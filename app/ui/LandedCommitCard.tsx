import type { ChecksSummary } from "../schemas/delivery";
import { Badge, type BadgeTone } from "./Badge";
import { Button } from "./Button";
import { Card } from "./Card";
import { Icon } from "./Icon";
import { Stack } from "./Stack";
import { Text } from "./Text";
import { color } from "./theme";

const checkBadge: Record<ChecksSummary["state"], { tone: BadgeTone; text: string }> = {
  success: { tone: "success", text: "Checks passed" },
  failure: { tone: "danger", text: "Checks failed" },
  pending: { tone: "info", text: "Checks running" },
  none: { tone: "default", text: "No checks" },
};

/**
 * Work a thread committed straight to a branch (no pull request): the commit title, "Landed on main · 3f9c2e1", its
 * checks when known, and a link to it on GitHub. The title is the commit message's first line; it is agent-written, so it
 * renders as plain text.
 *
 * @import import { LandedCommitCard } from '../../ui/LandedCommitCard'
 */
export function LandedCommitCard({
  repo,
  branch,
  sha,
  title,
  checks,
  onViewChanges,
}: {
  repo: string;
  branch: string;
  /** The full commit SHA; the card shows the first 7 characters. */
  sha: string;
  title?: string | undefined;
  /** The commit's checks as GitHub reports them now; leave out while they load. */
  checks?: ChecksSummary | undefined;
  /** Opens the commit's diff inside the app; without it the card only links to GitHub. */
  onViewChanges?: (() => void) | undefined;
}) {
  const failing = checks?.checks.filter((c) => c.state === "failure").map((c) => c.name) ?? [];

  return (
    <Card>
      <Stack gap={8}>
        <Stack direction="row" gap={8} align="center" justify="between">
          <Stack direction="row" gap={8} align="center">
            <Icon name="commit" />
            <Text bold>{title?.split("\n")[0]?.trim() || `Commit ${sha.slice(0, 7)}`}</Text>
          </Stack>
          {checks && <Badge tone={checkBadge[checks.state].tone}>{checkBadge[checks.state].text}</Badge>}
        </Stack>
        <Stack direction="row" gap={8} wrap align="baseline" justify="between">
          <Text tone="muted">
            Landed on {branch} · <Text mono>{sha.slice(0, 7)}</Text> · {repo}
          </Text>
          <Stack direction="row" gap={8} align="center">
            {onViewChanges && (
              <Button size="sm" onClick={onViewChanges}>
                View changes
              </Button>
            )}
          <a
            href={`https://github.com/${repo}/commit/${sha}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: color.accent, display: "inline-flex", gap: 4, alignItems: "center" }}
          >
            Open on GitHub <Icon name="external" size={14} />
          </a>
          </Stack>
        </Stack>
        {failing.length > 0 && <Text tone="danger">Failing: {failing.join(", ")}</Text>}
      </Stack>
    </Card>
  );
}
