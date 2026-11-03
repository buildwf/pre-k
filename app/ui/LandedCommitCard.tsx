import type { ChecksSummary } from "../schemas/delivery";
import { Card } from "./Card";
import { Stack } from "./Stack";
import { Text } from "./Text";
import { color } from "./theme";

const checkWords = {
  success: "Checks passed",
  failure: "Checks failed",
  pending: "Checks running",
  none: "No checks",
} as const;

/**
 * Work a thread committed straight to a branch (no pull request): "Landed on main · 3f9c2e1" with the commit title
 * and a link to it on GitHub. Shows what the thread recorded; the title is agent-written, so it renders as plain text.
 *
 * @import import { LandedCommitCard } from '../../ui/LandedCommitCard'
 */
export function LandedCommitCard({
  repo,
  branch,
  sha,
  title,
  checks,
}: {
  repo: string;
  branch: string;
  /** The full commit SHA; the card shows the first 7 characters. */
  sha: string;
  title?: string | undefined;
  /** The commit's checks as GitHub reports them now; leave out while they load. */
  checks?: ChecksSummary | undefined;
}) {
  const failing = checks?.checks.filter((c) => c.state === "failure").map((c) => c.name) ?? [];

  return (
    <Card>
      <Stack gap={8}>
        {title && <Text bold>{title}</Text>}
        <Stack direction="row" gap={12} wrap align="baseline">
          <Text bold>Landed on {branch}</Text>
          <Text mono>{sha.slice(0, 7)}</Text>
          <Text mono tone="muted">
            {repo}
          </Text>
          {checks && (
            <Text tone={checks.state === "failure" ? "danger" : checks.state === "success" ? "default" : "muted"}>
              {checkWords[checks.state]}
              {failing.length > 0 ? `: ${failing.join(", ")}` : ""}
            </Text>
          )}
          <a
            href={`https://github.com/${repo}/commit/${sha}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: color.accent }}
          >
            Open on GitHub
          </a>
        </Stack>
      </Stack>
    </Card>
  );
}
