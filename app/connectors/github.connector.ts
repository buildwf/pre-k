import { defineAction, defineConnector } from "point/connectors";
import { github } from "point/connectors/github";
import { z } from "zod";
import {
  branchName,
  newPullRequest,
  pullRequestReply,
  repoName,
  splitRepo,
  type OpenedPullRequest,
} from "../schemas/github";

/**
 * Point's built-in GitHub connector plus the two pull request actions pre-k needs to deliver a thread's work.
 * Point has no PR-creation action yet (buildwf/cloudflare-point#664); drop these when it ships them.
 *
 * GitHub REST API 2022-11-28: https://docs.github.com/en/rest/pulls/pulls
 */

const opened = (value: unknown): OpenedPullRequest => pullRequestReply.parse(value);

const pullsPath = (repo: string) => {
  const { owner, name } = splitRepo(repo);

  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls`;
};

export default defineConnector({
  ...github,
  actions: {
    ...github.actions,

    createPullRequest: defineAction({
      description: "Open a pull request from a branch already pushed to the repository.",
      input: newPullRequest.extend({ repo: repoName }),
      effect: "write",
      async run({ repo, ...fields }, ctx) {
        return opened(await ctx.request("POST", pullsPath(repo), { body: fields }));
      },
    }),

    findOpenPullRequest: defineAction({
      description: "The open pull request from a branch of the same repository, or null.",
      input: z.object({ repo: repoName, head: branchName.describe("The branch name.") }),
      effect: "read",
      async run({ repo, head }, ctx) {
        const list = z.array(z.unknown()).parse(
          await ctx.request("GET", pullsPath(repo), {
            query: { head: `${splitRepo(repo).owner}:${head}`, state: "open", per_page: 1 },
          }),
        );

        return list[0] === undefined ? null : opened(list[0]);
      },
    }),
  },
});
