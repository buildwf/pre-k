import os from "node:os";
import path from "node:path";

/**
 * Where pre-k keeps its clones of linked repos: `~/.pre-k/checkouts/<owner>/<name>`, beside the coordinators' folders,
 * owned by the app so the person never manages them. Not under userData: Point denies every agent sandbox all of
 * userData, so a builder whose worktree lived there couldn't read its own files and failed with "Unexpected".
 * PRE_K_CHECKOUTS overrides it for tests and headless runs.
 */
export function checkoutPath(repo: string): string {
  const root = process.env.PRE_K_CHECKOUTS ?? path.join(os.homedir(), ".pre-k", "checkouts");

  return path.join(root, ...repo.split("/"));
}

/**
 * The git remote for a GitHub repo. PRE_K_GIT_REMOTES points at a folder of bare repos named `<owner>__<name>.git`
 * (what app/testing/fake-github.ts makes), so tests and smoke runs clone and push with no network.
 */
export function remoteUrl(repo: string): string {
  const fake = process.env.PRE_K_GIT_REMOTES;

  return fake ? path.join(fake, `${repo.replace("/", "__")}.git`) : `https://github.com/${repo}.git`;
}
