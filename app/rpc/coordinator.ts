import { defineRouter, procedure } from "point/app";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

const projectId = z
  .string()
  .regex(/^[\w-]+$/, "letters, digits, _ and - only")
  .max(64);
const threadRows = z.array(z.object({ id: z.string() }));
const startedId = z.string();
const restarted = z.object({ message: z.literal("agents restarted") });

// The coordinator's own folder: its sandbox confines writes to it.
export const coordinatorFolder = (id: string) =>
  path.join(os.homedir(), ".pre-k", "projects", id, "coordinator");

export default defineRouter({
  // Returns the project's coordinator thread, starting it the first time and again if its thread was removed.
  ensure: procedure
    .input(z.object({ projectId }))
    .output(z.object({ threadId: z.string() }))
    .errors({ AGENT_START_FAILED: z.object({ code: z.string(), detail: z.unknown() }) })
    .handler(async ({ input, stores, rpc, fail }) => {
      const { threads } = stores.get("coordinators");
      const known = threads[input.projectId];
      if (known) {
        let listed = await rpc.call("agents.threads", {});
        if (!listed.ok && restarted.safeParse(listed.failure.detail).success)
          listed = await rpc.call("agents.threads", {});
        // Replace the coordinator only when the daemon says its thread is gone, never on a failed lookup.
        if (!listed.ok || threadRows.parse(listed.value).some((t) => t.id === known))
          return { threadId: known };
      }
      const cwd = coordinatorFolder(input.projectId);
      await fs.mkdir(cwd, { recursive: true });
      const start = () =>
        rpc.call("agents.start", {
          agent: "coordinator",
          cwd,
          persona: { name: "Coordinator", instructions: "The project's coordinator." },
        });
      let started = await start();
      // A call that reaches the agents daemon while it is still coming up fails with "agents restarted"; one retry
      // lands once it is up. Reported to Point; drop this when the bridge holds early calls instead.
      if (!started.ok && restarted.safeParse(started.failure.detail).success) started = await start();
      if (!started.ok) return fail("AGENT_START_FAILED", {
          code: started.failure.code,
          detail: started.failure.detail,
        });
      const threadId = startedId.parse(started.value);
      const latest = stores.get("coordinators");
      await stores.set("coordinators", {
        threads: { ...latest.threads, [input.projectId]: threadId },
      });
      return { threadId };
    }),
});
