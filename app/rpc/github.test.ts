import { ConnectorError } from "point/connectors";
import { fakeConnector } from "point/connectors/testing";
import { testClient } from "point/rpc/testing";
import { afterAll, describe, expect, it } from "vitest";
import githubConnector from "../connectors/github.connector";
import github from "./github";

describe("github.me", () => {
  let refused = false;
  let offline = false;
  const fake = fakeConnector(githubConnector, {
    me: () => {
      if (offline) throw new TypeError("fetch failed");
      if (refused) throw new ConnectorError("github", 401, "Bad credentials");
      return { login: "octo-pre-k", name: null, url: "https://github.com/octo-pre-k" };
    },
  });
  const { rpc, close } = testClient(github, { connectors: [fake] });

  afterAll(close);

  it("says who pre-k acts as, and nothing else", async () => {
    const r = await rpc.me();

    expect(r.ok ? r.value : r.failure).toEqual({
      login: "octo-pre-k",
      name: null,
      url: "https://github.com/octo-pre-k",
    });
  });

  it("fails TOKEN_REJECTED for a revoked token, so the window can ask to connect again", async () => {
    refused = true;
    const r = await rpc.me();

    refused = false;
    expect(r.ok ? null : r.failure.code).toBe("TOKEN_REJECTED");
  });

  it("fails UNREACHABLE when GitHub doesn't answer, so offline isn't an internal error", async () => {
    offline = true;
    const r = await rpc.me();

    offline = false;
    expect(r.ok ? null : r.failure).toEqual({ code: "UNREACHABLE", detail: { message: "fetch failed" } });
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

