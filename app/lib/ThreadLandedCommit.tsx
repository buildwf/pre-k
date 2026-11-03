import { rpc, useRpc } from "point/client";
import { LandedCommitCard } from "../ui/LandedCommitCard";

/**
 * The card for a commit a thread landed, with its checks read live from GitHub (#4). If the checks can't be read
 * (GitHub not connected, unknown commit), the card shows what the thread recorded, without a checks line.
 */
export function ThreadLandedCommit(props: { repo: string; branch: string; sha: string; title?: string | undefined }) {
  const { data } = useRpc(rpc.delivery.checks, { repo: props.repo, ref: props.sha });

  return <LandedCommitCard {...props} checks={data} />;
}
