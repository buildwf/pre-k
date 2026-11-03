import { defineRouter, procedure } from "point/app";
import { connect, ConnectorError } from "point/connectors";
import { z } from "zod";
import github from "../connectors/github.connector";
import { publishBranch } from "../lib/checkout";
import { newPullRequest } from "../schemas/github";
import { callerThread } from "../threads/state";

/**
 * pre-k on GitHub. The token stays in main: `connectors.require` fails CONNECTOR_NOT_CONNECTED until the person
 * connects (or GITHUB_TOKEN / the keychain item point/github is set), so the window shows its connect button.
 * Nothing here returns the token.
 */
export default defineRouter({
  // Who pre-k acts as (pre-k#9).
  me: procedure.handler(async ({ connectors }) => {
    const me = await connect(github, {
      token: await connectors.require("github"),
    }).me({});

    return { login: me.login, name: me.name ?? null, url: me.url };
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
