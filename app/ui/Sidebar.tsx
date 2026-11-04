import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors, font, motion, radius, space, text } from "sevenyears/tokens.stylex";
import { Icon, type IconName } from "./Icon";
import { StatusDot, type StatusTone } from "./StatusDot";

const s = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    height: "100vh",
    minHeight: 0,
    backgroundColor: colors.sidebar,
    color: colors.foreground,
    borderRightWidth: 1,
    borderRightStyle: "solid",
    borderRightColor: colors.border,
  },
  header: { padding: space[2], paddingBottom: 0 },
  content: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: space[4],
    padding: space[2],
  },
  footer: {
    padding: space[2],
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
  },
  group: { display: "flex", flexDirection: "column", gap: 2 },
  groupHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: "1.75rem",
    paddingInline: space[2],
  },
  label: { fontSize: text.xs, fontWeight: 500, color: colors.mutedForeground },
  menu: { display: "flex", flexDirection: "column", gap: 1, margin: 0, padding: 0, listStyle: "none" },
  item: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
    boxSizing: "border-box",
    width: "100%",
    minHeight: "2rem",
    paddingBlock: space[1],
    paddingInline: space[2],
    borderWidth: 0,
    borderRadius: radius.md,
    backgroundColor: { default: "transparent", ":hover": colors.accent },
    color: colors.foreground,
    fontFamily: font.sans,
    fontSize: text.sm,
    lineHeight: 1.3,
    textAlign: "left",
    cursor: "pointer",
    outline: "none",
    boxShadow: { default: "none", ":focus-visible": `inset 0 0 0 2px ${colors.ring}` },
    transitionProperty: "background-color",
    transitionDuration: motion.fast,
  },
  active: { backgroundColor: colors.accent, fontWeight: 500 },
  icon: { display: "flex", color: colors.mutedForeground },
  itemText: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  itemLines: { display: "flex", flexDirection: "column", flex: 1, minWidth: 0 },
  itemDetail: {
    fontSize: text.xs,
    color: colors.destructive,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  itemMeta: { fontSize: text.xs, color: colors.mutedForeground, whiteSpace: "nowrap" },
  empty: { paddingInline: space[2], fontSize: text.caption, color: colors.mutedForeground },
});

/**
 * The app's left column: `header` (the project switcher), groups of SidebarItems in the middle (scrolls), `footer` at
 * the bottom. Goes in AppShell's `sidebar`.
 *
 * @import import { Sidebar, SidebarGroup, SidebarItem } from '../../ui/Sidebar'
 */
export function Sidebar({ header, footer, children }: { header?: ReactNode; footer?: ReactNode; children?: ReactNode }) {
  return (
    <div {...stylex.props(s.root)}>
      {header && <div {...stylex.props(s.header)}>{header}</div>}
      <nav aria-label="Project navigation" {...stylex.props(s.content)}>
        {children}
      </nav>
      {footer && <div {...stylex.props(s.footer)}>{footer}</div>}
    </div>
  );
}

/** A labelled run of SidebarItems, with an optional action (a "New thread" icon button) beside the label. `empty` shows when there are no items. */
export function SidebarGroup({
  label,
  action,
  empty,
  children,
}: {
  label?: string;
  action?: ReactNode;
  empty?: string;
  children?: ReactNode;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];

  return (
    <div {...stylex.props(s.group)}>
      {(label || action) && (
        <div {...stylex.props(s.groupHead)}>
          <span {...stylex.props(s.label)}>{label}</span>
          {action}
        </div>
      )}
      {items.length === 0 && empty ? (
        <span {...stylex.props(s.empty)}>{empty}</span>
      ) : (
        <ul aria-label={label} {...stylex.props(s.menu)}>
          {children}
        </ul>
      )}
    </div>
  );
}

/**
 * One row of the sidebar: an icon or a status dot, a label that truncates, and short trailing text (a count, a time).
 * `active` marks the open view.
 */
export function SidebarItem({
  icon,
  status,
  meta,
  detail,
  active,
  onClick,
  children,
}: {
  icon?: IconName;
  /** A thread's state as a colored dot, in place of an icon. */
  status?: StatusTone;
  meta?: ReactNode;
  /** A second line under the label, in red: why a thread failed. */
  detail?: string | undefined;
  active?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        aria-current={active ? "page" : undefined}
        onClick={onClick}
        {...stylex.props(s.item, active && s.active)}
      >
        {status ? (
          <StatusDot tone={status} />
        ) : icon ? (
          <span {...stylex.props(s.icon)}>
            <Icon name={icon} />
          </span>
        ) : null}
        {detail ? (
          <span {...stylex.props(s.itemLines)}>
            <span {...stylex.props(s.itemText)}>{children}</span>
            <span title={detail} {...stylex.props(s.itemDetail)}>
              {detail}
            </span>
          </span>
        ) : (
          <span {...stylex.props(s.itemText)}>{children}</span>
        )}
        {meta !== undefined && <span {...stylex.props(s.itemMeta)}>{meta}</span>}
      </button>
    </li>
  );
}
