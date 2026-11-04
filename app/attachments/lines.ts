// The parts of attachments a window can use too (no Node): what can be attached, and the lines a message carries.

/** What Claude Code reads as content: images, PDFs and plain text. */
export const ATTACHABLE = ["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf", "text/plain"] as const;
export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_FILES = 5;

/** The line a message carries per attachment, so the coordinator can name them on `threads start --attachments`. */
export function attachmentLine(m: { id: string; name: string }): string {
  return `[attachment: ${m.name.replace(/[[\]]/g, "")}](attachment:${m.id})`;
}

const LINE = /\[attachment: ([^\]\n]+)\]\(attachment:([0-9a-f-]{36})\)/g;

/** A message's attachments, and its text without their lines. */
export function attachmentsIn(text: string): { text: string; attachments: { id: string; name: string }[] } {
  const attachments = [...text.matchAll(LINE)].flatMap((m) => (m[1] && m[2] ? [{ name: m[1], id: m[2] }] : []));
  return { text: text.replace(LINE, "").replace(/\n{2,}$/, "").trim(), attachments };
}
