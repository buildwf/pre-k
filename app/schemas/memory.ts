import { z } from "zod";

// A lasting fact about a project that any later thread should know ("tests need pnpm exec install-electron first").
// `savedBy` is the thread that saved it, or "person" for one typed in Project settings.
export const memoryNote = z.object({
  id: z.string(),
  projectId: z.string().min(1),
  text: z.string().trim().min(1, "A note needs text").max(2000),
  savedBy: z.string().min(1),
  at: z.number(),
});

export type MemoryNote = z.infer<typeof memoryNote>;
