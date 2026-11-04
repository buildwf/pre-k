import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors, space, text } from "sevenyears/tokens.stylex";

const s = stylex.create({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space[3],
    paddingBlock: space[4],
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    ":first-child": { borderTopWidth: 0, paddingTop: 0 },
  },
  compact: { gap: space[2], paddingBlock: space[3], paddingInline: space[4], ":first-child": { paddingTop: space[3] } },
  head: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: space[2] },
  titles: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  title: { margin: 0, fontSize: text.sm, fontWeight: 600, lineHeight: 1.4 },
  description: { fontSize: text.caption, color: colors.mutedForeground, lineHeight: 1.45 },
});

/** The id a Section's element gets from its title ("Coding agent" → "section-coding-agent"), to scroll to it. */
export const sectionId = (title: string) => `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

/**
 * One titled part of a settings page or a side panel (Repository, Instructions, Memory), divided from the next by a
 * hairline. `action` sits at the end of the title row (Edit, an icon Button). `compact` for the narrow right panel.
 *
 * @import import { Section } from '../../ui/Section'
 */
export function Section({
  title,
  description,
  action,
  compact,
  children,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  children?: ReactNode;
}) {
  return (
    <section id={sectionId(title)} aria-label={title} {...stylex.props(s.section, compact && s.compact)}>
      <div {...stylex.props(s.head)}>
        <div {...stylex.props(s.titles)}>
          <h2 {...stylex.props(s.title)}>{title}</h2>
          {description && <span {...stylex.props(s.description)}>{description}</span>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
