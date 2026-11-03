import type { ComponentProps } from "react";
import { useNamedControl } from "./Field";

/**
 * A one-line text input. `wide` fills the row it is in.
 *
 * @import import { TextField } from '../../ui/TextField'
 */
export function TextField({
  wide,
  ...props
}: Omit<ComponentProps<"input">, "style" | "className"> & { wide?: boolean }) {
  const field = useNamedControl("TextField", props);

  return (
    <input
      {...props}
      {...field}
      className="ui-control ui-field"
      style={{ padding: "5px 10px", flex: wide ? 1 : undefined, minWidth: 240 }}
    />
  );
}
