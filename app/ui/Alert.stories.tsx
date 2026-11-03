import { useState } from "react";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { Stack } from "./Stack";

export default { component: Alert };

export const Danger = {
  args: {
    tone: "danger",
    title: "Lost connection",
    children: "Point is trying again. Changes you make now are kept.",
  },
};

export const Attention = {
  args: { tone: "attention", children: "This thread has spent $0.90 of its $1.00 budget." },
};

export const Update = { args: { children: "Saved" } };

// The way to use it: keep the Alert rendered, empty, and put the message in when something happens.
function FailedSave() {
  const [error, setError] = useState<string>();

  return (
    <Stack gap={12}>
      <Alert tone="danger">{error}</Alert>
      <Stack direction="row" gap={8}>
        <Button onClick={() => setError("Couldn't save notes.md: the disk is full.")}>
          Save
        </Button>
        <Button variant="quiet" onClick={() => setError(undefined)}>
          Dismiss
        </Button>
      </Stack>
    </Stack>
  );
}

export const AfterAFailedAction = { render: () => <FailedSave /> };
