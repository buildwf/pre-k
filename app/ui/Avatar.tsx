import { useState } from "react";
import { color } from "./theme";

const sizes = { small: 24, medium: 32, large: 48 };

/** Up to two capital letters from a name (Ada Lovelace: AL), or a question mark when there is no name. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  const last = words.length > 1 ? words[words.length - 1] : undefined;

  if (!first) return "?";

  return ((Array.from(first)[0] ?? "") + (last ? (Array.from(last)[0] ?? "") : "")).toUpperCase();
}

/**
 * Who someone is, as a circle: their picture when they have one that loads, else their initials. It is decoration beside
 * their name, so a screen reader skips it; put the name next to it, or on the control that holds it. The picture comes
 * from the sign-in provider's `picture` claim, so only an https address is loaded, and without sending a referrer.
 *
 * @import import { Avatar } from '../../ui/Avatar'
 */
export function Avatar({ name, picture, size = "medium" }: { name: string; picture?: string | undefined; size?: keyof typeof sizes }) {
  const [failed, setFailed] = useState(false);
  const box = sizes[size];
  const show = picture !== undefined && picture.startsWith("https://") && !failed;

  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
        width: box,
        height: box,
        overflow: "hidden",
        borderRadius: "50%",
        background: color.hover,
        color: color.text,
        border: `1px solid ${color.subtle}`,
        fontSize: box * 0.4,
        fontWeight: 600,
        lineHeight: 1,
      }}
    >
      {show ? (
        <img
          src={picture}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
