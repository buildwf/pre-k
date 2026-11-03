import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { newPullRequest } from "../schemas/github";

/**
 * One fake GitHub for every pre-k test and smoke run (pre-k#15). `fetch` answers the REST calls pre-k makes, from
 * in-memory state, so a PR opened is then readable. `remote(repo)` is a local bare git repository to clone from and
 * push to, so git runs for real with no network. Replies use GitHub's field names so the real connector's Zod
 * schemas parse them; `fake-github.test.ts` checks that against `point/connectors/github`.
 */

export interface FakeRepo {
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
}

interface FakePull {
  number: number;
  title: string;
  body: string | null;
  draft: boolean;
  state: "open" | "closed";
  merged_at: string | null;
  head: string;
  base: string;
  created_at: string;
  updated_at: string;
  additions: number;
  deletions: number;
  changed_files: number;
  commits: number;
}

export type FakeFailure = "unauthorized" | "rateLimited";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export function fakeGitHub(o: { login?: string; repos?: FakeRepo[] } = {}) {
  const login = o.login ?? "octo-pre-k";
  const repos = new Map((o.repos ?? []).map((r) => [r.full_name, r]));
  const pulls = new Map<string, FakePull[]>();
  const remotes = new Map<string, string>();
  const calls: { method: string; path: string; body?: unknown }[] = [];
  let failure: FakeFailure | undefined;
  let now = Date.parse("2026-11-03T12:00:00Z");
  const stamp = () => new Date((now += 1000)).toISOString();

  const repoJson = (r: FakeRepo) => ({
    ...r,
    html_url: `https://github.com/${r.full_name}`,
    stargazers_count: 0,
    open_issues_count: (pulls.get(r.full_name) ?? []).filter((p) => p.state === "open").length,
    pushed_at: "2026-11-03T12:00:00Z",
  });

  const pullJson = (repo: string, p: FakePull) => ({
    number: p.number,
    title: p.title,
    body: p.body,
    draft: p.draft,
    state: p.state,
    merged_at: p.merged_at,
    user: { login },
    head: { ref: p.head, sha: SHA, repo: { full_name: repo } },
    base: { ref: p.base, sha: SHA, repo: { full_name: repo } },
    html_url: `https://github.com/${repo}/pull/${p.number}`,
    created_at: p.created_at,
    updated_at: p.updated_at,
    additions: p.additions,
    deletions: p.deletions,
    changed_files: p.changed_files,
    commits: p.commits,
  });

  const notFound = () => json(404, { message: "Not Found" });

  async function handle(method: string, url: URL, body: unknown): Promise<Response> {
    if (failure === "unauthorized") return json(401, { message: "Bad credentials" });
    if (failure === "rateLimited") return json(403, { message: "API rate limit exceeded" });

    const p = url.pathname;

    if (method === "GET" && p === "/user")
      return json(200, { login, name: "Fake Person", html_url: `https://github.com/${login}` });
    if (method === "GET" && p === "/user/repos") return json(200, [...repos.values()].map(repoJson));

    const m = /^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/.exec(p);

    if (!m) return notFound();
    const full = `${decodeURIComponent(m[1] ?? "")}/${decodeURIComponent(m[2] ?? "")}`;
    const repo = repos.get(full);

    if (!repo) return notFound();
    const rest = m[3] ?? "";
    const list = pulls.get(full) ?? [];

    if (method === "GET" && rest === "") return json(200, repoJson(repo));

    if (method === "GET" && rest === "/pulls") {
      const state = url.searchParams.get("state") ?? "open";
      const head = url.searchParams.get("head");

      return json(
        200,
        list
          .filter((x) => state === "all" || x.state === state)
          .filter((x) => !head || head === `${full.split("/")[0]}:${x.head}`)
          .toReversed()
          .map((x) => pullJson(full, x)),
      );
    }

    if (method === "POST" && rest === "/pulls") {
      const parsed = newPullRequest.safeParse(body);

      if (!parsed.success)
        return json(422, { message: "Validation Failed", errors: [{ code: "missing_field" }] });
      const b = parsed.data;
      if (list.some((x) => x.state === "open" && x.head === b.head && x.base === b.base))
        return json(422, {
          message: "Validation Failed",
          errors: [{ message: `A pull request already exists for ${full.split("/")[0]}:${b.head}.` }],
        });
      const created = stamp();
      const pr: FakePull = {
        number: list.length + 1,
        title: b.title,
        body: b.body ?? null,
        draft: b.draft ?? false,
        state: "open",
        merged_at: null,
        head: b.head,
        base: b.base,
        created_at: created,
        updated_at: created,
        additions: 1,
        deletions: 0,
        changed_files: 1,
        commits: 1,
      };

      pulls.set(full, [...list, pr]);

      return json(201, pullJson(full, pr));
    }

    const one = /^\/pulls\/(\d+)(\/files)?$/.exec(rest);
    const pr = one && list.find((x) => x.number === Number(one[1]));

    if (method === "GET" && pr && !one[2]) return json(200, pullJson(full, pr));
    if (method === "GET" && pr && one[2])
      return json(200, [{ filename: "README.md", status: "modified", additions: 1, deletions: 0 }]);

    return notFound();
  }

  const fetchImpl: typeof fetch = async (input, init) => {
    const req = new Request(input, init);
    const url = new URL(req.url);

    if (url.origin !== "https://api.github.com") throw new Error(`fake GitHub: unexpected ${url.origin}`);
    const text = req.method === "GET" ? "" : await req.text();
    const body: unknown = text ? JSON.parse(text) : undefined;

    calls.push({ method: req.method, path: url.pathname + url.search, ...(body !== undefined && { body }) });

    return handle(req.method, url, body);
  };

  return {
    login,
    fetch: fetchImpl,
    calls,
    /** Every request from now on fails this way, until `fail(undefined)`. */
    fail(f: FakeFailure | undefined) {
      failure = f;
    },
    addRepo(r: FakeRepo) {
      repos.set(r.full_name, r);
    },
    pulls(repo: string) {
      return (pulls.get(repo) ?? []).map((p) => pullJson(repo, p));
    },
    /** Move a PR on, as a person on GitHub would. */
    setPull(repo: string, number: number, to: "merged" | "closed" | "open") {
      const pr = (pulls.get(repo) ?? []).find((x) => x.number === number);

      if (!pr) throw new Error(`fake GitHub: no PR ${repo}#${number}`);
      pr.state = to === "open" ? "open" : "closed";
      pr.merged_at = to === "merged" ? stamp() : null;
      pr.updated_at = stamp();
    },
    /**
     * A bare git repository standing in for `https://github.com/<repo>.git`, created on first use with one commit on
     * the repo's default branch. Clone from it and push to it with plain git.
     */
    remote(repo: string): string {
      const r = repos.get(repo);

      if (!r) throw new Error(`fake GitHub: no repo ${repo}`);
      const existing = remotes.get(repo);

      if (existing) return existing;
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "pre-k-fake-github-"));
      const bare = path.join(root, `${repo.replace("/", "__")}.git`);
      const seed = path.join(root, "seed");
      const git = (cwd: string, ...args: string[]) =>
        execFileSync("git", ["-c", "user.name=Fake", "-c", "user.email=fake@example.com", ...args], {
          cwd,
          stdio: "pipe",
        });

      git(root, "init", "--quiet", "--bare", `--initial-branch=${r.default_branch}`, bare);
      git(root, "init", "--quiet", `--initial-branch=${r.default_branch}`, seed);
      fs.writeFileSync(path.join(seed, "README.md"), `# ${repo}\n`);
      git(seed, "add", "README.md");
      git(seed, "commit", "--quiet", "-m", "Initial commit");
      git(seed, "push", "--quiet", bare, r.default_branch);
      remotes.set(repo, bare);

      return bare;
    },
    /** Remove the bare repositories. */
    cleanup() {
      for (const bare of remotes.values()) fs.rmSync(path.dirname(bare), { recursive: true, force: true });
      remotes.clear();
    },
  };
}

export type FakeGitHub = ReturnType<typeof fakeGitHub>;

export const TEST_REPO: FakeRepo = {
  full_name: "buildwf/pre-k-playground",
  description: "Throwaway PRs from pre-k agents",
  private: false,
  default_branch: "main",
};
