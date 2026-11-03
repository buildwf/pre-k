import type { ThreadEventBody, ThreadStatus } from "point/agent";

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
 * `endedAs` wins: a person or the coordinator closed the thread. Then a failed latest `attempt` on a thread at rest. Otherwise Point's status decides. An idle thread that
 * opened a PR is waiting for review; one that landed commits (no PR) has landed its work. `status` is undefined when
 * the agents daemon has no such thread.
 */
export function threadState(
  status: ThreadStatus | undefined,
  endedAs: EndedAs | undefined,
  outputs: readonly OutputLike[],
  attempt?: { failed: boolean } | undefined,
): ThreadState {
  if (endedAs) return endedAs;
  // A finished thread whose latest attempt failed is failed until the next attempt; a running one is working again.
  if (attempt?.failed && (status === undefined || status === "idle" || status === "stopped")) return "failed";
  switch (status) {
    case "starting":
    case "running":
      return "working";
    case "parked":
    case "paused":
      return "blocked";
    case "interrupted":
      return "interrupted";
    // Point reports `stopped` for any thread whose harness has exited, including one that finished its turn and was
    // closed when the app quit, so it reads like idle. A harness that never started shows as a failed attempt.
    case "stopped":
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

/**
 * How the thread's latest request went, from its events: the last message the person sent, and whether the attempt
 * after it failed. A turn that ended `failed` or `interrupted` failed; so did an attempt where an error came and no turn
 * ended at all (the harness never started: a missing key or binary). An error notice inside a turn that completed
 * ("using its own login") is not a failure. `message` is the last error after the request, for the person to read.
 */
export function lastAttempt(events: readonly ThreadEventBody[]): {
  request?: string;
  failed: boolean;
  message?: string;
} {
  let at = -1;
  for (let i = events.length - 1; i >= 0; i--)
    if (events[i]?.type === "user") {
      at = i;
      break;
    }
  const asked = events[at];
  const request = asked?.type === "user" ? asked.text : undefined;
  let ended: "completed" | "interrupted" | "failed" | undefined;
  let message: string | undefined;
  for (const e of events.slice(at + 1)) {
    if (e.type === "turn.end") ended = e.status;
    else if (e.type === "error") message = e.message;
  }
  const failed = ended ? ended !== "completed" : message !== undefined && at >= 0;
  return { ...(request !== undefined ? { request } : {}), failed, ...(failed && message ? { message } : {}) };
}
