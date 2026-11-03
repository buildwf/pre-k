import { defineRouter, procedure } from "point/app";
import fs from "node:fs/promises";
import { z } from "zod";

// Procedures run in main. `.tool()` lets the agent call them through its CLI shim ($POINT_CLI); `.cli()` puts them on the app's CLI.
export default defineRouter({
  read: procedure
    .input(z.object({ path: z.string() }))
    .output(z.object({ text: z.string() }))
    .errors({ NOT_FOUND: z.object({ path: z.string() }) })
    .tool()
    .cli()
    .handler(async ({ input, fail }) => {
      try {
        return { text: await fs.readFile(input.path, "utf8") };
      } catch {
        return fail("NOT_FOUND", { path: input.path });
      }
    }),
});
