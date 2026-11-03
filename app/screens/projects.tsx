import { useState, type ReactNode } from "react";
import { rpc, useAgentModels, useCollection, useConnectors, useRpc } from "point/client";
import { eq, useLiveQuery } from "point/cloud/db";
import { linkFailure, repoFromInput } from "../projects/messages";
import { builderHarness, builderHarnesses, type BuilderHarness } from "../schemas/harness";
import type { Project, ProjectChange } from "../schemas/project";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Disclosure } from "../ui/Disclosure";
import { Field } from "../ui/Field";
import { EmptyState } from "../ui/EmptyState";
import { Heading } from "../ui/Heading";
import { List, ListItem } from "../ui/List";
import { Select } from "../ui/Select";
import { Stack } from "../ui/Stack";
import { Text } from "../ui/Text";
import { TextArea } from "../ui/TextArea";
import { TextField } from "../ui/TextField";


type LinkResult = { ok: true } | { ok: false; message: string };

// Links `text` (owner/name or a GitHub link) to the project: pre-k checks the token can see it and clones it.
async function linkRepo(projectId: string, text: string): Promise<LinkResult> {
  const repo = repoFromInput(text);
  const r = await rpc.github.linkRepo({ projectId, repo });

  return r.ok ? { ok: true } : { ok: false, message: linkFailure(r.failure.code, r.failure.detail, repo) };
}

// Shows the first-run form until a project exists, then the open project (the most recently opened) with a switcher
// and its settings above `children`.
export function Projects({ children }: { children: (project: Project) => ReactNode }) {
  const projects = useCollection("projects");
  const { data, isLoading } = useLiveQuery((q) =>
    q.from({ p: projects }).orderBy(({ p }) => p.lastOpenedAt, "desc"),
  );
  const [adding, setAdding] = useState(false);
  // A repo that couldn't be linked while creating: the project exists, and settings open on the Repository field.
  const [unlinked, setUnlinked] = useState<{ projectId: string; repo: string; message: string }>();

  if (isLoading) return null;

  const current = data[0];

  if (!current || adding)
    return (
      <NewProject
        first={!current}
        onDone={(failed) => {
          setUnlinked(failed);
          setAdding(false);
        }}
        onCancel={current ? () => setAdding(false) : undefined}
      />
    );

  const notice = unlinked?.projectId === current.id ? unlinked : undefined;

  return (
    <Stack gap={16}>
      <Stack direction="row" gap={8} align="center" justify="between" wrap>
        <Stack gap={4}>
          <Heading>{current.name}</Heading>
          <Text tone="muted">
            {current.repo ? `${current.repo} · ${current.defaultBranch ?? "default branch"}` : "No repository linked"}
          </Text>
        </Stack>
        <Stack direction="row" gap={8} align="center">
          {data.length > 1 && (
            <Select
              label="Project"
              value={current.id}
              options={data.map((p) => ({ value: p.id, label: p.name }))}
              onChange={(id) => void rpc.projects.open({ id })}
            />
          )}
          <Button onClick={() => setAdding(true)}>New project</Button>
        </Stack>
      </Stack>
      <Alert tone="attention" title={notice ? `Created ${current.name}, but ${notice.repo} isn't linked` : undefined}>
        {notice?.message}
      </Alert>
      {notice && (
        <RepositoryField key={current.id} project={current} initial={notice.repo} onLinked={() => setUnlinked(undefined)} />
      )}
      <Disclosure summary="Project settings">
        <ProjectSettings key={current.id} project={current} />
      </Disclosure>
      {children(current)}
    </Stack>
  );
}

function NewProject({
  first,
  onDone,
  onCancel,
}: {
  first: boolean;
  onDone: (unlinked?: { projectId: string; repo: string; message: string }) => void;
  onCancel?: (() => void) | undefined;
}) {
  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");
  const [instructions, setInstructions] = useState("");
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);
  // With a repository and no name, the project takes the repository's name.
  const repoName = repoFromInput(repo).split("/")[1] ?? "";
  const finalName = name.trim() || repoName;

  return (
    <Stack gap={24} maxWidth={560}>
      <Stack gap={8}>
        <Heading>{first ? "Start your first project" : "New project"}</Heading>
        <Text tone="muted">
          A project is one repository, the instructions every agent follows, and the threads that do the work. Ask for
          something in the project chat and an agent works on it in the repository.
        </Text>
      </Stack>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setProblem(undefined);
          const created = await rpc.projects.create({ name: finalName, instructions });

          if (!created.ok) {
            setBusy(false);
            setProblem(created.failure.code === "BAD_INPUT" ? "A project needs a name." : `Couldn't create it (${created.failure.code}).`);
            return;
          }
          const linked = repo.trim() ? await linkRepo(created.value.id, repo) : { ok: true as const };

          setBusy(false);
          onDone(linked.ok ? undefined : { projectId: created.value.id, repo: repoFromInput(repo), message: linked.message });
          document.querySelector("main")?.focus();
        }}
      >
        <Stack gap={16}>
          <Field label="Repository" hint="owner/name or a GitHub link. pre-k clones it once; each thread works on its own branch.">
            <TextField
              autoFocus
              value={repo}
              placeholder="buildwf/pre-k"
              onChange={(e) => setRepo(e.target.value)}
            />
          </Field>
          <GitHubStatus />
          <Field label="Name" error={problem}>
            <TextField value={name} placeholder={repoName || "My project"} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Instructions" hint="Every agent in this project reads these before it starts. You can change them later.">
            <TextArea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Use bun. Run bun run verify before landing a change."
            />
          </Field>
          <Stack direction="row" gap={8} justify="end">
            {onCancel && (
              <Button type="button" variant="quiet" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button variant="primary" type="submit" disabled={busy || !finalName}>
              {busy ? (repo.trim() ? "Linking repository…" : "Creating…") : "Create project"}
            </Button>
          </Stack>
        </Stack>
      </form>
    </Stack>
  );
}

// Whether pre-k can reach GitHub, and how to set it up when it can't. Shows nothing once it can.
function GitHubStatus() {
  const { connectors } = useConnectors();
  const github = connectors?.find((c) => c.name === "github");

  if (!github || github.connected) return null;

  return (
    <Alert tone="attention" title="GitHub isn't connected">
      {github.help}
    </Alert>
  );
}

// Each change saves on blur, so typing doesn't write a row per keystroke. A field shows the saved value until you
// edit it, so a change made elsewhere (the CLI, an agent, another window) shows here and a blur never writes it back.
function ProjectSettings({ project }: { project: Project }) {
  const [name, setName] = useState<string>();
  const [instructions, setInstructions] = useState<string>();
  const [status, setStatus] = useState("");

  const save = async (change: Omit<ProjectChange, "id">) => {
    const r = await rpc.projects.update({ id: project.id, ...change });

    setStatus(r.ok ? "Saved" : r.failure.code === "BAD_INPUT" ? "A project needs a name." : `Not saved (${r.failure.code}).`);
  };

  return (
    <Stack gap={16} padding={8}>
      <Repository project={project} />
      <Field label="Name">
        <TextField
          value={name ?? project.name}
          onChange={(e) => setName(e.target.value)}
          onBlur={async () => {
            if (name !== undefined && name !== project.name) await save({ name });
            setName(undefined);
          }}
        />
      </Field>
      <Field label="Instructions" hint="Applies to threads started after you change it.">
        <TextArea
          value={instructions ?? project.instructions}
          onChange={(e) => setInstructions(e.target.value)}
          onBlur={async () => {
            if (instructions !== undefined && instructions !== project.instructions) await save({ instructions });
            setInstructions(undefined);
          }}
        />
      </Field>
      <Field label="Coding agent" hint="New threads in this project run it. Threads already running keep theirs.">
        <Select
          value={project.harness ?? "claude-code"}
          options={builderHarness.options.map((h) => ({ value: h, label: builderHarnesses[h].label }))}
          onChange={(harness) => void save({ harness })}
        />
      </Field>
      <SignInState harness={project.harness ?? "claude-code"} />
      <Text tone="muted" role="status">
        {status}
      </Text>
      <Memory projectId={project.id} />
    </Stack>
  );
}

// The linked repository, with Change; or the field to link one.
function Repository({ project }: { project: Project }) {
  const [changing, setChanging] = useState(false);

  if (!project.repo || changing)
    return (
      <RepositoryField
        project={project}
        initial={project.repo ?? ""}
        onLinked={() => setChanging(false)}
        onCancel={project.repo ? () => setChanging(false) : undefined}
      />
    );

  return (
    <Stack gap={4}>
      <Text bold>Repository</Text>
      <Stack direction="row" gap={8} align="center" justify="between">
        <Text>
          {project.repo} · threads branch from {project.defaultBranch ?? "the default branch"}
        </Text>
        <Button variant="quiet" onClick={() => setChanging(true)}>
          Change
        </Button>
      </Stack>
    </Stack>
  );
}

function RepositoryField({
  project,
  initial,
  onLinked,
  onCancel,
}: {
  project: Project;
  initial: string;
  onLinked: () => void;
  onCancel?: (() => void) | undefined;
}) {
  const [text, setText] = useState(initial);
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await linkRepo(project.id, text);

        setBusy(false);
        setProblem(r.ok ? undefined : r.message);
        if (r.ok) onLinked();
      }}
    >
      <Stack gap={8}>
        <Stack direction="row" gap={8} align="end">
          <Field label="Repository" wide error={problem} hint={problem ? undefined : "owner/name or a GitHub link."}>
            <TextField value={text} placeholder="buildwf/pre-k" onChange={(e) => setText(e.target.value)} />
          </Field>
          {onCancel && (
            <Button type="button" variant="quiet" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={busy || !text.trim()}>
            {busy ? "Linking…" : "Link"}
          </Button>
        </Stack>
        <GitHubStatus />
      </Stack>
    </form>
  );
}


// Whether the picked agent can run here. Claude Code's saved /login isn't enough: a thread's sandbox can't read the
// keychain, so it needs a setup-token or a key (main says which, never the value).
function SignInState({ harness }: { harness: BuilderHarness }) {
  const models = useAgentModels(harness);
  const claude = useRpc(rpc.harnesses.claudeCredentials);
  const { signIn, cli } = builderHarnesses[harness];
  const credential = claude.data?.credential;
  const text =
    models.state === "loading"
      ? "Checking sign-in…"
      : models.state === "unauthenticated"
        ? `Not signed in. ${signIn}`
        : models.state === "empty"
          ? "Signed in, but this account has no models it can run."
          : models.state === "failed" && models.message?.includes("does not report its models")
            ? `pre-k can't check this agent's sign-in. If its threads fail to start: ${signIn}`
            : models.state === "failed"
              ? `Couldn't check sign-in (${models.message ?? "unknown error"}). Is \`${cli}\` installed and on PATH?`
              : harness !== "claude-code"
                ? "Signed in."
                : credential === "api-key"
                  ? "Ready: threads use your Anthropic API key, metered by pre-k."
                  : credential === "oauth-token"
                    ? "Ready: threads use your Claude subscription (setup-token)."
                    : `Signed in, but threads can't use the saved login. ${signIn}`;

  return (
    <Stack direction="row" gap={8} align="center" wrap>
      <Text tone="muted" role="status">
        {text}
      </Text>
      {models.state !== "loading" && models.state !== "ready" && (
        <Button variant="quiet" onClick={() => void models.refresh()}>
          Check again
        </Button>
      )}
    </Stack>
  );
}

// What agents saved for later threads (and what the person adds). Agents read it with `projects context`.
function Memory({ projectId }: { projectId: string }) {
  const memory = useCollection("memory");
  const { data } = useLiveQuery(
    (q) => q.from({ n: memory }).where(({ n }) => eq(n.projectId, projectId)).orderBy(({ n }) => n.at, "asc"),
  );
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string>();

  return (
    <Stack gap={8}>
      <Heading level={2}>Memory</Heading>
      {data.length === 0 ? (
        <EmptyState title="Nothing saved yet">
          Agents save what a later thread should know. You can add a note too.
        </EmptyState>
      ) : (
        <List label="Project memory">
          {data.map((n) => (
            <ListItem
              key={n.id}
              actions={
                <Button variant="quiet" onClick={() => void rpc.memory.remove({ id: n.id })}>
                  Remove
                </Button>
              }
            >
              <Text>{n.text}</Text>
              <Text tone="muted">
                {n.savedBy === "person" ? "you" : "a thread"} · {new Date(n.at).toLocaleDateString()}
              </Text>
            </ListItem>
          ))}
        </List>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await rpc.memory.save({ projectId, text });

          if (r.ok) setText("");
          setProblem(r.ok ? undefined : r.failure.code);
        }}
      >
        <Stack direction="row" gap={8} align="end">
          <Field label="Add a note" wide error={problem}>
            <TextField value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <Button type="submit" disabled={!text.trim()}>
            Add
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
