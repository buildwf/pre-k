import { ConnectorError } from "point/connectors";
import { fakeConnector } from "point/connectors/testing";
import { testClient } from "point/rpc/testing";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import delivery from "./delivery";

const summary = (over: Record<string, unknown> = {}) => ({
  number: 12,
  title: "Add a README badge",
  state: "open",
  draft: false,
  merged: false,
  body: null,
  author: "pre-k-agent",
  labels: [],
  assignees: [],
  url: "https://github.com/acme/test-repo/pull/12",
  createdAt: "2026-11-03T18:00:00Z",
  updatedAt: "2026-11-03T18:01:00Z",
  head: "pre-k/add-badge",
  base: "main",
  headSha: "a".repeat(40),
  baseSha: "b".repeat(40),
  headRepo: "acme/test-repo",
  baseRepo: "acme/test-repo",
  additions: 3,
  deletions: 1,
  changedFiles: 1,
  commits: 1,
  ...over,
});

let answer: () => unknown = () => summary();
const github = fakeConnector("github", { getPullRequestSummary: () => answer() });
const { rpc, close } = testClient(delivery, { connectors: [github] });

afterAll(close);
beforeEach(() => {
  github.clear();
  answer = () => summary();
});

describe("delivery.pullRequest", () => {
  it("reads an open PR for the card", async () => {
    const r = await rpc.pullRequest({ repo: "acme/test-repo", number: 12 });

    expect(r.ok && r.value).toEqual({
      repo: "acme/test-repo",
      number: 12,
      title: "Add a README badge",
      state: "open",
      head: "pre-k/add-badge",
      base: "main",
      headSha: "a".repeat(40),
      additions: 3,
      deletions: 1,
      changedFiles: 1,
      url: "https://github.com/acme/test-repo/pull/12",
    });
    expect(github.callsTo("getPullRequestSummary")).toEqual([{ repo: "acme/test-repo", number: 12 }]);
  });

  it("says merged once GitHub says so, and draft for an open draft", async () => {
    answer = () => summary({ state: "closed", merged: true });
    const merged = await rpc.pullRequest({ repo: "acme/test-repo", number: 12 });

    expect(merged.ok && merged.value.state).toBe("merged");

    answer = () => summary({ draft: true });
    const draft = await rpc.pullRequest({ repo: "acme/test-repo", number: 12 });

    expect(draft.ok && draft.value.state).toBe("draft");
  });

  it("fails with NOT_FOUND when GitHub has no such PR", async () => {
    answer = () => {
      throw new ConnectorError("github", 404, "Not Found");
    };
    const r = await rpc.pullRequest({ repo: "acme/test-repo", number: 99 });

    expect(r.ok ? null : r.failure).toEqual({
      code: "NOT_FOUND",
      detail: { repo: "acme/test-repo", number: 99 },
    });
  });
});
