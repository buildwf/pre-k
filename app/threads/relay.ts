import type { ThreadStatus } from "point/agent";
import { outputLabel, threadState, type EndedAs, type OutputLike, type ThreadState } from "./state";

/** What the relay needs to know about one pre-k thread, from the threads and thread-outputs collections. */
export interface RelayThread {
  threadId: string;
  projectId: string;
  title: string;
  endedAs?: EndedAs | undefined;
  /** The latest attempt, so a turn that failed reads as failed (with why), not as finished. */
  lastAttempt?: { failed: boolean; message?: string | undefined } | undefined;
  /** What it delivered: PRs and landed commits. */
  prs: (OutputLike & { url?: string | undefined })[];
}

/** A line for one project's coordinator. */
export interface RelayNote {
  projectId: string;
  threadId: string;
  text: string;
}

/** Every relayed line starts with this, so project chat shows it as an update and the coordinator knows it is one. */
export const UPDATE_PREFIX = "Thread update:";

const words: Record<ThreadState, string> = {
  working: "is working",
  blocked: "is waiting for you (an approval or a paused turn)",
  review_ready: "is ready for review",
  landed: "landed its work",
  done: "is done",
  failed: "failed",
  stopped: "was stopped",
  interrupted: "was interrupted",
  idle: "finished its turn without landing any work",
};

/**
 * Decides which thread changes project chat hears about (#16). Remembers, per thread, whether it has worked yet and
 * the last state it reported, so a new thread that hasn't started, a repeated status and a restart (seed) say nothing.
 */
export function createRelay() {
  const seen = new Map<string, { worked: boolean; last: string }>();

  return (threads: RelayThread[], status: Map<string, ThreadStatus>, opts: { seed?: boolean } = {}) => {
    const notes: RelayNote[] = [];
    for (const t of threads) {
      const state = threadState(status.get(t.threadId), t.endedAs, t.prs, t.lastAttempt);
      const key = `${state}|${t.prs.map(outputLabel).join(",")}`;
      const before = seen.get(t.threadId);
      const worked = (before?.worked ?? false) || state === "working" || Boolean(t.endedAs) || Boolean(opts.seed);
      seen.set(t.threadId, { worked, last: key });
      if (opts.seed || state === "working" || !worked || before?.last === key) continue;
      const list = (kind: OutputLike["kind"]) =>
        t.prs.filter((p) => p.kind === kind).map((p) => p.url ?? outputLabel(p)).join(", ");
      const prs = list("pr");
      const commits = list("commit");
      const why = state === "failed" && !t.endedAs ? reason(t.lastAttempt?.message) : "";
      notes.push({
        projectId: t.projectId,
        threadId: t.threadId,
        text: `${UPDATE_PREFIX} "${t.title}" ${words[state]}${why ? `: ${why}` : ""}.${prs ? ` PR: ${prs}.` : ""}${commits ? ` Commit: ${commits}.` : ""}`,
      });
    }
    return notes;
  };
}

/** The first line of a failure, without a trailing period, at most 120 characters. */
function reason(message: string | undefined): string {
  const line = (message ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/[.\s]+$/, "");
  return line.length > 120 ? `${line.slice(0, 119)}…` : line;
}

/** A note waiting for its coordinator. */
export interface HeldNote {
  coordinator: string;
  threadId: string;
  text: string;
}

/**
 * Notes wait while their coordinator is mid-turn, so a thread update lands after the coordinator's own reply rather
 * than racing it (project chat showed the two in either order). They also wait `settleMs` after the thread's latest
 * change, and a newer note for the same thread replaces the held one: a thread at rest reads "finished" a moment
 * before its failed attempt is recorded, and only the second is true. A coordinator Point doesn't list isn't busy.
 */
export function createOutbox(settleMs = 1500) {
  let held: (HeldNote & { at: number })[] = [];
  return {
    settleMs,
    hold(note: HeldNote, now: number) {
      held = [...held.filter((n) => n.threadId !== note.threadId), { ...note, at: now }];
    },
    take(status: ReadonlyMap<string, ThreadStatus>, now: number): HeldNote[] {
      const busy = (id: string) => {
        const s = status.get(id);
        return s === "starting" || s === "running" || s === "parked" || s === "paused";
      };
      const due = (n: HeldNote & { at: number }) => now - n.at >= settleMs && !busy(n.coordinator);
      const ready = held.filter(due);
      held = held.filter((n) => !due(n));
      return ready.map(({ coordinator, threadId, text }) => ({ coordinator, threadId, text }));
    },
  };
}
