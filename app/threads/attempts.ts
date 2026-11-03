import type { Collections, MainCalls } from "point/app";
import type { ThreadEventBody, ThreadStatus } from "point/agent";
import { z } from "zod";
import { lastAttempt } from "./state";

// The events an attempt's outcome depends on (Point doesn't export its event schema); the rest are skipped.
const attemptEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("user"), text: z.string(), turn: z.enum(["start", "steer", "queue"]) }),
  z.object({ type: z.literal("turn.end"), turnId: z.string(), status: z.enum(["completed", "interrupted", "failed"]) }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);

const BUSY: ReadonlySet<ThreadStatus> = new Set(["starting", "running", "parked", "paused"]);

/** Record how a thread's latest attempt went on its row, so the list can say "failed". Unchanged outcomes write nothing. */
export async function recordAttempt(
  collections: Pick<Collections, "get" | "upsert">,
  threadId: string,
  failed: boolean,
  message?: string,
) {
  const row = collections.get("threads", threadId);
  if (!row) return;
  const before = row.lastAttempt;
  if (before && before.failed === failed && before.message === message) return;
  const now = Date.now();
  await collections.upsert("threads", [
    { ...row, lastAttempt: { failed, ...(message !== undefined ? { message } : {}), at: now }, updatedAt: now },
  ]);
}

/**
 * Follows the transcript of each pre-k thread while it works, and records its latest attempt when a turn ends, and
 * once more when the thread comes to rest (an attempt whose harness never started has an error but no turn). Point's
 * thread list carries only status, and a window shouldn't open every transcript, so main does it once per busy spell.
 * Feed it each `agents.watchThreads` list, as a map of status by thread id, through `update`.
 */
export function createAttemptWatcher(o: {
  rpc: Pick<MainCalls, "stream">;
  collections: Pick<Collections, "get" | "upsert">;
  signal: AbortSignal;
  /** How long after a thread comes to rest to keep reading, for events that arrive after the status change. */
  graceMs?: number;
}) {
  const graceMs = o.graceMs ?? 2000;
  const open = new Map<string, { ac: AbortController; timer?: ReturnType<typeof setTimeout> | undefined }>();

  const settle = async (threadId: string, events: readonly ThreadEventBody[]) => {
    const a = lastAttempt(events);
    if (a.request !== undefined) await recordAttempt(o.collections, threadId, a.failed, a.message);
  };

  const watch = async (threadId: string) => {
    const ac = new AbortController();
    const stop = () => ac.abort();
    o.signal.addEventListener("abort", stop, { once: true });
    open.set(threadId, { ac });
    const events: ThreadEventBody[] = [];
    try {
      for await (const raw of o.rpc.stream("agents.events", { threadId }, { signal: ac.signal })) {
        const e = attemptEvent.safeParse(raw);
        if (!e.success) continue;
        events.push(e.data);
        if (e.data.type === "turn.end") await settle(threadId, events);
      }
    } catch {
      // Aborted at rest, or the daemon restarted: the next busy status opens it again.
    } finally {
      o.signal.removeEventListener("abort", stop);
      open.delete(threadId);
      if (!o.signal.aborted) await settle(threadId, events);
    }
  };

  return {
    update(statuses: ReadonlyMap<string, ThreadStatus>) {
      for (const [id, status] of statuses) {
        const w = open.get(id);
        if (BUSY.has(status)) {
          if (w?.timer) w.timer = void clearTimeout(w.timer);
          else if (!w && o.collections.get("threads", id)) void watch(id);
        } else if (w && !w.timer) w.timer = setTimeout(() => w.ac.abort(), graceMs);
      }
    },
  };
}
