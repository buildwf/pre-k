import { defineMain } from "point/app";
import { z } from "zod";
import { createRelay } from "./threads/relay";

const pointThreads = z.array(
  z.object({
    id: z.string(),
    status: z.enum(["starting", "running", "parked", "paused", "idle", "stopped", "interrupted"]),
  }),
);

const ac = new AbortController();

export default defineMain({
  // Project chat hears about its threads (#16): when a thread a coordinator started needs the person, finishes or
  // opens a PR, queue one line into that project's coordinator, recorded as from the thread, never steering it.
  ready({ rpc, collections, stores }) {
    const relay = createRelay();
    let status = new Map<string, z.infer<typeof pointThreads>[number]["status"]>();
    let seeded = false;

    const tick = async () => {
      const outputs = collections.all("thread-outputs");
      const threads = collections.all("threads").map((t) => ({
        threadId: t.threadId,
        projectId: t.projectId,
        title: t.title,
        endedAs: t.endedAs,
        prs: outputs.filter((o) => o.threadId === t.threadId),
      }));
      const notes = relay(threads, status, { seed: !seeded });
      seeded = true;
      for (const n of notes) {
        const coordinator = stores.get("coordinators").threads[n.projectId];
        if (!coordinator) continue;
        await rpc.call("agents.send", { threadId: coordinator, text: n.text, turn: "queue", by: `thread:${n.threadId}` });
      }
    };

    collections.subscribe("thread-outputs", () => void tick());
    collections.subscribe("threads", () => void tick());
    // The stream ends with an error when the agents daemon restarts; open it again a second later.
    void (async () => {
      while (!ac.signal.aborted) {
        try {
          for await (const list of rpc.stream("agents.watchThreads", {}, { signal: ac.signal })) {
            status = new Map(pointThreads.parse(list).map((t) => [t.id, t.status]));
            await tick();
          }
        } catch {
          if (ac.signal.aborted) return;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    })();
  },
  dispose() {
    ac.abort();
  },
});
