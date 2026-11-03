import { Button } from "./Button";
import { Stack } from "./Stack";
import { Text } from "./Text";

export default { component: Button };

export const Default = { args: { children: "new thread" } };
export const Primary = { args: { variant: "primary", children: "send" } };
export const Danger = { args: { variant: "danger", children: "delete thread" } };
export const Quiet = { args: { variant: "quiet", children: "cancel" } };
export const Accent = { args: { accent: "#6d28d9", children: "as Reviewer" } };
export const Submit = { args: { type: "submit", children: "send" } };
export const Disabled = { args: { disabled: true, children: "resume" } };

// Every interaction state side by side, forced with storybook-addon-pseudo-states, so a screenshot shows them all.
const states = ["rest", "hover", "focus", "pressed", "disabled"] as const;

export const States = {
  parameters: {
    pseudo: {
      hover: ['[data-state="hover"] *'],
      focusVisible: ['[data-state="focus"] *'],
      active: ['[data-state="pressed"] *'],
    },
  },
  render: () => (
    <Stack gap={12}>
      {(["default", "primary", "danger", "quiet"] as const).map((variant) => (
        <Stack key={variant} direction="row" gap={16} align="end">
          {states.map((s) => (
            <Stack key={s} gap={4}>
              <Text tone="muted">{s}</Text>
              <span data-state={s}>
                <Button variant={variant} disabled={s === "disabled"}>
                  {variant}
                </Button>
              </span>
            </Stack>
          ))}
        </Stack>
      ))}
    </Stack>
  ),
};
