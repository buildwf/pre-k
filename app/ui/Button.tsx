import type { ComponentProps } from "react";
import { Button as SevenButton } from "sevenyears/components/Button";

const variants = { default: "outline", primary: "default", danger: "destructive", quiet: "ghost" } as const;
const sizes = { default: "default", sm: "sm", icon: "icon" } as const;

/**
 * A clickable action, sevenyears' Button. `primary` is the one main action of a form or card (send, allow); use at most
 * one per group. `danger` is for actions that delete or can't be undone. `quiet` drops the border, for actions beside
 * content (copy, dismiss) and toolbars. `size="sm"` in headers and rows, `size="icon"` for an Icon alone (give it an
 * aria-label). `accent` tints the label, for actions tied to something with its own color (a persona).
 *
 * @import import { Button } from '../../ui/Button'
 */
export function Button({
  variant = "default",
  size = "default",
  accent,
  ...props
}: Omit<ComponentProps<"button">, "style" | "className"> & {
  variant?: "default" | "primary" | "danger" | "quiet";
  size?: "default" | "sm" | "icon";
  accent?: string | undefined;
}) {
  return (
    <SevenButton
      type="button"
      {...props}
      data-variant={variant}
      variant={variants[variant]}
      size={sizes[size]}
      // Mixed toward the text color so any persona color stays readable on light and dark backgrounds.
      style={accent ? { color: `color-mix(in srgb, ${accent} 55%, var(--ui-text))` } : undefined}
    />
  );
}
