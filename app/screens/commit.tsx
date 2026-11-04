import { rpc, useRpc } from "point/client";
import type { z } from "zod";
import type { CommitRef } from "../schemas/delivery";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { DiffView } from "../ui/DiffView";
import { Icon } from "../ui/Icon";
import { PaneBody, PaneHeader } from "../ui/Pane";
import { ProgressBar } from "../ui/ProgressBar";
import { Text } from "../ui/Text";

/** One landed commit's changes, Cursor-style: the commit message, its changed files and their diffs, inside pre-k. */
export function CommitView({ repo, sha, onBack }: z.infer<typeof CommitRef> & { onBack: () => void }) {
  const { data, failure, loading } = useRpc(rpc.delivery.commitDiff, { repo, sha });
  const added = data?.files.reduce((n, f) => n + f.additions, 0) ?? 0;
  const removed = data?.files.reduce((n, f) => n + f.deletions, 0) ?? 0;

  return (
    <>
      <PaneHeader
        title={data?.subject ?? `Commit ${sha.slice(0, 7)}`}
        badge={<Badge tone="success">Landed</Badge>}
        subtitle={
          data
            ? `${repo} · ${sha.slice(0, 7)} · ${data.author} · ${data.files.length} ${data.files.length === 1 ? "file" : "files"} · +${added} −${removed}`
            : `${repo} · ${sha.slice(0, 7)}`
        }
        actions={
          <Button size="sm" variant="quiet" onClick={onBack}>
            <Icon name="arrowLeft" size={14} /> Back
          </Button>
        }
      />
      <PaneBody wide>
        {loading && !data && <ProgressBar label="Reading the commit…" />}
        <Alert tone="danger">
          {failure &&
            (failure.code === "NOT_FOUND"
              ? `pre-k's copy of ${repo} doesn't have commit ${sha.slice(0, 7)}, and fetching it didn't find it either.`
              : `Couldn't read the commit (${failure.code}).`)}
        </Alert>
        {data?.body && <Text tone="muted">{data.body}</Text>}
        {data && <DiffView files={data.files} />}
      </PaneBody>
    </>
  );
}
