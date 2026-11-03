import { useState } from "react";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { Card } from "./Card";
import { Checkbox } from "./Checkbox";
import { Stack } from "./Stack";
import { Text } from "./Text";

/** What `useNotifications()` from point/client returns. */
export interface NotificationsState {
  /** False when the system can't show them (turned off for the app in System Settings, or not available). */
  supported: boolean;
  /** This machine's choice. */
  enabled: boolean;
  setEnabled(on: boolean): Promise<void>;
  test(): Promise<{ shown: boolean; reason?: string | undefined }>;
}

const why = new Map([
  ["unsupported", "The system won't show notifications for this app."],
  ["disabled", "Notifications are off here. Turn them on first."],
  ["rate-limited", "Too many notifications just now. Try again in a moment."],
]);

/**
 * The Settings row for notifications on this machine: a switch, a "Send a test" button, and the reason when the
 * system blocks them. Pass the hook's result, in a Settings window: `<NotificationsSetting notifications={useNotifications()} />`.
 * Its status line stays mounted so screen readers announce each result.
 *
 * @import import { NotificationsSetting } from '../../ui/NotificationsSetting'
 */
export function NotificationsSetting({ notifications }: { notifications: NotificationsState }) {
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const run = (action: () => Promise<void>) => {
    setError("");
    action().catch((e: Error) => setError(`Couldn't do that: ${e.message}`));
  };

  return (
    <Card>
      <Stack gap={12}>
        {!notifications.supported && (
          <Text tone="muted">
            The system is blocking notifications for this app. Allow them in your system's notification settings, then
            come back.
          </Text>
        )}
        <Checkbox
          checked={notifications.enabled && notifications.supported}
          disabled={!notifications.supported}
          onChange={(on) => run(() => notifications.setEnabled(on))}
        >
          Show notifications on this computer
        </Checkbox>
        <Stack direction="row" gap={12} align="center">
          <Button
            disabled={!notifications.supported || !notifications.enabled}
            onClick={() =>
              run(async () => {
                const sent = await notifications.test();
                setResult(sent.shown ? "Test sent." : (why.get(sent.reason ?? "") ?? "Nothing was shown."));
              })
            }
          >
            Send a test
          </Button>
          <Text tone="muted" role="status">
            {result}
          </Text>
        </Stack>
        <Alert tone="danger">{error}</Alert>
      </Stack>
    </Card>
  );
}
