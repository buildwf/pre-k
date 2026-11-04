import { Dialog } from "@base-ui/react/dialog";
import * as stylex from "@stylexjs/stylex";
import { Command } from "cmdk";
import type { ReactNode } from "react";
import { colors, font, glass, motion, radius, shadow, space, text, z } from "sevenyears/tokens.stylex";
import { Icon, type IconName } from "./Icon";
import { StatusDot, type StatusTone } from "./StatusDot";

const gone = ":is([data-starting-style], [data-ending-style])";

const s = stylex.create({
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: z.overlay,
    backgroundColor: colors.overlay,
    opacity: { default: 1, [gone]: 0 },
    transitionProperty: "opacity",
    transitionDuration: motion.fast,
  },
  popup: {
    position: "fixed",
    top: "14vh",
    left: "50%",
    zIndex: z.overlay,
    boxSizing: "border-box",
    width: "min(36rem, calc(100vw - 2rem))",
    overflow: "hidden",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: glass.popupFill,
    backdropFilter: glass.blur,
    boxShadow: shadow.md,
    color: colors.popoverForeground,
    // The popup renders in a portal outside the Window, so it sets the type itself.
    fontFamily: font.sans,
    outline: "none",
    opacity: { default: 1, [gone]: 0 },
    transform: { default: "translateX(-50%)", [gone]: "translateX(-50%) scale(0.98)" },
    transitionProperty: "opacity, transform",
    transitionDuration: motion.fast,
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
    paddingInline: space[4],
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
    color: colors.mutedForeground,
  },
  input: {
    flex: 1,
    height: "3rem",
    padding: 0,
    borderWidth: 0,
    outline: "none",
    backgroundColor: "transparent",
    color: colors.foreground,
    fontFamily: font.sans,
    fontSize: text.base,
    "::placeholder": { color: colors.mutedForeground },
  },
  list: { maxHeight: "min(24rem, 60vh)", overflowY: "auto", scrollbarWidth: "thin", padding: space[2], scrollPaddingBlock: space[2] },
  empty: { padding: space[6], textAlign: "center", fontSize: text.sm, color: colors.mutedForeground },
  heading: {
    paddingInline: space[2],
    paddingBlock: space[1],
    fontSize: text.xs,
    fontWeight: 500,
    color: colors.mutedForeground,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
    minHeight: "2.25rem",
    paddingInline: space[2],
    borderRadius: radius.md,
    fontSize: text.sm,
    cursor: "pointer",
    userSelect: "none",
    backgroundColor: { default: "transparent", ":is([data-selected=true])": colors.accent },
    color: colors.foreground,
  },
  icon: { display: "flex", color: colors.mutedForeground },
  label: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  detail: { fontSize: text.xs, color: colors.mutedForeground, whiteSpace: "nowrap" },
  footer: {
    display: "flex",
    gap: space[4],
    paddingInline: space[4],
    paddingBlock: space[2],
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    fontSize: text.xs,
    color: colors.mutedForeground,
  },
});

export interface PaletteItem {
  /** Unique within the palette; also what the filter matches besides `label` and `keywords`. */
  id: string;
  label: string;
  /** Short trailing text: a thread's state, a shortcut, "open". */
  detail?: ReactNode;
  icon?: IconName;
  /** A thread's state as a colored dot, in place of an icon. */
  status?: StatusTone;
  /** More words the filter matches ("dark", "theme" for Appearance). */
  keywords?: string[];
  onSelect: () => void;
}

export interface PaletteGroup {
  heading: string;
  items: PaletteItem[];
}

/**
 * The ⌘K palette: a search box over groups of places and actions (threads, projects, settings). Type to filter, the
 * arrow keys move, Enter picks and closes it, Escape closes it. Built on cmdk (sevenyears' Command) in a Base UI dialog.
 *
 * @import import { CommandPalette } from '../../ui/CommandPalette'
 */
export function CommandPalette({
  open,
  onOpenChange,
  groups,
  placeholder = "Jump to a thread, a project or a setting…",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: PaletteGroup[];
  placeholder?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop {...stylex.props(s.backdrop)} />
        <Dialog.Popup aria-label="Command palette" {...stylex.props(s.popup)}>
          <Command label="Command palette" loop>
            <div {...stylex.props(s.inputRow)}>
              <Icon name="search" />
              <Command.Input autoFocus placeholder={placeholder} aria-label="Search" {...stylex.props(s.input)} />
            </div>
            <Command.List {...stylex.props(s.list)}>
              <Command.Empty {...stylex.props(s.empty)}>Nothing matches.</Command.Empty>
              {groups
                .filter((g) => g.items.length > 0)
                .map((g) => (
                  <Command.Group key={g.heading} heading={<span {...stylex.props(s.heading)}>{g.heading}</span>}>
                    {g.items.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={`${item.label} ${item.id}`}
                        keywords={item.keywords ?? []}
                        onSelect={() => {
                          onOpenChange(false);
                          item.onSelect();
                        }}
                        {...stylex.props(s.item)}
                      >
                        {item.status ? (
                          <StatusDot tone={item.status} />
                        ) : item.icon ? (
                          <span {...stylex.props(s.icon)}>
                            <Icon name={item.icon} />
                          </span>
                        ) : null}
                        <span {...stylex.props(s.label)}>{item.label}</span>
                        {item.detail !== undefined && <span {...stylex.props(s.detail)}>{item.detail}</span>}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
            </Command.List>
            <div aria-hidden {...stylex.props(s.footer)}>
              <span>↑↓ to move</span>
              <span>Enter to open</span>
              <span>Esc to close</span>
            </div>
          </Command>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
