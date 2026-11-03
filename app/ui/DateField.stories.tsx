import { useState } from "react";
import { DateField } from "./DateField";
import { Field } from "./Field";
import { Stack } from "./Stack";
import { Text } from "./Text";

export default { component: DateField };

function Picked({
  start,
  ...range
}: {
  start: string;
  min?: string;
  max?: string;
}) {
  const [value, setValue] = useState(start);

  return (
    <Field label="Due date">
      <DateField value={value} onChange={setValue} {...range} />
    </Field>
  );
}

export const Empty = { render: () => <Picked start="" /> };

export const Filled = {
  render: () => <Picked start="2026-11-02" min="2026-01-01" max="2026-12-31" />,
};

// Every interaction state side by side, forced with storybook-addon-pseudo-states, so a screenshot shows them all.
const states = ["rest", "hover", "focus", "disabled"] as const;

export const States = {
  parameters: {
    pseudo: {
      hover: ['[data-state="hover"] *'],
      focusVisible: ['[data-state="focus"] *'],
    },
  },
  render: () => (
    <Stack direction="row" gap={16} align="end">
      {states.map((s) => (
        <Stack key={s} gap={4}>
          <Text tone="muted">{s}</Text>
          <span data-state={s}>
            <DateField
              aria-label={`Due date, ${s}`}
              value="2026-11-02"
              onChange={() => {}}
              disabled={s === "disabled"}
            />
          </span>
        </Stack>
      ))}
    </Stack>
  ),
};
