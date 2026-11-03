import { useId } from "react";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { Stack } from "./Stack";
import { Text } from "./Text";

/**
 * The account control for a window's header: a Sign in button while signed out, and once signed in the person's avatar,
 * which opens a small menu with their name, their email and Sign out. It is a native popover, so Escape and a click
 * outside close it and focus goes back to the avatar. `signingIn` shows a disabled Signing in… while the browser has the
 * person, and `error` says why a sign-in failed, with Try again. Bind it with the sign-in recipe (point generate window main --recipe sign-in adds app/windows/main/Account.tsx).
 *
 * @import import { AccountMenu } from '../../ui/AccountMenu'
 */
export function AccountMenu({
  status,
  name,
  email,
  picture,
  error,
  onSignIn,
  onSignOut,
}: {
  status: "signedOut" | "signingIn" | "signedIn";
  name: string;
  email: string;
  picture?: string | undefined;
  /** Why the last sign-in failed, shown beside the button while signed out. */
  error?: string | undefined;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const id = useId();

  if (status !== "signedIn")
    return (
      <Stack direction="row" gap={12} align="center">
        {/* Always rendered, so a failure put into it is announced. */}
        <Text role="status" tone="danger">
          {status === "signedOut" ? error : ""}
        </Text>
        <Button variant={status === "signedOut" ? "primary" : "default"} disabled={status === "signingIn"} onClick={onSignIn}>
          {status === "signingIn" ? "Signing in…" : error ? "Try again" : "Sign in"}
        </Button>
      </Stack>
    );

  const who = name || email || "Account";

  return (
    <>
      <button
        type="button"
        className="ui-account-trigger"
        popoverTarget={id}
        style={{ anchorName: `--ui-account-${id.replace(/[^a-zA-Z0-9]/g, "")}` }}
      >
        <Avatar name={who} picture={picture} />
        <span className="ui-sr-only">{`Account: ${who}`}</span>
      </button>
      <div
        id={id}
        popover="auto"
        role="group"
        aria-label="Account"
        className="ui-account-panel"
        style={{ positionAnchor: `--ui-account-${id.replace(/[^a-zA-Z0-9]/g, "")}` }}
      >
        <Stack gap={12}>
          <Stack direction="row" gap={12} align="center">
            <Avatar name={who} picture={picture} size="large" />
            <Stack gap={0}>
              <Text bold>{who}</Text>
              {email && who !== email && <Text tone="muted">{email}</Text>}
            </Stack>
          </Stack>
          <Button onClick={onSignOut}>Sign out</Button>
        </Stack>
      </div>
    </>
  );
}
