import { useLayoutEffect, type ReactNode } from "react";
import { Boundary } from "./Boundary";
import "./kit.css";
import { color, font, text } from "./theme";

/**
 * The root of every window: the page background, text color and type, in the system's light or dark appearance.
 * `scheme` fixes one instead, for a window that is always dark. Put the window's content in a Stack inside it.
 * It carries a Boundary for the whole window, so a failed read shows an Alert with Try again instead of a blank window;
 * wrap independent sections in their own `<Boundary what="notes">` so one failing list leaves the rest working.
 *
 * @import import { Window } from '../../ui/Window'
 */
export function Window({
  scheme = "system",
  children,
}: {
  scheme?: "system" | "light" | "dark";
  children?: ReactNode;
}) {
  useLayoutEffect(() => {
    // Fixed on the root element too, so the window's scrollbars follow; restored when the Window unmounts.
    if (scheme === "system") return;
    const root = document.documentElement;
    const before = root.style.colorScheme;
    root.style.colorScheme = scheme;

    return () => {
      root.style.colorScheme = before;
    };
  }, [scheme]);

  return (
    <main
      // Focusable by script only: a screen that replaces another (the first-run welcome giving way to the window) calls
      // document.querySelector('main')?.focus() so keyboard and screen-reader users start at the top of what's new.
      tabIndex={-1}
      style={{
        outline: "none",
        colorScheme: scheme === "system" ? undefined : scheme,
        minHeight: "100vh",
        background: color.page,
        color: color.text,
        fontFamily: font,
        fontSize: text.md,
        lineHeight: 1.5,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <Boundary>{children}</Boundary>
    </main>
  );
}
