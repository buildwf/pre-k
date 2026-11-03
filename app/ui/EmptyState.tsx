import type { ReactNode } from "react";
import { color, text } from "./theme";

/**
 * What a list, table or screen shows while it has nothing in it: a short title ("No threads yet"), a line on what
 * will appear here, and usually the action that fills it (a primary Button). Never leave an empty area blank.
 *
 * @import import { EmptyState } from '../../ui/EmptyState'
 */
export function EmptyState({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className="ui-enter"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "32px 16px",
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: text.lg, fontWeight: 600 }}>{title}</span>
      {children && <span style={{ color: color.muted, maxWidth: 360 }}>{children}</span>}
      {action && <div style={{ paddingTop: 8 }}>{action}</div>}
    </div>
  );
}
