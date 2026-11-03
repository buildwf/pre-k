import { useState } from "react";
import { Button } from "../Button";
import { EmptyState } from "../EmptyState";
import { Field } from "../Field";
import { Heading } from "../Heading";
import { Select } from "../Select";
import { Stack } from "../Stack";
import { TextArea } from "../TextArea";
import { TextField } from "../TextField";
import { Window } from "../Window";

// Recipe: one item's detail, as an edit form. Its name as the title, a Field for each value (an error shows under the
// one that is wrong), and the actions at the end: Save and Cancel together, Delete apart from them. An EmptyState
// while there is nothing to show.

type Status = "draft" | "review" | "published";

const statuses = [
  { value: "draft", label: "Draft" },
  { value: "review", label: "In review" },
  { value: "published", label: "Published" },
] as const;

type Item = { id: string; name: string; owner: string; notes: string; status: Status };

// Sample: the story's item. point generate window starts this empty, so the window opens on its EmptyState.
const sampleItems: Item[] = [
  {
    id: "1",
    name: "Q4 launch plan",
    owner: "ada@",
    notes: "Ship the desktop build first, then the web preview.",
    status: "review",
  },
];

export function DetailRecipe() {
  // TODO: replace with the item from useRpc / rpc.<router>.get for one kept in main, or useQuery(api.<table>.get, { id })
  // for a cloud table, and save with rpc.<router>.update or useMutation(api.<table>.update).
  const [items, setItems] = useState<Item[]>(sampleItems);
  const item = items[0];
  // What the person has typed since the last save; Cancel throws it away.
  const [draft, setDraft] = useState<Partial<Item>>({});

  if (!item)
    return (
      <Window>
        <Stack padding={24} gap={24} maxWidth={560}>
          <EmptyState title="Nothing to show yet">Pick something to see its details here.</EmptyState>
        </Stack>
      </Window>
    );

  const shown = { ...item, ...draft };

  const ownerError = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(shown.owner)
    ? undefined
    : "Enter a full email address, like ada@example.com";

  const save = () => {
    setItems(items.map((i) => (i.id === item.id ? shown : i)));
    setDraft({});
  };

  return (
    <Window>
      <Stack padding={24} gap={24} maxWidth={560}>
        <Heading>{shown.name || "Untitled"}</Heading>
        <Stack gap={16}>
          <Field label="Name">
            <TextField value={shown.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="Owner" error={ownerError}>
            <TextField
              type="email"
              value={shown.owner}
              onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
            />
          </Field>
          <Field label="Notes" hint="Shown to everyone on the project.">
            <TextArea value={shown.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </Field>
          <Field label="Status">
            <Select value={shown.status} options={statuses} onChange={(status) => setDraft({ ...draft, status })} />
          </Field>
        </Stack>
        <Stack direction="row" gap={8} align="center" justify="between">
          <Stack direction="row" gap={8}>
            <Button variant="primary" disabled={ownerError !== undefined} onClick={save}>
              Save
            </Button>
            <Button variant="quiet" onClick={() => setDraft({})}>
              Cancel
            </Button>
          </Stack>
          <Button variant="danger" onClick={() => setItems(items.filter((i) => i.id !== item.id))}>
            Delete
          </Button>
        </Stack>
      </Stack>
    </Window>
  );
}
