import { Stack } from "./Stack";
import { Text } from "./Text";
import { UnreadCount } from "./UnreadCount";

export default { component: UnreadCount };

export const Default = { args: { count: 3 } };
export const Capped = { args: { count: 120, max: 99 } };

export const InARow = {
  render: () => (
    <Stack direction="row" gap={8} align="center">
      <Text>Assigned to me</Text>
      <UnreadCount count={2} what="new cards" />
    </Stack>
  ),
};
