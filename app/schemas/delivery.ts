import { z } from "zod";

/** A pull request a thread produced: what `thread_outputs` (kind "pr") records. */
export const PullRequestRef = z.object({
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  number: z.number().int().positive(),
});

/** What the PR card shows, read from GitHub at render time. */
export const PullRequestCardData = PullRequestRef.extend({
  title: z.string(),
  state: z.enum(["open", "draft", "merged", "closed"]),
  head: z.string(),
  base: z.string(),
  headSha: z.string(),
  additions: z.number(),
  deletions: z.number(),
  changedFiles: z.number(),
  url: z.string().url(),
});

export type PullRequestCardData = z.infer<typeof PullRequestCardData>;

/** A commit or branch whose checks to read. */
export const ChecksRef = z.object({ repo: PullRequestRef.shape.repo, ref: z.string().min(1).max(255) });

/** Check runs and commit statuses on a ref, rolled up the way Point's `getChecks` does. */
export const ChecksSummary = z.object({
  state: z.enum(["pending", "success", "failure", "none"]),
  checks: z.array(z.object({ name: z.string(), state: z.enum(["pending", "success", "failure", "none"]), url: z.string().optional() })),
});

export type ChecksSummary = z.infer<typeof ChecksSummary>;

/** A landed commit to show the changes of. */
export const CommitRef = z.object({ repo: PullRequestRef.shape.repo, sha: z.string().regex(/^[0-9a-f]{40}$/) });

const DiffLine = z.object({
  kind: z.enum(["context", "added", "removed"]),
  text: z.string(),
  /** Line number in the old file (context, removed) and the new file (context, added). */
  old: z.number().optional(),
  new: z.number().optional(),
});

export const DiffFile = z.object({
  path: z.string(),
  /** The path before a rename. */
  from: z.string().optional(),
  status: z.enum(["added", "modified", "deleted", "renamed"]),
  additions: z.number(),
  deletions: z.number(),
  binary: z.boolean(),
  hunks: z.array(z.object({ header: z.string(), lines: z.array(DiffLine) })),
  /** Lines were left out past the per-file limit. */
  truncated: z.boolean(),
});

/** What one commit changed, read from pre-k's own clone of the repo. */
export const CommitDiff = z.object({
  sha: z.string(),
  subject: z.string(),
  body: z.string(),
  author: z.string(),
  date: z.string(),
  files: z.array(DiffFile),
});

export type DiffFile = z.infer<typeof DiffFile>;
export type CommitDiff = z.infer<typeof CommitDiff>;
