import { defineAgent } from "point/app";

export default defineAgent({
  harness: "claude-code",
  model: "anthropic/claude-sonnet-5-5",
  sandbox: "local",
});
