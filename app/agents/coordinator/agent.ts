import { defineAgent } from "point/app";

// The project's coordinator: the agent behind project chat. One thread per project, started by coordinator.ensure.
// Its sandbox confines writes to its own folder, so it reads the project but changes code only through threads.
export default defineAgent({
  harness: "claude-code",
  model: "anthropic/claude-sonnet-5-5",
  sandbox: "coordinator",
});
