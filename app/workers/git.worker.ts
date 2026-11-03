import { defineRouter, defineWorker, procedure } from "point/app";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

const run = promisify(execFile);

// Runs in its own supervised utilityProcess as rpc.git.*
export default defineWorker({
  rpc: defineRouter({
    status: procedure
      .input(z.object({ cwd: z.string() }))
      .cli()
      .handler(
        async ({ input }) => (await run("git", ["status", "--short"], { cwd: input.cwd })).stdout,
      ),
    log: procedure
      .input(z.object({ cwd: z.string(), n: z.number().default(10) }))
      .handler(
        async ({ input }) =>
          (await run("git", ["log", "--oneline", `-${input.n}`], { cwd: input.cwd })).stdout,
      ),
  }),
});
