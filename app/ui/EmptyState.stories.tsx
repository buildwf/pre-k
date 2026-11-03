import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

export default { component: EmptyState };

export const Default = {
  args: {
    title: "No threads yet",
    children: "Start one and the coder works in your repository while you watch.",
    action: <Button variant="primary">New thread</Button>,
  },
};

export const TitleOnly = { args: { title: "Nothing matches this filter" } };
