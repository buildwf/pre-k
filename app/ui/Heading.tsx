import type { ReactNode } from "react";
import { text } from "./theme";

const sizes = {
  1: { fontSize: text["2xl"], letterSpacing: "-0.02em" },
  2: { fontSize: text.xl, letterSpacing: "-0.01em" },
  3: { fontSize: text.lg, letterSpacing: 0 },
};

/**
 * A window's or a section's title. Level 1 is the window title; use one per window.
 *
 * @import import { Heading } from '../../ui/Heading'
 */
export function Heading({ level = 1, children }: { level?: 1 | 2 | 3; children?: ReactNode }) {
  const Tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";

  return (
    <Tag style={{ margin: 0, fontWeight: 600, lineHeight: 1.25, ...sizes[level] }}>{children}</Tag>
  );
}
