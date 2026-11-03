// OpenCode: after each edit, write or patch, run `point check` (Point's rules, no types) and append any problems to the
// tool's result, so the model reads what to fix in the same turn. The tool's arguments go to the script as a hook's JSON,
// so the report is about the files this edit touched. When the session goes idle, check the whole app with its types and,
// if that fails, prompt the session to fix it. Claude Code and Codex do the same through their PostToolUse and Stop hooks.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const script = fileURLToPath(new URL("../../scripts/agent-check.sh", import.meta.url));

type Content =
  | { type: "text"; text: string }
  | { type: "file"; uri: string; mime: string; name?: string };

type Result = { output?: unknown; content?: string | readonly Content[]; metadata?: unknown };

type After = (
  | { tool: string; status: "completed"; result: Result }
  | { tool: string; status: "error" }
) & { args?: unknown; input?: unknown };

type Event = {
  type: string;
  sessionID?: unknown;
  properties?: { sessionID?: unknown };
  data?: { sessionID?: unknown };
};

type Context = {
  tool: { hook(name: "execute.after", callback: (event: After) => void): Promise<void> };
  event?: { subscribe(options: { signal: AbortSignal }): AsyncIterable<Event> };
  session?: { prompt(input: { sessionID: string; text: string }): Promise<void> };
};

const hookOutput = z.object({
  hookSpecificOutput: z.object({ additionalContext: z.string().optional() }).optional(),
});

const isTextContent = (value: Result["content"]): value is string =>
  z.string().safeParse(value).success;

const context = (stdout: string): string => {
  try {
    return hookOutput.parse(JSON.parse(stdout)).hookSpecificOutput?.additionalContext ?? "";
  } catch {
    return "";
  }
};

export default {
  id: "point.check",
  setup: async (ctx: Context) => {
    await ctx.tool.hook("execute.after", (event) => {
      if (event.status !== "completed" || !["edit", "write", "patch"].includes(event.tool)) return;

      const run = spawnSync("sh", [script], {
        encoding: "utf8",
        input: JSON.stringify({ cwd: process.cwd(), tool_input: event.args ?? event.input ?? {} }),
      });

      // Exit 2 is the edited files' problems; exit 0 with output is the rest of the app's, as context.
      const report =
        run.status === 2 ? run.stderr.trim() : run.status === 0 ? context(run.stdout) : "";

      if (!report) return;
      const text = `\n\n${report}`;
      const { content, output } = event.result;
      event.result = {
        ...event.result,
        content: isTextContent(content)
          ? content + text
          : content
            ? [...content, { type: "text", text }]
            : `${output === undefined ? "" : JSON.stringify(output)}${text}`,
      };
    });
    const { event, session } = ctx;

    if (!event || !session) return undefined;
    // Sessions this plugin has prompted to fix types: the next check there is a continuation, which lets the session
    // stop when the report hasn't changed (as Claude Code's stop_hook_active does), so it can't loop on what it can't fix.
    const prompted = new Set<string>();
    const unverified = new Map<string, string>();
    const controller = new AbortController();
    void (async () => {
      for await (const e of event.subscribe({ signal: controller.signal })) {
        if (e.type !== "session.idle") continue;

        const sessionId = z
          .string()
          .safeParse(e.properties?.sessionID ?? e.sessionID ?? e.data?.sessionID);

        if (!sessionId.success) continue;
        const id = sessionId.data;

        const run = spawnSync("sh", [script, "--stop"], {
          encoding: "utf8",
          input: JSON.stringify({ stop_hook_active: prompted.has(id) }),
        });

        if (run.status !== 2) {
          const report = run.status === 0 ? context(run.stdout) : run.stderr.trim();

          if (report) {
            if (unverified.get(id) !== report)
              console.warn(`point check: verification remains incomplete for ${id}\n${report}`);
            unverified.set(id, report);
          } else {
            prompted.delete(id);
            unverified.delete(id);
          }

          continue;
        }

        prompted.add(id);
        await session.prompt({ sessionID: id, text: run.stderr.trim() });
      }
    })().catch(() => {});

    return () => controller.abort();
  },
};
