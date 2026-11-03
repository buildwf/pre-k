import { defineCollection } from "point/app";
import { z } from "zod";

const repo = z.string().regex(/^[^/\s]+\/[^/\s]+$/);
const common = {
  id: z.string().min(1),
  threadId: z.string().min(1),
  repo,
  url: z.string().url().optional(),
  title: z.string().optional(),
  createdAt: z.number(),
};

// What a thread delivered, appended by `threads report`: a pull request it opened, or a commit it landed on a branch
// (no PR). The key is derived from the output's identity (outputKey in app/threads/state.ts), so reporting the same
// one twice leaves one row.
export default defineCollection({
  schema: z.discriminatedUnion("kind", [
    z.object({ ...common, kind: z.literal("pr"), number: z.number().int().positive() }),
    z.object({
      ...common,
      kind: z.literal("commit"),
      sha: z.string().regex(/^[0-9a-f]{7,40}$/),
      branch: z.string().min(1),
    }),
  ]),
  key: "id",
});
