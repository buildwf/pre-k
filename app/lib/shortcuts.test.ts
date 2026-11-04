import { describe, expect, it } from "vitest";
import { aria, label, matches, shortcuts } from "./shortcuts";

const press = (key: string, mods: Partial<{ metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }>) => ({
  key,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

describe("shortcuts", () => {
  it("matches Command on a Mac and Control elsewhere, and nothing else", () => {
    expect(matches(press("1", { metaKey: true }), shortcuts.chat, true)).toBe(true);
    expect(matches(press("1", { ctrlKey: true }), shortcuts.chat, true)).toBe(false);
    expect(matches(press("1", { ctrlKey: true }), shortcuts.chat, false)).toBe(true);
    expect(matches(press("1", { metaKey: true, shiftKey: true }), shortcuts.chat, true)).toBe(false);
    expect(matches(press("1", {}), shortcuts.chat, true)).toBe(false);
  });

  it("needs Shift where the shortcut has it, whatever case the key comes in", () => {
    expect(matches(press("N", { metaKey: true, shiftKey: true }), shortcuts.newProject, true)).toBe(true);
    expect(matches(press("n", { metaKey: true }), shortcuts.newProject, true)).toBe(false);
  });

  it("reads as each platform writes it", () => {
    expect(label(shortcuts.settings, true)).toBe("⌘,");
    expect(label(shortcuts.newProject, true)).toBe("⇧⌘N");
    expect(label(shortcuts.newProject, false)).toBe("Ctrl+Shift+N");
    expect(aria(shortcuts.chat, true)).toBe("Meta+1");
  });
});
