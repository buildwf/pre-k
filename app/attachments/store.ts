import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { ATTACHABLE, MAX_BYTES } from "./lines";

/**
 * Files the person attaches in project chat, kept on this machine under the project, so the coordinator can hand them
 * to the threads it starts by id. Only what Claude Code reads as content: images, PDFs and plain text.
 */
export { ATTACHABLE, MAX_BYTES, MAX_FILES } from "./lines";

export const attachmentId = z.string().regex(/^[0-9a-f-]{36}$/, "an attachment id");
export const attachmentFile = z.object({
  name: z.string().trim().min(1).max(200),
  mime: z.enum(ATTACHABLE),
  /** base64, or a base64 data URL */
  data: z.string().min(1),
});
const meta = z.object({ id: attachmentId, name: z.string(), mime: z.enum(ATTACHABLE) });
export type AttachmentMeta = z.infer<typeof meta>;
/** What Point's agents.send takes. */
export type InlineAttachment = z.infer<typeof attachmentFile>;

const folder = (projectId: string, root: string) => path.join(root, ".pre-k", "projects", projectId, "attachments");
const base64 = (data: string) => (data.startsWith("data:") ? data.slice(data.indexOf(",") + 1) : data);

/** Save files for a project; returns their ids. Refuses a file over MAX_BYTES. */
export async function saveAttachments(
  projectId: string,
  files: readonly z.infer<typeof attachmentFile>[],
  root = os.homedir(),
): Promise<AttachmentMeta[]> {
  const dir = folder(projectId, root);
  await fs.mkdir(dir, { recursive: true });
  const saved: AttachmentMeta[] = [];
  for (const f of files) {
    const bytes = Buffer.from(base64(f.data), "base64");
    if (bytes.length > MAX_BYTES) throw new Error(`${f.name} is over ${MAX_BYTES / 1024 / 1024} MB`);
    const m = { id: randomUUID(), name: f.name, mime: f.mime };
    await fs.writeFile(path.join(dir, m.id), bytes);
    await fs.writeFile(path.join(dir, `${m.id}.json`), JSON.stringify(m));
    saved.push(m);
  }
  return saved;
}

/** A project's saved files by id, as Point attachments, with where each is on disk. Unknown ids are skipped. */
export async function loadAttachments(
  projectId: string,
  ids: readonly string[],
  root = os.homedir(),
): Promise<(InlineAttachment & { path: string })[]> {
  const dir = folder(projectId, root);
  const out: (InlineAttachment & { path: string })[] = [];
  for (const id of ids) {
    if (!attachmentId.safeParse(id).success) continue;
    try {
      const m = meta.parse(JSON.parse(await fs.readFile(path.join(dir, `${id}.json`), "utf8")));
      const file = path.join(dir, id);
      out.push({ mime: m.mime, name: m.name, data: (await fs.readFile(file)).toString("base64"), path: file });
    } catch {
      // gone or not this project's: skip it
    }
  }
  return out;
}

export { attachmentLine, attachmentsIn } from "./lines";
