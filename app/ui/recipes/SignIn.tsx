import { useState } from "react";
import { Alert } from "../Alert";
import { Avatar } from "../Avatar";
import { Button } from "../Button";
import { Heading } from "../Heading";
import { ProgressBar } from "../ProgressBar";
import { Stack } from "../Stack";
import { Text } from "../Text";
import { Window } from "../Window";

// Recipe: sign in. One window for the whole account: signed out (a primary Sign in), waiting for the browser (a
// progress bar and what to do, announced politely), a failure (an Alert that says why, with Try again), and signed in
// (who, and Sign out). The sign-in itself happens in the system browser, so nothing here asks for a password.

type Status = "signedOut" | "signingIn" | "signedIn";

export function SignInRecipe() {
  // TODO: replace these with `const { state, signIn, signOut } = useDesktopSignIn()` from point/client (point.config.ts
  // needs `signIn: { issuer, clientId }`; point docs sign-in-providers): status is state?.status, who is state?.user.
  const [status, setStatus] = useState<Status>("signedOut");
  const [error, setError] = useState("");

  const signIn = async () => {
    setError("");
    setStatus("signingIn");
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setStatus("signedIn");
  };

  return (
    <SignInView
      status={status}
      name="Ada Lovelace"
      email="ada@example.com"
      picture=""
      error={error}
      onSignIn={() => void signIn()}
      onSignOut={() => {
        setError("");
        setStatus("signedOut");
      }}
    />
  );
}

/** The window for a sign-in at any point, from what the container holds: the stories draw each state with it. */
export function SignInView({
  status,
  name,
  email,
  picture,
  error,
  onSignIn,
  onSignOut,
}: {
  status: Status;
  /** Who is signed in, from the provider's claims. */
  name: string;
  email: string;
  /** The provider's picture claim, or empty: the initials show instead. */
  picture: string;
  /** Why the last sign-in failed, or empty. */
  error: string;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  return (
    <Window>
      <Stack padding={24} gap={16} maxWidth={480}>
        <Heading>{status === "signedIn" ? "Signed in" : "Sign in"}</Heading>
        {/* Always rendered, so the text put into it is what a screen reader announces. */}
        <Text role="status" tone="muted">
          {status === "signingIn" ? "Waiting for your browser. Finish signing in there." : ""}
        </Text>
        <Alert tone="danger" title={error ? "Couldn't sign in" : undefined}>
          {error}
        </Alert>
        {status === "signedOut" && (
          <Stack gap={12}>
            <Text tone="muted">Signing in opens your browser, and brings you back here when you are done.</Text>
            <Stack direction="row">
              <Button variant="primary" onClick={onSignIn}>
                {error ? "Try again" : "Sign in"}
              </Button>
            </Stack>
          </Stack>
        )}
        {status === "signingIn" && (
          <Stack gap={12}>
            <ProgressBar label="Signing in" />
            <Text tone="muted">This stops waiting after ten minutes.</Text>
          </Stack>
        )}
        {status === "signedIn" && (
          <Stack gap={12}>
            <Stack direction="row" gap={12} align="center">
              <Avatar name={name || email} picture={picture} size="large" />
              <Stack gap={4}>
                <Text bold>{name || email}</Text>
                {name && <Text tone="muted">{email}</Text>}
              </Stack>
            </Stack>
            <Stack direction="row">
              <Button onClick={onSignOut}>Sign out</Button>
            </Stack>
          </Stack>
        )}
      </Stack>
    </Window>
  );
}
