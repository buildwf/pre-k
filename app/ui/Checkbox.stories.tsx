import { Checkbox } from "./Checkbox";
import { Stack } from "./Stack";
import { Text } from "./Text";

export default { component: Checkbox };

export const Unchecked = {
  args: { checked: false, onChange: () => {}, children: "Show hidden files" },
};

export const Checked = {
  args: { checked: true, onChange: () => {}, children: "Show hidden files" },
};

export const Done = {
  args: { checked: true, struck: true, onChange: () => {}, children: "Write the release notes" },
};

export const Disabled = {
  args: { checked: false, disabled: true, onChange: () => {}, children: "Sync (sign in first)" },
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
            <Checkbox checked={false} disabled={s === "disabled"} onChange={() => {}}>
              Show hidden files
            </Checkbox>
          </span>
        </Stack>
      ))}
    </Stack>
  ),
};
