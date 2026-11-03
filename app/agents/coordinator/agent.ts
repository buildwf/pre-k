import { defineAgent } from "point/app";
import { harnessFor } from "../../harnesses/lib/select";

// The project's coordinator: the agent behind project chat. One thread per project, started by coordinator.ensure.
// Its sandbox confines writes to its own folder, so it reads the project but changes code only through threads.
// PREK_HARNESS=scripted runs it keyless on the scripted coordinator (tests, smoke).
export default defineAgent({
  harness: harnessFor("claude-code", "scripted-coordinator"),
  model: "anthropic/claude-sonnet-5-5",
  sandbox: "coordinator",
});
