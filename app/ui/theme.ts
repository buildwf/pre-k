/**
 * The kit's colors and sizes, by name, for the inline styles of components in app/ui/. The values live in kit.css as
 * CSS custom properties (each color light and dark), so a dark mode, a new palette or a different spacing scale is an
 * edit to kit.css alone. Components take their colors from here rather than from hex values.
 */
export const color = {
  /** The window's background. */
  page: "var(--ui-page)",
  /** Controls and panels on the page. */
  surface: "var(--ui-surface)",
  /** A control or row under the pointer. */
  hover: "var(--ui-hover)",
  text: "var(--ui-text)",
  muted: "var(--ui-muted)",
  danger: "var(--ui-danger)",
  border: "var(--ui-border)",
  /** Dividers and the borders of panels, softer than a control's. */
  subtle: "var(--ui-subtle)",
  /** Something waiting on the person, like an approval. */
  attention: "var(--ui-attention)",
  /** The selected option, a progress bar's fill, focus. */
  accent: "var(--ui-accent)",
  /** Text on an accent background. */
  onAccent: "var(--ui-on-accent)",
};

/** Every gap and padding is one of these, in pixels: a 4px grid, so spacing lines up across windows. */
export type Space = 0 | 4 | 8 | 12 | 16 | 24 | 32 | 48;

/** Font sizes, from kit.css's type scale. Body text is md; xs is for captions, table headers and tool lines. */
export const text = {
  xs: "var(--ui-text-xs)",
  sm: "var(--ui-text-sm)",
  md: "var(--ui-text-md)",
  lg: "var(--ui-text-lg)",
  xl: "var(--ui-text-xl)",
  "2xl": "var(--ui-text-2xl)",
};

export const radius = "var(--ui-radius)";
export const panelRadius = "var(--ui-radius-panel)";
export const shadow = "var(--ui-shadow)";
export const font = "var(--ui-font)";
export const mono = "var(--ui-mono)";
