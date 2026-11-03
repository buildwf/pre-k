import { createContext, useContext, useEffect, useId, type AriaAttributes, type ReactNode } from "react";
import { color, text } from "./theme";

/** What a Field tells the control inside it: the note that describes it, and whether that note is an error. */
interface FieldNote {
  describedBy?: string;
  invalid: boolean;
}

const InField = createContext<FieldNote | undefined>(undefined);

/**
 * Used by TextField, TextArea and Select: returns the aria attributes their Field gives them (its hint or error as
 * the description, invalid after an error) for the control to spread, and says so on the console when the control has
 * no accessible name, so a smoke run or the devtools shows an unlabeled input an agent wrote by hand. A control inside
 * a Field is named by it.
 */
export function useNamedControl(kind: string, props: AriaAttributes): AriaAttributes {
  const field = useContext(InField);
  const named = Boolean(props["aria-label"] ?? props["aria-labelledby"]);

  useEffect(() => {
    if (!field && !named)
      console.error(`${kind} has no label for screen readers: put it in <Field label="...">, or give it aria-label.`);
  }, [field, named, kind]);

  const aria: AriaAttributes = {};

  if (field?.describedBy) aria["aria-describedby"] = field.describedBy;

  if (field?.invalid) aria["aria-invalid"] = true;

  return aria;
}

/**
 * A labeled form control: the label above, one control (TextField, TextArea, Select) inside, and a hint or an error
 * below. Wrap every input in one, so it has a visible label that screen readers announce too; they read the hint or
 * error as the control's description. `error` replaces the hint, turns it red and marks the control invalid; pass it
 * after a failed submit or validation.
 *
 * @import import { Field } from '../../ui/Field'
 */
export function Field({
  label,
  hint,
  error,
  wide,
  children,
}: {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  /** Fills the row it is in, like the input of a one-line add form. */
  wide?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  const note = error ?? hint;

  // Context rather than cloneElement, which React discourages: the control reads these through useNamedControl.
  const field: FieldNote = { invalid: Boolean(error) };

  if (note) field.describedBy = id;

  return (
    // Start-aligned even inside a centered EmptyState, so the label sits over its control.
    <div
      style={{ display: "flex", flexDirection: "column", gap: 4, flex: wide ? 1 : undefined, textAlign: "start" }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: text.sm, fontWeight: 500 }}>{label}</span>
        <InField value={field}>{children}</InField>
      </label>
      {note && (
        <span
          id={id}
          role={error ? "alert" : undefined}
          style={{ fontSize: text.xs, color: error ? color.danger : color.muted }}
        >
          {note}
        </span>
      )}
    </div>
  );
}
