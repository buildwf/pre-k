import type { ComponentProps, CSSProperties } from "react";

/**
 * A clickable action. `primary` is the one main action of a form or card (send, allow); use at most one per group.
 * `danger` is for actions that delete or can't be undone. `quiet` drops the border, for actions beside content
 * (copy, dismiss). `accent` tints the label (blended with the text color so it stays readable in both schemes), for actions tied to something with its own color (a persona).
 *
 * @import import { Button } from '../../ui/Button'
 */
export function Button({
  variant = "default",
  accent,
  ...props
}: Omit<ComponentProps<"button">, "style" | "className"> & {
  variant?: "default" | "primary" | "danger" | "quiet";
  accent?: string | undefined;
}) {
  const style: CSSProperties = { padding: "5px 12px", fontWeight: 500 };

  // Mixed toward the text color so any persona color stays readable on light and dark backgrounds.
  if (accent) style.color = `color-mix(in srgb, ${accent} 55%, var(--ui-text))`;

  return (
    <button
      type="button"
      {...props}
      data-variant={variant}
      className="ui-control ui-pressable"
      style={style}
    />
  );
}
