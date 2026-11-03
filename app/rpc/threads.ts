import { defineRouter, procedure } from "point/app";
import { z } from "zod";
import { callerThread, outputKey, threadState } from "../threads/state";

const status = z.enum(["starting", "running", "parked", "paused", "idle", "stopped", "interrupted"]);
const pointThreads = z.array(z.object({ id: z.string(), status }));

const output = z.object({
  kind: z.literal("pr"),
  repo: z.string(),
  number: z.number(),
  url: z.string().optional(),
  title: z.string().optional(),
});

const listed = z.object({
  threadId: z.string(),
  title: z.string(),
  request: z.string(),
  requestedBy: z.string(),
  repo: z.string().optional(),
  branch: z.string().optional(),
  state: z.enum(["working", "blocked", "review_ready", "done", "failed", "stopped", "interrupted", "idle"]),
  outputs: z.array(output),
  updatedAt: z.number(),
});

// The coordinator agent reads a project's threads before starting one (`"$POINT_CLI" threads list --projectId p1`);
// a thread's agent records what it delivered (`"$POINT_CLI" threads report --kind pr --repo o/r --number 12`).
export default defineRouter({
  list: procedure
    .input(z.object({ projectId: z.string().min(1) }))
    .output(z.array(listed))
    .tool()
    .cli()
    .handler(async ({ input, collections, rpc }) => {
      // Point's live status. If the agents daemon is down the threads still list, as idle or review_ready.
      const live = await rpc.call("agents.threads", undefined).catch(() => undefined);
      const parsed = live?.ok ? pointThreads.safeParse(live.value) : undefined;
      const statusOf = new Map(parsed?.success ? parsed.data.map((t) => [t.id, t.status]) : []);
      const outputs = collections.all("thread-outputs");
      return collections
        .all("threads")
        .filter((t) => t.projectId === input.projectId)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((t) => {
          const mine = outputs
            .filter((o) => o.threadId === t.threadId)
            .sort((a, b) => a.createdAt - b.createdAt)
            .map(({ kind, repo, number, url, title }) => ({ kind, repo, number, url, title }));
          return {
            threadId: t.threadId,
            title: t.title,
            request: t.request,
            requestedBy: t.requestedBy,
            repo: t.repo,
            branch: t.branch,
            state: threadState(statusOf.get(t.threadId), t.endedAs, mine.length),
            outputs: mine,
            updatedAt: t.updatedAt,
          };
        });
    }),

  report: procedure
    .input(
      output.extend({
        repo: z.string().regex(/^[^/\s]+\/[^/\s]+$/, "repo is owner/name"),
        number: z.number().int().positive(),
        // Required for callers other than a thread's own agent (main code such as the PR tool, the CLI).
        threadId: z.string().optional(),
      }),
    )
    .errors({
      NOT_A_THREAD: z.object({ threadId: z.string().optional() }),
      OTHER_THREAD: z.object({ threadId: z.string() }),
    })
    .tool()
    .cli()
    .handler(async ({ input, caller, collections, fail }) => {
      const own = callerThread(caller);
      // An agent reports only for its own thread.
      if (own && input.threadId && input.threadId !== own) return fail("OTHER_THREAD", { threadId: input.threadId });
      const threadId = own ?? input.threadId;
      const thread = threadId ? collections.get("threads", threadId) : undefined;
      if (!threadId || !thread) return fail("NOT_A_THREAD", { threadId });
      const row = { threadId, kind: input.kind, repo: input.repo, number: input.number };
      const id = outputKey(row);
      const before = collections.get("thread-outputs", id);
      const now = Date.now();
      await collections.upsert("thread-outputs", [
        {
          ...row,
          id,
          url: input.url ?? before?.url,
          title: input.title ?? before?.title,
          createdAt: before?.createdAt ?? now,
        },
      ]);
      await collections.upsert("threads", [{ ...thread, updatedAt: now }]);
      return { id, recorded: before ? "already" : "new" } as const;
    }),

  // Closing a thread is the person's (or the CLI's) call. No `.tool()`, so Point refuses agent callers (FORBIDDEN).
  end: procedure
    .input(z.object({ threadId: z.string(), as: z.enum(["done", "failed", "stopped"]) }))
    .errors({ NOT_A_THREAD: z.object({ threadId: z.string() }) })
    .cli()
    .handler(async ({ input, collections, fail }) => {
      const thread = collections.get("threads", input.threadId);
      if (!thread) return fail("NOT_A_THREAD", { threadId: input.threadId });
      await collections.upsert("threads", [{ ...thread, endedAs: input.as, updatedAt: Date.now() }]);
      return "ended" as const;
    }),
});
