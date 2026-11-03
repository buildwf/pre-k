import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { checkoutPath } from "./paths";

afterEach(() => delete process.env.PRE_K_CHECKOUTS);

test("checkouts live outside userData, which Point hides from every agent sandbox", () => {
  delete process.env.PRE_K_CHECKOUTS;
  expect(checkoutPath("acme/app")).toBe(path.join(os.homedir(), ".pre-k", "checkouts", "acme", "app"));
});

test("PRE_K_CHECKOUTS overrides the root", () => {
  process.env.PRE_K_CHECKOUTS = "/tmp/co";
  expect(checkoutPath("acme/app")).toBe("/tmp/co/acme/app");
});
