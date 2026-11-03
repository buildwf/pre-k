import { useState, type ReactNode } from "react";
import { color, text } from "./theme";

export interface Column<Row> {
  /** The header. */
  label: string;
  /** What the cell shows for a row. */
  cell: (row: Row) => ReactNode;
  /** `end` for numbers and amounts. */
  align?: "start" | "end";
  /** Makes the column sortable: its header becomes a button that sorts ascending, then descending, then not at all. */
  sort?: (a: Row, b: Row) => number;
}

/** Which column the table is sorted by, by its label. */
export interface Sort {
  column: string;
  direction: "ascending" | "descending";
}

/**
 * Rows of data under labeled columns, like a list of runs with their status and cost. Give each column its label and
 * how to draw its cell; `rowKey` names each row for React. To let people sort by a column, give it a `sort` compare
 * function; `defaultSort` picks the starting order. The table keeps the sort itself and never reorders `rows`.
 * `entering` is the `rowKey` of the one row the person just added, and only that row eases in. Leave it unset for
 * loaded rows and for a row that appeared because of a filter, a sort, a refresh, or a tab change.
 *
 * @import import { Table } from '../../ui/Table'
 */
export function Table<Row>({
  columns,
  rows,
  rowKey,
  empty = "Nothing yet",
  defaultSort,
  entering,
  caption,
}: {
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  /** Shown in place of the rows when there are none. */
  empty?: string;
  /** The order the table starts in. The column needs a `sort`. */
  defaultSort?: Sort;
  /** `rowKey` of the one row the person just added. That row eases in. Unset for loaded data. */
  entering?: string | undefined;
  /** What the table is, for screen readers (a table's name in their list of tables), not shown. Name it when the window has more than one. */
  caption?: string;
}) {
  const [sort, setSort] = useState<Sort | undefined>(defaultSort);
  const by = columns.find((c) => c.label === sort?.column)?.sort;

  const shown =
    by && sort
      ? [...rows].sort((a, b) => (sort.direction === "ascending" ? by(a, b) : by(b, a)))
      : rows;

  const next = (column: string) =>
    setSort(
      sort?.column !== column
        ? { column, direction: "ascending" }
        : sort.direction === "ascending"
          ? { column, direction: "descending" }
          : undefined,
    );

  const cell = (align: Column<Row>["align"]) => ({
    padding: "8px 12px",
    textAlign: align === "end" ? ("right" as const) : ("left" as const),
    borderBottom: `1px solid ${color.subtle}`,
  });

  return (
    // Wide tables scroll sideways inside their own box instead of pushing the whole window wider.
    <div style={{ overflowX: "auto" }}>
      <table
        style={{ borderCollapse: "collapse", width: "100%", fontVariantNumeric: "tabular-nums" }}
      >
        {caption && <caption className="ui-sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                scope="col"
                key={c.label}
                aria-sort={
                  c.sort ? (sort?.column === c.label ? sort.direction : "none") : undefined
                }
                style={{ ...cell(c.align), color: color.muted, fontWeight: 500, fontSize: text.xs }}
              >
                {c.sort ? (
                  <button
                    type="button"
                    className="ui-control ui-pressable ui-sort"
                    data-variant="quiet"
                    data-align={c.align ?? "start"}
                    onClick={() => next(c.label)}
                  >
                    {c.label}
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.length ? (
            shown.map((row) => {
              const key = rowKey(row);

              return (
                <tr key={key} className={entering === key ? "ui-row ui-enter" : "ui-row"}>
                  {columns.map((c) => (
                    <td key={c.label} style={cell(c.align)}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={columns.length} style={{ ...cell("start"), color: color.muted }}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
