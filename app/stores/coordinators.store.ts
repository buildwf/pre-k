import { defineStore } from "point/app";
import { z } from "zod";

// Which agent thread is each project's coordinator, so project chat reopens the same conversation after a restart.
export default defineStore({
  schema: z.object({ threads: z.record(z.string(), z.string()) }),
  initial: { threads: {} },
});
