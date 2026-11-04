import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { attachmentLine, attachmentsIn, loadAttachments, saveAttachments } from "./store";

let root = "";
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "prek-att-"));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("attachments", () => {
  it("saves files per project and loads them back as Point attachments", async () => {
    const [a] = await saveAttachments("p1", [{ name: "note.txt", mime: "text/plain", data: "data:text/plain;base64,aGk=" }], root);
    expect(a).toMatchObject({ name: "note.txt", mime: "text/plain" });
    const loaded = await loadAttachments("p1", [a?.id ?? ""], root);
    expect(loaded).toEqual([expect.objectContaining({ name: "note.txt", mime: "text/plain", data: "aGk=" })]);
    expect(await loadAttachments("p2", [a?.id ?? ""], root)).toEqual([]);
    expect(await loadAttachments("p1", ["../../etc/passwd"], root)).toEqual([]);
  });

  it("refuses a file over the limit", async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64");
    await expect(saveAttachments("p1", [{ name: "big.png", mime: "image/png", data: big }], root)).rejects.toThrow(/over 5 MB/);
  });

  it("finds attachment lines in a message", () => {
    const id = "0b4c3c8e-1111-4222-8333-444455556666";
    const text = `Use this logo\n\n${attachmentLine({ id, name: "logo [v2].png" })}`;
    expect(attachmentsIn(text)).toEqual({ text: "Use this logo", attachments: [{ id, name: "logo v2.png" }] });
    expect(attachmentsIn("plain")).toEqual({ text: "plain", attachments: [] });
  });
});
