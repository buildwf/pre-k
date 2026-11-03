import { Button } from "./Button";
import { Card } from "./Card";
import { Stack } from "./Stack";
import { Text } from "./Text";

/**
 * Shown in place of "add" when a plan's limit stops the person: what the limit is, and the one way past it. It is a
 * status region that stays mounted (an empty one announces nothing), so show it when the server refused the create,
 * not before: `{refused && <LimitNotice what="cards" limit={10} plan="Free" onUpgrade={open} />}`.
 *
 * @import import { LimitNotice } from '../../ui/LimitNotice'
 */
export function LimitNotice({
  what,
  limit,
  plan = "Free",
  onUpgrade,
  upgrade = "Upgrade",
}: {
  /** The plural noun the limit counts, like "cards". */
  what: string;
  limit: number;
  /** The person's current plan. */
  plan?: string;
  /** Opens the Plan window (or checkout). Leave it out to show the limit with no way past it. */
  onUpgrade?: (() => void) | undefined;
  upgrade?: string;
}) {
  return (
    <div role="status">
      <Card tone="attention">
        <Stack direction="row" gap={12} align="center" justify="between">
          <Stack gap={4}>
            <Text bold>
              The {plan} plan holds up to {limit} {what}.
            </Text>
            <Text tone="muted">Upgrade to add more.</Text>
          </Stack>
          {onUpgrade && (
            <Button variant="primary" onClick={onUpgrade}>
              {upgrade}
            </Button>
          )}
        </Stack>
      </Card>
    </div>
  );
}
