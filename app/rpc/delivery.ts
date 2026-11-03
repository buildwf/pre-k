import { defineRouter, procedure } from "point/app";
import { connect, ConnectorError } from "point/connectors";
import github from "../connectors/github.connector";
import { ChecksRef, ChecksSummary, PullRequestCardData, PullRequestRef } from "../schemas/delivery";

// Review and delivery: what a thread produced, read live from GitHub. Window-only (no .tool()): the card shows
// GitHub's answer, never what an agent claims about its PR.
export default defineRouter({
  pullRequest: procedure
    .input(PullRequestRef)
    .output(PullRequestCardData)
    .errors({ NOT_FOUND: PullRequestRef })
    .handler(async ({ input, connectors, fail }) => {
      const client = connect(github, { token: await connectors.require("github") });

      try {
        const pr = await client.getPullRequestSummary(input);

        return {
          repo: input.repo,
          number: pr.number,
          title: pr.title,
          state: pr.merged ? "merged" : pr.draft && pr.state === "open" ? "draft" : pr.state,
          head: pr.head,
          base: pr.base,
          headSha: pr.headSha,
          additions: pr.additions,
          deletions: pr.deletions,
          changedFiles: pr.changedFiles,
          url: pr.url,
        };
      } catch (e) {
        if (e instanceof ConnectorError && e.status === 404) return fail("NOT_FOUND", input);
        throw e;
      }
    }),

  // The checks on a landed commit (#4): Point's getChecks, rolled up to pending, success, failure or none.
  checks: procedure
    .input(ChecksRef)
    .output(ChecksSummary)
    .errors({ NOT_FOUND: ChecksRef })
    .handler(async ({ input, connectors, fail }) => {
      const client = connect(github, { token: await connectors.require("github") });

      try {
        const r = await client.getChecks(input);

        return { state: r.state, checks: r.checks.map((c) => ({ name: c.name, state: c.state, url: c.url ?? undefined })) };
      } catch (e) {
        if (e instanceof ConnectorError && (e.status === 404 || e.status === 422)) return fail("NOT_FOUND", input);
        throw e;
      }
    }),
});
