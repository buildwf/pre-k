import { Text } from "./Text";

export default { component: Text };

export const Default = { args: { children: "The coder finished in 12 turns." } };
export const Muted = { args: { tone: "muted", children: "running · $0.012" } };

export const Danger = {
  args: { tone: "danger", children: "budget_exceeded: the thread spent $1.00" },
};

export const Mono = { args: { mono: true, children: "files.read" } };
