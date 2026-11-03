import { useState } from "react";
import { z } from "zod";
import { rpc, useAgent, useStore } from "point/client";
import { render } from "../../../.point/components";
import { persona, type Persona } from "../../schemas/persona";
import { Projects } from "../../screens/projects";
import { Threads } from "../../screens/threads";
import { ApprovalPrompt } from "../../ui/ApprovalPrompt";
import { Button } from "../../ui/Button";
import { Disclosure } from "../../ui/Disclosure";
import { EmptyState } from "../../ui/EmptyState";
import { Field } from "../../ui/Field";
import { Message } from "../../ui/Message";
import { MessageList } from "../../ui/MessageList";
import { Window } from "../../ui/Window";
import { Stack } from "../../ui/Stack";
import { Text } from "../../ui/Text";
import { TextArea } from "../../ui/TextArea";
import { TextField } from "../../ui/TextField";
import { ProjectChat } from "./ProjectChat";

export default function Page() {
  const [settings, setSettings] = useStore("settings");
  const [personas, setPersonas] = useStore("personas");
  const [threadId, setThreadId] = useState<string>();
  const [problem, setProblem] = useState<string>();

  if (!settings || !personas) return null;

  const start = async (persona?: Persona) => {
    const base = { agent: "coder", cwd: settings.repo };

    const r = await rpc.agents.start(
      persona
        ? {
            ...base,
            persona: persona.model
              ? { name: persona.name, instructions: persona.instructions, model: persona.model }
              : { name: persona.name, instructions: persona.instructions },
          }
        : base,
    );

    if (r.ok) {
      setThreadId(r.value);

      if (persona) void setPersonas({ ...personas, lastUsed: persona.id });
    } else setProblem(`${r.failure.code}: ${JSON.stringify(r.failure.detail)}`);
  };

  return (
    <Window>
      <Stack padding={24} maxWidth={800} gap={16}>
        <Projects>
          {(project) => (
            <>
        <ProjectChat projectId={project.id} />
        <Field label="Repository">
          <TextField
            value={settings.repo}
            onChange={(e) => setSettings({ ...settings, repo: e.target.value })}
          />
        </Field>
        <Stack direction="row" gap={8} align="center" wrap>
          <Button variant="primary" onClick={() => start()}>
            New thread
          </Button>
          {personas.personas.map((p) => (
            <Button key={p.id} onClick={() => start(p)} accent={p.color} title={p.instructions}>
              As {p.name}
            </Button>
          ))}
        </Stack>
        <Disclosure summary="Import persona">
          <TextArea
            aria-label="Persona JSON"
            placeholder='{"name": "...", "instructions": "..."}'
            onBlur={(e) => {
              try {
                const p = persona.omit({ id: true }).parse(JSON.parse(e.target.value));
                void setPersonas({
                  ...personas,
                  personas: [...personas.personas, { id: String(Date.now()), ...p }],
                });
                e.target.value = "";
              } catch (err) {
                setProblem(String(err));
              }
            }}
          />
        </Disclosure>
        {problem && <Text tone="danger">{problem}</Text>}
        {/* One local project until Project setup adds project records. */}
        <Threads projectId={project.id} />
        {threadId ? (
          <Chat threadId={threadId} />
        ) : (
          <EmptyState title="No thread yet">
            Start one and the coder works in the repository above. Approve its file writes as they
            come.
          </EmptyState>
        )}
            </>
          )}
        </Projects>
      </Stack>
    </Window>
  );
}

function Chat({ threadId }: { threadId: string }) {
  const agent = useAgent(threadId);
  const [text, setText] = useState("");

  return (
    <Stack gap={12}>
      <Stack direction="row" gap={8} align="center">
        <Text tone="muted">
          {agent.persona ? `${agent.persona.name} · ` : ""}
          {agent.status} · ${agent.usage.costUsd.toFixed(3)}
        </Text>
        <Button variant="quiet" disabled={!agent.can.cancel} onClick={() => agent.cancel()}>
          Cancel
        </Button>{" "}
        <Button variant="quiet" disabled={!agent.can.pause} onClick={() => agent.pause()}>
          Pause
        </Button>{" "}
        <Button variant="quiet" disabled={!agent.can.resume} onClick={() => agent.resume()}>
          Resume
        </Button>
      </Stack>
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
            </Message>
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
          void agent.send(text);
          setText("");
        }}
      >
        <Stack direction="row" gap={8}>
          <TextField
            wide
            aria-label="Message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask the coder (a message mid-turn steers it)"
          />{" "}
          <Button variant="primary" type="submit">
            Send
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
