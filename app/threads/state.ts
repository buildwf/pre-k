import type { ThreadStatus } from "point/agent";

/** What the person sees for a thread, derived from Point's live status and pre-k's record. Never stored. */
export type ThreadState =
  | "working"
  | "blocked"
  | "review_ready"
  | "landed"
  | "done"
  | "failed"
  | "stopped"
  | "interrupted"
  | "idle";

export type EndedAs = "done" | "failed" | "stopped";

/** The part of an output row the state and labels need. */
export type OutputLike =
  | { kind: "pr"; repo: string; number: number }
  | { kind: "commit"; repo: string; sha: string; branch: string };

/**
 * `endedAs` wins: a person or the coordinator closed the thread. Otherwise Point's status decides. An idle thread that
 * opened a PR is waiting for review; one that landed commits (no PR) has landed its work. `status` is undefined when
 * the agents daemon has no such thread.
 */
export function threadState(
  status: ThreadStatus | undefined,
  endedAs: EndedAs | undefined,
  outputs: readonly OutputLike[],
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
      if (outputs.some((o) => o.kind === "pr")) return "review_ready";
      return outputs.some((o) => o.kind === "commit") ? "landed" : "idle";
  }
}

/** How an output reads in text: `o/r#12` for a PR, `o/r@abc1234` for a commit. */
export const outputLabel = (o: OutputLike) =>
  o.kind === "pr" ? `${o.repo}#${o.number}` : `${o.repo}@${o.sha.slice(0, 7)}`;

/** One output row per thread and output: a repeated report replaces the row instead of adding one. */
export const outputKey = (o: OutputLike & { threadId: string }) =>
  o.kind === "pr" ? `${o.threadId}:pr:${o.repo}#${o.number}` : `${o.threadId}:commit:${o.repo}@${o.sha}`;

/** `agent:<threadId>` names the thread an agent call comes from; any other caller has none. */
export const callerThread = (caller: string) =>
  caller.startsWith("agent:") ? caller.slice("agent:".length) || undefined : undefined;
