import { Message } from "./Message";

export default { component: Message };

export const You = { args: { from: "you", children: "Add a test for the files router." } };

export const Agent = {
  args: {
    from: "agent",
    children: "Added files.test.ts with two cases: a missing file and a read outside the repo.",
  },
};

export const Tool = {
  args: { from: "tool", title: "files.write", children: '{"path":"app/rpc/files.test.ts"}' },
};

export const Pending = { args: { from: "agent", pending: true, children: "Reading the router" } };

export const Markdown = {
  args: {
    from: "agent",
    children: [
      "**What it does**: reads a file through `rpc.files.read` and shows it.",
      "",
      '- Missing files return `{ ok: false, failure: { code: "not-found" } }`',
      "- Reads outside the repo are refused",
      "",
      "```ts",
      "const r = await rpc.files.read({ path: 'README.md' })",
      "```",
      "",
      "| Case | Result |",
      "|---|---|",
      "| missing | not-found |",
      "| outside | refused |",
    ].join("\n"),
  },
};
