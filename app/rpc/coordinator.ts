import { defineRouter, procedure, type MainCalls } from "point/app";
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

const githubMe = z.object({ login: z.string(), name: z.string().nullable() });

async function personName(set: string | undefined, rpc: MainCalls) {
  const chosen = set?.trim();
  if (chosen) return { name: chosen, from: "settings" as const };
  const me = await rpc.call("github.me", {}).catch(() => undefined);
  const gh = me?.ok ? githubMe.safeParse(me.value) : undefined;
  if (gh?.success) return { name: gh.data.name?.trim() || gh.data.login, from: "github" as const };
  return { name: os.userInfo().username || "you", from: "computer" as const };
}

export default defineRouter({
  // Who the person in project chat is: the name they set, else their GitHub name or login, else their computer
  // account. Project chat records their messages under it.
  whoami: procedure
    .output(z.object({ name: z.string(), from: z.enum(["settings", "github", "computer"]) }))
    .handler(({ stores, rpc }) => personName(stores.get("settings").name, rpc)),
  // The same name as plain text, for the coordinator: `--requestedBy "$("$POINT_CLI" coordinator name)"`.
  name: procedure
    .output(z.string())
    .tool()
    .cli()
    .handler(async ({ stores, rpc }) => (await personName(stores.get("settings").name, rpc)).name),
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
        // The project's instructions and memory as the thread's standing context (fixed at start; the coordinator
        // refreshes it with `projects context`). A project without them starts with none.
        const context = await rpc.call("projects.context", { projectId: id }).catch(() => undefined);
        const text = context?.ok ? z.string().safeParse(context.value) : undefined;
        const start = () =>
          rpc.call("agents.start", {
            agent: "coordinator",
            cwd,
            ...(text?.success && text.data.trim() ? { context: text.data } : {}),
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
