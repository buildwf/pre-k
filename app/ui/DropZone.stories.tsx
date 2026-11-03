import { DropZone } from "./DropZone";
import { Stack } from "./Stack";
import { Text } from "./Text";

export default { component: DropZone };

export const One = { args: { onFiles: () => {} } };

export const Photos = {
  args: {
    onFiles: () => {},
    accept: "image/*",
    multiple: true,
    children: "Drop photos here or click to choose",
  },
};

export const Disabled = {
  args: { onFiles: () => {}, disabled: true, children: "Sign in to upload" },
};

export const Compact = { args: { onFiles: () => {}, compact: true, children: "Attach file" } };

// Every interaction state side by side, forced with storybook-addon-pseudo-states, so a screenshot shows them all.
const states = ["rest", "hover", "focus", "disabled"] as const;

export const States = {
  parameters: {
    pseudo: { hover: ['[data-state="hover"] *'], focusVisible: ['[data-state="focus"] *'] },
  },
  render: () => (
    <Stack direction="row" gap={16} align="end">
      {states.map((s) => (
        <Stack key={s} gap={4}>
          <Text tone="muted">{s}</Text>
          <span data-state={s}>
            <DropZone compact disabled={s === "disabled"} onFiles={() => {}}>
              Attach file
            </DropZone>
          </span>
        </Stack>
      ))}
    </Stack>
  ),
};
