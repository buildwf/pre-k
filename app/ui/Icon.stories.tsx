import { Icon } from "./Icon";
import { Stack } from "./Stack";

export default { component: Icon };

export const Default = { args: { name: "chat" } };
export const Large = { args: { name: "settings", size: 20 } };

export const All = {
  render: () => (
    <Stack direction="row" gap={12} wrap>
      {(
        [
          "plus", "chat", "settings", "chevronDown", "chevronsUpDown", "more", "panelRight", "commit", "pullRequest",
          "arrowUp", "stop", "pause", "play", "check", "x", "book", "brain", "package", "terminal", "folder",
          "external", "trash",
        ] as const
      ).map((name) => (
        <Icon key={name} name={name} />
      ))}
    </Stack>
  ),
};
