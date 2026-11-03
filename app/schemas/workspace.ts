import { z } from "zod";

// A thread's branch and worktree (pre-k#12): what workspaces.prepare answers and threads.start records.
export const preparedWorkspace = z.object({
  repo: z.string(),
  baseBranch: z.string(),
  branch: z.string(),
  worktree: z.string(),
});

export type PreparedWorkspace = z.infer<typeof preparedWorkspace>;

// What releasing a worktree did: removed, or kept because it holds work GitHub doesn't have yet.
export const releaseResult = z.object({
  removed: z.boolean(),
  reason: z.enum(["uncommitted", "unpushed"]).optional(),
});

export type ReleaseResult = z.infer<typeof releaseResult>;
