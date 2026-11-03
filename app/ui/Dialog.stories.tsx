import { useState } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Stack } from "./Stack";
import { Text } from "./Text";
import { Window } from "./Window";

export default { component: Dialog };

// Open by default, so the story shows the dialog itself; the button reopens it after Cancel.
function DeleteThread() {
  const [open, setOpen] = useState(true);

  return (
    <Stack gap={12}>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete thread
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete this thread?">
        <Stack gap={16}>
          <Text>It can't be undone. Its messages are removed from every device.</Text>
          <Stack direction="row" gap={8}>
            <Button variant="danger" onClick={() => setOpen(false)}>
              Delete
            </Button>
            <Button variant="quiet" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Dialog>
    </Stack>
  );
}

export const Light = { render: () => <DeleteThread /> };

export const Dark = {
  render: () => (
    <Window scheme="dark">
      <DeleteThread />
    </Window>
  ),
};
