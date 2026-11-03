import { defineSandbox } from "point/app";

// Writes confined to the thread's workspace; network only through Point's egress proxy to these hosts.
export default defineSandbox({
  provider: "local",
  network: { allow: ["*.anthropic.com", "*.github.com", "registry.npmjs.org"] },
});
