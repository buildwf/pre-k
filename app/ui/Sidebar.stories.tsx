import { Sidebar, SidebarGroup, SidebarItem } from "./Sidebar";

export default { component: Sidebar };

export const Default = {
  render: () => (
    <Sidebar
      header={<strong>pre-k</strong>}
      footer={
        <SidebarGroup>
          <SidebarItem icon="settings">Project settings</SidebarItem>
        </SidebarGroup>
      }
    >
      <SidebarGroup>
        <SidebarItem icon="chat" active shortcut={{ label: "⌘1", aria: "Meta+1" }}>
          Project chat
        </SidebarItem>
        <SidebarItem icon="package" shortcut={{ label: "⌘2", aria: "Meta+2" }}>
          Delivered
        </SidebarItem>
      </SidebarGroup>
      <SidebarGroup label="Threads">
        <SidebarItem status="working" meta="working">
          Add a README badge
        </SidebarItem>
        <SidebarItem status="waiting" meta="needs you">
          Fix the Safari export button
        </SidebarItem>
        <SidebarItem status="success" meta="landed">
          Switch to bun
        </SidebarItem>
      </SidebarGroup>
    </Sidebar>
  ),
};
export const Empty = {
  render: () => (
    <Sidebar>
      <SidebarGroup label="Threads" empty="Ask in the project chat and the coordinator starts a thread for the work." />
    </Sidebar>
  ),
};
