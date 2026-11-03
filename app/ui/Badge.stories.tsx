import { Badge } from "./Badge";
import { Stack } from "./Stack";

export default { component: Badge };

export const Default = { args: { children: "idle" } };
export const Info = { args: { tone: "info", children: "working" } };
export const Success = { args: { tone: "success", children: "landed" } };
export const Warning = { args: { tone: "warning", children: "needs you" } };
export const Danger = { args: { tone: "danger", children: "failed" } };

export const Tones = {
  render: () => (
    <Stack direction="row" gap={8}>
      <Badge>idle</Badge>
      <Badge tone="info">working</Badge>
      <Badge tone="success">landed</Badge>
      <Badge tone="warning">needs you</Badge>
      <Badge tone="danger">failed</Badge>
    </Stack>
  ),
};
