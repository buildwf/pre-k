import { defineStore } from "point/app";
import { z } from "zod";

import { persona } from "../schemas/persona";

export default defineStore({
  schema: z.object({ personas: z.array(persona), lastUsed: z.string().optional() }),
  initial: {
    personas: [
      {
        id: "ada",
        name: "Ada",
        instructions: "Terse and dry. Answer in one line first, then details only if asked.",
        color: "#1084FE",
      },
      {
        id: "coach",
        name: "Coach",
        instructions: "Warm and encouraging. Explain the why before the how, in short paragraphs.",
        color: "#D4572A",
      },
    ],
  },
});
