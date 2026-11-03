import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { branchName } from "../schemas/github";

/**
 * Plain git for pre-k's checkouts (pre-k#10, #12, #14): one app-owned clone per linked repo, one worktree and branch
 * per thread, and publishing a thread's branch. Every call is an async child process, so main never blocks.
 *
 * Credentials: a token reaches git only through `GIT_CONFIG_*` environment variables of that one process, as an
 * `http.<origin>.extraheader`. It is never in argv, a remote URL or `.git/config`, so `ps`, `git remote -v` and the
 * agent's own git commands in the worktree can't see it.
 */

const run = promisify(execFile);

export class GitError extends Error {
  constructor(
    readonly step: string,
    readonly stderr: string,
  ) {
    super(`git ${step} failed: ${stderr.trim().split("\n").at(-1) ?? ""}`);
  }
}

/** The environment that lets one git process authenticate to GitHub with a token. */
export function tokenEnv(token: string | null, origin = "https://github.com/"): NodeJS.ProcessEnv {
  const base: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0" };

  if (!token) return base;
  const basic = Buffer.from(`x-access-token:${token}`).toString("base64");

  // Append after any GIT_CONFIG_* entries the environment already carries, rather than replacing them.
  const n = Number(base.GIT_CONFIG_COUNT ?? 0) || 0;

  return {
    ...base,
    GIT_CONFIG_COUNT: String(n + 1),
    [`GIT_CONFIG_KEY_${n}`]: `http.${origin}.extraheader`,
    [`GIT_CONFIG_VALUE_${n}`]: `AUTHORIZATION: basic ${basic}`,
  };
}

async function git(cwd: string, args: string[], token: string | null = null): Promise<string> {
  try {
    const r = await run("git", args, { cwd, env: tokenEnv(token), maxBuffer: 16 * 1024 * 1024 });

    return r.stdout.trim();
  } catch (e) {
    const stderr = e instanceof Error && "stderr" in e ? String(e.stderr) : String(e);

    throw new GitError(args[0] ?? "", token ? stderr.replaceAll(token, "***") : stderr);
  }
}

const exists = (p: string) =>
  fs.stat(p).then(
    () => true,
    () => false,
  );

/** Clone `url` into `dir` once; later calls fetch instead. */
export async function ensureClone(o: { url: string; dir: string; token: string | null }) {
  if (await exists(path.join(o.dir, ".git"))) return fetchOrigin(o);
  await fs.mkdir(path.dirname(o.dir), { recursive: true });
  await git(path.dirname(o.dir), ["clone", "--quiet", "--", o.url, o.dir], o.token);
}

export async function fetchOrigin(o: { dir: string; token: string | null }) {
  await git(o.dir, ["fetch", "--quiet", "--prune", "origin"], o.token);
}

/** `pre-k/<slug of the title>-<4 random chars>`: readable on GitHub, unique per thread. */
export function threadBranch(title: string, suffix = randomBytes(2).toString("hex")): string {
  const slug =
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/, "") || "thread";

  return branchName.parse(`pre-k/${slug}-${suffix}`);
}

/** A new worktree on a new branch from `origin/<base>`. Fails if the branch exists. */
export async function addWorktree(o: { dir: string; base: string; branch: string; worktree: string }) {
  branchName.parse(o.branch);
  branchName.parse(o.base);
  await fs.mkdir(path.dirname(o.worktree), { recursive: true });
  await git(o.dir, ["worktree", "add", "--quiet", "-b", o.branch, o.worktree, `origin/${o.base}`]);
}

/** Commits on the branch that `origin/<branch>` doesn't have yet (all of them before the first push). */
async function unpushed(
  worktree: string,
  branch: string,
  base: string,
  token: string | null,
): Promise<number> {
  const remote = await git(worktree, ["ls-remote", "--heads", "origin", branch], token);
  const since = remote ? `origin/${branch}` : `origin/${base}`;

  if (remote) await git(worktree, ["fetch", "--quiet", "origin", branch], token);

  return Number(await git(worktree, ["rev-list", "--count", `${since}..HEAD`]));
}

const dirty = async (worktree: string) => (await git(worktree, ["status", "--porcelain"])) !== "";

/**
 * Remove a thread's worktree. Keeps it, and says why, when it has uncommitted changes or commits that were never
 * pushed: the branch on GitHub is the only other copy of the agent's work.
 */
export async function releaseWorktree(o: {
  dir: string;
  worktree: string;
  branch: string;
  base: string;
  /** For a private repo: checking what was pushed talks to the remote. */
  token: string | null;
}): Promise<{ removed: true } | { removed: false; reason: "uncommitted" | "unpushed" }> {
  if (!(await exists(o.worktree))) return { removed: true };
  if (await dirty(o.worktree)) return { removed: false, reason: "uncommitted" };
  if ((await unpushed(o.worktree, o.branch, o.base, o.token)) > 0) return { removed: false, reason: "unpushed" };
  await git(o.dir, ["worktree", "remove", o.worktree]);

  return { removed: true };
}

export type PublishResult =
  | { ok: true; branch: string; head: string }
  | { ok: false; reason: "no-changes" | "rejected"; detail: string };

/**
 * Publish a thread's branch: commit anything uncommitted as `message`, refuse when the branch has nothing beyond
 * `origin/<base>`, then push. Never force-pushes; a rejected push (someone else moved the branch) is reported.
 */
export async function publishBranch(o: {
  worktree: string;
  branch: string;
  base: string;
  message: string;
  author: { name: string; email: string };
  token: string | null;
}): Promise<PublishResult> {
  const current = await git(o.worktree, ["rev-parse", "--abbrev-ref", "HEAD"]);

  if (current !== o.branch)
    return { ok: false, reason: "rejected", detail: `the worktree is on ${current}, not ${o.branch}` };

  if (await dirty(o.worktree)) {
    await git(o.worktree, ["add", "--all"]);
    await git(o.worktree, [
      "-c",
      `user.name=${o.author.name}`,
      "-c",
      `user.email=${o.author.email}`,
      "commit",
      "--quiet",
      "-m",
      o.message,
    ]);
  }

  const ahead = Number(await git(o.worktree, ["rev-list", "--count", `origin/${o.base}..HEAD`]));

  if (ahead === 0)
    return { ok: false, reason: "no-changes", detail: `${o.branch} has no commits beyond ${o.base}` };

  try {
    await git(o.worktree, ["push", "--quiet", "origin", `HEAD:refs/heads/${o.branch}`], o.token);
  } catch (e) {
    if (e instanceof GitError) return { ok: false, reason: "rejected", detail: e.message };
    throw e;
  }

  return { ok: true, branch: o.branch, head: await git(o.worktree, ["rev-parse", "HEAD"]) };
}
