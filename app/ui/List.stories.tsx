import { useState } from "react";
import { Button } from "./Button";
import { Checkbox } from "./Checkbox";
import { List, ListItem } from "./List";
import { Stack } from "./Stack";
import { Text } from "./Text";

export default { component: List };

export const Default = {
  render: () => (
    <List label="To-dos">
      <ListItem actions={<Button variant="quiet">Delete</Button>}>
        <Checkbox checked struck onChange={() => {}}>
          Write the release notes
        </Checkbox>
      </ListItem>
      <ListItem actions={<Button variant="quiet">Delete</Button>}>
        <Checkbox checked={false} onChange={() => {}}>
          Record the demo
        </Checkbox>
      </ListItem>
      <ListItem actions={<Button variant="quiet">Delete</Button>}>
        <Checkbox checked={false} onChange={() => {}}>
          Send the beta invites
        </Checkbox>
      </ListItem>
    </List>
  ),
};

export const TextRows = {
  render: () => (
    <List label="Files">
      <ListItem actions={<Button variant="quiet">Open</Button>}>
        <Text mono>notes.md</Text>
        <Text tone="muted">2 KB</Text>
      </ListItem>
      <ListItem>
        <Text mono>todo.txt</Text>
        <Text tone="muted">340 B</Text>
      </ListItem>
    </List>
  ),
};

// The rows already on screen stay still. Add eases in only the row the person just added.
function AddedRows() {
  const [rows, setRows] = useState([
    { id: "1", title: "Write the release notes" },
    { id: "2", title: "Record the demo" },
  ]);

  const [entered, setEntered] = useState<string | undefined>();

  const add = () => {
    const id = String(Date.now());
    setRows([...rows, { id, title: "Send the beta invites" }]);
    setEntered(id);
  };

  return (
    <Stack gap={8}>
      <Button onClick={add}>Add</Button>
      <List label="To-dos">
        {rows.map((row) => (
          <ListItem key={row.id} enter={row.id === entered}>
            {row.title}
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}

export const JustAdded = { render: () => <AddedRows /> };

// A row in every state side by side, forced with storybook-addon-pseudo-states, so a screenshot shows them all.
const states = ["rest", "hover"] as const;

export const States = {
  parameters: { pseudo: { hover: ['[data-state="hover"] *'] } },
  render: () => (
    <Stack direction="row" gap={16}>
      {states.map((s) => (
        <Stack key={s} gap={4}>
          <Text tone="muted">{s}</Text>
          <span data-state={s}>
            <List>
              <ListItem actions={<Button variant="quiet">Delete</Button>}>Record the demo</ListItem>
            </List>
          </span>
        </Stack>
      ))}
    </Stack>
  ),
};
