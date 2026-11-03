import { defineCollection } from "point/app";
import { z } from "zod";

// What a thread produced, appended by `threads report`. The key is derived from the output's identity
// (outputKey in app/threads/state.ts), so reporting the same PR twice leaves one row.
export default defineCollection({
  schema: z.object({
    id: z.string().min(1),
    threadId: z.string().min(1),
    kind: z.enum(["pr"]),
    repo: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
    number: z.number().int().positive(),
    url: z.string().url().optional(),
    title: z.string().optional(),
    createdAt: z.number(),
  }),
  key: "id",
});
