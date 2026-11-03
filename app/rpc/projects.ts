import { randomUUID } from "node:crypto";
import { defineRouter, procedure } from "point/app";
import { z } from "zod";
import { contextText, INSTRUCTIONS_LIMIT, projectOfThread } from "../projects/caller";
import { project, projectChange } from "../schemas/project";
import { callerThread } from "../threads/state";

const notFound = { NOT_FOUND: z.object({ id: z.string() }) };

// Projects, in main. Windows read rows live with useCollection('projects'); these are the writes and the CLI surface
// (`point cli projects create --name ...`), so smoke runs and scripts drive the same path as the window.
export default defineRouter({
  create: procedure
    .input(
      project.pick({ name: true }).extend({
        instructions: z.string().max(INSTRUCTIONS_LIMIT).default(""),
        // A chosen id, so a smoke run or script can name the project in its later steps. Default: a random one.
        id: z.string().trim().min(1).max(64).optional(),
      }),
    )
    .output(z.object({ id: z.string() }))
    .errors({ EXISTS: z.object({ id: z.string() }) })
    .cli()
    .handler(async ({ input, collections, fail }) => {
      const now = Date.now();
      const id = input.id ?? randomUUID();

      if (collections.get("projects", id)) return fail("EXISTS", { id });

      await collections.upsert("projects", [
        { id, name: input.name, instructions: input.instructions, createdAt: now, lastOpenedAt: now },
      ]);

      return { id };
    }),

  // Changes only the fields given, so Project setup's edits never clear the GitHub fields and the reverse.
  update: procedure
    .input(projectChange.extend({ instructions: z.string().max(INSTRUCTIONS_LIMIT).optional() }))
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

  // A project's standing context, always within Point's limit for agents.start's `context`. Main passes it when it
  // starts a thread (`rpc.call("projects.context", { projectId })`); an agent can re-read it, with memory saved since,
  // through `"$POINT_CLI" projects context`, where the project comes from its thread. The CLI names it with --projectId.
  context: procedure
    .input(z.object({ projectId: z.string().min(1).optional() }).default({}))
    .output(z.string())
    .errors({ NOT_IN_PROJECT: z.object({}) })
    .tool()
    .cli()
    .handler(async ({ input, caller, collections, rpc, fail }) => {
      const thread = callerThread(caller);
      const projectId = thread
        ? await projectOfThread(thread, collections.get("threads", thread)?.projectId, rpc.call)
        : input.projectId;
      const row = projectId ? collections.get("projects", projectId) : undefined;

      if (!row) return fail("NOT_IN_PROJECT", {});

      return contextText(row, collections.all("memory").filter((n) => n.projectId === row.id));
    }),
});
