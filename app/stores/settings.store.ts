import { defineStore } from "point/app";
import { z } from "zod";

// Persisted under userData/stores, validated on write, live in every window via useStore('settings').
export default defineStore({
  schema: z.object({
    repo: z.string(),
    theme: z.enum(["system", "light", "dark"]),
    // What project chat calls the person; unset means their GitHub name, else their computer account (coordinator.whoami).
    name: z.string().optional(),
  }),
  initial: { repo: process.cwd(), theme: "system" },
});
