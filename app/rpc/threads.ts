import { defineRouter, procedure } from "point/app";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { preparedWorkspace as prepared } from "../schemas/workspace";
import { callerThread, outputKey, threadState } from "../threads/state";

const status = z.enum(["starting", "running", "parked", "paused", "idle", "stopped", "interrupted"]);
const pointThreads = z.array(z.object({ id: z.string(), status }));

// The agent new threads run: the builder from #19 (Claude Code; `builder-codex` and `builder-opencode` pick another harness).
export const THREAD_AGENT = "builder";

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
 * (Coordinator chat's `coordinator.projectOf`), so the coordinator never has to know its own id.
 */
async function projectFor(
  given: string | undefined,
  caller: string,
  rpc: { call: (path: string, input: unknown) => Promise<{ ok: boolean; value?: unknown }> },
) {
  if (given) return given;
  const own = callerThread(caller);
  if (!own) return undefined;
  const r = await rpc.call("coordinator.projectOf", { threadId: own }).catch(() => undefined);
  const id = r?.ok ? z.string().min(1).safeParse(r.value) : undefined;
  return id?.success ? id.data : undefined;
}

const repoName = z.string().regex(/^[^/\s]+\/[^/\s]+$/, "repo is owner/name");
const outputFields = { repo: repoName, url: z.string().optional(), title: z.string().optional() };
// A PR the thread opened, or a commit it landed on a branch without one.
const output = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("pr"), number: z.number().int().positive(), ...outputFields }),
  z.object({
    kind: z.literal("commit"),
    sha: z.string().regex(/^[0-9a-f]{7,40}$/, "sha is a hex commit id"),
    branch: z.string().min(1),
    ...outputFields,
  }),
]);

const listed = z.object({
  threadId: z.string(),
  title: z.string(),
  request: z.string(),
  requestedBy: z.string(),
  repo: z.string().optional(),
  branch: z.string().optional(),
  state: z.enum(["working", "blocked", "review_ready", "landed", "done", "failed", "stopped", "interrupted", "idle"]),
  outputs: z.array(output),
  updatedAt: z.number(),
});

// The coordinator agent reads a project's threads before starting one (`"$POINT_CLI" threads list --projectId p1`);
// a thread's agent records what it delivered (`"$POINT_CLI" threads report --kind pr --repo o/r --number 12`, or
// `--kind commit --repo o/r --sha <sha> --branch main` for work landed without a PR).
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
        // A project with no repo still gets a thread; anything else stops here.
        return fail("WORKSPACE_FAILED", { code: ws.failure.code, message: messageOf(ws.failure) });

      // Never let the agent fall back to the daemon's working directory (the app's own checkout): a thread with no
      // repo works in an empty scratch folder of its own.
      const scratch = workspace ? undefined : await fs.mkdtemp(path.join(os.tmpdir(), "pre-k-thread-"));
      const release = async () => {
        if (workspace) await rpc.call("workspaces.release", { worktree: workspace.worktree }).catch(() => undefined);
        if (scratch) await fs.rm(scratch, { recursive: true, force: true }).catch(() => undefined);
      };
      // The project's instructions and memory (Project setup's `projects.context`, kept within Point's limit) become the
      // thread's standing context. A thread still starts without it.
      const context = await rpc.call("projects.context", { projectId }).catch(() => undefined);
      const text = context?.ok ? z.string().min(1).safeParse(context.value) : undefined;
      const started = await rpc.call("agents.start", {
        agent: THREAD_AGENT,
        cwd: workspace?.worktree ?? scratch,
        by: input.requestedBy,
        ...(text?.success ? { context: text.data } : {}),
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
      // Point's live status. If the agents daemon is down the threads still list, as idle, review_ready or landed.
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
            .map(({ id: _id, threadId: _t, createdAt: _c, ...o }) => o);
          return {
            threadId: t.threadId,
            title: t.title,
            request: t.request,
            requestedBy: t.requestedBy,
            repo: t.repo,
            branch: t.branch,
            state: threadState(statusOf.get(t.threadId), t.endedAs, mine),
            outputs: mine,
            updatedAt: t.updatedAt,
          };
        });
    }),

  report: procedure
    // threadId is required for callers other than a thread's own agent (main code such as the PR tool, the CLI).
    .input(output.and(z.object({ threadId: z.string().optional() })))
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
      const { threadId: _given, url, title, ...identity } = input;
      const id = outputKey({ ...identity, threadId });
      const before = collections.get("thread-outputs", id);
      const now = Date.now();
      const kept = {
        id,
        threadId,
        createdAt: before?.createdAt ?? now,
        ...((url ?? before?.url) ? { url: url ?? before?.url } : {}),
        ...((title ?? before?.title) ? { title: title ?? before?.title } : {}),
      };
      await collections.upsert("thread-outputs", [{ ...identity, ...kept }]);
      // Re-read after the await so a concurrent `end` (or any other edit) isn't overwritten: only touch updatedAt.
      const current = collections.get("threads", threadId) ?? thread;
      await collections.upsert("threads", [{ ...current, updatedAt: now }]);
      return { id, recorded: before ? "already" : "new" } as const;
    }),

  // Following up on a thread, finished or not: a person's next request, or a retry of one that failed. A thread the
  // person (or the coordinator) closed is reopened first, so its state comes from its new turn again. Queued, so a
  // follow-up never steers a turn already running. Point starts a new harness for a thread whose harness has exited.
  followUp: procedure
    .input(z.object({ threadId: z.string().min(1), text: z.string().trim().min(1), by: z.string().min(1).optional() }))
    .errors({
      NOT_A_THREAD: z.object({ threadId: z.string() }),
      FORBIDDEN_FOR_THREADS: z.object({}),
      SEND_FAILED: z.object({ message: z.string() }),
    })
    .tool()
    .cli()
    .handler(async ({ input, caller, collections, rpc, fail }) => {
      // Like start: a thread's own agent doesn't hand itself, or another thread, more work.
      const own = callerThread(caller);
      if (own && collections.get("threads", own)) return fail("FORBIDDEN_FOR_THREADS", {});
      const thread = collections.get("threads", input.threadId);
      if (!thread) return fail("NOT_A_THREAD", { threadId: input.threadId });
      const { endedAs: _ended, ...open } = thread;
      await collections.upsert("threads", [{ ...open, updatedAt: Date.now() }]);
      const sent = await rpc.call("agents.send", {
        threadId: input.threadId,
        text: input.text,
        turn: "queue",
        ...(input.by ? { by: input.by } : {}),
      });
      if (!sent.ok) return fail("SEND_FAILED", { message: messageOf(sent.failure) });
      const r = receipt.safeParse(sent.value);
      return { reopened: thread.endedAs !== undefined, message: r.success ? r.data : ("delivered" as const) };
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
