import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CommitDiff, DiffFile } from "../schemas/delivery";
import { fetchOrigin } from "./checkout";

const run = promisify(execFile);

/** Lines kept per file; a generated or vendored file past this shows a note instead of thousands of rows. */
export const MAX_LINES_PER_FILE = 1500;
const SEP = "\u001f";

const git = async (dir: string, args: string[]) =>
  (await run("git", ["-c", "core.quotePath=false", ...args], { cwd: dir, maxBuffer: 64 * 1024 * 1024 })).stdout;

/**
 * What commit `sha` changed in the clone at `dir`, parsed from `git show`. A commit the clone doesn't have yet (landed
 * from another machine) is fetched once from origin with `token`.
 */
export async function commitDiff(o: { dir: string; sha: string; token: string | null }): Promise<CommitDiff | null> {
  const has = () =>
    git(o.dir, ["cat-file", "-e", `${o.sha}^{commit}`]).then(
      () => true,
      () => false,
    );

  if (!(await has())) {
    await fetchOrigin({ dir: o.dir, token: o.token }).catch(() => undefined);
    if (!(await has())) return null;
  }

  const meta = await git(o.dir, ["show", "-s", `--format=%H${SEP}%an${SEP}%aI${SEP}%s${SEP}%b`, o.sha]);
  const [sha = o.sha, author = "", date = "", subject = "", body = ""] = meta.split(SEP);
  // First parent for merges; a root commit diffs against the empty tree.
  const patch = await git(o.dir, ["show", "--format=", "--patch", "--find-renames", "--no-color", "--first-parent", "-m", o.sha]);

  return { sha, author, date, subject, body: body.trim(), files: parsePatch(patch) };
}

/** Parse `git show --patch` output into files, hunks and numbered lines. */
export function parsePatch(patch: string): DiffFile[] {
  const files: DiffFile[] = [];
  let file: DiffFile | undefined;
  let kept = 0;
  let oldNo = 0;
  let newNo = 0;

  for (const line of patch.split("\n")) {
    const start = /^diff --git a\/(.+) b\/(.+)$/.exec(line);

    if (start) {
      file = { path: start[2] ?? "", status: "modified", additions: 0, deletions: 0, binary: false, hunks: [], truncated: false };
      files.push(file);
      kept = 0;
      continue;
    }
    if (!file) continue;

    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/.exec(line);

    if (hunk) {
      oldNo = Number(hunk[1]);
      newNo = Number(hunk[2]);
      file.hunks.push({ header: line, lines: [] });
      continue;
    }

    const current = file.hunks.at(-1);

    if (!current) {
      if (line.startsWith("new file mode")) file.status = "added";
      else if (line.startsWith("deleted file mode")) file.status = "deleted";
      else if (line.startsWith("rename from ")) {
        file.status = "renamed";
        file.from = line.slice("rename from ".length);
      } else if (line.startsWith("Binary files ")) file.binary = true;
      continue;
    }

    const kind = line[0] === "+" ? "added" : line[0] === "-" ? "removed" : line[0] === " " ? "context" : undefined;

    if (!kind) continue; // "\ No newline at end of file", or the trailing empty line
    if (kind === "added") file.additions++;
    if (kind === "removed") file.deletions++;
    if (kept >= MAX_LINES_PER_FILE) {
      file.truncated = true;
    } else {
      kept++;
      current.lines.push({
        kind,
        text: line.slice(1),
        ...(kind !== "added" ? { old: oldNo } : {}),
        ...(kind !== "removed" ? { new: newNo } : {}),
      });
    }
    if (kind !== "added") oldNo++;
    if (kind !== "removed") newNo++;
  }

  return files;
}
