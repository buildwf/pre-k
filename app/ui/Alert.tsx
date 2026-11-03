import type { ReactNode } from "react";

const roles = { danger: "alert", attention: "status", default: "status" } as const;

/**
 * A message about what just happened, announced to screen readers: an error after a failed action ("Lost connection",
 * "Couldn't save"), a warning, or a quiet update like "Saved". `danger` interrupts the screen reader (role="alert");
 * `attention` and the default wait their turn (role="status").
 *
 * Keep it rendered and change its children: an empty Alert shows nothing, and the text put into it later is what gets
 * announced. Mounting a status region together with its text can go unannounced.
 *
 * @import import { Alert } from '../../ui/Alert'
 */
export function Alert({
  tone = "default",
  title,
  children,
}: {
  /** `danger` for errors, `attention` for warnings, the default for updates. */
  tone?: keyof typeof roles;
  /** A bold first line, like "Lost connection". */
  title?: string | undefined;
  children?: ReactNode;
}) {
  const shown =
    title !== undefined ||
    (children !== undefined && children !== null && children !== false && children !== "");

  return (
    <div role={roles[tone]} className={shown ? "ui-alert ui-enter" : undefined} data-tone={tone}>
      {title !== undefined && <strong className="ui-alert-title">{title}</strong>}
      {shown && children}
    </div>
  );
}
