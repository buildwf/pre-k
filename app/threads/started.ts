import { z } from "zod";

const command = z.object({ command: z.string() });
const reply = z.object({ threadId: z.string().min(1), branch: z.string().optional() });

/**
 * The thread a coordinator's tool call started, or undefined. The coordinator starts threads by running
 * `"$POINT_CLI" threads start ... --json` (#13), so project chat finds them in its own transcript: a shell call whose
 * command is `threads start` and whose output is the procedure's JSON reply.
 */
export function startedThread(input: unknown, output: unknown): string | undefined {
  const cmd = command.safeParse(input);
  if (!cmd.success || !/\bthreads start\b/.test(cmd.data.command)) return undefined;
  const text = z.string().safeParse(output);
  if (!text.success) return undefined;
  // The reply is the last JSON object the command printed; anything before it is noise (a shell's warnings).
  const start = text.data.indexOf("{");
  if (start < 0) return undefined;
  try {
    const parsed = reply.safeParse(JSON.parse(text.data.slice(start)));
    return parsed.success ? parsed.data.threadId : undefined;
  } catch {
    return undefined;
  }
}
