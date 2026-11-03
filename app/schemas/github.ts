import { z } from "zod";

// GitHub shapes pre-k's connector actions and its fake GitHub share (pre-k#14, #15).

export const repoName = z
  .string()
  .regex(/^[\w.-]+\/[\w.-]+$/, "owner/name, like buildwf/pre-k")
  .describe("owner/name, like buildwf/pre-k.");

export const branchName = z
  .string()
  .regex(/^[\w./-]+$/)
  .refine((b) => !b.includes(".."), "no '..' in a branch name");

/** The body of POST /repos/{owner}/{repo}/pulls, as pre-k sends it. */
export const newPullRequest = z.object({
  head: branchName.describe("The branch with the changes."),
  base: branchName.describe("The branch to merge into, usually the default branch."),
  title: z.string().min(1).max(256),
  body: z.string().max(65_536).optional().describe("Markdown."),
  draft: z.boolean().optional(),
});

export type NewPullRequest = z.infer<typeof newPullRequest>;

/** A pull request as GitHub's REST API answers it, read into what pre-k keeps of one it opened or found. */
export const pullRequestReply = z
  .object({
    number: z.number().int(),
    title: z.string(),
    state: z.enum(["open", "closed"]),
    draft: z.boolean().optional(),
    html_url: z.string(),
    head: z.object({ ref: z.string() }),
    base: z.object({ ref: z.string() }),
  })
  .transform((p) => ({
    number: p.number,
    title: p.title,
    state: p.state,
    draft: p.draft ?? false,
    url: p.html_url,
    head: p.head.ref,
    base: p.base.ref,
  }));

export type OpenedPullRequest = z.output<typeof pullRequestReply>;

/** Split `owner/name`; the input was already checked against `repoName`. */
export function splitRepo(repo: string): { owner: string; name: string } {
  const [owner, name, extra] = repo.split("/");

  if (!owner || !name || extra !== undefined) throw new Error(`not owner/name: ${repo}`);

  return { owner, name };
}
