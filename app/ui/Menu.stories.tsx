import { Icon } from "./Icon";
import { Menu } from "./Menu";

export default { component: Menu };

const noop = () => {};

export const More = {
  args: {
    label: "Thread actions",
    trigger: <Icon name="more" />,
    items: [
      { label: "Cancel the turn", onSelect: noop },
      { label: "Mark done", onSelect: noop, separated: true },
      { label: "Mark failed", onSelect: noop, danger: true },
    ],
  },
};
export const Disabled = {
  args: { label: "Thread actions", trigger: <Icon name="more" />, items: [{ label: "Resume", onSelect: noop, disabled: true }] },
};
export const Wide = {
  args: { wide: true, heading: "Projects", trigger: "pre-k", items: [{ label: "dedworc", onSelect: noop }] },
};
