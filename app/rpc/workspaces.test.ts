import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { testClient } from "point/rpc/testing";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import outputs from "../collections/thread-outputs.collection";
import threads from "../collections/threads.collection";
import { ensureClone } from "../lib/checkout";
import { fakeGitHub, TEST_REPO } from "../testing/fake-github";
import workspaces from "./workspaces";

const repo = TEST_REPO.full_name;
const sh = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

describe("workspaces", () => {
  const remotes = fakeGitHub({ repos: [TEST_REPO] });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pre-k-workspaces-"));
  const checkoutPath = path.join(root, "checkouts", repo);
  const open: { close: () => void }[] = [];
  const projects: Record<string, unknown> = {
    p1: { id: "p1", repo, defaultBranch: "main", checkoutPath },
    bare: { id: "bare" },
    missing: { id: "missing", repo, defaultBranch: "main", checkoutPath: path.join(root, "nope") },
  };
  const client = () => {
    const c = testClient(workspaces, {
      collections: { threads, "thread-outputs": outputs },
      rpc: {
        call: async (p: string, input: unknown) => {
          const id = p === "projects.get" && typeof input === "object" && input && "id" in input ? String(input.id) : "";
          const row = projects[id];
          return row
            ? { ok: true as const, value: row }
            : { ok: false as const, failure: { code: "NOT_FOUND", detail: { id } } };
        },
      },
    });
    open.push(c);
    return c;
  };

  beforeAll(async () => {
    await ensureClone({ url: remotes.remote(repo), dir: checkoutPath, token: null });
  });
  afterEach(() => open.splice(0).forEach((c) => c.close()));
  afterAll(() => {
    remotes.cleanup();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("gives each thread a branch and worktree off the default branch", async () => {
    const { rpc } = client();
    const a = await rpc.prepare({ projectId: "p1", title: "Fix the README" });
    const b = await rpc.prepare({ projectId: "p1", title: "Fix the README" });

    if (!a.ok || !b.ok) throw new Error("prepare failed");
    expect(a.value).toMatchObject({ repo, baseBranch: "main", branch: expect.stringMatching(/^pre-k\/fix-the-readme-[0-9a-f]{4}$/) });
    expect(a.value.branch).not.toBe(b.value.branch);
    expect(a.value.worktree).toBe(path.join(`${checkoutPath}.worktrees`, a.value.branch.slice("pre-k/".length)));
    expect(sh(a.value.worktree, "rev-parse", "--abbrev-ref", "HEAD")).toBe(a.value.branch);
    expect(sh(a.value.worktree, "rev-parse", "HEAD")).toBe(sh(checkoutPath, "rev-parse", "origin/main"));
  });

  it("says why it can't: no repo, not cloned", async () => {
    const { rpc } = client();
    const none = await rpc.prepare({ projectId: "bare", title: "x" });
    const unknown = await rpc.prepare({ projectId: "who", title: "x" });
    const missing = await rpc.prepare({ projectId: "missing", title: "x" });

    expect(none.ok ? null : none.failure.code).toBe("NO_REPO");
    expect(unknown.ok ? null : unknown.failure.code).toBe("NO_REPO");
    expect(missing.ok ? null : missing.failure).toEqual({ code: "NOT_CLONED", detail: { repo } });
  });

  it("releases a clean worktree, keeps one with work, and refuses other folders", async () => {
    const { rpc } = client();
    const clean = await rpc.prepare({ projectId: "p1", title: "Clean" });
    const busy = await rpc.prepare({ projectId: "p1", title: "Busy" });

    if (!clean.ok || !busy.ok) throw new Error("prepare failed");
    fs.writeFileSync(path.join(busy.value.worktree, "WIP.md"), "wip\n");

    expect((await rpc.release({ worktree: clean.value.worktree })).ok).toBe(true);
    expect(fs.existsSync(clean.value.worktree)).toBe(false);
    const kept = await rpc.release({ worktree: busy.value.worktree });
    expect(kept.ok && kept.value).toEqual({ removed: false, reason: "uncommitted" });
    expect(fs.existsSync(busy.value.worktree)).toBe(true);
    const other = await rpc.release({ worktree: root });
    expect(other.ok ? null : other.failure.code).toBe("NOT_A_WORKTREE");
  });
});
