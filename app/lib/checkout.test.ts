import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fakeGitHub, TEST_REPO } from "../testing/fake-github";
import {
  addWorktree,
  ensureClone,
  publishBranch,
  releaseWorktree,
  threadBranch,
  tokenEnv,
} from "./checkout";

const author = { name: "pre-k agent", email: "agent@pre-k.invalid" };
const sh = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

describe("checkout", () => {
  const fake = fakeGitHub({ repos: [TEST_REPO] });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pre-k-checkout-"));
  const dir = path.join(root, "checkouts", TEST_REPO.full_name);
  let bare = "";

  beforeAll(async () => {
    bare = fake.remote(TEST_REPO.full_name);
    await ensureClone({ url: bare, dir, token: "secret-token" });
  });
  afterAll(() => {
    fake.cleanup();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("names branches from the title, unique per thread", () => {
    expect(threadBranch("Fix the README's typo!", "ab12")).toBe("pre-k/fix-the-readme-s-typo-ab12");
    expect(threadBranch("???", "ab12")).toBe("pre-k/thread-ab12");
    expect(threadBranch("x".repeat(100), "ab12")).toBe(`pre-k/${"x".repeat(40)}-ab12`);
    expect(threadBranch("same")).not.toBe(threadBranch("same"));
  });

  it("passes a token only through this process's environment", () => {
    const before = Number(process.env.GIT_CONFIG_COUNT ?? 0) || 0;
    const env = tokenEnv("secret-token");

    expect(env.GIT_CONFIG_COUNT).toBe(String(before + 1));
    expect(env[`GIT_CONFIG_KEY_${before}`]).toBe("http.https://github.com/.extraheader");
    expect(env[`GIT_CONFIG_VALUE_${before}`]).toBe(
      `AUTHORIZATION: basic ${Buffer.from("x-access-token:secret-token").toString("base64")}`,
    );
    expect(tokenEnv(null).GIT_CONFIG_COUNT).toBe(process.env.GIT_CONFIG_COUNT);
  });

  it("clones once, then fetches, and never writes the token to disk", async () => {
    await ensureClone({ url: bare, dir, token: "secret-token" });

    expect(fs.readFileSync(path.join(dir, ".git", "config"), "utf8")).not.toContain("secret-token");
    expect(sh(dir, "remote", "get-url", "origin")).toBe(bare);
  });

  it("gives two threads two branches and two worktrees", async () => {
    const a = path.join(root, "wt", "a");
    const b = path.join(root, "wt", "b");

    await addWorktree({ dir, base: "main", branch: "pre-k/a-0001", worktree: a });
    await addWorktree({ dir, base: "main", branch: "pre-k/b-0002", worktree: b });

    expect(sh(a, "rev-parse", "--abbrev-ref", "HEAD")).toBe("pre-k/a-0001");
    expect(sh(b, "rev-parse", "--abbrev-ref", "HEAD")).toBe("pre-k/b-0002");
    await expect(
      addWorktree({ dir, base: "main", branch: "pre-k/a-0001", worktree: path.join(root, "wt", "c") }),
    ).rejects.toThrow(/git worktree failed/);
  });

  it("refuses to publish a branch with no changes", async () => {
    const wt = path.join(root, "wt", "empty");

    await addWorktree({ dir, base: "main", branch: "pre-k/empty-0003", worktree: wt });

    expect(
      await publishBranch({ worktree: wt, branch: "pre-k/empty-0003", base: "main", message: "m", author, token: null }),
    ).toMatchObject({ ok: false, reason: "no-changes" });
    expect(await releaseWorktree({ dir, worktree: wt, branch: "pre-k/empty-0003", base: "main", token: null })).toEqual({
      removed: true,
    });
  });

  it("commits, pushes, and only then lets the worktree go", async () => {
    const wt = path.join(root, "wt", "work");
    const branch = "pre-k/work-0004";

    await addWorktree({ dir, base: "main", branch, worktree: wt });
    fs.writeFileSync(path.join(wt, "NOTES.md"), "from the agent\n");

    expect(await releaseWorktree({ dir, worktree: wt, branch, base: "main", token: null })).toEqual({
      removed: false,
      reason: "uncommitted",
    });

    const r = await publishBranch({ worktree: wt, branch, base: "main", message: "Add notes", author, token: null });

    expect(r).toMatchObject({ ok: true, branch });
    expect(sh(bare, "log", "-1", "--format=%s %an", branch)).toBe("Add notes pre-k agent");

    fs.writeFileSync(path.join(wt, "MORE.md"), "more\n");
    sh(wt, "add", "MORE.md");
    sh(wt, "-c", "user.name=a", "-c", "user.email=a@b.c", "commit", "-q", "-m", "more");
    expect(await releaseWorktree({ dir, worktree: wt, branch, base: "main", token: null })).toEqual({
      removed: false,
      reason: "unpushed",
    });

    await publishBranch({ worktree: wt, branch, base: "main", message: "unused", author, token: null });
    expect(await releaseWorktree({ dir, worktree: wt, branch, base: "main", token: null })).toEqual({ removed: true });
    expect(fs.existsSync(wt)).toBe(false);
  });

  it("reports a rejected push instead of forcing it", async () => {
    const wt = path.join(root, "wt", "race");
    const branch = "pre-k/race-0005";
    const other = path.join(root, "other");

    await addWorktree({ dir, base: "main", branch, worktree: wt });
    sh(root, "clone", "-q", bare, other);
    sh(other, "switch", "-q", "-c", branch);
    fs.writeFileSync(path.join(other, "THEIRS.md"), "theirs\n");
    sh(other, "add", "THEIRS.md");
    sh(other, "-c", "user.name=o", "-c", "user.email=o@p.q", "commit", "-q", "-m", "theirs");
    sh(other, "push", "-q", "origin", branch);

    fs.writeFileSync(path.join(wt, "MINE.md"), "mine\n");
    expect(
      await publishBranch({ worktree: wt, branch, base: "main", message: "mine", author, token: null }),
    ).toMatchObject({ ok: false, reason: "rejected" });
    expect(sh(bare, "log", "-1", "--format=%s", branch)).toBe("theirs");
  });
});
