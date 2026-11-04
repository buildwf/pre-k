import { describe, expect, it } from "vitest";
import { mentionMatches, mentionQuery, mentionToken, parseMention, pickMention, withMentions } from "./mentions";

const badge = { threadId: "t1", title: "Add a README badge" };
const docs = { threadId: "t2", title: "Fix the docs" };

describe("mentions", () => {
  it("finds the query after an @ at the end of the box", () => {
    expect(mentionQuery("ask @add")).toBe("add");
    expect(mentionQuery("@")).toBe("");
    expect(mentionQuery("mail me@x.com")).toBeUndefined();
    expect(mentionQuery("@add then")).toBeUndefined();
  });

  it("matches threads by title", () => {
    expect(mentionMatches([badge, docs], "READ")).toEqual([badge]);
    expect(mentionMatches([badge, docs], "")).toEqual([badge, docs]);
  });

  it("turns a picked thread into its token, and back", () => {
    const box = pickMention("@add", badge);
    expect(box).toBe("@Add a README badge ");
    const sent = withMentions(`${box}also a CI badge`, [badge]);
    expect(sent).toBe("@[Add a README badge](thread:t1) also a CI badge");
    expect(parseMention(sent)).toEqual({ ...badge, rest: "also a CI badge", before: "" });
  });

  it("drops a mention the person deleted again", () => {
    expect(withMentions("just text", [badge])).toBe("just text");
    expect(parseMention("just text")).toBeUndefined();
  });

  it("keeps brackets out of the token", () => {
    expect(mentionToken({ threadId: "t3", title: "Fix [bug]" })).toBe("@[Fix bug](thread:t3)");
  });
});
