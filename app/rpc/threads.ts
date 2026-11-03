import { defineRouter, procedure } from "point/app";
import { z } from "zod";
import { callerThread, outputKey, threadState } from "../threads/state";

const status = z.enum(["starting", "running", "parked", "paused", "idle", "stopped", "interrupted"]);
const pointThreads = z.array(z.object({ id: z.string(), status }));

// The agent new threads run. `builder` arrives with #19; until then the scaffold's coder does the work.
export const THREAD_AGENT = "coder";

const prepared = z.object({ repo: z.string(), baseBranch: z.string(), branch: z.string(), worktree: z.string() });
const failure = z.object({ code: z.string(), detail: z.unknown() });
const receipt = z.enum(["delivered", "queued", "rejected"]);

const messageOf = (f: unknown) => {
  const parsed = failure.safeParse(f);
  if (!parsed.success) return "unknown failure";
  const d = parsed.data.detail;
  const m = d && typeof d === "object" && "message" in d ? String(d.message) : undefined;
  return m ? `${parsed.data.code}: ${m}` : parsed.data.code;
};

/**
 * The project a call is about: the `projectId` it passed, else, for a coordinator agent, the project it coordinates
 * (Coordinator chat's `coordinators.projectOf`), so the coordinator never has to know its own id.
 */
async function projectFor(
  given: string | undefined,
  caller: string,
  rpc: { call: (path: string, input: unknown) => Promise<{ ok: boolean; value?: unknown }> },
) {
  if (given) return given;
  const own = callerThread(caller);
  if (!own) return undefined;
  const r = await rpc.call("coordinators.projectOf", { threadId: own }).catch(() => undefined);
  const id = r?.ok ? z.string().min(1).safeParse(r.value) : undefined;
  return id?.success ? id.data : undefined;
}

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
  // The coordinator starts a thread for a request: `"$POINT_CLI" threads start --projectId p1 --title "Add badge"
  // --request "..." --requestedBy Zack`. One worktree per thread (#12's workspaces.prepare), one Point thread in it, a
  // pre-k row, and the person's request as the first message, recorded as theirs.
  start: procedure
    .input(
      z.object({
        // Optional for a coordinator agent: its own project is used.
        projectId: z.string().min(1).optional(),
        title: z.string().trim().min(1).max(120),
        request: z.string().trim().min(1),
        requestedBy: z.string().trim().min(1),
      }),
    )
    .errors({
      NO_PROJECT: z.object({}),
      FORBIDDEN_FOR_THREADS: z.object({ threadId: z.string() }),
      WORKSPACE_FAILED: z.object({ code: z.string(), message: z.string() }),
      AGENT_START_FAILED: z.object({ message: z.string() }),
    })
    .tool()
    .cli()
    .handler(async ({ input, caller, collections, rpc, fail }) => {
      // A thread pre-k started can't start more threads; only the coordinator, windows and the CLI can.
      const own = callerThread(caller);
      if (own && collections.get("threads", own)) return fail("FORBIDDEN_FOR_THREADS", { threadId: own });

      const projectId = await projectFor(input.projectId, caller, rpc);
      if (!projectId) return fail("NO_PROJECT", {});

      const ws = await rpc.call("workspaces.prepare", { projectId, title: input.title });
      let workspace: z.infer<typeof prepared> | undefined;
      if (ws.ok) workspace = prepared.parse(ws.value);
      else if (ws.failure.code !== "NO_REPO")
        // A project with no repo still gets a thread (no worktree); anything else stops here.
        return fail("WORKSPACE_FAILED", { code: ws.failure.code, message: messageOf(ws.failure) });

      const release = async () => {
        if (workspace) await rpc.call("workspaces.release", { worktree: workspace.worktree }).catch(() => undefined);
      };
      const started = await rpc.call("agents.start", {
        agent: THREAD_AGENT,
        ...(workspace ? { cwd: workspace.worktree } : {}),
      });
      const threadId = started.ok ? z.string().safeParse(started.value) : undefined;
      if (!started.ok || !threadId?.success) {
        await release();
        return fail("AGENT_START_FAILED", { message: started.ok ? "agents.start answered no thread id" : messageOf(started.failure) });
      }

      const now = Date.now();
      await collections.upsert("threads", [
        {
          threadId: threadId.data,
          projectId,
          title: input.title,
          request: input.request,
          requestedBy: input.requestedBy,
          ...(workspace ? { repo: workspace.repo, baseBranch: workspace.baseBranch, branch: workspace.branch, worktree: workspace.worktree } : {}),
          createdAt: now,
          updatedAt: now,
        },
      ]);

      // The thread stays even if the first message fails (no key, no harness): its transcript shows the error and the
      // person can retry from the thread.
      const sent = await rpc.call("agents.send", {
        threadId: threadId.data,
        text: input.request,
        turn: "queue",
        by: input.requestedBy,
      });
      const r = sent.ok ? receipt.safeParse(sent.value) : undefined;
      return {
        threadId: threadId.data,
        branch: workspace?.branch,
        firstMessage: r?.success ? r.data : ("failed" as const),
      };
    }),

  list: procedure
    // Optional for a coordinator agent, like start.
    .input(z.object({ projectId: z.string().min(1).optional() }))
    .output(z.array(listed))
    .errors({ NO_PROJECT: z.object({}) })
    .tool()
    .cli()
    .handler(async ({ input, caller, collections, rpc, fail }) => {
      const projectId = await projectFor(input.projectId, caller, rpc);
      if (!projectId) return fail("NO_PROJECT", {});
      // Point's live status. If the agents daemon is down the threads still list, as idle or review_ready.
      const live = await rpc.call("agents.threads", undefined).catch(() => undefined);
      const parsed = live?.ok ? pointThreads.safeParse(live.value) : undefined;
      const statusOf = new Map(parsed?.success ? parsed.data.map((t) => [t.id, t.status]) : []);
      const outputs = collections.all("thread-outputs");
      return collections
        .all("threads")
        .filter((t) => t.projectId === projectId)
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
      // Re-read after the await so a concurrent `end` (or any other edit) isn't overwritten: only touch updatedAt.
      const current = collections.get("threads", threadId) ?? thread;
      await collections.upsert("threads", [{ ...current, updatedAt: now }]);
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
