import { Component, Suspense, type ReactNode } from "react";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { ProgressBar } from "./ProgressBar";
import { Stack } from "./Stack";
import { Text } from "./Text";

/**
 * What a part of a window shows while its data loads and when loading it fails. Put it around anything that reads
 * with `useLiveSuspenseQuery` (point/cloud/db) or `use(promise)`: while the data is on its way it shows a progress
 * bar and a line saying what is loading, and if reading throws it shows an Alert with the message and a "Try again" button instead of a blank window.
 * `what` names the section for both states ("notes" gives "Loading notes…" and "Couldn't load notes"). Wrap each
 * independent section, so one failing list leaves the rest of the window working.
 *
 * @import import { Boundary } from '../../ui/Boundary'
 */
export function Boundary({ what, children }: { what?: string | undefined; children?: ReactNode }) {
  const name = what ?? "this";

  return (
    <Failure title={`Couldn't load ${name}`}>
      <Suspense
        fallback={
          <Stack gap={8}>
            <ProgressBar label={`Loading ${name}`} />
            <Text tone="muted">{what ? `Loading ${what}…` : "Loading…"}</Text>
          </Stack>
        }
      >
        {children}
      </Suspense>
    </Failure>
  );
}

// React only catches render errors in a class (https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary).
interface FailureState {
  failed: Error | undefined;
}

class Failure extends Component<{ title: string; children?: ReactNode }, FailureState> {
  override state: FailureState = { failed: undefined };

  static getDerivedStateFromError(failed: Error) {
    return { failed };
  }

  override render() {
    const { failed } = this.state;

    if (!failed) return this.props.children;

    return (
      <Stack gap={12}>
        <Alert tone="danger" title={this.props.title}>
          {failed.message}
        </Alert>
        <Stack direction="row">
          <Button onClick={() => this.setState({ failed: undefined })}>Try again</Button>
        </Stack>
      </Stack>
    );
  }
}
