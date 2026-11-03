import type { ReactNode } from "react";
import { color, mono as monospace } from "./theme";

const tones = { default: "inherit", muted: color.muted, danger: color.danger };

/**
 * A run of text: muted for secondary details, danger for errors, mono for names and values from the machine.
 *
 * @import import { Text } from '../../ui/Text'
 */
export function Text({
  tone = "default",
  bold,
  mono,
  faded,
  role,
  children,
}: {
  tone?: keyof typeof tones;
  bold?: boolean;
  mono?: boolean;
  /** Shown at lower contrast, for content that is still arriving. Only default-tone text fades: muted or danger text
   * is already at its lowest readable contrast. */
  faded?: boolean;
  /** `status` announces a change to screen readers politely, like "Saved"; keep the Text rendered and change its
   * children. For errors and warnings, use Alert. */
  role?: "status";
  children?: ReactNode;
}) {
  return (
    <span
      role={role}
      style={{
        color: tones[tone],
        fontWeight: bold ? 600 : undefined,
        fontFamily: mono ? monospace : undefined,
        opacity: faded && tone === "default" ? 0.6 : undefined,
      }}
    >
      {children}
    </span>
  );
}
