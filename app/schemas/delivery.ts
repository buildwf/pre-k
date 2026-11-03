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
