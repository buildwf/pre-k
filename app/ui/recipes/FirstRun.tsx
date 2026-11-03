import { useState } from "react";
import { Button } from "../Button";
import { Field } from "../Field";
import { Heading } from "../Heading";
import { Stack } from "../Stack";
import { Text } from "../Text";
import { TextField } from "../TextField";
import { Window } from "../Window";

// Recipe: the first run. A welcome screen shown once, the first time the app opens: what the app does in two
// sentences, what it needs to start (a name and a workspace folder), and Continue, which saves them and moves on.

export function FirstRunRecipe() {
  // TODO: keep these in a store (point generate store setup name:string folder:string welcomed:boolean) with
  // useStore('setup'); pick the folder with rpc.point.dialog.openFolder() from point/client, whose result's value is
  // the chosen paths. Continue saves welcomed: true; the main window shows this screen while welcomed is false. When it gives way to the main screen, call
  // document.querySelector('main')?.focus() once the save succeeds (Window's main takes script focus) so keyboard and
  // screen-reader users start at the top of the new screen.
  const [name, setName] = useState("");
  const [folder] = useState("");
  const chooseFolder = () => {};
  const finish = () => {};

  return (
    <Window>
      <Stack padding={48} gap={24} maxWidth={480}>
        <Stack gap={8}>
          <Heading>Welcome</Heading>
          <Text tone="muted">
            Notes keeps your writing in one folder on this computer. Everything you write is saved as you type.
          </Text>
        </Stack>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            finish();
          }}
        >
          <Stack gap={16}>
            <Field label="Your name">
              <TextField autoFocus value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Stack direction="row" gap={8} align="end">
              <Field label="Workspace folder" wide>
                <TextField readOnly value={folder} placeholder="No folder chosen" />
              </Field>
              <Button type="button" onClick={chooseFolder}>
                Choose…
              </Button>
            </Stack>
            <Stack direction="row" justify="end">
              <Button variant="primary" type="submit" disabled={!name.trim() || !folder}>
                Continue
              </Button>
            </Stack>
          </Stack>
        </form>
      </Stack>
    </Window>
  );
}
