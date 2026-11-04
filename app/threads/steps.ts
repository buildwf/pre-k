import type { Message } from "point/agent";
import { z } from "zod";

import type { WorkStep } from "../ui/WorkSteps";
import { toolLine } from "./toolLine";

export type StepKind = WorkStep["kind"];
type Step = WorkStep;

export type TranscriptItem =
  | { item: "message"; message: Message }
  | { item: "steps"; id: string; steps: Step[]; running: boolean };

const fields = z
  .object({
    command: z.union([z.string(), z.array(z.string())]),
    cmd: z.union([z.string(), z.array(z.string())]),
    file_path: z.string(),
    path: z.string(),
    notebook_path: z.string(),
    pattern: z.string(),
    query: z.string(),
    url: z.string(),
    description: z.string(),
  })
  .partial();

const verbs: Record<StepKind, [done: string, running: string]> = {
  command: ["Ran", "Running"],
  edit: ["Edited", "Editing"],
  read: ["Read", "Reading"],
  search: ["Searched", "Searching"],
  web: ["Fetched", "Fetching"],
  tool: ["Used", "Using"],
};

/** The first line of a value, at most `max` characters. */
export const oneLine = (s: string, max = 120) => {
  const line = s.trim().split("\n")[0] ?? "";
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

/** A file path as the person knows it: inside the thread's worktree, relative to it. */
const relative = (file: string, cwd: string | undefined) =>
  cwd && file.startsWith(`${cwd.replace(/\/$/, "")}/`) ? file.slice(cwd.replace(/\/$/, "").length + 1) : file;

/**
 * Names one tool call: Claude Code's Bash, Edit, Write, Read, Grep, Glob, WebFetch and WebSearch; Codex's shell and
 * apply_patch; Point's app tools (`mcp__point__<tool>`). Anything else is "Used <name>".
 */
export function describeTool(name: string, input: unknown, cwd?: string): { kind: StepKind; target: string } {
  const f = fields.safeParse(input ?? {}).data ?? {};
  const command = f.command ?? f.cmd;
  const text = Array.isArray(command) ? command.join(" ") : command;
  const file = f.file_path ?? f.notebook_path ?? f.path;
  const base = name.replace(/^mcp__[^_]+__/, "");
  switch (base) {
    case "Bash":
    case "shell":
    case "exec_command":
    case "local_shell":
      return { kind: "command", target: oneLine(text ?? f.description ?? base) };
    case "Edit":
    case "MultiEdit":
    case "Write":
    case "NotebookEdit":
    case "apply_patch":
    case "edit":
    case "write":
      return { kind: "edit", target: file ? relative(file, cwd) : patchFile(text) ?? "files" };
    case "Read":
    case "read":
      return { kind: "read", target: file ? relative(file, cwd) : "a file" };
    case "Grep":
    case "Glob":
    case "grep":
    case "glob":
      return { kind: "search", target: oneLine(f.pattern ?? f.query ?? "the files") };
    case "WebFetch":
    case "WebSearch":
    case "webfetch":
      return { kind: "web", target: oneLine(f.url ?? f.query ?? "the web") };
    default: {
      // Any other tool: its name and what its input tells (Task's description, a custom tool's first string).
      const line = toolLine(base, input);
      return { kind: "tool", target: line ? `${base} · ${oneLine(line)}` : base };
    }
  }
}

/** The first file a patch names (`*** Update File: a.ts`), for Codex's apply_patch. */
const patchFile = (patch: string | undefined) => patch?.match(/\*\*\* (?:Update|Add|Delete) File: (.+)/)?.[1]?.trim();

/** A tool's output as text: a string as it is, anything else as JSON. */
const outputText = (output: unknown) =>
  output === undefined ? undefined : (z.string().safeParse(output).data ?? JSON.stringify(output, null, 2));

/**
 * The transcript as the thread view shows it: each run of consecutive tool calls becomes one group of steps, between
 * the messages around it. `failed` holds the ids of tool calls that ended in an error.
 */
export function groupTranscript(
  messages: readonly Message[],
  failed: ReadonlySet<string> = new Set(),
  cwd?: string,
): TranscriptItem[] {
  const items: TranscriptItem[] = [];
  for (const m of messages) {
    if (m.role !== "tool") {
      items.push({ item: "message", message: m });
      continue;
    }
    const { kind, target } = describeTool(m.name ?? "tool", m.input, cwd);
    const output = m.done ? outputText(m.output) : undefined;
    const step: Step = {
      id: m.id,
      kind,
      verb: verbs[kind][m.done ? 0 : 1],
      target,
      ...(output !== undefined ? { output } : {}),
      running: !m.done,
      failed: failed.has(m.id),
    };
    const last = items.at(-1);
    if (last?.item === "steps") {
      last.steps.push(step);
      last.running ||= step.running;
    } else items.push({ item: "steps", id: m.id, steps: [step], running: step.running });
  }
  return items;
}

/** "Ran 2 commands, edited 3 files": what a finished group did, by kind. Each edited file counts once. */
export function summarize(steps: readonly Step[]): string {
  const count = (kind: StepKind) => steps.filter((s) => s.kind === kind);
  const files = new Set(count("edit").map((s) => s.target)).size;
  const parts = [
    plural(count("command").length, "Ran", "command"),
    plural(files, "Edited", "file"),
    plural(count("read").length, "Read", "file"),
    plural(count("search").length, "Searched", "time"),
    plural(count("web").length, "Fetched", "page"),
    plural(count("tool").length, "Used", "tool"),
  ].filter((p): p is string => p !== undefined);
  const text = parts.map((p, i) => (i === 0 ? p : p.charAt(0).toLowerCase() + p.slice(1))).join(", ");
  const failures = steps.filter((s) => s.failed).length;
  return failures ? `${text} · ${failures} failed` : text;
}

const plural = (n: number, verb: string, noun: string) =>
  n === 0 ? undefined : `${verb} ${n} ${noun}${n === 1 ? "" : "s"}`;
