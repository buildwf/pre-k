import { z } from "zod";

type Call = (path: string, input: unknown) => Promise<{ ok: boolean; value?: unknown }>;

/**
 * The project an agent thread belongs to: the project on its `threads` row (a builder thread pre-k started), else
 * the project it coordinates (Coordinator chat's `coordinator.projectOf`). Undefined for a thread in no project.
 */
export async function projectOfThread(threadId: string, recorded: string | undefined, call: Call) {
  if (recorded) return recorded;
  const r = await call("coordinator.projectOf", { threadId }).catch(() => undefined);
  const id = r?.ok ? z.string().min(1).safeParse(r.value) : undefined;
  return id?.success ? id.data : undefined;
}

/** Point refuses a longer `context` on agents.start (it never truncates). */
export const CONTEXT_LIMIT = 32_000;

/** The longest instructions a project takes, so instructions plus some memory always fit CONTEXT_LIMIT. */
export const INSTRUCTIONS_LIMIT = 16_000;

/**
 * What an agent reads before it starts: the project's instructions, then what earlier threads saved, newest kept
 * when they don't all fit CONTEXT_LIMIT (the rest stay readable with `memory list`).
 */
export function contextText(
  project: { name: string; instructions: string; repo?: string | undefined; defaultBranch?: string | undefined },
  notes: { text: string; savedBy: string; at: number }[],
) {
  const head = [`# Project: ${project.name}`];
  if (project.repo) head.push(`Repository: ${project.repo}${project.defaultBranch ? ` (base ${project.defaultBranch})` : ""}`);
  head.push("", "## Project instructions", project.instructions.trim() || "(none)", "", "## Project memory");
  if (notes.length === 0) return [...head, "(nothing saved yet)"].join("\n");

  const omittedLine = (n: number) => `(${n} older note${n === 1 ? "" : "s"} left out for length: run "$POINT_CLI" memory list)`;
  const budget = CONTEXT_LIMIT - head.join("\n").length - omittedLine(notes.length).length - 2;
  const kept: string[] = [];
  let used = 0;
  for (const n of [...notes].sort((a, b) => b.at - a.at)) {
    const line = `- ${n.text}`;
    if (used + line.length + 1 > budget) break;
    kept.unshift(line);
    used += line.length + 1;
  }
  const omitted = notes.length - kept.length;

  return [...head, ...(omitted ? [omittedLine(omitted)] : []), ...kept].join("\n");
}
