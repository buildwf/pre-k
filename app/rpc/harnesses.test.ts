import { testClient } from "point/rpc/testing";
import { afterAll, describe, expect, it } from "vitest";
import router, { claudeBuilderCredential } from "./harnesses";

const { rpc, close } = testClient(router);
afterAll(close);

describe("harnesses", () => {
  it("names the credential a Claude Code builder would use, never its value", async () => {
    const no = async () => false;
    expect(await claudeBuilderCredential({ CLAUDE_CODE_OAUTH_TOKEN: "t" }, no)).toBe("oauth-token");
    expect(await claudeBuilderCredential({ ANTHROPIC_API_KEY: "k", CLAUDE_CODE_OAUTH_TOKEN: "t" }, no)).toBe("api-key");
    expect(await claudeBuilderCredential({}, async () => true)).toBe("api-key");
    expect(await claudeBuilderCredential({}, no)).toBe("none");
  });

  it("claudeCredentials answers with the kind only", async () => {
    const r = await rpc.claudeCredentials();
    expect(r.ok && Object.keys(r.value)).toEqual(["credential"]);
  });
});
