import { Button } from "./Button";
import { Section } from "./Section";
import { Text } from "./Text";

export default { component: Section };

export const Default = {
  args: { title: "Repository", description: "Threads clone it and work on their own branch.", children: <Text>buildwf/pre-k</Text> },
};
export const WithAction = {
  args: {
    title: "Instructions",
    compact: true,
    action: (
      <Button size="sm" variant="quiet">
        Edit
      </Button>
    ),
    children: <Text>Use bun. Land small commits on main.</Text>,
  },
};
