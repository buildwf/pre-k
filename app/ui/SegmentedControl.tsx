import { useRef, type KeyboardEvent } from "react";
import { color } from "./theme";

/**
 * A row of two to four mutually exclusive options, all visible, like a view switch (list / grid) or a filter
 * (all / open / done). The selected one lifts out of the track. Use it instead of Buttons with a selected look. Like any radio
 * group, it takes one Tab stop and the arrow keys move the selection. `disabled` dims it and stops changes.
 *
 * @import import { SegmentedControl } from '../../ui/SegmentedControl'
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  label?: string;
  disabled?: boolean;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const current = Math.max(
    options.findIndex((o) => o.value === value),
    0,
  );

  const move = (e: KeyboardEvent) => {
    if (disabled) return;
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];

    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? options.length - 1
          : step === undefined
            ? -1
            : (current + step + options.length) % options.length;

    const option = options[next];

    if (!option) return;
    e.preventDefault();
    onChange(option.value);
    buttons.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled}
      onKeyDown={move}
      className="ui-control"
      style={{ display: "inline-flex", alignSelf: "flex-start", padding: 2, gap: 2, background: color.hover }}
    >
      {options.map((o, i) => {
        const selected = o.value === value;

        return (
          <button
            key={o.value}
            ref={(el) => {
              buttons.current[i] = el;

              // React 19 runs this when the button goes away, so the list never keeps a removed element.
              return () => {
                buttons.current[i] = null;
              };
            }}
            type="button"
            disabled={disabled}
            role="radio"
            aria-checked={selected}
            tabIndex={i === current ? 0 : -1}
            onClick={() => onChange(o.value)}
            className="ui-control ui-pressable ui-segment"
            style={{ padding: "3px 12px", fontWeight: 500 }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
