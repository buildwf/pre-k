import { expect, test } from "vitest";
import type { AgentHandle } from "point/client";
import { formatCost, threadCost } from "./cost";

const usage = (costUsd: number) => ({ type: "usage", inputTokens: 1, outputTokens: 1, costUsd }) as const;
const ownLogin = {
  type: "error",
  message: "claude-code can only use the gateway with an API key for anthropic; using its own login instead",
} as const;
// Only the fields threadCost reads; the rest of a ThreadEvent's envelope doesn't matter here.
const events = (...es: object[]): AgentHandle["events"] => es.map((e) => Object.assign({}, e)) as never;

test("gateway usage is per request, so it adds up", () => {
  expect(threadCost(events(usage(0.1), usage(0.2)))).toEqual({ usd: 0.30000000000000004, estimate: false });
});

test("Claude Code on its own login reports a running total: the largest one, as an estimate", () => {
  const c = threadCost(events(ownLogin, usage(0.05), ownLogin, usage(0.12)));
  expect(c).toEqual({ usd: 0.12, estimate: true });
  expect(formatCost(c)).toBe("≈ $0.12 (estimate)");
});

test("no usage yet costs nothing", () => {
  expect(formatCost(threadCost([]))).toBe("$0.00");
});
