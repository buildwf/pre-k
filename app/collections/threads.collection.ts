import { defineCollection } from "point/app";
import { z } from "zod";

// One row per Point agent thread that pre-k started. Point keeps status, messages and approvals; this row adds what
// Point's thread list doesn't carry: the project, a title, the person's request and the branch it works on.
export default defineCollection({
  schema: z.object({
    threadId: z.string().min(1),
    projectId: z.string().min(1),
    title: z.string().min(1),
    request: z.string(),
    requestedBy: z.string().min(1),
    repo: z.string().optional(),
    baseBranch: z.string().optional(),
    branch: z.string().optional(),
    worktree: z.string().optional(),
    endedAs: z.enum(["done", "failed", "stopped"]).optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
  }),
  key: "threadId",
});
