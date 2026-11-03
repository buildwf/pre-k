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

/** What an agent reads before it starts: the project's instructions, then what earlier threads saved. */
export function contextText(
  project: { name: string; instructions: string; repo?: string | undefined; defaultBranch?: string | undefined },
  notes: { text: string; savedBy: string; at: number }[],
) {
  const lines = [`# Project: ${project.name}`];
  if (project.repo) lines.push(`Repository: ${project.repo}${project.defaultBranch ? ` (base ${project.defaultBranch})` : ""}`);
  lines.push("", "## Project instructions", project.instructions.trim() || "(none)", "", "## Project memory");
  if (notes.length === 0) lines.push("(nothing saved yet)");
  for (const n of [...notes].sort((a, b) => a.at - b.at)) lines.push(`- ${n.text}`);
  return lines.join("\n");
}
