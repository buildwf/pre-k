import { useState } from "react";
import { ThreadLandedCommit } from "../lib/ThreadLandedCommit";
import { z } from "zod";
import { rpc, useAgent, useCollection, useThreads } from "point/client";
import { eq, useLiveQuery } from "point/cloud/db";
import { render } from "../../.point/components";
import { ThreadPullRequest } from "../lib/ThreadPullRequest";
import { lastAttempt, threadState, type ThreadState } from "../threads/state";
import { Alert } from "../ui/Alert";
import { ApprovalPrompt } from "../ui/ApprovalPrompt";
import { Button } from "../ui/Button";
import { Disclosure } from "../ui/Disclosure";
import { EmptyState } from "../ui/EmptyState";
import { Heading } from "../ui/Heading";
import { List, ListItem } from "../ui/List";
import { Message } from "../ui/Message";
import { MessageList } from "../ui/MessageList";
import { Stack } from "../ui/Stack";
import { Text } from "../ui/Text";
import { TextField } from "../ui/TextField";

/**
 * How each state reads: the words a person scans for, red for the ones waiting on them, and one line on what it means
 * and what they can do next.
 */
const stateWords: Record<ThreadState, { text: string; tone: "default" | "muted" | "danger"; help: string }> = {
  working: { text: "working", tone: "default", help: "The agent is on it. Steer it, or queue what comes next." },
  blocked: { text: "needs you", tone: "danger", help: "Paused, or waiting for you to allow a tool." },
  review_ready: { text: "ready for review", tone: "default", help: "Opened a pull request. Review it, or follow up with changes." },
  landed: { text: "landed", tone: "default", help: "Committed its work. Follow up to ask for more." },
  done: { text: "done", tone: "muted", help: "Marked done. A follow-up reopens it." },
  failed: { text: "failed", tone: "danger", help: "Failed. Open it to see why, then retry or follow up." },
  stopped: { text: "stopped", tone: "muted", help: "Stopped. A follow-up reopens it." },
  interrupted: { text: "interrupted", tone: "danger", help: "Cut off mid-turn. Retry to send the request again." },
  idle: { text: "idle", tone: "muted", help: "Finished its turn without landing any work. Follow up to ask for more." },
};

/** An open thread whose latest attempt failed: shown in the thread view, which reads the thread's events. */
const attemptFailed: (typeof stateWords)[ThreadState] = {
  text: "attempt failed",
  tone: "danger",
  help: "The last attempt didn't finish. Retry it, or send a different request.",
};

/** The first line of an error, at most 80 characters. */
const short = (message: string | undefined) => {
  const line = message?.split("\n")[0]?.trim();
  return line && line.length > 80 ? `${line.slice(0, 79)}…` : line || undefined;
};

/** "commit 3f9c2e1 on main" or "PR #12": what a thread delivered, in a list row. */
const delivered = (o: { kind: "pr"; number: number } | { kind: "commit"; sha: string; branch: string }) =>
  o.kind === "pr" ? `PR #${o.number}` : `landed ${o.sha.slice(0, 7)} on ${o.branch}`;

/** A project's threads, newest activity first, and the one that is open. */
export function Threads({
  projectId,
  open: shown,
  onOpen,
}: {
  projectId: string;
  /** Controlled from outside, so project chat's thread cards can open a thread here. */
  open?: string | undefined;
  onOpen?: ((threadId: string) => void) | undefined;
}) {
  const threads = useCollection("threads");
  const outputs = useCollection("thread-outputs");
  const live = useThreads();
  const [own, setOwn] = useState<string>();
  const open = onOpen ? shown : own;
  const setOpen = onOpen ?? setOwn;
  const { data: rows, isLoading } = useLiveQuery(
    (q) =>
      q
        .from({ t: threads })
        .where(({ t }) => eq(t.projectId, projectId))
        .orderBy(({ t }) => t.updatedAt, "desc"),
  );
  const { data: produced } = useLiveQuery((q) => q.from({ o: outputs }));
  const statusOf = new Map(live.map((t) => [t.id, t.status]));

  if (isLoading) return null;

  return (
    <Stack gap={12}>
      <Heading level={2}>Threads</Heading>
      {rows.length === 0 ? (
        <EmptyState title="No threads yet">
          Ask in the project chat and the coordinator starts a thread for the work.
        </EmptyState>
      ) : (
        <List label="Threads">
          {rows.map((t) => {
            const prs = produced.filter((o) => o.threadId === t.threadId);
            const named = threadState(statusOf.get(t.threadId), t.endedAs, prs, t.lastAttempt);
            const state = stateWords[named];
            // Why it failed, in a few words, so the list says what went wrong without opening the thread.
            const why = named === "failed" && !t.endedAs ? short(t.lastAttempt?.message) : undefined;
            return (
              <ListItem
                key={t.threadId}
                actions={
                  <Button variant="quiet" onClick={() => setOpen(t.threadId)} aria-pressed={open === t.threadId}>
                    Open
                  </Button>
                }
              >
                <Stack gap={4}>
                  <Stack direction="row" gap={8} align="baseline" wrap>
                    <Text bold>{t.title}</Text>
                    <Text tone={state.tone}>{why ? `${state.text}: ${why}` : state.text}</Text>
                  </Stack>
                  <Stack direction="row" gap={8} wrap>
                    {prs.length > 0 ? (
                      <Text tone="muted">{prs.map(delivered).join(" · ")}</Text>
                    ) : (
                      <Text tone="muted">asked by {t.requestedBy}</Text>
                    )}
                    {t.branch && (
                      <Text tone="muted" mono>
                        {t.branch}
                      </Text>
                    )}
                  </Stack>
                </Stack>
              </ListItem>
            );
          })}
        </List>
      )}
      {open && <ThreadView key={open} threadId={open} />}
    </Stack>
  );
}

/**
 * One thread: what state it's in and what to do about it, the agent's work as it happens, what it delivered,
 * approvals, a failed attempt with Retry, and one box to steer a running turn or follow up on a finished one.
 */
export function ThreadView({ threadId }: { threadId: string }) {
  const agent = useAgent(threadId);
  const threads = useCollection("threads");
  const { data } = useLiveQuery((q) => q.from({ t: threads }).where(({ t }) => eq(t.threadId, threadId)));
  const row = data[0];
  const outputs = useCollection("thread-outputs");
  const { data: prs } = useLiveQuery((q) =>
    q.from({ o: outputs }).where(({ o }) => eq(o.threadId, threadId)).orderBy(({ o }) => o.createdAt, "asc"),
  );
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string>();
  const [sending, setSending] = useState(false);
  const busy = agent.status === "starting" || agent.status === "running" || agent.status === "parked" || agent.status === "paused";
  const attempt = lastAttempt(agent.events);
  const retryable = !busy && !sending && attempt.failed;
  // A failed attempt reads as one, not as "idle", unless the thread was closed since.
  const state =
    retryable && !row?.endedAs
      ? attemptFailed
      : stateWords[threadState(agent.status, row?.endedAs, prs)];
  // A steered message's id is its steer id, so these find their message.
  const steers = new Map<string, string>();
  for (const e of agent.events) {
    if (e.type === "steer.delivered") steers.set(e.steerId, "steered");
    else if (e.type === "steer.failed") steers.set(e.steerId, `steer failed: ${e.reason}`);
  }
  // Not running: through main, which reopens a closed thread and queues the request (a new turn, or a new harness).
  const followUp = async (message: string) => {
    setSending(true);
    const r = await rpc.threads.followUp({ threadId, text: message });
    setSending(false);
    setProblem(r.ok ? undefined : r.failure.code === "SEND_FAILED" ? `Couldn't send it: ${r.failure.detail.message}` : r.failure.code);
    return r.ok;
  };
  const send = async (turn: "steer" | "queue") => {
    const message = text.trim();
    if (!message) return;
    if (busy) {
      void agent.send(message, { turn });
      setText("");
    } else if (await followUp(message)) setText("");
  };
  const end = async (as: "done" | "failed") => {
    const r = await rpc.threads.end({ threadId, as });
    setProblem(r.ok ? undefined : r.failure.code);
  };
  const started = agent.messages.length > 0;

  return (
    <Stack gap={12}>
      <Stack direction="row" gap={8} align="center" justify="between" wrap>
        <Heading level={3}>{row?.title ?? threadId.slice(0, 8)}</Heading>
        <Stack direction="row" gap={4} wrap>
          {agent.can.pause && (
            <Button variant="quiet" onClick={() => agent.pause()}>
              Pause
            </Button>
          )}
          {agent.can.resume && (
            <Button variant="quiet" onClick={() => agent.resume()}>
              Resume
            </Button>
          )}
          {agent.can.cancel && (
            <Button variant="quiet" onClick={() => agent.cancel()}>
              Cancel
            </Button>
          )}
          {!row?.endedAs && !busy && (
            <>
              <Button variant="quiet" onClick={() => end("done")}>
                Mark done
              </Button>
              <Button variant="quiet" onClick={() => end("failed")}>
                Mark failed
              </Button>
            </>
          )}
        </Stack>
      </Stack>
      <Stack gap={4}>
        <Stack direction="row" gap={8} align="baseline" wrap>
          <Text tone={state.tone} bold>
            {state.text}
          </Text>
          <Text tone="muted">{state.help}</Text>
        </Stack>
        <Text tone="muted">
          ${agent.usage.costUsd.toFixed(3)}
          {row?.requestedBy ? ` · asked by ${row.requestedBy}` : ""}
          {row?.branch ? ` · ${row.branch}` : ""}
        </Text>
      </Stack>
      {/* A failure comes first: it is what the person has to act on. */}
      <Alert tone="danger">
        {retryable && (
          <Stack direction="row" gap={8} align="center" justify="between" wrap>
            <Text>{attempt.message ?? "The turn ended before the agent finished."}</Text>
            <Button variant="primary" onClick={() => void followUp(attempt.request ?? row?.request ?? "")}>
              Retry
            </Button>
          </Stack>
        )}
      </Alert>
      <Alert tone="danger">{problem}</Alert>
      <MessageList>
        {agent.messages.map((m) =>
          m.role === "tool" ? (
            <Message key={m.id} from="tool" title={m.name ?? "tool"} pending={!m.done}>
              {JSON.stringify(m.input)}
              {m.done && m.output !== undefined
                ? ` → ${z.string().safeParse(m.output).data ?? JSON.stringify(m.output)}`
                : ""}
            </Message>
          ) : m.role === "reasoning" ? (
            <Disclosure key={m.id} summary={m.done ? "Thinking" : "Thinking…"}>
              <Text tone="muted">{m.text}</Text>
            </Disclosure>
          ) : (
            <Message key={m.id} from={m.role === "user" ? "you" : "agent"} pending={!m.done}>
              {m.text}
              {steers.has(m.id) && <Text tone="muted"> ({steers.get(m.id)})</Text>}
            </Message>
          ),
        )}
      </MessageList>
      {/* Components the agent rendered (its summary); props were validated by the runtime before the ui event. */}
      {agent.ui.map((u) => (
        <div key={u.id}>{render(u)}</div>
      ))}
      {/* What the thread delivered, read live from GitHub (Review and delivery, #1). */}
      {prs.map((o) =>
        o.kind === "pr" ? (
          <ThreadPullRequest key={o.id} repo={o.repo} number={o.number} />
        ) : (
          <ThreadLandedCommit key={o.id} repo={o.repo} branch={o.branch} sha={o.sha} title={o.title} />
        ),
      )}
      <ApprovalPrompt pending={agent.pending} onDecide={agent.approve} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send("steer");
        }}
      >
        <Stack direction="row" gap={8}>
          <TextField
            wide
            aria-label="Message the thread"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              busy
                ? "Steer the running turn, or queue for after it"
                : row?.endedAs
                  ? "Ask for more: a follow-up reopens the thread"
                  : started
                    ? "Follow up with a new request"
                    : "Message the agent"
            }
          />
          <Button variant="primary" type="submit" disabled={sending}>
            {busy ? "Steer" : started ? "Follow up" : "Send"}
          </Button>
          {busy && <Button onClick={() => void send("queue")}>Queue</Button>}
        </Stack>
      </form>
    </Stack>
  );
}
