import { TextField } from "./TextField";
import { Stack } from "./Stack";
import { Text } from "./Text";

export default { component: TextField };

export const Empty = { args: { placeholder: "ask the coder" } };
export const Filled = { args: { "aria-label": "Folder", defaultValue: "/Users/me/code/app" } };

export const Wide = {
  args: { wide: true, placeholder: "ask the coder (a message mid-turn steers it)" },
};

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
            <TextField aria-label={`Ask the coder, ${s}`} placeholder="ask the coder" disabled={s === "disabled"} />
          </span>
        </Stack>
      ))}
    </Stack>
  ),
};
