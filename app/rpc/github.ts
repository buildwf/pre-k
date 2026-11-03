import { defineRouter, procedure } from "point/app";
import { connect, ConnectorError } from "point/connectors";
import { z } from "zod";
import github from "../connectors/github.connector";
import { ensureClone, GitError, landOnBase, publishBranch } from "../lib/checkout";
import { checkoutPath, remoteUrl } from "../lib/paths";
import { newPullRequest, repoName } from "../schemas/github";
import { linkedRepo } from "../schemas/workspace";
import { callerThread } from "../threads/state";

/**
 * pre-k on GitHub. The token stays in main: `connectors.require` fails CONNECTOR_NOT_CONNECTED until the person
 * connects (or GITHUB_TOKEN / the keychain item point/github is set), so the window shows its connect button.
 * Nothing here returns the token.
 */
export default defineRouter({
  // Who pre-k acts as (pre-k#9).
  me: procedure
    .errors({
      TOKEN_REJECTED: z.object({ status: z.number() }),
      GITHUB_FAILED: z.object({ status: z.number(), message: z.string() }),
      UNREACHABLE: z.object({ message: z.string() }),
    })
    .handler(async ({ connectors, fail }) => {
      // Outside the try: CONNECTOR_NOT_CONNECTED is the framework's own failure, so the window shows Connect.
      const token = await connectors.require("github");

      try {
        const me = await connect(github, { token }).me({});

        return { login: me.login, name: me.name ?? null, url: me.url };
      } catch (e) {
        // An expired or revoked token: the window offers to connect again instead of showing an internal error.
        if (e instanceof ConnectorError && e.status === 401) return fail("TOKEN_REJECTED", { status: e.status });
        if (e instanceof ConnectorError) return fail("GITHUB_FAILED", { status: e.status, message: e.message });
        // No answer at all (offline, DNS, a proxy): typed, so the window says so and nothing counts it as a crash.
        if (e instanceof Error) return fail("UNREACHABLE", { message: e.message });
        throw e;
      }
    }),

  /**
   * Link a repository to a project (pre-k#10): check the person's token can reach it, clone it once into the app's own
   * folder (later calls fetch), and store its GitHub fields on the project through projects.update.
   */
  linkRepo: procedure
    .input(z.object({ projectId: z.string().min(1), repo: repoName }))
    .output(linkedRepo)
    .errors({
      NO_PROJECT: z.object({ projectId: z.string() }),
      REPO_NOT_VISIBLE: z.object({ repo: z.string() }),
      CLONE_FAILED: z.object({ message: z.string() }),
      GITHUB_FAILED: z.object({ status: z.number(), message: z.string() }),
    })
    .cli()
    .handler(async ({ input, connectors, rpc, fail }) => {
      const token = await connectors.require("github");
      let found;

      try {
        found = await connect(github, { token }).getRepo({ repo: input.repo });
      } catch (e) {
        // GitHub answers 404 for a private repo the token can't see, as for one that doesn't exist.
        if (e instanceof ConnectorError && e.status === 404) return fail("REPO_NOT_VISIBLE", { repo: input.repo });
        if (e instanceof ConnectorError) return fail("GITHUB_FAILED", { status: e.status, message: e.message });
        throw e;
      }

      const dir = checkoutPath(found.repo);

      try {
        await ensureClone({ url: remoteUrl(found.repo), dir, token });
      } catch (e) {
        if (e instanceof GitError) return fail("CLONE_FAILED", { message: e.message });
        throw e;
      }

      const updated = await rpc.call("projects.update", {
        id: input.projectId,
        repo: found.repo,
        defaultBranch: found.defaultBranch,
        private: found.private,
        htmlUrl: found.url,
        checkoutPath: dir,
      });

      if (!updated.ok) return fail("NO_PROJECT", { projectId: input.projectId });

      return { repo: found.repo, defaultBranch: found.defaultBranch, checkoutPath: dir };
    }),

  /**
   * A thread's agent lands its work straight on the repo's default branch, no PR (Zack, 2026-11-03):
   * `"$POINT_CLI" github landOnMain --message "..."`. Like openPullRequest, main does the git work with the token and
   * takes the repo, branch and base from the thread's record, never from the input.
   */
  landOnMain: procedure
    .input(z.object({ message: z.string().trim().min(1).max(256).optional() }))
    .output(z.object({ sha: z.string(), url: z.string() }))
    .errors({
      NOT_A_THREAD: z.object({}),
      NO_CHANGES: z.object({ message: z.string() }),
      CONFLICT: z.object({ message: z.string(), files: z.array(z.string()), next: z.string() }),
      NOT_FAST_FORWARD: z.object({ message: z.string() }),
      PUSH_REJECTED: z.object({ message: z.string() }),
    })
    .tool()
    .cli()
    .handler(async ({ input, caller, collections, connectors, rpc, fail }) => {
      const threadId = callerThread(caller);
      const thread = threadId ? collections.get("threads", threadId) : undefined;

      if (!threadId || !thread?.repo || !thread.branch || !thread.baseBranch || !thread.worktree)
        return fail("NOT_A_THREAD", {});
      const token = await connectors.require("github");
      const message = input.message ?? thread.title;
      const login = (await connect(github, { token }).me({})).login;
      const landed = await landOnBase({
        worktree: thread.worktree,
        branch: thread.branch,
        base: thread.baseBranch,
        message,
        author: { name: "pre-k agent", email: `${login}@users.noreply.github.com` },
        token,
      });

      if (landed.ok) {
        const url = `https://github.com/${thread.repo}/commit/${landed.sha}`;

        // Recorded as the thread's output once Threads' commit kind exists; the commit is on GitHub either way.
        await rpc
          .call("threads.report", {
            threadId,
            kind: "commit",
            repo: thread.repo,
            sha: landed.sha,
            branch: thread.baseBranch,
            url,
            title: message,
          })
          .catch(() => undefined);

        return { sha: landed.sha, url };
      }
      switch (landed.reason) {
        case "no-changes":
          return fail("NO_CHANGES", { message: landed.detail });
        case "conflict":
          // What the agent does next, in the failure itself, so every harness gets the same recovery.
          return fail("CONFLICT", {
            message: `${thread.baseBranch} changed under this thread and ${landed.files.length || "some"} file(s) conflict`,
            files: landed.files,
            next: `git rebase origin/${thread.baseBranch}, fix the conflicts in ${landed.files.join(", ") || "the files git names"}, git add them, git rebase --continue, then run github landOnMain again. Nothing was pushed.`,
          });
        case "not-fast-forward":
          return fail("NOT_FAST_FORWARD", { message: landed.detail });
        case "rejected":
          return fail("PUSH_REJECTED", { message: landed.detail });
      }
    }),

  /**
   * A thread's agent delivers its work (pre-k#14): `"$POINT_CLI" github openPullRequest --title T --body B`. Main,
   * not the sandbox, pushes the thread's own branch to its own repo (both from the thread's record, never the input),
   * then opens the PR or returns the open one for that branch, and records it with `threads report`.
   */
  openPullRequest: procedure
    .input(newPullRequest.pick({ title: true, body: true, draft: true }))
    .output(
      z.object({ number: z.number(), url: z.string(), created: z.boolean() }),
    )
    .errors({
      NOT_A_THREAD: z.object({}),
      NO_CHANGES: z.object({ message: z.string() }),
      PUSH_REJECTED: z.object({ message: z.string() }),
      GITHUB_FAILED: z.object({ status: z.number(), message: z.string() }),
    })
    .tool()
    .cli()
    .handler(async ({ input, caller, collections, connectors, rpc, fail }) => {
      const threadId = callerThread(caller);
      const thread = threadId
        ? collections.get("threads", threadId)
        : undefined;

      if (
        !threadId ||
        !thread?.repo ||
        !thread.branch ||
        !thread.baseBranch ||
        !thread.worktree
      )
        return fail("NOT_A_THREAD", {});
      const { repo, branch, baseBranch: base, worktree } = thread;
      const token = await connectors.require("github");
      const gh = connect(github, { token });

      try {
        const login = (await gh.me({})).login;
        const pushed = await publishBranch({
          worktree,
          branch,
          base,
          message: input.title,
          author: {
            name: "pre-k agent",
            email: `${login}@users.noreply.github.com`,
          },
          token,
        });

        if (!pushed.ok)
          return pushed.reason === "no-changes"
            ? fail("NO_CHANGES", { message: pushed.detail })
            : fail("PUSH_REJECTED", { message: pushed.detail });

        const existing = await gh.findOpenPullRequest({ repo, head: branch });
        const pr =
          existing ??
          (await gh.createPullRequest({ repo, head: branch, base, ...input }));

        // Idempotent per (thread, repo, number); a failed record doesn't undo a PR that now exists on GitHub.
        await rpc.call("threads.report", {
          threadId,
          kind: "pr",
          repo,
          number: pr.number,
          url: pr.url,
          title: pr.title,
        });

        return { number: pr.number, url: pr.url, created: !existing };
      } catch (e) {
        if (e instanceof ConnectorError)
          return fail("GITHUB_FAILED", {
            status: e.status,
            message: e.message,
          });
        throw e;
      }
    }),
});
