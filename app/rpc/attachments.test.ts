import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { testClient } from "point/rpc/testing";
import { afterEach, expect, it } from "vitest";
import router from "./attachments";

const home = process.env.HOME;
afterEach(() => {
  process.env.HOME = home;
});

it("saves attached files for a project and refuses one that is too big", async () => {
  process.env.HOME = await fs.mkdtemp(path.join(os.tmpdir(), "prek-home-"));
  const { rpc, close } = testClient(router, { caller: "window:main" });
  const r = await rpc.save({ projectId: "p1", files: [{ name: "a.txt", mime: "text/plain", data: "aGk=" }] });
  expect(r.ok && r.value[0]?.name).toBe("a.txt");
  const big = Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64");
  const r2 = await rpc.save({ projectId: "p1", files: [{ name: "b.png", mime: "image/png", data: big }] });
  expect(r2.ok ? "ok" : r2.failure.code).toBe("TOO_BIG");
  close();
});
