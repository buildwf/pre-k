import { useCollection } from "point/client";
import { eq, useLiveQuery } from "point/cloud/db";
import { ThreadPullRequest } from "../lib/ThreadPullRequest";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Heading } from "../ui/Heading";
import { LandedCommitCard } from "../ui/LandedCommitCard";
import { Stack } from "../ui/Stack";
import { Text } from "../ui/Text";

/**
 * Everything a project's threads delivered, newest first (#2): each landed commit (or PR) with the thread that made
 * it and a button to open that thread. Reads the threads and thread-outputs collections; writes nothing.
 */
export function Delivered({ projectId, onOpen }: { projectId: string; onOpen: (threadId: string) => void }) {
  const threads = useCollection("threads");
  const outputs = useCollection("thread-outputs");
  const { data: mine } = useLiveQuery((q) => q.from({ t: threads }).where(({ t }) => eq(t.projectId, projectId)));
  const { data: all } = useLiveQuery((q) => q.from({ o: outputs }).orderBy(({ o }) => o.createdAt, "desc"));
  const titles = new Map(mine.map((t) => [t.threadId, t.title]));
  const rows = all.filter((o) => titles.has(o.threadId));

  return (
    <Stack gap={12}>
      <Heading level={2}>Delivered</Heading>
      {rows.length === 0 ? (
        <EmptyState title="Nothing delivered yet">
          When a thread lands its work on main, it shows up here.
        </EmptyState>
      ) : (
        rows.map((o) => (
          <Stack key={o.id} gap={4}>
            <Stack direction="row" justify="between" align="baseline" gap={8}>
              <Text tone="muted">From “{titles.get(o.threadId)}”</Text>
              <Button variant="quiet" onClick={() => onOpen(o.threadId)}>
                Open thread
              </Button>
            </Stack>
            {o.kind === "commit" ? (
              <LandedCommitCard repo={o.repo} branch={o.branch} sha={o.sha} title={o.title} />
            ) : (
              <ThreadPullRequest repo={o.repo} number={o.number} />
            )}
          </Stack>
        ))
      )}
    </Stack>
  );
}
