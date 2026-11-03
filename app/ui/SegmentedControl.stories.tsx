import { SegmentedControl } from "./SegmentedControl";
import { Stack } from "./Stack";
import { Text } from "./Text";

const filters = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
];

export default { component: SegmentedControl };

export const Default = {
  args: { value: "all", options: filters, label: "filter", onChange: () => {} },
};

export const SecondSelected = {
  args: { value: "open", options: filters, label: "filter", onChange: () => {} },
};

export const Disabled = {
  args: { value: "all", options: filters, label: "filter", disabled: true, onChange: () => {} },
};

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
            <SegmentedControl value="open" options={filters} label="filter" onChange={() => {}} />
          </span>
        </Stack>
      ))}
    </Stack>
  ),
};
