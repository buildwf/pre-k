import { Disclosure } from "./Disclosure";
import { Stack } from "./Stack";
import { Text } from "./Text";

export default { component: Disclosure };

export const Closed = { args: { summary: "import persona", children: "Paste a persona as JSON." } };

// Every interaction state side by side, forced with storybook-addon-pseudo-states, so a screenshot shows them all.
const states = ["rest", "hover", "focus"] as const;

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
            <Disclosure summary="import persona">Paste a persona as JSON.</Disclosure>
          </span>
        </Stack>
      ))}
    </Stack>
  ),
};
