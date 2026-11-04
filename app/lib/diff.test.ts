import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { commitDiff, MAX_LINES_PER_FILE, parsePatch } from "./diff";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pre-k-diff-"));
const git = (...args: string[]) =>
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { cwd: dir, encoding: "utf8" }).trim();

git("init", "-q", "-b", "main");
fs.writeFileSync(path.join(dir, "README.md"), "# repo\n\nline two\nline three\n");
fs.writeFileSync(path.join(dir, "old.txt"), "moving\n".repeat(20));
fs.writeFileSync(path.join(dir, "gone.txt"), "bye\n");
git("add", "-A");
git("commit", "-qm", "init");
fs.writeFileSync(path.join(dir, "README.md"), "# repo\n\nline 2\nline three\n![badge](x)\n");
fs.renameSync(path.join(dir, "old.txt"), path.join(dir, "new.txt"));
fs.rmSync(path.join(dir, "gone.txt"));
fs.writeFileSync(path.join(dir, "added.ts"), "export const a = 1;\n");
git("add", "-A");
git("commit", "-qm", "Add a README badge", "-m", "Made by a test.");
const sha = git("rev-parse", "HEAD");

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("commitDiff", () => {
  it("reads the commit's message and every changed file", async () => {
    const d = await commitDiff({ dir, sha, token: null });

    expect(d && { subject: d.subject, body: d.body, author: d.author }).toEqual({
      subject: "Add a README badge",
      body: "Made by a test.",
      author: "t",
    });
    const byPath = new Map(d?.files.map((f) => [f.path, f]));

    expect(byPath.get("added.ts")).toMatchObject({ status: "added", additions: 1, deletions: 0 });
    expect(byPath.get("gone.txt")).toMatchObject({ status: "deleted", additions: 0, deletions: 1 });
    expect(byPath.get("new.txt")).toMatchObject({ status: "renamed", from: "old.txt", hunks: [] });
    expect(byPath.get("README.md")).toMatchObject({ status: "modified", additions: 2, deletions: 1 });
  });

  it("numbers lines in the old and new file", async () => {
    const readme = (await commitDiff({ dir, sha, token: null }))?.files.find((f) => f.path === "README.md");

    expect(readme?.hunks[0]?.lines).toEqual([
      { kind: "context", text: "# repo", old: 1, new: 1 },
      { kind: "context", text: "", old: 2, new: 2 },
      { kind: "removed", text: "line two", old: 3 },
      { kind: "added", text: "line 2", new: 3 },
      { kind: "context", text: "line three", old: 4, new: 4 },
      { kind: "added", text: "![badge](x)", new: 5 },
    ]);
  });

  it("answers null for a commit the clone doesn't have and can't fetch", async () => {
    expect(await commitDiff({ dir, sha: "f".repeat(40), token: null })).toBeNull();
  });
});

describe("parsePatch", () => {
  it("keeps counting past the per-file limit but stops keeping lines", () => {
    const n = MAX_LINES_PER_FILE + 10;
    const patch = [
      "diff --git a/big.txt b/big.txt",
      "new file mode 100644",
      `@@ -0,0 +1,${n} @@`,
      ...Array.from({ length: n }, (_, i) => `+${i}`),
    ].join("\n");
    const [big] = parsePatch(patch);

    expect(big).toMatchObject({ additions: n, truncated: true });
    expect(big?.hunks[0]?.lines).toHaveLength(MAX_LINES_PER_FILE);
  });

  it("marks binary files", () => {
    const [img] = parsePatch(
      ["diff --git a/logo.png b/logo.png", "new file mode 100644", "Binary files /dev/null and b/logo.png differ"].join("\n"),
    );

    expect(img).toMatchObject({ path: "logo.png", status: "added", binary: true, hunks: [] });
  });
});
