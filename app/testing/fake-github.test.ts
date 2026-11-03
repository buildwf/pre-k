import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { connect } from "point/connectors";
import { github } from "point/connectors/github";
import { afterEach, describe, expect, it } from "vitest";
import { fakeGitHub, TEST_REPO } from "./fake-github";

// The fake must answer in shapes Point's real GitHub connector parses, or tests built on it prove nothing.
describe("fake GitHub", () => {
  const fake = fakeGitHub({ repos: [TEST_REPO] });
  const gh = connect(github, { token: "t", fetch: fake.fetch });
  const repo = TEST_REPO.full_name;

  afterEach(() => fake.cleanup());

  it("answers the built-in connector's reads", async () => {
    expect((await gh.me({})).login).toBe("octo-pre-k");
    expect((await gh.getRepo({ repo })).defaultBranch).toBe("main");
    expect((await gh.listReposPage({})).items.map((r) => r.repo)).toEqual([repo]);
  });

  it("serves a PR summary that follows merges", async () => {
    await fake.fetch(`https://api.github.com/repos/${repo}/pulls`, {
      method: "POST",
      body: JSON.stringify({ title: "T", head: "pre-k/x", base: "main" }),
    });
    expect(await gh.getPullRequestSummary({ repo, number: 1 })).toMatchObject({
      number: 1,
      state: "open",
      merged: false,
      head: "pre-k/x",
      base: "main",
      changedFiles: 1,
    });
    fake.setPull(repo, 1, "merged");
    expect(await gh.getPullRequestSummary({ repo, number: 1 })).toMatchObject({
      state: "closed",
      merged: true,
    });
    expect((await gh.listPullRequestFiles({ repo, number: 1 })).items[0]?.path).toBe("README.md");
  });

  it("404s an unknown repo or PR", async () => {
    await expect(gh.getRepo({ repo: "buildwf/nope" })).rejects.toMatchObject({ status: 404 });
    await expect(gh.getPullRequestSummary({ repo, number: 9 })).rejects.toMatchObject({ status: 404 });
  });

  it("gives a bare remote that clones and takes a push", () => {
    const bare = fake.remote(repo);
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "pre-k-clone-"));
    const git = (...args: string[]) =>
      execFileSync("git", ["-c", "user.name=T", "-c", "user.email=t@example.com", ...args], {
        cwd: work,
        encoding: "utf8",
      });

    try {
      git("clone", "--quiet", bare, ".");
      expect(fs.readFileSync(path.join(work, "README.md"), "utf8")).toContain(repo);
      git("switch", "--quiet", "-c", "pre-k/y");
      fs.writeFileSync(path.join(work, "x.txt"), "x\n");
      git("add", "x.txt");
      git("commit", "--quiet", "-m", "x");
      git("push", "--quiet", "origin", "pre-k/y");
      expect(git("ls-remote", "--heads", bare, "pre-k/y")).toContain("refs/heads/pre-k/y");
      expect(fake.remote(repo)).toBe(bare);
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  });
});
