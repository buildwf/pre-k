import type { ReactNode } from "react";
import { color, panelRadius, shadow } from "./theme";

/**
 * A bordered panel for one thing: a thread the coordinator started, a commit, a pull request, an approval.
 * `attention` marks something waiting on the person. Same look as sevenyears' Card, drawn with the kit's variables
 * rather than StyleX: agent components (app/components) render it, and Point loads those outside the renderer's
 * build, where StyleX isn't compiled. Keep anything app/components imports free of StyleX.
 *
 * @import import { Card } from '../../ui/Card'
 */
export function Card({ tone = "default", children }: { tone?: "default" | "attention"; children?: ReactNode }) {
  return (
    <section
      className="ui-enter"
      style={{
        boxSizing: "border-box",
        padding: 16,
        border: `1px solid ${tone === "attention" ? `color-mix(in srgb, ${color.warning} 45%, ${color.subtle})` : color.subtle}`,
        borderRadius: panelRadius,
        background: tone === "attention" ? `color-mix(in srgb, ${color.warning} 8%, ${color.surface})` : color.surface,
        boxShadow: shadow,
      }}
    >
      {children}
    </section>
  );
}
