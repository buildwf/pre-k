import { useState } from "react";
import { Alert } from "../Alert";
import { Button } from "../Button";
import { Card } from "../Card";
import { Heading } from "../Heading";
import { ProgressBar } from "../ProgressBar";
import { Stack } from "../Stack";
import { Text } from "../Text";
import { Window } from "../Window";

// Recipe: the person's plan. The current plan and what it includes, how much of the limit is used, and one Upgrade;
// after Upgrade the hosted checkout opens and the window says it is waiting for the payment until the plan row
// flips to Pro (only a verified payment event changes it, never this window); a failed payment says so and offers
// Try again. A Pro plan has no limit to show.

type State = "free" | "pending" | "pro" | "failed";

export function PlanRecipe({
  start = "free",
  used = 4,
  limit = 10,
  what = "cards",
}: {
  start?: State;
  used?: number;
  limit?: number;
  what?: string;
}) {
  // Sample: the story's state. The generated window reads the plan row with useStore and opens the checkout with a
  // cloud function; "pending" is the time between opening it and the row changing.
  const [state, setState] = useState<State>(start);

  const upgrade = () => setState("pending");

  return (
    <Window>
      <Stack padding={24} gap={16} maxWidth={640}>
        <Heading>Plan</Heading>
        <Alert tone="danger">{state === "failed" ? "The payment didn't go through. Nothing was charged on your plan." : ""}</Alert>
        <Alert>{state === "pro" ? "You're on Pro. Thanks!" : ""}</Alert>
        <Card>
          <Stack gap={12}>
            <Stack direction="row" gap={8} align="baseline">
              <Heading level={2}>{state === "pro" ? "Pro" : "Free"}</Heading>
              <Text tone="muted">Your current plan</Text>
            </Stack>
            {state === "pro" ? (
              <Text>Unlimited {what}.</Text>
            ) : (
              <Stack gap={4}>
                <Text>
                  {used} of {limit} {what} used
                </Text>
                <ProgressBar value={used} max={limit} label={`${what} used`} />
              </Stack>
            )}
          </Stack>
        </Card>
        {state === "pending" && (
          <Stack gap={8}>
            <Text>Waiting for your payment…</Text>
            <ProgressBar label="Waiting for your payment" />
            <Stack direction="row" gap={8}>
              <Button onClick={() => setState("free")}>Cancel</Button>
            </Stack>
          </Stack>
        )}
        {(state === "free" || state === "failed") && (
          <Stack direction="row" gap={8}>
            <Button variant="primary" onClick={upgrade}>
              {state === "failed" ? "Try again" : "Upgrade to Pro"}
            </Button>
          </Stack>
        )}
      </Stack>
    </Window>
  );
}
