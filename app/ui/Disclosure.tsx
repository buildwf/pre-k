import type { ReactNode } from "react";

/**
 * A labeled section that starts closed, for things most people don't need every time. It opens and closes smoothly.
 *
 * @import import { Disclosure } from '../../ui/Disclosure'
 */
export function Disclosure({ summary, children }: { summary: string; children?: ReactNode }) {
  return (
    <details className="ui-disclosure">
      <summary>{summary}</summary>
      <div style={{ paddingTop: 8 }}>{children}</div>
    </details>
  );
}
