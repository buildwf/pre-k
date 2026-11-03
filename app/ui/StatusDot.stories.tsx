import { StatusDot } from "./StatusDot";
import { Stack } from "./Stack";
import { Text } from "./Text";

export default { component: StatusDot };

export const Working = { args: { tone: "working", label: "working" } };
export const Waiting = { args: { tone: "waiting", label: "needs you" } };
export const Success = { args: { tone: "success", label: "landed" } };
export const Danger = { args: { tone: "danger", label: "failed" } };
export const Idle = { args: { tone: "idle", label: "idle" } };

export const All = {
  render: () => (
    <Stack gap={8}>
      {(["working", "waiting", "success", "danger", "idle"] as const).map((tone) => (
        <Stack key={tone} direction="row" gap={8} align="center">
          <StatusDot tone={tone} />
          <Text>{tone}</Text>
        </Stack>
      ))}
    </Stack>
  ),
};
