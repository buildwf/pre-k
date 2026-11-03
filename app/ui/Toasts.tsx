import { Button } from "./Button";
import { Card } from "./Card";
import { Stack } from "./Stack";
import { Text } from "./Text";

/** One in-page notification: an entry of `useToasts()` from `point/cloud/web-notify`. */
export interface ToastItem {
  id: number;
  title: string;
  body?: string | undefined;
}

/**
 * In-page notifications for a web window, over the hook that holds them: `<Toasts toasts={useToasts()}
 * onDismiss={dismissToast} />`, once, at the top level of the window (the hook removes each after a few seconds).
 * Fixed to the bottom right, newest last, plain text only. The region stays mounted so screen readers announce each
 * new toast, and every toast has a Dismiss button named for it.
 *
 * @import import { Toasts } from '../../ui/Toasts'
 */
export function Toasts({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ position: "fixed", right: 16, bottom: 16, width: "min(360px, calc(100vw - 32px))", zIndex: 10 }}
    >
      <Stack gap={8}>
        {toasts.map((toast) => (
          <Card key={toast.id}>
            <Stack direction="row" gap={12} align="start" justify="between">
              <Stack gap={0}>
                <Text bold>{toast.title}</Text>
                {toast.body && <Text tone="muted">{toast.body}</Text>}
              </Stack>
              <Button variant="quiet" aria-label={`Dismiss ${toast.title}`} onClick={() => onDismiss(toast.id)}>
                Dismiss
              </Button>
            </Stack>
          </Card>
        ))}
      </Stack>
    </div>
  );
}
