import { defineAgent } from "point/app";
import { harnessFor } from "../../harnesses/lib/select";

// A pre-k thread's builder on claude-code. Start a thread with this agent to pick that harness (#19).
export default defineAgent({
  harness: harnessFor("claude-code", "scripted-builder"),
  model: "anthropic/claude-sonnet-5-5",
  sandbox: "builder",
});
