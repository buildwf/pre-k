import { fakeConnector } from "point/connectors/testing";
import { testClient } from "point/rpc/testing";
import { afterAll, describe, expect, it } from "vitest";
import githubConnector from "../connectors/github.connector";
import github from "./github";

describe("github.me", () => {
  const fake = fakeConnector(githubConnector, {
    me: { login: "octo-pre-k", name: null, url: "https://github.com/octo-pre-k" },
  });
  const { rpc, close } = testClient(github, { connectors: [fake] });

  afterAll(close);

  it("says who pre-k acts as, and nothing else", async () => {
    const r = await rpc.me();

    expect(r.ok && r.value).toEqual({
      login: "octo-pre-k",
      name: null,
      url: "https://github.com/octo-pre-k",
    });
  });
});

describe("github.me, not connected", () => {
  const { rpc, close } = testClient(github);

  afterAll(close);

  it("fails CONNECTOR_NOT_CONNECTED so the window can show Connect", async () => {
    const before = { GITHUB_TOKEN: process.env.GITHUB_TOKEN, GH_TOKEN: process.env.GH_TOKEN };
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    try {
      const r = await rpc.me();

      expect(r.ok ? null : r.failure.code).toBe("CONNECTOR_NOT_CONNECTED");
    } finally {
      Object.assign(process.env, Object.fromEntries(Object.entries(before).filter(([, v]) => v)));
    }
  });
});
