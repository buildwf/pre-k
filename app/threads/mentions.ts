/**
 * @-mentions of a thread in project chat. The person picks a thread from the list that opens on `@`; the message the
 * coordinator gets carries it as `@[title](thread:<id>)`, so the coordinator (and the scripted one) knows exactly which
 * thread to send the follow-up to, and project chat can show it as a chip.
 */

/** A thread the person can mention. */
export interface Mentionable {
  threadId: string;
  title: string;
}

const TOKEN = /@\[([^\]\n]+)\]\(thread:([\w:.-]+)\)/;

/** The mention as the coordinator receives it. */
export function mentionToken(m: Mentionable): string {
  return `@[${m.title.replace(/[[\]]/g, "")}](thread:${m.threadId})`;
}

/** The thread a message mentions, and the message without the mention; undefined when it mentions none. */
export function parseMention(text: string): (Mentionable & { rest: string; before: string }) | undefined {
  const m = TOKEN.exec(text);
  if (!m || m[1] === undefined || m[2] === undefined) return undefined;
  const before = text.slice(0, m.index).trim();
  const rest = `${before} ${text.slice(m.index + m[0].length)}`.trim();
  return { title: m[1], threadId: m[2], rest, before };
}

/** What the person is typing after an `@` at the end of the box (`@add` → "add"), or undefined. */
export function mentionQuery(text: string): string | undefined {
  return /(?:^|\s)@([^\s@[]*)$/.exec(text)?.[1];
}

/** The threads that match what follows the `@`, by title, most recent first as given, at most `limit`. */
export function mentionMatches(threads: readonly Mentionable[], query: string, limit = 5): Mentionable[] {
  const q = query.toLowerCase();
  return threads.filter((t) => t.title.toLowerCase().includes(q)).slice(0, limit);
}

/** The box after picking a thread: the `@query` at the end becomes `@Title `. */
export function pickMention(text: string, picked: Mentionable): string {
  return text.replace(/@[^\s@[]*$/, `@${picked.title} `);
}

/**
 * The message to send: the first `@Title` of a picked thread becomes its token. Mentions whose `@Title` the person
 * deleted again are dropped.
 */
export function withMentions(text: string, picked: readonly Mentionable[]): string {
  for (const p of picked) {
    const at = text.indexOf(`@${p.title}`);
    if (at >= 0) return `${text.slice(0, at)}${mentionToken(p)}${text.slice(at + p.title.length + 1)}`;
  }
  return text;
}
