import type { ReactNode } from "react";
import { color, panelRadius, shadow } from "./theme";

/**
 * A bordered panel that sets one thing apart. `attention` is for something waiting on the person, like an approval.
 * A card eases in when it first appears, so new things are noticed without a jump.
 *
 * @import import { Card } from '../../ui/Card'
 */
export function Card({
  tone = "default",
  children,
}: {
  tone?: "default" | "attention";
  children?: ReactNode;
}) {
  return (
    <section
      className="ui-enter"
      style={{
        border: `1px solid ${color.subtle}`,
        borderRadius: panelRadius,
        padding: 16,
        background: tone === "attention" ? color.attention : color.surface,
        boxShadow: shadow,
      }}
    >
      {children}
    </section>
  );
}
