import { TextArea } from "./TextArea";
import { Stack } from "./Stack";
import { Text } from "./Text";

export default { component: TextArea };

export const Empty = { args: { placeholder: '{"name": "...", "instructions": "..."}' } };

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
            <TextArea aria-label={`Instructions, ${s}`} placeholder="instructions" disabled={s === "disabled"} />
          </span>
        </Stack>
      ))}
    </Stack>
  ),
};
