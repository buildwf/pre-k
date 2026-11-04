import { rpc } from "point/client";
import type { Project } from "../schemas/project";
import { useProjectThreads } from "./threads";
import { useSetTheme } from "./you";
import { stateLabel } from "../threads/labels";
import { CommandPalette, type PaletteGroup } from "../ui/CommandPalette";
import { label, shortcuts } from "../lib/shortcuts";

/** Where a palette pick goes: a view of the main window, or a section of Project settings to scroll to. */
export type Destination =
  | { kind: "chat" }
  | { kind: "delivered" }
  | { kind: "thread"; threadId: string }
  | { kind: "settings"; section?: string };

// Each settings section, with the words someone might type for it.
const settingSections: { title: string; keywords: string[] }[] = [
  { title: "Appearance", keywords: ["theme", "mode"] },
  { title: "GitHub", keywords: ["connect", "token", "account"] },
  { title: "Repository", keywords: ["repo", "link", "branch"] },
  { title: "General", keywords: ["name", "instructions"] },
  { title: "Coding agent", keywords: ["harness", "claude", "codex", "opencode", "model", "sign in"] },
  { title: "Memory", keywords: ["notes"] },
  { title: "You", keywords: ["your name", "profile"] },
];

/**
 * ⌘K: jump to a view, a thread of this project, another project or a settings section, or switch the appearance,
 * from the keyboard. The groups are built from the live threads and projects each time it opens.
 */
export function Palette({
  open,
  onOpenChange,
  project,
  projects,
  go,
  newProject,
  mac,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  projects: readonly Project[];
  go: (to: Destination) => void;
  newProject: () => void;
  mac: boolean;
}) {
  const threads = useProjectThreads(project.id);
  const setTheme = useSetTheme();

  const groups: PaletteGroup[] = [
    {
      heading: "Go to",
      items: [
        { id: "go-chat", label: "Project chat", icon: "chat", detail: label(shortcuts.chat, mac), onSelect: () => go({ kind: "chat" }) },
        {
          id: "go-delivered",
          label: "Delivered",
          icon: "package",
          detail: label(shortcuts.delivered, mac),
          onSelect: () => go({ kind: "delivered" }),
        },
        {
          id: "go-settings",
          label: "Project settings",
          icon: "settings",
          detail: label(shortcuts.settings, mac),
          onSelect: () => go({ kind: "settings" }),
        },
      ],
    },
    {
      heading: "Threads",
      items: threads.map((t) => ({
        id: `thread-${t.threadId}`,
        label: t.title,
        status: stateLabel[t.state].dot,
        detail: stateLabel[t.state].text,
        onSelect: () => go({ kind: "thread", threadId: t.threadId }),
      })),
    },
    {
      heading: "Projects",
      items: [
        ...projects
          .filter((p) => p.id !== project.id)
          .map((p) => ({
            id: `project-${p.id}`,
            label: `Switch to ${p.name}`,
            icon: "folder" as const,
            keywords: [p.name, p.repo ?? ""],
            onSelect: () => void rpc.projects.open({ id: p.id }),
          })),
        { id: "project-new", label: "New project", icon: "plus", detail: label(shortcuts.newProject, mac), onSelect: newProject },
      ],
    },
    {
      heading: "Settings",
      items: [
        ...settingSections.map((section) => ({
          id: `setting-${section.title}`,
          label: section.title,
          icon: "settings" as const,
          keywords: section.keywords,
          onSelect: () => go({ kind: "settings", section: section.title }),
        })),
        { id: "theme-light", label: "Appearance: Light", icon: "sun", keywords: ["theme"], onSelect: () => setTheme("light") },
        { id: "theme-dark", label: "Appearance: Dark", icon: "moon", keywords: ["theme"], onSelect: () => setTheme("dark") },
        {
          id: "theme-system",
          label: "Appearance: System",
          icon: "monitor",
          keywords: ["theme", "auto"],
          onSelect: () => setTheme("system"),
        },
      ],
    },
  ];

  return <CommandPalette open={open} onOpenChange={onOpenChange} groups={groups} />;
}
