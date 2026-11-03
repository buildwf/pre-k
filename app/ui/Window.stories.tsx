import { Window } from "./Window";

// Window is the preview's own wrapper, so these stories skip it rather than nest a second main landmark.
export default { component: Window, parameters: { window: false } };

export const System = { args: { children: "Follows the system appearance" } };
export const Dark = { args: { scheme: "dark", children: "Always dark" } };
