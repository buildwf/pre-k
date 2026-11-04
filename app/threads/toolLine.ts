import { z } from "zod";

// The field of each common tool's input that says what the call did, so a tool line reads "Bash git status" instead of
// the input's JSON. Other tools show their first short string field.
const telling: Record<string, string> = {
  Bash: "command",
  Read: "file_path",
  Write: "file_path",
  Edit: "file_path",
  MultiEdit: "file_path",
  NotebookEdit: "notebook_path",
  Grep: "pattern",
  Glob: "pattern",
  WebFetch: "url",
  WebSearch: "query",
  Task: "description",
};

const fields = z.record(z.string(), z.unknown());

/** One line saying what a tool call did: the input field that tells it, else its first string, else nothing. */
export function toolLine(name: string | undefined, input: unknown): string {
  const parsed = fields.safeParse(input);
  if (!parsed.success) return typeof input === "string" ? firstLine(input) : "";
  const key = name ? telling[name] : undefined;
  const value = key ? parsed.data[key] : undefined;
  if (typeof value === "string") return firstLine(value);
  const first = Object.values(parsed.data).find((v): v is string => typeof v === "string" && v.length > 0);
  return first ? firstLine(first) : "";
}

const firstLine = (text: string) => {
  const lines = text.trim().split("\n");
  return lines.length > 1 ? `${lines[0]} …` : (lines[0] ?? "");
};
