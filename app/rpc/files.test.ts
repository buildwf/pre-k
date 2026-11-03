import { testClient } from "point/rpc/testing";
import { afterAll, describe, expect, it } from "vitest";
import { z } from "zod";
import files from "./files";

// Tests sit next to the code they test and call routers the way a window does: typed results, typed failure codes.
const { rpc, close } = testClient(files);

afterAll(close);

describe("files", () => {
  it("reads a file", async () => {
    const r = await rpc.read({ path: "package.json" });
    // JSON.parse answers unknown in a Point app: parse it with the shape you expect.
    expect(r.ok && z.object({ type: z.string() }).parse(JSON.parse(r.value.text)).type).toBe(
      "module",
    );
  });

  it("fails with NOT_FOUND for a missing file", async () => {
    const r = await rpc.read({ path: "no-such-file" });
    expect(r.ok ? null : r.failure).toEqual({
      code: "NOT_FOUND",
      detail: { path: "no-such-file" },
    });
  });
});
