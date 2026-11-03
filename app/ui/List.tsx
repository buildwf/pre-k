import type { ReactNode } from "react";
import { color } from "./theme";

/**
 * A list of things a person acts on one by one, like to-dos or files: a ListItem per thing, each row divided from the
 * next and lit under the pointer, so a row's actions read as its own. For rows of data under column labels, use
 * Table.
 *
 * @import import { List } from '../../ui/List'
 */
export function List({
  label,
  children,
}: {
  /** For screen readers, when no heading says what the list is. */
  label?: string;
  children?: ReactNode;
}) {
  return (
    <ul aria-label={label} style={{ listStyle: "none", margin: "0 -8px", padding: 0 }}>
      {children}
    </ul>
  );
}

/**
 * One row of a List: its content at the start (a Checkbox, a Text) and its actions at the end (a quiet Button).
 * `enter` eases this row in. Set it only on the row the person just added. Leave it off for the first paint of a
 * full list, and for a row that appeared because of a filter, a sort, a refresh, or a tab change.
 *
 * @import import { ListItem } from '../../ui/List'
 */
export function ListItem({
  actions,
  enter,
  children,
}: {
  /** Buttons at the end of the row, like Delete. */
  actions?: ReactNode;
  /** Ease this one row in. Only the row the person just added. */
  enter?: boolean;
  children?: ReactNode;
}) {
  return (
    <li
      className={enter ? "ui-row ui-enter" : "ui-row"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "4px 8px",
        minHeight: 32,
        borderBottom: `1px solid ${color.subtle}`,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>{children}</span>
      {actions && <span style={{ display: "flex", gap: 4 }}>{actions}</span>}
    </li>
  );
}
