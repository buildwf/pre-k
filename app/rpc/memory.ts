import { randomUUID } from "node:crypto";
import { defineRouter, procedure } from "point/app";
import { z } from "zod";
import { projectOfThread } from "../projects/caller";
import { memoryNote } from "../schemas/memory";
import { callerThread } from "../threads/state";

const errors = { NOT_IN_PROJECT: z.object({}), NOT_FOUND: z.object({ id: z.string() }) };

// Project memory. Agents save and read their own project's notes through `"$POINT_CLI" memory save --text ...` and
// `memory list`: an agent's project comes from its thread, never from what it passes. Windows and the CLI name the
// project. Editing and removing are for the person only (no .tool()).
export default defineRouter({
  save: procedure
    .input(memoryNote.pick({ text: true }).extend({ projectId: z.string().min(1).optional() }))
    .output(z.object({ id: z.string() }))
    .errors(errors)
    .tool()
    .cli()
    .handler(async ({ input, caller, collections, rpc, fail }) => {
      const thread = callerThread(caller);
      const projectId = thread
        ? await projectOfThread(thread, collections.get("threads", thread)?.projectId, rpc.call)
        : input.projectId;

      if (!projectId || !collections.get("projects", projectId)) return fail("NOT_IN_PROJECT", {});

      const id = randomUUID();
      await collections.upsert("memory", [{ id, projectId, text: input.text, savedBy: thread ?? "person", at: Date.now() }]);

      return { id };
    }),

  list: procedure
    .input(z.object({ projectId: z.string().min(1).optional() }).default({}))
    .errors(errors)
    .tool()
    .cli()
    .handler(async ({ input, caller, collections, rpc, fail }) => {
      const thread = callerThread(caller);
      const projectId = thread
        ? await projectOfThread(thread, collections.get("threads", thread)?.projectId, rpc.call)
        : input.projectId;

      if (!projectId) return fail("NOT_IN_PROJECT", {});

      return collections
        .all("memory")
        .filter((n) => n.projectId === projectId)
        .sort((a, b) => a.at - b.at);
    }),

  update: procedure
    .input(memoryNote.pick({ id: true, text: true }))
    .errors(errors)
    .cli()
    .handler(async ({ input, collections, fail }) => {
      const row = collections.get("memory", input.id);

      if (!row) return fail("NOT_FOUND", { id: input.id });
      await collections.upsert("memory", [{ ...row, text: input.text }]);

      return "updated";
    }),

  remove: procedure
    .input(z.object({ id: z.string() }))
    .cli()
    .handler(async ({ input, collections }) => {
      await collections.remove("memory", [input.id]);

      return "removed";
    }),
});
