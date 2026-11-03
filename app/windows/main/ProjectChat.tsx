import { useEffect, useState } from "react";
import { rpc, useAgent } from "point/client";
import { render } from "../../../.point/components";
import { ApprovalPrompt } from "../../ui/ApprovalPrompt";
import { Button } from "../../ui/Button";
import { Heading } from "../../ui/Heading";
import { Message } from "../../ui/Message";
import { MessageList } from "../../ui/MessageList";
import { Stack } from "../../ui/Stack";
import { Text } from "../../ui/Text";
import { TextField } from "../../ui/TextField";

// Project chat: the conversation with the project's coordinator. Messages queue by default, so nothing typed while
// the coordinator is busy interrupts it or gets lost; Steer redirects the running turn instead.
export function ProjectChat({ projectId }: { projectId: string }) {
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
      {threadId ? <Conversation threadId={threadId} /> : !problem && <Text tone="muted">Starting…</Text>}
    </Stack>
  );
}

function Conversation({ threadId }: { threadId: string }) {
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
      <MessageList>
        {agent.messages.flatMap((m) =>
          m.role === "user" ? (
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
            [<Message key={m.id} from="tool" title={m.name ?? "tool"} pending={!m.done} />]
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
          <TextField
            wide
            aria-label="Message the coordinator"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={busy ? "Queue a message for after this turn" : "Ask or hand off work"}
          />{" "}
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
