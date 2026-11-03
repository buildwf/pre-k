import { z } from "zod";
import type { ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { color, mono, panelRadius, text } from "./theme";

/**
 * One turn in a conversation with an agent. `you` is the person's message (a tinted bubble on the right), `agent` is
 * the agent's reply (on the left, easy to read at length; a string is Markdown, as models write it), `tool` is a call
 * the agent made (one compact mono line, `title` is the tool's name). `pending` shows it is still arriving: replies
 * dim, tool lines keep their contrast since they are already small and muted. Screen readers hear who said each one.
 * Each message eases in.
 *
 * @import import { Message } from '../../ui/Message'
 */
export function Message({
  from,
  title,
  pending,
  children,
}: {
  from: "you" | "agent" | "tool";
  title?: string;
  pending?: boolean;
  children?: ReactNode;
}) {
  const fade = pending ? { opacity: 0.6 } : {};

  if (from === "tool")
    return (
      <div
        className="ui-enter"
        aria-busy={pending}
        style={{
          display: "flex",
          gap: 8,
          fontFamily: mono,
          fontSize: text.xs,
          color: color.muted,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        <span className="ui-sr-only">Tool call: </span>
        <span style={{ color: color.text, fontWeight: 500 }}>{title}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{children}</span>
      </div>
    );

  if (from === "you")
    return (
      <div
        className="ui-enter"
        style={{
          alignSelf: "flex-end",
          maxWidth: "80%",
          padding: "8px 12px",
          borderRadius: panelRadius,
          background: `color-mix(in srgb, ${color.accent} 12%, ${color.surface})`,
          whiteSpace: "pre-wrap",
          ...fade,
        }}
      >
        <span className="ui-sr-only">You: </span>
        {children}
      </div>
    );

  const markdown = z.string().safeParse(children);

  const reply = markdown.success ? (
    // react-markdown renders no raw HTML from the model, and links open outside the app's window.
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children: text }) => (
          <a href={href} target="_blank" rel="noreferrer">
            {text}
          </a>
        ),
      }}
    >
      {markdown.data}
    </Markdown>
  ) : (
    children
  );

  return (
    <div
      className="ui-enter ui-markdown"
      aria-busy={pending}
      style={{ transition: "opacity var(--ui-base) var(--ui-ease)", ...fade }}
    >
      <span className="ui-sr-only">Agent: </span>
      {reply}
    </div>
  );
}
