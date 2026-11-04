import { defineHarness } from "point/app";
import { builderTurn, scriptedSession } from "./lib/scripted";

// The keyless builder for tests and `point smoke` (#17): selected by PREK_HARNESS=scripted. No model, no cost.
export default defineHarness({
  name: "scripted-builder",
  capabilities: { steer: true, interrupt: true, resume: false, attachments: true },
  async start(o) {
    return scriptedSession(o, builderTurn);
  },
});
