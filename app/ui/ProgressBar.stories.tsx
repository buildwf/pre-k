import { ProgressBar } from "./ProgressBar";

export default { component: ProgressBar };

export const Started = { args: { value: 0.1, label: "indexing" } };
export const Halfway = { args: { value: 5, max: 10, label: "files" } };
export const Unknown = { args: { label: "waiting for the agent" } };
