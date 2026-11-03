import { useState } from "react";
import { LandedCommitCard } from "../ui/LandedCommitCard";
import { z } from "zod";
import { rpc, useAgent, useCollection, useThreads } from "point/client";
import { eq, useLiveQuery } from "point/cloud/db";
import { render } from "../../.point/components";
import { ThreadPullRequest } from "../lib/ThreadPullRequest";
import { threadState, type ThreadState } from "../threads/state";
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

/** How each state reads in the list: the words a person scans for, and red for the ones waiting on them. */
const stateLabel: Record<ThreadState, { text: string; tone: "default" | "muted" | "danger" }> = {
  working: { text: "working", tone: "default" },
  blocked: { text: "needs you", tone: "danger" },
  review_ready: { text: "ready for review", tone: "default" },
  landed: { text: "landed", tone: "default" },
  done: { text: "done", tone: "muted" },
  failed: { text: "failed", tone: "danger" },
  stopped: { text: "stopped", tone: "muted" },
  interrupted: { text: "interrupted", tone: "danger" },
  idle: { text: "idle", tone: "muted" },
};

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
            const state = stateLabel[threadState(statusOf.get(t.threadId), t.endedAs, prs)];
            return (
              <ListItem
                key={t.threadId}
                actions={
                  <Button variant="quiet" onClick={() => setOpen(t.threadId)} aria-pressed={open === t.threadId}>
                    Open
                  </Button>
                }
              >
                <Text bold>{t.title}</Text>
                <Text tone={state.tone}>{state.text}</Text>
                {t.branch && (
                  <Text tone="muted" mono>
                    {t.branch}
                  </Text>
                )}
                {prs.map((o) => (
                  <Text key={o.id} tone="muted">
                    {o.kind === "pr" ? `PR #${o.number}` : `commit ${o.sha.slice(0, 7)}`}
                  </Text>
                ))}
              </ListItem>
            );
          })}
        </List>
      )}
      {open && <ThreadView key={open} threadId={open} />}
    </Stack>
  );
}

/** One thread: the request, the agent's work as it happens, approvals, and the controls to steer or stop it. */
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
  const busy = agent.status === "running" || agent.status === "parked" || agent.status === "paused";
  // A steered message's id is its steer id, so these find their message.
  const steers = new Map<string, string>();
  for (const e of agent.events) {
    if (e.type === "steer.delivered") steers.set(e.steerId, "steered");
    else if (e.type === "steer.failed") steers.set(e.steerId, `steer failed: ${e.reason}`);
  }
  const send = (turn: "steer" | "queue") => {
    if (!text.trim()) return;
    void agent.send(text, { turn });
    setText("");
  };
  const end = async (as: "done" | "failed") => {
    const r = await rpc.threads.end({ threadId, as });
    setProblem(r.ok ? undefined : r.failure.code);
  };

  return (
    <Stack gap={12}>
      <Stack direction="row" gap={8} align="center" justify="between" wrap>
        <Text bold>{row?.title ?? threadId.slice(0, 8)}</Text>
        <Stack direction="row" gap={4} wrap>
          <Button variant="quiet" disabled={!agent.can.pause} onClick={() => agent.pause()}>
            Pause
          </Button>
          <Button variant="quiet" disabled={!agent.can.resume} onClick={() => agent.resume()}>
            Resume
          </Button>
          <Button variant="quiet" disabled={!agent.can.cancel} onClick={() => agent.cancel()}>
            Cancel
          </Button>
          <Button variant="quiet" onClick={() => end("done")}>
            Mark done
          </Button>
          <Button variant="quiet" onClick={() => end("failed")}>
            Mark failed
          </Button>
        </Stack>
      </Stack>
      <Text tone="muted">
        {agent.status}
        {row?.requestedBy ? ` · asked by ${row.requestedBy}` : ""}
        {row?.branch ? ` · ${row.branch}` : ""}
      </Text>
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
          <LandedCommitCard key={o.id} repo={o.repo} branch={o.branch} sha={o.sha} title={o.title} />
        ),
      )}
      <ApprovalPrompt pending={agent.pending} onDecide={agent.approve} />
      {agent.events
        .filter((e): e is typeof e & { type: "error" } => e.type === "error")
        .slice(-1)
        .map((e) => (
          <Text key={e.id} tone="danger">
            {e.message}
          </Text>
        ))}
      {problem && <Text tone="danger">{problem}</Text>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send("steer");
        }}
      >
        <Stack direction="row" gap={8}>
          <TextField
            wide
            aria-label="Message the thread"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={busy ? "Steer the running turn, or queue for after it" : "Message the agent"}
          />
          <Button variant="primary" type="submit">
            {busy ? "Steer" : "Send"}
          </Button>
          {busy && (
            <Button onClick={() => send("queue")}>Queue</Button>
          )}
        </Stack>
      </form>
    </Stack>
  );
}
