import { defineSandbox } from "point/app";

// The coordinator's workspace is its own folder (coordinator.ensure creates it), so the local provider confines its
// writes there. Network only reaches the model.
export default defineSandbox({
  provider: "local",
  network: { allow: ["*.anthropic.com"] },
});
