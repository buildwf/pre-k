import { Badge } from "./Badge";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { PaneBody, PaneHeader } from "./Pane";
import { Text } from "./Text";

export default { component: PaneHeader };

export const Header = { args: { title: "Project chat", subtitle: "buildwf/pre-k · main" } };
export const WithBadgeAndActions = {
  args: {
    title: "Add a README badge",
    badge: <Badge tone="info">working</Badge>,
    subtitle: "asked by Zack · pre-k/add-readme-badge · $0.12",
    actions: (
      <Button size="sm" variant="quiet">
        <Icon name="pause" size={14} />
        Pause
      </Button>
    ),
  },
};
export const Body = {
  render: () => (
    <PaneBody>
      <Text>The view's content, in a centered reading column.</Text>
    </PaneBody>
  ),
};
