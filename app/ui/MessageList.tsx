import type { ReactNode } from "react";

/**
 * The column of a conversation's Messages. It is a live log for screen readers, so turns are announced as they
 * stream in without moving focus. Put every Message (and anything else in the conversation, like approvals) inside it.
 *
 * @import import { MessageList } from '../../ui/MessageList'
 */
export function MessageList({
  label = "Conversation",
  children,
}: {
  label?: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="log"
      aria-label={label}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      {children}
    </div>
  );
}
