import type { ThreadStatus } from "point/agent";
import { outputLabel, threadState, type EndedAs, type OutputLike, type ThreadState } from "./state";

/** What the relay needs to know about one pre-k thread, from the threads and thread-outputs collections. */
export interface RelayThread {
  threadId: string;
  projectId: string;
  title: string;
  endedAs?: EndedAs | undefined;
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
  idle: "finished its turn without opening a PR",
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
      const state = threadState(status.get(t.threadId), t.endedAs, t.prs);
      const key = `${state}|${t.prs.map(outputLabel).join(",")}`;
      const before = seen.get(t.threadId);
      const worked = (before?.worked ?? false) || state === "working" || Boolean(t.endedAs) || Boolean(opts.seed);
      seen.set(t.threadId, { worked, last: key });
      if (opts.seed || state === "working" || !worked || before?.last === key) continue;
      const list = (kind: OutputLike["kind"]) =>
        t.prs.filter((p) => p.kind === kind).map((p) => p.url ?? outputLabel(p)).join(", ");
      const prs = list("pr");
      const commits = list("commit");
      notes.push({
        projectId: t.projectId,
        threadId: t.threadId,
        text: `${UPDATE_PREFIX} "${t.title}" ${words[state]}.${prs ? ` PR: ${prs}.` : ""}${commits ? ` Commit: ${commits}.` : ""}`,
      });
    }
    return notes;
  };
}
