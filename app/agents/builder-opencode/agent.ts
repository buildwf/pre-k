import { defineAgent } from "point/app";
import { harnessFor } from "../../harnesses/lib/select";

// A pre-k thread's builder on opencode. Start a thread with this agent to pick that harness (#19).
export default defineAgent({
  harness: harnessFor("opencode", "scripted-builder"),
  sandbox: "builder",
  // Off the gateway: the gateway routes Anthropic models only, so this harness uses its own login and default model.
  // pre-k does not meter or budget these runs.
  gateway: false,
});
