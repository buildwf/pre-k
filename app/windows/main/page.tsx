import { useEffect, useState } from "react";
import { aria, label, matches, shortcuts, type Shortcut } from "../../lib/shortcuts";
import { ProjectPanel } from "../../screens/panel";
import { CommitView } from "../../screens/commit";
import { Delivered } from "../../screens/delivered";
import { OpenCommitContext } from "../../lib/navigation";
import type { CommitRef } from "../../schemas/delivery";
import type { z } from "zod";
import { GitHub } from "../../screens/github";
import { YourName } from "../../screens/you";
import { Memory, ProjectSettings, Projects, ProjectSwitcher } from "../../screens/projects";
import { ThreadNav, ThreadView } from "../../screens/threads";
import { AppShell } from "../../ui/AppShell";
import { Button } from "../../ui/Button";
import { Icon } from "../../ui/Icon";
import { PaneBody, PaneHeader } from "../../ui/Pane";
import { Section } from "../../ui/Section";
import { Sidebar, SidebarGroup, SidebarItem } from "../../ui/Sidebar";
import { Window } from "../../ui/Window";
import { ProjectChat } from "./ProjectChat";

const mac = navigator.platform.startsWith("Mac");

/** What the middle column shows. The project chat is home; a thread, Delivered and Settings open from the sidebar. */
type View =
  | { kind: "chat" }
  | { kind: "thread"; threadId: string }
  | { kind: "delivered" }
  | { kind: "settings" }
  | (z.infer<typeof CommitRef> & { kind: "commit"; back: Exclude<View, { kind: "commit" }> });

export default function Page() {
  return (
    <Window>
      <Projects>{(view) => <Workspace key={view.project.id} {...view} />}</Projects>
    </Window>
  );
}

function Workspace({ project, projects, newProject, notice }: Parameters<Parameters<typeof Projects>[0]["children"]>[0]) {
  const [view, setView] = useState<View>({ kind: "chat" });
  const [panel, setPanel] = useState(true);
  const openThread = (threadId: string) => setView({ kind: "thread", threadId });
  const openCommit = (c: z.infer<typeof CommitRef>) =>
    setView((v) => ({ kind: "commit", ...c, back: v.kind === "commit" ? v.back : v }));
  // Keyboard first, like Cursor and Linear: ⌘1 chat, ⌘2 Delivered, ⌘, settings, ⌘\\ the panel, ⇧⌘N a new project.
  useEffect(() => {
    const actions: [Shortcut, () => void][] = [
      [shortcuts.chat, () => setView({ kind: "chat" })],
      [shortcuts.delivered, () => setView({ kind: "delivered" })],
      [shortcuts.settings, () => setView({ kind: "settings" })],
      [shortcuts.panel, () => setPanel((open) => !open)],
      [shortcuts.newProject, newProject],
    ];
    const onKey = (e: KeyboardEvent) => {
      const hit = actions.find(([shortcut]) => matches(e, shortcut, mac));
      if (!hit) return;
      e.preventDefault();
      hit[1]();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newProject]);
  const keys = (shortcut: Shortcut) => ({ label: label(shortcut, mac), aria: aria(shortcut, mac) });
  const repo = project.repo ? `${project.repo} · ${project.defaultBranch ?? "default branch"}` : "No repository linked";
  const panelToggle = (
    <Button
      size="icon"
      variant="quiet"
      aria-label={panel ? "Hide project panel" : "Show project panel"}
      aria-keyshortcuts={aria(shortcuts.panel, mac)}
      title={`${panel ? "Hide" : "Show"} the project panel (${label(shortcuts.panel, mac)})`}
      aria-pressed={panel}
      onClick={() => setPanel(!panel)}
    >
      <Icon name="panelRight" />
    </Button>
  );

  return (
    <OpenCommitContext.Provider value={openCommit}>
    <AppShell
      sidebar={
        <Sidebar
          header={<ProjectSwitcher project={project} projects={projects} onNew={newProject} />}
          footer={
            <SidebarGroup>
              <SidebarItem
                icon="settings"
                active={view.kind === "settings"}
                shortcut={keys(shortcuts.settings)}
                onClick={() => setView({ kind: "settings" })}
              >
                Project settings
              </SidebarItem>
            </SidebarGroup>
          }
        >
          <SidebarGroup>
            <SidebarItem
              icon="chat"
              active={view.kind === "chat"}
              shortcut={keys(shortcuts.chat)}
              onClick={() => setView({ kind: "chat" })}
            >
              Project chat
            </SidebarItem>
            <SidebarItem
              icon="package"
              active={view.kind === "delivered"}
              shortcut={keys(shortcuts.delivered)}
              onClick={() => setView({ kind: "delivered" })}
            >
              Delivered
            </SidebarItem>
          </SidebarGroup>
          <ThreadNav projectId={project.id} open={view.kind === "thread" ? view.threadId : undefined} onOpen={openThread} />
        </Sidebar>
      }
      aside={
        view.kind === "chat" && panel ? (
          <ProjectPanel project={project} onEdit={() => setView({ kind: "settings" })} memory={<Memory projectId={project.id} compact />} />
        ) : undefined
      }
    >
      {view.kind === "chat" && (
        <ProjectChat
          projectId={project.id}
          subtitle={repo}
          actions={panelToggle}
          notice={notice}
          onOpenThread={openThread}
        />
      )}
      {view.kind === "thread" && <ThreadView key={view.threadId} threadId={view.threadId} />}
      {view.kind === "delivered" && (
        <>
          <PaneHeader title="Delivered" subtitle="Everything this project's threads landed, newest first" />
          <PaneBody>
            <Delivered projectId={project.id} onOpen={openThread} />
          </PaneBody>
        </>
      )}
      {view.kind === "settings" && (
        <>
          <PaneHeader title="Project settings" subtitle={repo} />
          <PaneBody wide>
            {notice}
            <Section title="GitHub">
              <GitHub project={project} link={false} />
            </Section>
            <ProjectSettings project={project} />
            <Section title="You">
              <YourName />
            </Section>
          </PaneBody>
        </>
      )}
      {view.kind === "commit" && (
        <CommitView key={view.sha} repo={view.repo} sha={view.sha} onBack={() => setView(view.back)} />
      )}
    </AppShell>
    </OpenCommitContext.Provider>
  );
}
