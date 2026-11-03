import { useEffect, useState } from "react";
import { rpc, useAgent, useCollection, useThreads } from "point/client";
import { eq, useLiveQuery } from "point/cloud/db";
import { render } from "../../../.point/components";
import { ThreadPullRequest } from "../../lib/ThreadPullRequest";
import { UPDATE_PREFIX } from "../../threads/relay";
import { startedThread } from "../../threads/started";
import { threadState } from "../../threads/state";
import { ApprovalPrompt } from "../../ui/ApprovalPrompt";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { EmptyState } from "../../ui/EmptyState";
import { Field } from "../../ui/Field";
import { Heading } from "../../ui/Heading";
import { Message } from "../../ui/Message";
import { MessageList } from "../../ui/MessageList";
import { Stack } from "../../ui/Stack";
import { Text } from "../../ui/Text";
import { TextField } from "../../ui/TextField";

// Project chat: the conversation with the project's coordinator. Messages queue by default, so nothing typed while
// the coordinator is busy interrupts it or gets lost; Steer redirects the running turn instead.
export function ProjectChat({
  projectId,
  onOpenThread,
}: {
  projectId: string;
  onOpenThread?: ((threadId: string) => void) | undefined;
}) {
  const [threadId, setThreadId] = useState<string>();
  const [problem, setProblem] = useState<string>();

  useEffect(() => {
    let live = true;
    void rpc.coordinator.ensure({ projectId }).then((r) => {
      if (!live) return;
      if (r.ok) setThreadId(r.value.threadId);
      else setProblem(`Couldn't start the coordinator: ${r.failure.code} ${JSON.stringify(r.failure.detail)}`);
    });
    return () => {
      live = false;
    };
  }, [projectId]);

  return (
    <Stack gap={12}>
      <Heading>Project chat</Heading>
      {problem && <Text tone="danger">{problem}</Text>}
      {threadId ? <Conversation threadId={threadId} onOpenThread={onOpenThread} /> : !problem && <Text tone="muted">Starting…</Text>}
    </Stack>
  );
}

function Conversation({
  threadId,
  onOpenThread,
}: {
  threadId: string;
  onOpenThread?: ((threadId: string) => void) | undefined;
}) {
  const agent = useAgent(threadId);
  const [text, setText] = useState("");
  const busy = agent.status === "running" || agent.status === "parked" || agent.status === "paused";
  const send = (turn: "queue" | "steer") => {
    if (!text.trim()) return;
    void agent.send(text, { turn });
    setText("");
  };
  const steers = new Map<string, string>();
  for (const e of agent.events) {
    if (e.type === "steer.delivered") steers.set(e.steerId, "steered");
    else if (e.type === "steer.failed") steers.set(e.steerId, `steer failed: ${e.reason}`);
  }

  return (
    <Stack gap={12}>
      <Text tone="muted">
        Coordinator · {agent.status} · ${agent.usage.costUsd.toFixed(3)}
      </Text>
      {agent.messages.length === 0 && (
        <EmptyState title="Start the project chat">
          Ask the coordinator about the project, or describe work for it to hand to a thread. Type below and press
          Enter.
        </EmptyState>
      )}
      <MessageList>
        {agent.messages.flatMap((m) =>
          m.role === "user" && m.text.startsWith(UPDATE_PREFIX) ? (
            [
              <Text key={m.id} tone="muted">
                {m.text}
              </Text>,
            ]
          ) : m.role === "user" ? (
            [
              <Message key={m.id} from="you" pending={!m.done}>
                {m.text}
              </Message>,
              ...(steers.has(m.id)
                ? [
                    <Text key={`${m.id}:steer`} tone="muted">
                      {steers.get(m.id)}
                    </Text>,
                  ]
                : []),
            ]
          ) : m.role === "assistant" ? (
            [
              <Message key={m.id} from="agent" pending={!m.done}>
                {m.text}
              </Message>,
            ]
          ) : m.role === "tool" ? (
            [
              <Message key={m.id} from="tool" title={m.name ?? "tool"} pending={!m.done} />,
              ...[startedThread(m.input, m.done ? m.output : undefined)].flatMap((id) =>
                id ? [<StartedThread key={`${m.id}:thread`} threadId={id} onOpen={onOpenThread} />] : [],
              ),
            ]
          ) : (
            []
          ),
        )}
      </MessageList>
      {/* props were validated by the runtime before the ui event */}
      {agent.ui.map((u) => (
        <div key={u.id}>{render(u)}</div>
      ))}
      <ApprovalPrompt pending={agent.pending} onDecide={agent.approve} />
      {agent.events
        .filter((e): e is typeof e & { type: "error" } => e.type === "error")
        .slice(-1)
        .map((e) => (
          <Text key={e.id} tone="danger">
            {e.message}
          </Text>
        ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send("queue");
        }}
      >
        <Stack direction="row" gap={8}>
          <Field label="Message the coordinator">
            <TextField
              wide
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={busy ? "Queue a message for after this turn" : "Ask or hand off work"}
            />
          </Field>{" "}
          <Button variant="primary" type="submit">
            {busy ? "Queue" : "Send"}
          </Button>
          {busy && (
            <Button type="button" onClick={() => send("steer")}>
              Steer
            </Button>
          )}
        </Stack>
      </form>
    </Stack>
  );
}

const stateWords = {
  working: "working",
  blocked: "needs you",
  review_ready: "ready for review",
  done: "done",
  failed: "failed",
  stopped: "stopped",
  interrupted: "interrupted",
  idle: "idle",
} as const;

// The card for a thread the coordinator started: its title, live state, branch and the PRs it opened.
function StartedThread({
  threadId,
  onOpen,
}: {
  threadId: string;
  onOpen?: ((threadId: string) => void) | undefined;
}) {
  const threads = useCollection("threads");
  const outputs = useCollection("thread-outputs");
  const live = useThreads();
  const { data: rows } = useLiveQuery((q) => q.from({ t: threads }).where(({ t }) => eq(t.threadId, threadId)));
  const { data: prs } = useLiveQuery((q) => q.from({ o: outputs }).where(({ o }) => eq(o.threadId, threadId)));
  const row = rows[0];
  if (!row) return null;
  const state = threadState(live.find((t) => t.id === threadId)?.status, row.endedAs, prs.length);

  return (
    <Card>
      <Stack gap={8}>
        <Stack direction="row" gap={8} align="center">
          <Text bold>Started a thread: {row.title}</Text>
          <Text tone="muted">{stateWords[state]}</Text>
          {onOpen && (
            <Button variant="quiet" onClick={() => onOpen(threadId)}>
              Open thread
            </Button>
          )}
        </Stack>
        {row.branch && (
          <Text tone="muted" mono>
            {row.branch}
          </Text>
        )}
        {prs.map((o) => (
          <ThreadPullRequest key={o.id} repo={o.repo} number={o.number} />
        ))}
      </Stack>
    </Card>
  );
}
