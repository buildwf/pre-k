import { Stack } from "./Stack";

export default { component: Stack };

export const Column = {
  args: { children: ["first", "second", "third"].map((t) => <span key={t}>{t}</span>) },
};

export const Row = {
  args: {
    direction: "row",
    gap: 16,
    children: ["first", "second", "third"].map((t) => <span key={t}>{t}</span>),
  },
};
