import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors, space, text } from "sevenyears/tokens.stylex";

const s = stylex.create({
  header: {
    display: "flex",
    alignItems: "center",
    gap: space[3],
    boxSizing: "border-box",
    minHeight: "3.25rem",
    paddingBlock: space[2],
    paddingInline: space[4],
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
    flexShrink: 0,
  },
  titles: { display: "flex", flexDirection: "column", minWidth: 0, flex: 1 },
  titleRow: { display: "flex", alignItems: "center", gap: space[2], minWidth: 0 },
  title: {
    margin: 0,
    fontSize: text.sm,
    fontWeight: 600,
    lineHeight: 1.4,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  subtitle: {
    fontSize: text.xs,
    color: colors.mutedForeground,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  actions: { display: "flex", alignItems: "center", gap: space[1], flexShrink: 0 },
  body: { flex: 1, minHeight: 0, overflowY: "auto", scrollbarGutter: "stable" },
  column: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: space[4],
    width: "100%",
    maxWidth: "46rem",
    marginInline: "auto",
    paddingBlock: space[6],
    paddingInline: space[6],
  },
  wideColumn: { maxWidth: "52rem" },
  footer: {
    flexShrink: 0,
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "46rem",
    marginInline: "auto",
    paddingInline: space[6],
    paddingBottom: space[4],
  },
});

/**
 * The top bar of the open view: its title, a badge or status beside it, a muted line under it, and actions at the end
 * (icon Buttons and a Menu). Put it first in AppShell's middle column.
 *
 * @import import { PaneHeader, PaneBody, PaneFooter } from '../../ui/Pane'
 */
export function PaneHeader({
  title,
  badge,
  subtitle,
  actions,
}: {
  title: ReactNode;
  badge?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header {...stylex.props(s.header)}>
      <div {...stylex.props(s.titles)}>
        <div {...stylex.props(s.titleRow)}>
          <h1 {...stylex.props(s.title)}>{title}</h1>
          {badge}
        </div>
        {subtitle && <span {...stylex.props(s.subtitle)}>{subtitle}</span>}
      </div>
      {actions && <div {...stylex.props(s.actions)}>{actions}</div>}
    </header>
  );
}

/** The view's scrolling content, in a centered reading column. `wide` for settings and lists. */
export function PaneBody({ wide, children }: { wide?: boolean; children?: ReactNode }) {
  return (
    <div {...stylex.props(s.body)}>
      <div {...stylex.props(s.column, wide && s.wideColumn)}>{children}</div>
    </div>
  );
}

/** What stays at the bottom of the view while the body scrolls: the Composer. */
export function PaneFooter({ children }: { children?: ReactNode }) {
  return <div {...stylex.props(s.footer)}>{children}</div>;
}
