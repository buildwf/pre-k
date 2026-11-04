import * as stylex from "@stylexjs/stylex";
import { useRef } from "react";
import { colors, font, radius, space, text } from "sevenyears/tokens.stylex";
import type { DiffFile } from "../schemas/delivery";
import { Icon } from "./Icon";

const s = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  root: { display: "flex", flexDirection: "column", gap: space[3] },
  caption: { fontSize: text.xs, fontWeight: 500, color: colors.mutedForeground },
  row: {
    appearance: "none",
    boxSizing: "border-box",
    width: "100%",
    margin: 0,
    borderWidth: 0,
    borderRadius: 0,
    font: "inherit",
    color: "inherit",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: space[2],
    paddingBlock: space[2],
    paddingInline: space[3],
    fontSize: text.sm,
    cursor: "pointer",
    borderTopWidth: { default: 1, ":first-child": 0 },
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    backgroundColor: { default: "transparent", ":hover": colors.muted },
  },
  path: { flex: 1, minWidth: 0, fontFamily: font.mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  status: { width: "1rem", fontFamily: font.mono, fontSize: text.xs, fontWeight: 600, textAlign: "center" },
  statusAdded: { color: colors.successText },
  statusDeleted: { color: colors.destructiveText },
  statusOther: { color: colors.mutedForeground },
  plus: { fontFamily: font.mono, fontSize: text.xs, color: colors.successText },
  minus: { fontFamily: font.mono, fontSize: text.xs, color: colors.destructiveText },
  file: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden",
    scrollMarginTop: space[4],
  },
  fileHeader: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
    paddingBlock: space[2],
    paddingInline: space[3],
    backgroundColor: colors.muted,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
    fontSize: text.sm,
  },
  code: { overflowX: "auto", fontFamily: font.mono, fontSize: text.xs, lineHeight: "1.25rem" },
  table: { borderCollapse: "collapse", width: "100%", minWidth: "max-content" },
  hunk: { backgroundColor: colors.secondary, color: colors.mutedForeground },
  num: {
    width: "3rem",
    minWidth: "3rem",
    paddingInline: space[2],
    textAlign: "right",
    color: colors.mutedForeground,
    userSelect: "none",
    verticalAlign: "top",
  },
  sign: { width: "1rem", paddingInline: space[1], userSelect: "none", color: colors.mutedForeground },
  line: { paddingInlineEnd: space[4], whiteSpace: "pre" },
  added: { backgroundColor: colors.added },
  removed: { backgroundColor: colors.removed },
  note: { paddingBlock: space[3], paddingInline: space[3], fontSize: text.sm, color: colors.mutedForeground },
});

const letter = { added: "A", modified: "M", deleted: "D", renamed: "R" } as const;

/**
 * A commit's changes, the way a code review shows them: a list of changed files (click one to jump to it), then each
 * file's hunks with old and new line numbers, added lines green and removed lines red. Text renders as plain text.
 *
 * @import import { DiffView } from '../../ui/DiffView'
 */
export function DiffView({ files }: { files: DiffFile[] }) {
  const refs = useRef(new Map<string, HTMLElement>());

  return (
    <div {...stylex.props(s.root)}>
      <div {...stylex.props(s.caption)}>
        {files.length} changed {files.length === 1 ? "file" : "files"}
      </div>
      <div {...stylex.props(s.list)} role="list" aria-label="Changed files">
        {files.map((f) => (
          <button
            key={f.path}
            type="button"
            role="listitem"
            {...stylex.props(s.row)}
            onClick={() => refs.current.get(f.path)?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <span
              {...stylex.props(
                s.status,
                f.status === "added" ? s.statusAdded : f.status === "deleted" ? s.statusDeleted : s.statusOther,
              )}
              title={f.status}
            >
              {letter[f.status]}
            </span>
            <span {...stylex.props(s.path)}>{f.from ? `${f.from} → ${f.path}` : f.path}</span>
            <span {...stylex.props(s.plus)}>+{f.additions}</span>
            <span {...stylex.props(s.minus)}>−{f.deletions}</span>
          </button>
        ))}
      </div>
      {files.map((f) => (
        <section
          key={f.path}
          aria-label={f.path}
          {...stylex.props(s.file)}
          ref={(el) => {
            if (el) refs.current.set(f.path, el);
            else refs.current.delete(f.path);
          }}
        >
          <div {...stylex.props(s.fileHeader)}>
            <Icon name="file" size={14} />
            <span {...stylex.props(s.path)}>{f.from ? `${f.from} → ${f.path}` : f.path}</span>
            <span {...stylex.props(s.plus)}>+{f.additions}</span>
            <span {...stylex.props(s.minus)}>−{f.deletions}</span>
          </div>
          {f.binary ? (
            <div {...stylex.props(s.note)}>Binary file, not shown.</div>
          ) : f.hunks.length === 0 ? (
            <div {...stylex.props(s.note)}>{f.status === "renamed" ? "Renamed without changes." : "No text changes."}</div>
          ) : (
            <div {...stylex.props(s.code)}>
              <table {...stylex.props(s.table)}>
                <tbody>
                  {f.hunks.map((h) => [
                    <tr key={h.header} {...stylex.props(s.hunk)}>
                      <td {...stylex.props(s.num)} />
                      <td {...stylex.props(s.num)} />
                      <td colSpan={2} {...stylex.props(s.line)}>
                        {h.header}
                      </td>
                    </tr>,
                    ...h.lines.map((l) => (
                      <tr key={`${h.header}:${l.old ?? ""}:${l.new ?? ""}`} {...stylex.props(l.kind === "added" && s.added, l.kind === "removed" && s.removed)}>
                        <td {...stylex.props(s.num)}>{l.old ?? ""}</td>
                        <td {...stylex.props(s.num)}>{l.new ?? ""}</td>
                        <td {...stylex.props(s.sign)}>{l.kind === "added" ? "+" : l.kind === "removed" ? "−" : ""}</td>
                        <td {...stylex.props(s.line)}>{l.text}</td>
                      </tr>
                    )),
                  ])}
                </tbody>
              </table>
            </div>
          )}
          {f.truncated && <div {...stylex.props(s.note)}>Long diff: only the first lines are shown.</div>}
        </section>
      ))}
    </div>
  );
}
