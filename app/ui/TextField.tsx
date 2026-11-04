import type { ComponentProps } from "react";
import { Input } from "sevenyears/components/Input";
import { useNamedControl } from "./Field";

/**
 * A one-line text input, sevenyears' Input. Put it in a Field for its label. `wide` fills the row it sits in.
 *
 * @import import { TextField } from '../../ui/TextField'
 */
export function TextField({
  wide,
  ...props
}: Omit<ComponentProps<"input">, "style" | "className"> & { wide?: boolean }) {
  const field = useNamedControl("TextField", props);

  return <Input {...props} {...field} style={wide ? { flex: 1 } : undefined} />;
}
