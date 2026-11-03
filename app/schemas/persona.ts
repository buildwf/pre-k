import { z } from "zod";

// Runtime personas (Grok Bot's bots, minus voice): a template is one of these entries as JSON.
export const persona = z.object({
  id: z.string(),
  name: z.string().min(1),
  instructions: z.string().min(1),
  model: z.string().optional(),
  color: z.string().optional(),
});

export type Persona = z.infer<typeof persona>;
