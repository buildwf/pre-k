import { describe, expect, it } from "vitest";
import { stateLabel } from "./labels";

describe("stateLabel", () => {
  it("marks the states waiting on the person in amber and failures in red", () => {
    expect(stateLabel.blocked).toMatchObject({ text: "needs you", badge: "warning", dot: "waiting" });
    expect(stateLabel.review_ready.badge).toBe("warning");
    expect(stateLabel.failed).toMatchObject({ badge: "danger", dot: "danger" });
    expect(stateLabel.landed).toMatchObject({ text: "landed", badge: "success" });
  });
});
