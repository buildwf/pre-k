import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors } from "sevenyears/tokens.stylex";

const styles = stylex.create({
  shell: {
    display: "grid",
    gridTemplateColumns: "15.5rem minmax(0, 1fr)",
    height: "100vh",
    overflow: "hidden",
    backgroundColor: colors.background,
  },
  withAside: { gridTemplateColumns: "15.5rem minmax(0, 1fr) 20rem" },
  main: { display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, height: "100vh" },
  aside: {
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    height: "100vh",
    overflowY: "auto",
    borderLeftWidth: 1,
    borderLeftStyle: "solid",
    borderLeftColor: colors.border,
    backgroundColor: colors.background,
  },
});

/**
 * The app's frame: a Sidebar on the left, the open view in the middle, and an optional panel on the right (the
 * project's instructions and memory, like a project's knowledge panel). Each column scrolls on its own. Use it once,
 * as the only child of Window.
 *
 * @import import { AppShell } from '../../ui/AppShell'
 */
export function AppShell({ sidebar, aside, children }: { sidebar: ReactNode; aside?: ReactNode; children?: ReactNode }) {
  return (
    <div {...stylex.props(styles.shell, aside !== undefined && aside !== null && aside !== false && styles.withAside)}>
      {sidebar}
      <div {...stylex.props(styles.main)}>{children}</div>
      {aside ? (
        <aside aria-label="Project" {...stylex.props(styles.aside)}>
          {aside}
        </aside>
      ) : null}
    </div>
  );
}
