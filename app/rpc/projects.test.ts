import { testClient } from "point/rpc/testing";
import { afterAll, describe, expect, it } from "vitest";
import projects from "../collections/projects.collection";
import router from "./projects";

const { rpc, collections, close } = testClient(router, { collections: { projects } });

afterAll(close);

describe("projects", () => {
  it("creates a project with its instructions", async () => {
    const r = await rpc.create({ name: "Test", instructions: "Use pnpm." });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const got = await rpc.get({ id: r.value.id });
    expect(got.ok && got.value).toMatchObject({ name: "Test", instructions: "Use pnpm." });
  });

  it("refuses a blank name", async () => {
    const r = await rpc.create({ name: "   " });

    expect(r.ok ? null : r.failure.code).toBe("BAD_INPUT");
  });

  it("keeps the GitHub fields when Project setup edits the name", async () => {
    const r = await rpc.create({ name: "Linked" });

    if (!r.ok) throw new Error("create failed");
    const { id } = r.value;
    await rpc.update({ id, repo: "acme/app", defaultBranch: "main", checkoutPath: "/tmp/acme" });
    await rpc.update({ id, name: "Renamed", instructions: "Small PRs." });

    expect(collections.get("projects", id)).toMatchObject({
      name: "Renamed",
      instructions: "Small PRs.",
      repo: "acme/app",
      defaultBranch: "main",
      checkoutPath: "/tmp/acme",
    });
  });

  it("lists the most recently opened project first", async () => {
    const a = await rpc.create({ name: "A" });
    const b = await rpc.create({ name: "B" });

    if (!a.ok || !b.ok) throw new Error("create failed");
    await new Promise((resolve) => setTimeout(resolve, 2));
    await rpc.open({ id: a.value.id });

    const list = await rpc.list();
    expect(list.ok && list.value.slice(0, 2).map((p) => p.id)).toEqual([a.value.id, b.value.id]);
  });

  it("fails with NOT_FOUND for an unknown project", async () => {
    for (const r of [await rpc.get({ id: "nope" }), await rpc.open({ id: "nope" }), await rpc.update({ id: "nope", name: "x" })]) {
      expect(r.ok ? null : r.failure).toEqual({ code: "NOT_FOUND", detail: { id: "nope" } });
    }
  });
});
