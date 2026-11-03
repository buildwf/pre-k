import { useState } from "react";
import { Button } from "../Button";
import { Checkbox } from "../Checkbox";
import { EmptyState } from "../EmptyState";
import { Field } from "../Field";
import { Heading } from "../Heading";
import { List, ListItem } from "../List";
import { Stack } from "../Stack";
import { Text } from "../Text";
import { TextField } from "../TextField";
import { Window } from "../Window";

// Recipe: a list with an add form. The title and count, a one-line form that adds to the list, a List row per item
// with its check and a Delete, and an EmptyState while there is nothing.

type Item = { id: string; title: string; done: boolean };

// Sample: the story's rows. point generate window starts this empty, so the window opens on its EmptyState.
const sampleItems: Item[] = [
  { id: "1", title: "Write the release notes", done: true },
  { id: "2", title: "Record the demo", done: false },
  { id: "3", title: "Send the beta invites", done: false },
];

export function ListRecipe() {
  // TODO: replace with useStore('<name>') from point/client for a list kept on this machine, or with
  // useQuery(api.<table>.list, {}) and useMutation(api.<table>.create) from point/cloud/react for a cloud table.
  // Both are undefined until they load, so return null (or a Spinner) until then.
  const [items, setItems] = useState<Item[]>(sampleItems);

  const [title, setTitle] = useState("");
  // Only the row the person just added eases in. The rows already here stay still, and so does a later refresh.
  const [entered, setEntered] = useState<string | undefined>();

  const add = () => {
    if (!title.trim()) return;
    const id = String(Date.now());
    setItems([...items, { id, title: title.trim(), done: false }]);
    setEntered(id);
    setTitle("");
  };

  return (
    <Window>
      <Stack padding={24} gap={16} maxWidth={640}>
        <Stack direction="row" gap={8} align="baseline">
          <Heading>Items</Heading>
          <Text tone="muted">{items.length}</Text>
        </Stack>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Stack direction="row" gap={8} align="end">
            <Field label="New item" wide>
              <TextField
                wide
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs doing?"
              />
            </Field>
            <Button variant="primary" type="submit">
              Add
            </Button>
          </Stack>
        </form>
        {items.length ? (
          <List label="Items">
            {items.map((item) => (
              <ListItem
                key={item.id}
                enter={item.id === entered}
                actions={
                  <Button
                    variant="quiet"
                    aria-label={`Delete ${item.title}`}
                    onClick={() => setItems(items.filter((i) => i.id !== item.id))}
                  >
                    Delete
                  </Button>
                }
              >
                <Checkbox
                  checked={item.done}
                  struck
                  onChange={(done) =>
                    setItems(items.map((i) => (i.id === item.id ? { ...i, done } : i)))
                  }
                >
                  {item.title}
                </Checkbox>
              </ListItem>
            ))}
          </List>
        ) : (
          <EmptyState title="Nothing here yet">Add the first item above.</EmptyState>
        )}
      </Stack>
    </Window>
  );
}
