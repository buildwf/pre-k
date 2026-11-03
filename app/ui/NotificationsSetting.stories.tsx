import { NotificationsSetting } from "./NotificationsSetting";

export default { component: NotificationsSetting };

const on = {
  supported: true,
  enabled: true,
  setEnabled: async () => {},
  test: async () => ({ shown: true }),
};

export const On = { args: { notifications: on } };
export const Off = { args: { notifications: { ...on, enabled: false } } };
export const BlockedBySystem = { name: "Blocked by the system", args: { notifications: { ...on, supported: false } } };
export const TestNotShown = { name: "Test not shown", args: { notifications: { ...on, test: async () => ({ shown: false, reason: "rate-limited" }) } } };
