import type { ReactNode } from "react";
import { color } from "./theme";

/**
 * An on/off choice with its label, like "Show hidden files" or a to-do's done state. `struck` crosses the label out
 * while checked, for finished items.
 *
 * @import import { Checkbox } from '../../ui/Checkbox'
 */
export function Checkbox({
  checked,
  onChange,
  disabled,
  struck,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  struck?: boolean;
  children?: ReactNode;
}) {
  return (
    <label
      className="ui-check"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        textDecoration: struck && checked ? "line-through" : undefined,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: color.accent, margin: 0, width: 15, height: 15 }}
      />
      {children}
    </label>
  );
}
