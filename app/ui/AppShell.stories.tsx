import { AppShell } from "./AppShell";
import { PaneBody, PaneHeader } from "./Pane";
import { Section } from "./Section";
import { Sidebar, SidebarGroup, SidebarItem } from "./Sidebar";
import { Text } from "./Text";

export default { component: AppShell };

const sidebar = (
  <Sidebar>
    <SidebarGroup>
      <SidebarItem icon="chat" active>
        Project chat
      </SidebarItem>
    </SidebarGroup>
  </Sidebar>
);

export const WithPanel = {
  render: () => (
    <AppShell
      sidebar={sidebar}
      aside={
        <Section compact title="Instructions">
          <Text>Use bun.</Text>
        </Section>
      }
    >
      <PaneHeader title="Project chat" />
      <PaneBody>
        <Text>Conversation</Text>
      </PaneBody>
    </AppShell>
  ),
};
export const NoPanel = {
  render: () => (
    <AppShell sidebar={sidebar}>
      <PaneHeader title="Project settings" />
      <PaneBody wide>
        <Text>Settings</Text>
      </PaneBody>
    </AppShell>
  ),
};
