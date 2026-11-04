import type { PullRequestCardData } from "../schemas/delivery";
import { Alert } from "./Alert";
import { Badge, type BadgeTone } from "./Badge";
import { Button } from "./Button";
import { Card } from "./Card";
import { Icon } from "./Icon";
import { Stack } from "./Stack";
import { Text } from "./Text";
import { color } from "./theme";

const stateBadge: Record<PullRequestCardData["state"], { tone: BadgeTone; text: string }> = {
  open: { tone: "info", text: "Open" },
  draft: { tone: "default", text: "Draft" },
  merged: { tone: "success", text: "Merged" },
  closed: { tone: "default", text: "Closed" },
};

/**
 * The pull request a thread produced, as GitHub reports it now. Title and branch names come from an agent, so they
 * render as plain text. `failure` replaces the details with what went wrong; `loading` fades a stale answer.
 *
 * @import import { PullRequestCard } from '../../ui/PullRequestCard'
 */
export function PullRequestCard({
  pr,
  loading,
  failure,
  onRefresh,
}: {
  pr: PullRequestCardData | undefined;
  loading?: boolean;
  /** One line saying why the PR can't be shown, like "PR #12 is not on GitHub". */
  failure?: string | undefined;
  onRefresh?: () => void;
}) {
  return (
    <Card>
      <Stack gap={8}>
        <Stack direction="row" justify="between" align="baseline" gap={12}>
          {pr ? (
            <Stack direction="row" gap={8} align="center">
              <Icon name="pullRequest" />
              <Text bold faded={loading === true}>
                {pr.title}
              </Text>
              <Badge tone={stateBadge[pr.state].tone}>{stateBadge[pr.state].text}</Badge>
            </Stack>
          ) : (
            <Text tone="muted">{loading ? "Reading the pull request…" : "Pull request"}</Text>
          )}
          {onRefresh && (
            <Button variant="quiet" size="sm" onClick={onRefresh} disabled={loading}>
              Refresh
            </Button>
          )}
        </Stack>
        <Alert tone="danger">{failure}</Alert>
        {pr && !failure && (
          <Stack direction="row" gap={12} wrap align="baseline">
            <Text mono>
              {pr.repo}#{pr.number}
            </Text>
            <Text mono tone="muted">
              {pr.head} → {pr.base}
            </Text>
            <Text mono tone="muted">
              {pr.headSha.slice(0, 7)}
            </Text>
            <Text mono>
              +{pr.additions} −{pr.deletions}
            </Text>
            <Text tone="muted">
              {pr.changedFiles} {pr.changedFiles === 1 ? "file" : "files"}
            </Text>
            <a
              href={pr.url}
              target="_blank"
              rel="noreferrer"
              style={{ color: color.accent, display: "inline-flex", gap: 4, alignItems: "center" }}
            >
              Open on GitHub <Icon name="external" size={14} />
            </a>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
