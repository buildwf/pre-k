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
// A call that reaches the agents daemon while it is still coming up fails with "agents restarted"; one retry lands
// once it is up. Drop the retries when buildwf/cloudflare-point#674 makes the bridge hold early calls.
const restarted = z.object({ message: z.literal("agents restarted") });

const startFailure = z.object({ code: z.string(), detail: z.unknown() });
type Outcome = { threadId: string } | { failure: z.infer<typeof startFailure> };

// Starts in flight, per project, so overlapping calls (two windows opening one project) share one coordinator.
const starting = new Map<string, Promise<Outcome>>();

// The coordinator's own folder: its sandbox confines writes to it.
export const coordinatorFolder = (id: string) =>
  path.join(os.homedir(), ".pre-k", "projects", id, "coordinator");

export default defineRouter({
  // Which project a coordinator thread belongs to. Main-only: threads.start and threads.list resolve an agent caller
  // with it, so the coordinator never passes its own project id.
  projectOf: procedure
    .trust("main")
    .input(z.object({ threadId: z.string() }))
    .output(z.string())
    .errors({ NOT_A_COORDINATOR: z.object({ threadId: z.string() }) })
    .handler(({ input, stores, fail }) => {
      const found = Object.entries(stores.get("coordinators").threads).find(
        ([, threadId]) => threadId === input.threadId,
      );
      return found ? found[0] : fail("NOT_A_COORDINATOR", { threadId: input.threadId });
    }),
  // Returns the project's coordinator thread, starting it the first time and again if its thread was removed.
  ensure: procedure
    .input(z.object({ projectId }))
    .output(z.object({ threadId: z.string() }))
    .errors({ AGENT_START_FAILED: startFailure })
    .handler(async ({ input, stores, rpc, fail }) => {
      const id = input.projectId;
      const run = async (): Promise<Outcome> => {
        const known = stores.get("coordinators").threads[id];
        if (known) {
          let listed = await rpc.call("agents.threads", {});
          if (!listed.ok && restarted.safeParse(listed.failure.detail).success)
            listed = await rpc.call("agents.threads", {});
          // Replace the coordinator only when the daemon says its thread is gone, never on a failed lookup.
          if (!listed.ok || threadRows.parse(listed.value).some((t) => t.id === known))
            return { threadId: known };
        }
        const cwd = coordinatorFolder(id);
        await fs.mkdir(cwd, { recursive: true });
        const start = () =>
          rpc.call("agents.start", {
            agent: "coordinator",
            cwd,
            persona: { name: "Coordinator", instructions: "The project's coordinator." },
          });
        let started = await start();
        if (!started.ok && restarted.safeParse(started.failure.detail).success) started = await start();
        if (!started.ok) return { failure: started.failure };
        const threadId = startedId.parse(started.value);
        const latest = stores.get("coordinators");
        await stores.set("coordinators", { threads: { ...latest.threads, [id]: threadId } });
        return { threadId };
      };
      let pending = starting.get(id);
      if (!pending) {
        pending = run().finally(() => starting.delete(id));
        starting.set(id, pending);
      }
      const outcome = await pending;
      if ("failure" in outcome)
        return fail("AGENT_START_FAILED", {
          code: outcome.failure.code,
          detail: outcome.failure.detail,
        });
      return outcome;
    }),
});
