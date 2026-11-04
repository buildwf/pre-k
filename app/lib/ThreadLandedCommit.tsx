import { rpc, useRpc } from "point/client";
import { LandedCommitCard } from "../ui/LandedCommitCard";
import { useOpenCommit } from "./navigation";

/**
 * The card for a commit a thread landed, with its checks read live from GitHub (#4) and "View changes", which opens
 * the commit's diff. If the checks can't be read (GitHub not connected, unknown commit), the card shows what the
 * thread recorded, without a checks line.
 */
export function ThreadLandedCommit(props: { repo: string; branch: string; sha: string; title?: string | undefined }) {
  const { data } = useRpc(rpc.delivery.checks, { repo: props.repo, ref: props.sha });
  const open = useOpenCommit();

  return (
    <LandedCommitCard
      {...props}
      checks={data}
      onViewChanges={open ? () => open({ repo: props.repo, sha: props.sha }) : undefined}
    />
  );
}
