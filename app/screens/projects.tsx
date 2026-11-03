import { useState, type ReactNode } from "react";
import { rpc, useCollection } from "point/client";
import { useLiveQuery } from "point/cloud/db";
import type { Project, ProjectChange } from "../schemas/project";
import { Button } from "../ui/Button";
import { Disclosure } from "../ui/Disclosure";
import { Field } from "../ui/Field";
import { Heading } from "../ui/Heading";
import { Select } from "../ui/Select";
import { Stack } from "../ui/Stack";
import { Text } from "../ui/Text";
import { TextArea } from "../ui/TextArea";
import { TextField } from "../ui/TextField";


// Shows the first-run form until a project exists, then the open project (the most recently opened) with a switcher
// and its settings above `children`.
export function Projects({ children }: { children: (project: Project) => ReactNode }) {
  const projects = useCollection("projects");
  const { data, isLoading } = useLiveQuery((q) =>
    q.from({ p: projects }).orderBy(({ p }) => p.lastOpenedAt, "desc"),
  );
  const [adding, setAdding] = useState(false);

  if (isLoading) return null;

  const current = data[0];

  if (!current || adding)
    return <NewProject onDone={() => setAdding(false)} onCancel={current ? () => setAdding(false) : undefined} />;

  return (
    <Stack gap={16}>
      <Stack direction="row" gap={8} align="center" justify="between" wrap>
        <Heading>{current.name}</Heading>
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
      <Disclosure summary="Project settings">
        <ProjectSettings key={current.id} project={current} />
      </Disclosure>
      {children(current)}
    </Stack>
  );
}

function NewProject({ onDone, onCancel }: { onDone: () => void; onCancel?: (() => void) | undefined }) {
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [problem, setProblem] = useState<string>();

  return (
    <Stack gap={24} maxWidth={560}>
      <Stack gap={8}>
        <Heading>New project</Heading>
        <Text tone="muted">
          A project holds a repository, the instructions every agent follows, and the threads that do the work.
        </Text>
      </Stack>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await rpc.projects.create({ name, instructions });

          if (r.ok) {
            onDone();
            document.querySelector("main")?.focus();
          } else setProblem(r.failure.code);
        }}
      >
        <Stack gap={16}>
          <Field label="Name" error={problem}>
            <TextField autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Instructions" hint="Every agent in this project reads these first. You can change them later.">
            <TextArea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Use pnpm. Keep pull requests small."
            />
          </Field>
          <Stack direction="row" gap={8} justify="end">
            {onCancel && (
              <Button type="button" variant="quiet" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button variant="primary" type="submit" disabled={!name.trim()}>
              Create project
            </Button>
          </Stack>
        </Stack>
      </form>
    </Stack>
  );
}

// Each change saves on blur, so typing doesn't write a row per keystroke.
function ProjectSettings({ project }: { project: Project }) {
  const [name, setName] = useState(project.name);
  const [instructions, setInstructions] = useState(project.instructions);
  const [status, setStatus] = useState("");

  const save = async (change: Omit<ProjectChange, "id">) => {
    const r = await rpc.projects.update({ id: project.id, ...change });

    setStatus(r.ok ? "Saved" : r.failure.code === "BAD_INPUT" ? "A project needs a name" : r.failure.code);
  };

  return (
    <Stack gap={16} padding={8}>
      <Field label="Name">
        <TextField
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== project.name && void save({ name })}
        />
      </Field>
      <Field label="Instructions" hint="Applies to threads started after you change it.">
        <TextArea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          onBlur={() => instructions !== project.instructions && void save({ instructions })}
        />
      </Field>
      <Text tone="muted" role="status">
        {status}
      </Text>
    </Stack>
  );
}
