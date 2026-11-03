import { useEffect, useRef } from "react";
import { AccountMenu } from "./AccountMenu";
import { Heading } from "./Heading";
import { Stack } from "./Stack";

export default { component: AccountMenu };

const noop = () => undefined;

// Where it goes: the right end of a window's header row.
function Header({ children }: { children: React.ReactNode }) {
  return (
    <Stack padding={24} gap={16}>
      <Stack direction="row" justify="between" align="center">
        <Heading>Notes</Heading>
        {children}
      </Stack>
    </Stack>
  );
}

const ada = { name: "Ada Lovelace", email: "ada@example.com", onSignIn: noop, onSignOut: noop };

export const SignedOut = { render: () => <Header><AccountMenu {...ada} status="signedOut" /></Header> };
export const Failed = { render: () => <Header><AccountMenu {...ada} status="signedOut" error="The provider answered access_denied." /></Header> };
export const SigningIn = { render: () => <Header><AccountMenu {...ada} status="signingIn" /></Header> };
export const SignedIn = { render: () => <Header><AccountMenu {...ada} status="signedIn" /></Header> };

function Opened() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[popover]")?.showPopover();
  }, []);

  return (
    <div ref={ref}>
      <Header><AccountMenu {...ada} status="signedIn" /></Header>
    </div>
  );
}

export const Open = { render: () => <Opened /> };
