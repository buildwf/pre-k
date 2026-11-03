import { z } from "zod";

// One project. Project setup owns name, instructions and the timestamps; the GitHub fields are written by the GitHub
// domain (buildwf/pre-k#10) through projects.update.
export const project = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "A project needs a name"),
  instructions: z.string(),
  createdAt: z.number(),
  lastOpenedAt: z.number(),
  repo: z.string().optional(),
  defaultBranch: z.string().optional(),
  private: z.boolean().optional(),
  htmlUrl: z.string().optional(),
  checkoutPath: z.string().optional(),
});

export type Project = z.infer<typeof project>;

// What projects.update takes: the id and any fields to change. Timestamps are main's.
export const projectChange = project.omit({ createdAt: true, lastOpenedAt: true }).partial().required({ id: true });

export type ProjectChange = z.infer<typeof projectChange>;
