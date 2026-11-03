import { useRef } from "react";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { ProgressBar } from "./ProgressBar";
import { Stack } from "./Stack";
import { Text } from "./Text";

/** What `useUpdate()` from point/client returns: where the app is in updating itself, and what the person can do. */
export interface UpdateState {
  /** `off`: updates aren't set up here (point dev, no feed, an unsigned macOS build); see `reason`. */
  status: "off" | "idle" | "checking" | "downloading" | "ready" | "error";
  /** The new version, once known. */
  version?: string | undefined;
  /** 0 to 1 while downloading; leave it out when unknown. */
  progress?: number | undefined;
  /** What went wrong, as a sentence, when `status` is `error`. */
  error?: string | undefined;
  /** Why `status` is `off`. */
  reason?: string | undefined;
  check(): void;
  install(): void;
}

/**
 * The app's update notice: nothing while updates are off or the app is up to date, then a progress bar while the new
 * version downloads by itself, "Version 2.1 is ready" with Restart, and a failure with Try again. Pass it what
 * `useUpdate()` returns and put it at the top of the main window: `<UpdateBanner update={useUpdate()} />`. It stays
 * mounted, so screen readers announce each change.
 *
 * @import import { UpdateBanner } from '../../ui/UpdateBanner'
 */
export function UpdateBanner({ update }: { update: UpdateState }) {
  const { status, version, progress, error } = update;
  const retried = useRef<HTMLDivElement>(null);
  const named = version ? `Version ${version}` : "A new version";

  const percent =
    progress === undefined ? "" : ` · ${Math.round(progress * 100)}%`;

  // Two regions that are always there, one for progress and one for failure, because a screen reader announces text
  // put into a region that already exists and often ignores a region whose role changed.
  return (
    <>
      <Alert
        title={
          status === "ready"
            ? `${named} is ready`
            : status === "downloading"
              ? `Downloading ${named.toLowerCase()}${percent}`
              : status === "checking"
                ? "Checking for updates…"
                : undefined
        }
      >
        {status === "ready" ? (
          <Stack direction="row" gap={12} align="center" justify="between" wrap>
            <Text tone="muted">
              Restart to update. The app closes and opens again.
            </Text>
            <Button variant="primary" onClick={update.install}>
              Restart
            </Button>
          </Stack>
        ) : status === "downloading" ? (
          <ProgressBar value={progress} label="Update download" />
        ) : undefined}
      </Alert>
      <div ref={retried} tabIndex={-1}>
        <Alert
          tone="danger"
          title={status === "error" ? "Couldn't update" : undefined}
        >
          {status === "error" ? (
            <Stack
              direction="row"
              gap={12}
              align="center"
              justify="between"
              wrap
            >
              <Text>{error ?? "Something went wrong while updating."}</Text>
              <Button
                onClick={() => {
                  // Try again disappears while the check runs, so focus moves to the notice instead of the page.
                  retried.current?.focus();
                  update.check();
                }}
              >
                Try again
              </Button>
            </Stack>
          ) : undefined}
        </Alert>
      </div>
    </>
  );
}
