import { useNamedControl } from "./Field";

/**
 * A date picked in the browser's own date input. `value` and `onChange` use `YYYY-MM-DD` text (`""` when no date is
 * chosen), which is what a date column or a store field holds; nothing is parsed into a `Date`, so a time zone never
 * moves the day. Put it in a `Field` for its label. `min` and `max` are `YYYY-MM-DD` too.
 *
 * @import import { DateField } from '../../ui/DateField'
 */
export function DateField({
  value,
  onChange,
  min,
  max,
  disabled,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  /** For screen readers when no `Field` label sits around it. */
  "aria-label"?: string;
}) {
  const field = useNamedControl("DateField", props);

  return (
    <input
      type="date"
      {...props}
      {...field}
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="ui-control ui-field"
      style={{ padding: "5px 10px" }}
    />
  );
}
