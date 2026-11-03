import { z } from "zod";

const command = z.object({ command: z.string() });
const reply = z.object({ threadId: z.string().min(1), branch: z.string().optional() });

/** What one coordinator tool call did about starting a thread. */
export type ThreadStart = { started: string } | { failed: string };

// Electron and Chromium log lines (`[123:1103/194030.4:ERROR:dbus/bus.cc:406] ...`) that say nothing about pre-k.
const noise = /^\[\d+:\d+\/[\d.]+:(ERROR|WARNING|INFO):/;

/**
 * The thread a coordinator's tool call started, or why it couldn't. The coordinator starts threads by running
 * `"$POINT_CLI" threads start ... --json` (#13), so project chat finds them in its own transcript: a shell call whose
 * command is `threads start`; its output is the procedure's JSON reply, or the failure the CLI printed.
 */
export function threadStart(input: unknown, output: unknown): ThreadStart | undefined {
  const cmd = command.safeParse(input);
  if (!cmd.success || !/\bthreads start\b/.test(cmd.data.command)) return undefined;
  const text = z.string().safeParse(output);
  if (!text.success) return undefined;
  const start = text.data.indexOf("{");
  if (start >= 0) {
    try {
      const parsed = reply.safeParse(JSON.parse(text.data.slice(start)));
      if (parsed.success) return { started: parsed.data.threadId };
    } catch {
      // not the reply: report it as a failure below
    }
  }
  return { failed: quietLines(text.data).at(-1) ?? "the command printed nothing" };
}

/** A command's or error's lines without blank lines and Electron's log noise. */
export function quietLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^could not start a thread:\s*/, "").trim())
    .filter((l) => l && !noise.test(l));
}

/** The thread a call started, or undefined. */
export function startedThread(input: unknown, output: unknown): string | undefined {
  const r = threadStart(input, output);
  return r && "started" in r ? r.started : undefined;
}
