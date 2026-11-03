import { Avatar } from "./Avatar";
import { Stack } from "./Stack";

export default { component: Avatar };

export const Initials = { args: { name: "Ada Lovelace" } };
export const OneName = { args: { name: "Ada" } };
export const NoName = { args: { name: "" } };

// A picture that does not load (or is not https) falls back to the initials.
export const BrokenPicture = { args: { name: "Ada Lovelace", picture: "https://example.invalid/missing.png" } };

export const Sizes = {
  render: () => (
    <Stack direction="row" gap={12} align="center">
      <Avatar name="Ada Lovelace" size="small" />
      <Avatar name="Ada Lovelace" />
      <Avatar name="Ada Lovelace" size="large" />
    </Stack>
  ),
};
