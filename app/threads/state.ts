import type { ThreadStatus } from "point/agent";

/** What the person sees for a thread, derived from Point's live status and pre-k's record. Never stored. */
export type ThreadState =
  | "working"
  | "blocked"
  | "review_ready"
  | "done"
  | "failed"
  | "stopped"
  | "interrupted"
  | "idle";

export type EndedAs = "done" | "failed" | "stopped";

/**
 * `endedAs` wins: a person or the coordinator closed the thread. Otherwise Point's status decides, and an idle thread
 * that has produced a PR is waiting for review. `status` is undefined when the agents daemon has no such thread.
 */
export function threadState(
  status: ThreadStatus | undefined,
  endedAs: EndedAs | undefined,
  outputs: number,
): ThreadState {
  if (endedAs) return endedAs;
  switch (status) {
    case "starting":
    case "running":
      return "working";
    case "parked":
    case "paused":
      return "blocked";
    case "interrupted":
    case "stopped":
      return "interrupted";
    case "idle":
    case undefined:
      return outputs > 0 ? "review_ready" : "idle";
  }
}

/** One output row per (thread, kind, repo, number): a repeated report replaces the row instead of adding one. */
export const outputKey = (o: { threadId: string; kind: string; repo: string; number: number }) =>
  `${o.threadId}:${o.kind}:${o.repo}#${o.number}`;

/** `agent:<threadId>` names the thread an agent call comes from; any other caller has none. */
export const callerThread = (caller: string) =>
  caller.startsWith("agent:") ? caller.slice("agent:".length) || undefined : undefined;
