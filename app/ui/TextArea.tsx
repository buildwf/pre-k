import type { ComponentProps } from "react";
import { useNamedControl } from "./Field";

/**
 * A multi-line text input that fills its row, for pasted JSON or long instructions.
 *
 * @import import { TextArea } from '../../ui/TextArea'
 */
export function TextArea(props: Omit<ComponentProps<"textarea">, "style" | "className">) {
  const field = useNamedControl("TextArea", props);

  return (
    <textarea
      rows={4}
      {...props}
      {...field}
      className="ui-control ui-field"
      style={{ padding: "8px 10px", width: "100%", boxSizing: "border-box", resize: "vertical" }}
    />
  );
}
