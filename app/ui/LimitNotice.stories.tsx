import { LimitNotice } from "./LimitNotice";

export default { component: LimitNotice };

export const Default = { args: { what: "cards", limit: 10, plan: "Free", onUpgrade: () => {} } };

export const NoWayPast = { name: "No way past it", args: { what: "cards", limit: 10, plan: "Free" } };
