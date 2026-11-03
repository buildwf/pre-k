import { randomUUID } from "node:crypto";
import { defineRouter, procedure } from "point/app";
import { z } from "zod";
import { project, projectChange } from "../schemas/project";

const notFound = { NOT_FOUND: z.object({ id: z.string() }) };

// Projects, in main. Windows read rows live with useCollection('projects'); these are the writes and the CLI surface
// (`point cli projects create --name ...`), so smoke runs and scripts drive the same path as the window.
export default defineRouter({
  create: procedure
    .input(project.pick({ name: true }).extend({ instructions: z.string().default("") }))
    .output(z.object({ id: z.string() }))
    .cli()
    .handler(async ({ input, collections }) => {
      const now = Date.now();
      const id = randomUUID();

      await collections.upsert("projects", [
        { id, name: input.name, instructions: input.instructions, createdAt: now, lastOpenedAt: now },
      ]);

      return { id };
    }),

  // Changes only the fields given, so Project setup's edits never clear the GitHub fields and the reverse.
  update: procedure
    .input(projectChange)
    .errors(notFound)
    .cli()
    .handler(async ({ input, collections, fail }) => {
      const row = collections.get("projects", input.id);

      if (!row) return fail("NOT_FOUND", { id: input.id });

      const changes = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));

      await collections.upsert("projects", [{ ...row, ...changes }]);

      return "updated";
    }),

  // Marks the project as the one in front, so the next launch reopens it.
  open: procedure
    .input(z.object({ id: z.string() }))
    .errors(notFound)
    .cli()
    .handler(async ({ input, collections, fail }) => {
      const row = collections.get("projects", input.id);

      if (!row) return fail("NOT_FOUND", { id: input.id });

      await collections.upsert("projects", [{ ...row, lastOpenedAt: Date.now() }]);

      return "opened";
    }),

  get: procedure
    .input(z.object({ id: z.string() }))
    .errors(notFound)
    .cli()
    .handler(({ input, collections, fail }) => {
      const row = collections.get("projects", input.id);

      return row ?? fail("NOT_FOUND", { id: input.id });
    }),

  // Most recently opened first.
  list: procedure.cli().handler(({ collections }) =>
    collections.all("projects").sort((a, b) => b.lastOpenedAt - a.lastOpenedAt),
  ),
});
