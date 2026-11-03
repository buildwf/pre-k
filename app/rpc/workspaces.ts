import fs from "node:fs/promises";
import path from "node:path";
import { defineRouter, procedure } from "point/app";
import { z } from "zod";
import { preparedWorkspace, releaseResult } from "../schemas/workspace";
import {
  addWorktree,
  fetchOrigin,
  GitError,
  releaseWorktree,
  threadBranch,
} from "../lib/checkout";

/**
 * One branch and worktree per thread (pre-k#12). `threads start` calls `prepare` and starts the Point thread in the
 * worktree; `release` removes it when the thread is over, unless it holds work GitHub doesn't have yet. Worktrees sit
 * beside the project's checkout (`<checkout>.worktrees/<branch>`), so they share its objects.
 */

const linked = z.object({
  repo: z.string().min(1),
  defaultBranch: z.string().min(1),
  checkoutPath: z.string().min(1),
});

const WORKTREES = ".worktrees";

const exists = (p: string) =>
  fs.stat(p).then(
    () => true,
    () => false,
  );

export default defineRouter({
  prepare: procedure
    .input(z.object({ projectId: z.string().min(1), title: z.string().min(1) }))
    .output(preparedWorkspace)
    .errors({
      NO_REPO: z.object({ projectId: z.string() }),
      NOT_CLONED: z.object({ repo: z.string() }),
      FETCH_FAILED: z.object({ message: z.string() }),
    })
    .handler(async ({ input, rpc, connectors, fail }) => {
      // The project record is Project setup's (pre-k#18); its GitHub fields are written by github.linkRepo.
      const got = await rpc.call("projects.get", { id: input.projectId });
      const project = got.ok ? linked.safeParse(got.value) : undefined;

      if (!project?.success)
        return fail("NO_REPO", { projectId: input.projectId });
      const { repo, defaultBranch, checkoutPath } = project.data;

      if (!(await exists(path.join(checkoutPath, ".git"))))
        return fail("NOT_CLONED", { repo });

      try {
        await fetchOrigin({
          dir: checkoutPath,
          token: await connectors.token("github"),
        });
        // A random suffix makes a collision unlikely; one retry covers it.
        for (let attempt = 0; ; attempt++) {
          const branch = threadBranch(input.title);
          const worktree = path.join(
            `${checkoutPath}${WORKTREES}`,
            branch.replace(/^pre-k\//, ""),
          );

          try {
            await addWorktree({
              dir: checkoutPath,
              base: defaultBranch,
              branch,
              worktree,
            });

            return { repo, baseBranch: defaultBranch, branch, worktree };
          } catch (e) {
            if (attempt > 0 || !(e instanceof GitError)) throw e;
          }
        }
      } catch (e) {
        if (e instanceof GitError)
          return fail("FETCH_FAILED", { message: e.message });
        throw e;
      }
    }),

  release: procedure
    .input(z.object({ worktree: z.string().min(1) }))
    .output(releaseResult)
    .errors({ NOT_A_WORKTREE: z.object({ worktree: z.string() }) })
    .handler(async ({ input, collections, connectors, fail }) => {
      // Only a worktree `prepare` made: `<checkout>.worktrees/<name>` on a pre-k/ branch.
      const parent = path.dirname(input.worktree);

      if (!parent.endsWith(WORKTREES))
        return fail("NOT_A_WORKTREE", { worktree: input.worktree });
      const dir = parent.slice(0, -WORKTREES.length);
      const thread = collections
        .all("threads")
        .find((t) => t.worktree === input.worktree);

      try {
        return await releaseWorktree({
          dir,
          worktree: input.worktree,
          // A thread that failed to start has no row yet; its fresh worktree is checked against its own branch.
          branch: thread?.branch ?? `pre-k/${path.basename(input.worktree)}`,
          base: thread?.baseBranch ?? "HEAD",
          token: await connectors.token("github"),
        });
      } catch (e) {
        if (e instanceof GitError)
          return fail("NOT_A_WORKTREE", { worktree: input.worktree });
        throw e;
      }
    }),
});
