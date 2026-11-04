import { DiffView } from "./DiffView";

export default { component: DiffView };

export const Commit = {
  args: {
    files: [
      {
        path: "README.md",
        status: "modified",
        additions: 2,
        deletions: 1,
        binary: false,
        truncated: false,
        hunks: [
          {
            header: "@@ -1,4 +1,5 @@",
            lines: [
              { kind: "context", text: "# test repo", old: 1, new: 1 },
              { kind: "context", text: "", old: 2, new: 2 },
              { kind: "removed", text: "A playground for pre-k.", old: 3 },
              { kind: "added", text: "A playground for pre-k's builders.", new: 3 },
              { kind: "context", text: "", old: 4, new: 4 },
              { kind: "added", text: "![verify](https://example.com/badge.svg)", new: 5 },
            ],
          },
        ],
      },
      {
        path: "src/badge.ts",
        status: "added",
        additions: 3,
        deletions: 0,
        binary: false,
        truncated: false,
        hunks: [
          {
            header: "@@ -0,0 +1,3 @@",
            lines: [
              { kind: "added", text: "export function badge(name: string) {", new: 1 },
              { kind: "added", text: "  return `![${name}](https://example.com/${name}.svg)`;", new: 2 },
              { kind: "added", text: "}", new: 3 },
            ],
          },
        ],
      },
      { path: "docs/logo.png", status: "added", additions: 0, deletions: 0, binary: true, truncated: false, hunks: [] },
      { path: "docs/guide.md", from: "guide.md", status: "renamed", additions: 0, deletions: 0, binary: false, truncated: false, hunks: [] },
    ],
  },
};
