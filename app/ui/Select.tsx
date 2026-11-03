import { useNamedControl } from "./Field";

/**
 * A choice among options in a dropdown, for more than four or so options (use SegmentedControl for fewer). `onChange`
 * gets the chosen option's value.
 *
 * @import import { Select } from '../../ui/Select'
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  /** For screen readers when no visible label sits beside it. */
  label?: string;
  disabled?: boolean;
}) {
  const field = useNamedControl("Select", { "aria-label": label });

  return (
    <select
      value={value}
      aria-label={label}
      {...field}
      disabled={disabled}
      onChange={(e) => {
        const chosen = options.find((o) => o.value === e.target.value);

        if (chosen) onChange(chosen.value);
      }}
      className="ui-control ui-pressable"
      style={{ padding: "5px 8px" }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
