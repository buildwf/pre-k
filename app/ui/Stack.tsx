import type { ReactNode } from "react";
import type { Space } from "./theme";

/**
 * Lays its children out in a column (or a row) with even spacing. Use it for every layout instead of styled divs.
 * Gaps and padding come from the 4px scale (4, 8, 12, 16, 24, 32, 48): 8 between controls in a row, 12 to 16 between
 * sections, 24 around a window's content.
 *
 * @import import { Stack } from '../../ui/Stack'
 */
export function Stack({
  direction = "column",
  gap = 8,
  align,
  justify,
  wrap,
  padding,
  maxWidth,
  children,
}: {
  direction?: "column" | "row";
  /** Space between children, in pixels, from the scale. */
  gap?: Space;
  align?: "start" | "center" | "end" | "baseline";
  /** `between` pushes the first and last children apart, like a title and its action, or Save and Delete. */
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
  padding?: Space;
  /** A readable column: it stops growing here and centers, so a page keeps its shape in a wide window or browser tab. Use it on a window's outermost Stack; inside another Stack it would shrink to its content. */
  maxWidth?: number;
  children?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction,
        gap,
        alignItems: align,
        justifyContent: justify === "between" ? "space-between" : justify,
        flexWrap: wrap ? "wrap" : undefined,
        padding,
        maxWidth,
        marginInline: maxWidth === undefined ? undefined : "auto",
      }}
    >
      {children}
    </div>
  );
}
