import { defineHarness } from "point/app";
import { coordinatorTurn, scriptedSession } from "./lib/scripted";

// The keyless coordinator for tests and `point smoke` (#17): selected by PREK_HARNESS=scripted. No model, no cost.
export default defineHarness({
  name: "scripted-coordinator",
  capabilities: { steer: true, interrupt: true, resume: false },
  async start(o) {
    return scriptedSession(o, coordinatorTurn);
  },
});
