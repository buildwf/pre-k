import { defineTool } from "point/app";
import { z } from "zod";

// The filename is the tool name the model sees. Runs in Point's trusted process; reaches the workspace via ctx.sandbox.
export default defineTool({
  description: "Run the test suite and return the failing lines.",
  input: z.object({ filter: z.string().optional() }),
  effect: "local-process",
  async run({ filter }, ctx) {
    const r = await ctx.exec("npm", ["test", "--", ...(filter ? [filter] : [])]);

    return r.code === 0
      ? "all tests passed"
      : r.stdout
          .split("\n")
          .filter((l) => /fail|error|✗|×/i.test(l))
          .join("\n") || r.stderr;
  },
});
