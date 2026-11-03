import { defineDaemon, defineRouter, procedure } from "point/app";

// Outlives the app (launchd when packaged). Agents already run in Point's own `agents` daemon; put long-lived app
// services here.
export default defineDaemon({
  rpc: defineRouter({
    uptime: procedure
      .cli()
      .handler(() => ({ pid: process.pid, seconds: Math.round(process.uptime()) })),
  }),
});
