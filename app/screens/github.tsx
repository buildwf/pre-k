import { useState } from "react";
import { rpc, useConnectors, useRpc } from "point/client";
import type { Project } from "../schemas/project";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Heading } from "../ui/Heading";
import { Stack } from "../ui/Stack";
import { Text } from "../ui/Text";
import { TextField } from "../ui/TextField";

// Where a token the person didn't connect here comes from.
const source = (c: "person" | "env" | "keychain" | null) =>
  c === "env" ? " (from GITHUB_TOKEN)" : c === "keychain" ? " (from the keychain)" : "";

/**
 * The project's GitHub (pre-k#9, #10): connect an account with GitHub's device flow, see who pre-k acts as, and link
 * the repository its threads land on. The token stays in main; this only shows the code to type and the login.
 */
// `link` false leaves out the Repository field, for Project settings, which links the repository in its own section.
export function GitHub({ project, link = true }: { project: Project; link?: boolean }) {
  const { connectors, pending, error, connect, cancel, disconnect } = useConnectors();
  const github = connectors?.find((c) => c.name === "github");
  const me = useRpc(rpc.github.me);

  if (!github) return null;

  const login = github.connected === null ? undefined : me.data?.login;

  return (
    <Stack gap={12}>
      {link && <Heading level={2}>GitHub</Heading>}
      {login ? (
        <Stack direction="row" gap={8} align="center" justify="between" wrap>
          <Text>
            Connected as <Text mono>{login}</Text>
            <Text tone="muted">{source(github.connected)}</Text>
          </Text>
          {github.connected === "person" && (
            <Button variant="quiet" onClick={() => void disconnect("github").then(() => me.refetch())}>
              Disconnect
            </Button>
          )}
        </Stack>
      ) : pending ? (
        <Stack gap={8}>
          {pending.code && (
            <Text>
              Enter <Text mono bold>{pending.code}</Text> on the GitHub page that opened.
            </Text>
          )}
          <Text tone="muted" role="status">
            Waiting for GitHub…
          </Text>
          <Stack direction="row" gap={8}>
            <Button onClick={cancel}>Cancel</Button>
          </Stack>
        </Stack>
      ) : (
        <Stack gap={8}>
          <Text tone="muted">Threads clone, push and land on main as the account you connect.</Text>
          <Stack direction="row" gap={8}>
            <Button
              variant="primary"
              disabled={!github.canConnect}
              onClick={() => void connect("github").then(() => me.refetch())}
            >
              Connect GitHub
            </Button>
          </Stack>
          {!github.canConnect && (
            <Text tone="muted">Connecting turns on once pre-k has its GitHub OAuth app. Until then it uses GITHUB_TOKEN.</Text>
          )}
          {me.failure?.code === "UNREACHABLE" && (
            <Stack direction="row" gap={8} align="center">
              <Text tone="muted">Can't reach GitHub right now.</Text>
              <Button variant="quiet" onClick={() => me.refetch()}>
                Try again
              </Button>
            </Stack>
          )}
          {me.failure?.code === "TOKEN_REJECTED" && (
            <Text tone="danger">GitHub refused the saved token{source(github.connected)}. Connect again, or replace it.</Text>
          )}
          {error && <Text tone="danger">{error}</Text>}
        </Stack>
      )}
      {login && link && <LinkRepo key={project.id} project={project} />}
    </Stack>
  );
}

function problem(code: string): string {
  switch (code) {
    case "REPO_NOT_VISIBLE":
      return "GitHub doesn't show that repository to this account. Check the name, or that the account can see it.";
    case "BAD_INPUT":
      return "Write it as owner/name.";
    case "CLONE_FAILED":
      return "Cloning failed. Try again, or check the network.";
    case "GITHUB_FAILED":
      return "GitHub answered with an error. Try again.";
    case "CONNECTOR_NOT_CONNECTED":
      return "Connect GitHub first.";
    default:
      return code;
  }
}

function LinkRepo({ project }: { project: Project }) {
  const [repo, setRepo] = useState(project.repo ?? "");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string>();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await rpc.github.linkRepo({ projectId: project.id, repo: repo.trim() });

        setBusy(false);
        setFailed(r.ok ? undefined : problem(r.failure.code));
      }}
    >
      <Stack gap={8}>
        <Stack direction="row" gap={8} align="end">
          <Field
            label="Repository"
            wide
            hint={
              project.repo
                ? `Threads land on ${project.repo}'s ${project.defaultBranch ?? "default branch"}.`
                : "owner/name. pre-k clones it once, and each thread works in its own copy."
            }
            error={failed}
          >
            <TextField value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="buildwf/pre-k-playground" />
          </Field>
          <Button type="submit" disabled={busy || !repo.trim() || repo.trim() === project.repo}>
            {busy ? "Linking…" : project.repo ? "Change" : "Link"}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
