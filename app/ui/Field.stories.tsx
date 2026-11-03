import { Button } from "./Button";
import { Field } from "./Field";
import { Stack } from "./Stack";
import { TextArea } from "./TextArea";
import { TextField } from "./TextField";

export default { component: Field };

export const Default = {
  args: {
    label: "Repository",
    children: <TextField placeholder="/Users/you/code/app" />,
  },
};

export const Hint = {
  args: {
    label: "Name",
    hint: "Shown on threads and messages",
    children: <TextField />,
  },
};

export const WithError = {
  args: {
    label: "Repository",
    error: "No git repository at this path",
    children: <TextField defaultValue="/tmp/nothing" />,
  },
};

/** A whole form: Fields in a column 16 apart, the primary action last. */
export const Form = {
  // A 420px box, not Stack's maxWidth, which centers a page's column; a form story stays at the left edge.
  render: () => (
    <div style={{ width: 420 }}>
      <Stack gap={16} padding={24}>
        <Field label="Name">
          <TextField />
        </Field>
        <Field label="Instructions" hint="Appended to the agent's own">
          <TextArea />
        </Field>
        <Stack direction="row" gap={8}>
          <Button variant="primary" type="submit">
            Save persona
          </Button>
          <Button variant="quiet">Cancel</Button>
        </Stack>
      </Stack>
    </div>
  ),
};
