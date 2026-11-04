import { CommandPalette } from "./CommandPalette";

export default { component: CommandPalette };

const noop = () => {};

export const Default = {
  render: () => (
    <CommandPalette
      open
      onOpenChange={noop}
      groups={[
        {
          heading: "Go to",
          items: [
            { id: "chat", label: "Project chat", icon: "chat", detail: "⌘1", onSelect: noop },
            { id: "delivered", label: "Delivered", icon: "package", detail: "⌘2", onSelect: noop },
          ],
        },
        {
          heading: "Threads",
          items: [
            { id: "t1", label: "Add a README badge", status: "working", detail: "working", onSelect: noop },
            { id: "t2", label: "Fix the Safari export button", status: "danger", detail: "failed", onSelect: noop },
          ],
        },
        {
          heading: "Settings",
          items: [{ id: "appearance-dark", label: "Appearance: Dark", icon: "moon", keywords: ["theme"], onSelect: noop }],
        },
      ]}
    />
  ),
};
