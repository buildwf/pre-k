import { PullRequestCard } from "./PullRequestCard";

export default { component: PullRequestCard };

const pr = {
  repo: "acme/test-repo",
  number: 12,
  title: "Add a README badge",
  state: "open",
  head: "pre-k/add-badge",
  base: "main",
  headSha: "3f9c2e1a7b8d4c6e5f0a1b2c3d4e5f6a7b8c9d0e",
  additions: 3,
  deletions: 1,
  changedFiles: 1,
  url: "https://github.com/acme/test-repo/pull/12",
} as const;

export const Open = { args: { pr, onRefresh: () => {} } };
export const Merged = { args: { pr: { ...pr, state: "merged" }, onRefresh: () => {} } };
export const Loading = { args: { pr: undefined, loading: true } };
export const NotFound = { args: { pr: undefined, failure: "acme/test-repo#99 is not on GitHub." } };
