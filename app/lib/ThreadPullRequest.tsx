import { rpc, useRpc } from "point/client";
import type { PullRequestRef } from "../schemas/delivery";
import { PullRequestCard } from "../ui/PullRequestCard";
import type { z } from "zod";

/**
 * The live card for one PR a thread recorded in thread_outputs: `<ThreadPullRequest repo="acme/x" number={12} />`.
 * Reads GitHub when it mounts, when the window regains focus, and on Refresh; no polling.
 */
export function ThreadPullRequest({ repo, number }: z.infer<typeof PullRequestRef>) {
  const { data, failure, loading, refetch } = useRpc(rpc.delivery.pullRequest, { repo, number });

  return (
    <PullRequestCard
      pr={data}
      loading={loading}
      failure={failure && describe(failure.code, repo, number)}
      onRefresh={() => void refetch()}
    />
  );
}

function describe(code: string, repo: string, number: number) {
  if (code === "NOT_FOUND") return `${repo}#${number} is not on GitHub, or this GitHub account can't see it.`;
  if (code === "CONNECTOR_NOT_CONNECTED") return "Connect GitHub to see this pull request.";

  return `Couldn't read ${repo}#${number} from GitHub (${code}).`;
}
