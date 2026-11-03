import { Select } from "./Select";
import { Stack } from "./Stack";
import { Text } from "./Text";

const models = [
  { value: "default", label: "Default model" },
  { value: "fast", label: "Fast" },
  { value: "thorough", label: "Thorough" },
];

export default { component: Select };

export const Default = {
  args: { value: "default", options: models, label: "model", onChange: () => {} },
};

export const Disabled = {
  args: { value: "fast", options: models, label: "model", disabled: true, onChange: () => {} },
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
            <Select
              value="fast"
              options={models}
              label="model"
              disabled={s === "disabled"}
              onChange={() => {}}
            />
          </span>
        </Stack>
      ))}
    </Stack>
  ),
};
