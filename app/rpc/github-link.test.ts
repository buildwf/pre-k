import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ConnectorError } from "point/connectors";
import { fakeConnector } from "point/connectors/testing";
import { testClient } from "point/rpc/testing";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import githubConnector from "../connectors/github.connector";
import { fakeGitHub, TEST_REPO } from "../testing/fake-github";
import github from "./github";

const repo = TEST_REPO.full_name;

describe("github.linkRepo", () => {
  const remotes = fakeGitHub({ repos: [TEST_REPO] });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pre-k-link-"));
  const updates: unknown[] = [];
  const open: { close: () => void }[] = [];
  const gh = fakeConnector(githubConnector, {
    getRepo: ({ repo: r }: { repo: string }) => {
      if (r !== repo) throw new ConnectorError("github", 404, "Not Found");
      return {
        repo,
        description: null,
        private: false,
        defaultBranch: "main",
        url: `https://github.com/${repo}`,
        stars: 0,
        openIssues: 0,
        pushedAt: null,
      };
    },
  });
  const client = () => {
    const c = testClient(github, {
      connectors: [gh],
      rpc: {
        call: async (p: string, input: unknown) => {
          updates.push({ p, input });
          return typeof input === "object" && input && "id" in input && input.id === "p1"
            ? { ok: true as const, value: "updated" }
            : { ok: false as const, failure: { code: "NOT_FOUND", detail: {} } };
        },
      },
    });
    open.push(c);
    return c.rpc;
  };

  beforeAll(() => {
    process.env.PRE_K_CHECKOUTS = path.join(root, "checkouts");
    process.env.PRE_K_GIT_REMOTES = path.dirname(remotes.remote(repo));
  });
  afterEach(() => open.splice(0).forEach((c) => c.close()));
  afterAll(() => {
    delete process.env.PRE_K_CHECKOUTS;
    delete process.env.PRE_K_GIT_REMOTES;
    remotes.cleanup();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("clones the repo into the app's folder and stores it on the project", async () => {
    const rpc = client();
    const dir = path.join(root, "checkouts", "buildwf", "pre-k-playground");
    const r = await rpc.linkRepo({ projectId: "p1", repo });

    expect(r.ok && r.value).toEqual({ repo, defaultBranch: "main", checkoutPath: dir });
    expect(fs.readFileSync(path.join(dir, "README.md"), "utf8")).toContain(repo);
    expect(updates.at(-1)).toEqual({
      p: "projects.update",
      input: {
        id: "p1",
        repo,
        defaultBranch: "main",
        private: false,
        htmlUrl: `https://github.com/${repo}`,
        checkoutPath: dir,
      },
    });
    // Linking again fetches into the same clone.
    expect((await rpc.linkRepo({ projectId: "p1", repo })).ok).toBe(true);
  });

  it("says when the token can't see the repo, or the project is gone", async () => {
    const rpc = client();
    const hidden = await rpc.linkRepo({ projectId: "p1", repo: "buildwf/secret" });
    const gone = await rpc.linkRepo({ projectId: "nope", repo });

    expect(hidden.ok ? null : hidden.failure).toEqual({ code: "REPO_NOT_VISIBLE", detail: { repo: "buildwf/secret" } });
    expect(gone.ok ? null : gone.failure.code).toBe("NO_PROJECT");
  });
});
