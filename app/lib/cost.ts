import type { AgentHandle } from "point/client";

type ThreadEvent = AgentHandle["events"][number];

/**
 * What a thread has cost so far, for its status line. Gateway usage is per request, so it sums. Claude Code on its own
 * login (no Anthropic key) reports a running total per session instead (cloudflare-point#737), so summing would count
 * earlier turns again: take the largest total it reported, and call it an estimate, since a subscription pays for it.
 */
export function threadCost(events: readonly ThreadEvent[]): { usd: number; estimate: boolean } {
  const ownLogin = events.some(
    (e) => e.type === "error" && /^claude-code .*using its own login instead/.test(e.message),
  );
  const costs = events.flatMap((e) => (e.type === "usage" ? [e.costUsd ?? 0] : []));

  return {
    usd: ownLogin ? Math.max(0, ...costs) : costs.reduce((a, b) => a + b, 0),
    estimate: ownLogin,
  };
}

/** "$0.12", or "≈ $0.12 (estimate)" when the thread runs on the person's own Claude login. */
export function formatCost(c: { usd: number; estimate: boolean }): string {
  return c.estimate ? `≈ $${c.usd.toFixed(2)} (estimate)` : `$${c.usd.toFixed(2)}`;
}
