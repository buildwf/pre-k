import type { ThreadState } from "./state";

/**
 * How each thread state reads wherever a thread is shown (the sidebar, its header, the chat's card): the words a
 * person scans for, the Badge tone and the StatusDot tone. Amber is for states waiting on the person, red for failed.
 */
export const stateLabel = {
  working: { text: "working", badge: "info", dot: "working" },
  blocked: { text: "needs you", badge: "warning", dot: "waiting" },
  review_ready: { text: "ready for review", badge: "warning", dot: "waiting" },
  landed: { text: "landed", badge: "success", dot: "success" },
  done: { text: "done", badge: "default", dot: "success" },
  failed: { text: "failed", badge: "danger", dot: "danger" },
  stopped: { text: "stopped", badge: "default", dot: "idle" },
  interrupted: { text: "interrupted", badge: "danger", dot: "danger" },
  idle: { text: "idle", badge: "default", dot: "idle" },
} as const satisfies Record<
  ThreadState,
  {
    text: string;
    badge: "default" | "success" | "warning" | "danger" | "info";
    dot: "working" | "waiting" | "success" | "danger" | "idle";
  }
>;
