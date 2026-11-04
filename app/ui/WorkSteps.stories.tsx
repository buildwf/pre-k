import { WorkSteps, type WorkStep } from "./WorkSteps";

const done: WorkStep[] = [
  { id: "1", kind: "read", verb: "Read", target: "README.md", output: "# test repo", running: false, failed: false },
  { id: "2", kind: "edit", verb: "Edited", target: "README.md", running: false, failed: false },
  {
    id: "3",
    kind: "command",
    verb: "Ran",
    target: "git add -A && git commit -q -m 'Add a README badge' && git rev-parse --short HEAD",
    output: "ebf7988",
    running: false,
    failed: false,
  },
  { id: "4", kind: "command", verb: "Ran", target: "bun run test", output: "1 failed", running: false, failed: true },
];

export default { component: WorkSteps };

/** Folded once the agent moved on. */
export const Done = {
  render: () => <WorkSteps steps={done} summary="Read 1 file, edited 1 file, ran 2 commands · 1 failed" running={false} />,
};

/** Open while it works, with a spinner on the step running now. */
export const Running = {
  render: () => (
    <WorkSteps
      steps={[...done.slice(0, 2), { id: "5", kind: "command", verb: "Running", target: "bun run test", running: true, failed: false }]}
      summary=""
      running
    />
  ),
};
