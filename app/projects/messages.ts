import { z } from "zod";

const detail = z.object({
  repo: z.string().optional(),
  message: z.string().optional(),
  status: z.number().optional(),
});

/** What the person reads when linking a repository fails: what happened and what to do, never a bare code. */
export function linkFailure(code: string, raw: unknown, repo: string): string {
  const d = detail.safeParse(raw).data ?? {};

  switch (code) {
    case "CONNECTOR_NOT_CONNECTED":
      return "pre-k can't reach GitHub yet: there is no GitHub token on this computer.";
    case "REPO_NOT_VISIBLE":
      return `pre-k can't see ${d.repo ?? repo}. Check the name, and that your GitHub token can read this repository.`;
    case "CLONE_FAILED":
      return `GitHub found ${repo}, but cloning it failed${d.message ? `: ${d.message}` : "."}`;
    case "GITHUB_FAILED":
      if (d.status === 401) return "GitHub refused pre-k's token: it's wrong or expired. Replace the GitHub token, then try again.";
      if (d.status === 403) return "GitHub refused the request: the token lacks access, or the rate limit is used up. Try again later.";
      return `GitHub didn't answer${d.message ? ` (${d.message})` : ""}. Try again in a moment.`;
    case "BAD_INPUT":
      return "Write the repository as owner/name, like buildwf/pre-k.";
    case "NO_PROJECT":
      return "This project no longer exists.";
    default:
      return `Linking ${repo} failed (${code}).`;
  }
}

/** A pasted GitHub URL or `owner/name`, as owner/name. */
export function repoFromInput(text: string): string {
  const t = text.trim().replace(/\.git$/, "").replace(/\/+$/, "");
  const url = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+\/[^/\s]+)/.exec(t);

  return url?.[1] ?? t;
}
