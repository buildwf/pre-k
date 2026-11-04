import type { ComponentProps } from "react";
import { Textarea } from "sevenyears/components/Textarea";
import { useNamedControl } from "./Field";

/**
 * A multi-line text input, sevenyears' Textarea: instructions, notes, a JSON paste. Put it in a Field for its label.
 * For a chat message, use Composer.
 *
 * @import import { TextArea } from '../../ui/TextArea'
 */
export function TextArea(props: Omit<ComponentProps<"textarea">, "style" | "className">) {
  const field = useNamedControl("TextArea", props);

  return <Textarea rows={4} {...props} {...field} />;
}
