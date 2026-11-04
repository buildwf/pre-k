/**
 * The main window's keyboard shortcuts, in one place so the handler, the sidebar hints and aria-keyshortcuts agree.
 * "Mod" is Command on a Mac and Control elsewhere.
 */
export const shortcuts = {
  palette: "Mod+K",
  chat: "Mod+1",
  delivered: "Mod+2",
  settings: "Mod+,",
  panel: "Mod+\\",
  newProject: "Mod+Shift+N",
} as const;

export type Shortcut = (typeof shortcuts)[keyof typeof shortcuts];

type Keys = { key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean };

/** Whether a keydown is this shortcut. Only the platform's own modifier counts, so Control+1 on a Mac does nothing. */
export function matches(e: Keys, shortcut: Shortcut, mac: boolean): boolean {
  const parts = shortcut.split("+");
  const key = parts.at(-1) ?? "";
  const shift = parts.includes("Shift");
  const mod = mac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
  return mod && e.shiftKey === shift && !e.altKey && e.key.toLowerCase() === key.toLowerCase();
}

/** How the shortcut reads: "⌘1" and "⇧⌘N" on a Mac, "Ctrl+1" and "Ctrl+Shift+N" elsewhere. */
export function label(shortcut: Shortcut, mac: boolean): string {
  const parts = shortcut.split("+");
  if (!mac) return parts.map((p) => (p === "Mod" ? "Ctrl" : p)).join("+");
  const key = parts.at(-1) ?? "";
  return `${parts.includes("Shift") ? "⇧" : ""}⌘${key}`;
}

/** The aria-keyshortcuts value: "Meta+1" on a Mac, "Control+1" elsewhere. */
export function aria(shortcut: Shortcut, mac: boolean): string {
  return shortcut.replace("Mod", mac ? "Meta" : "Control");
}
