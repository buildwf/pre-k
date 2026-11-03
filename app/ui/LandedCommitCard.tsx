import { Card } from "./Card";
import { Stack } from "./Stack";
import { Text } from "./Text";
import { color } from "./theme";

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
}: {
  repo: string;
  branch: string;
  /** The full commit SHA; the card shows the first 7 characters. */
  sha: string;
  title?: string | undefined;
}) {
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
