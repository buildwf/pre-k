import { useEffect, useState, type ReactNode } from "react";
import { ThreadLandedCommit } from "../../lib/ThreadLandedCommit";
import { rpc, useAgent, useCollection, useRpc, useThreads } from "point/client";
import { eq, useLiveQuery } from "point/cloud/db";
import { render } from "../../../.point/components";
import { ThreadPullRequest } from "../../lib/ThreadPullRequest";
import { stateLabel } from "../../threads/labels";
import { UPDATE_PREFIX } from "../../threads/relay";
import { quietLines, threadStart } from "../../threads/started";
import { threadState } from "../../threads/state";
import { Alert } from "../../ui/Alert";
import { ApprovalPrompt } from "../../ui/ApprovalPrompt";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { Composer } from "../../ui/Composer";
import { EmptyState } from "../../ui/EmptyState";
import { Message } from "../../ui/Message";
import { MessageList } from "../../ui/MessageList";
import { PaneBody, PaneFooter, PaneHeader } from "../../ui/Pane";
import { ProgressBar } from "../../ui/ProgressBar";
import { Stack } from "../../ui/Stack";
import { Text } from "../../ui/Text";

/** What the shell hands the chat's header and body: the repository line, the panel toggle, a setup warning. */
interface Frame {
  /** Under the title: the project's repository and branch. */
  subtitle?: ReactNode;
  /** At the end of the header: the project panel's toggle. */
  actions?: ReactNode;
  /** Above the conversation: a repository that couldn't be linked. */
  notice?: ReactNode;
}

// Project chat: the conversation with the project's coordinator, as the app's main view (header, scrolling
// conversation, composer pinned at the bottom). Messages queue by default, so nothing typed while the coordinator is
// busy interrupts it or gets lost; Steer redirects the running turn instead.
export function ProjectChat({
  projectId,
  onOpenThread,
  ...frame
}: Frame & {
  projectId: string;
  onOpenThread?: ((threadId: string) => void) | undefined;
}) {
  const [threadId, setThreadId] = useState<string>();
  const [problem, setProblem] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    void rpc.coordinator.ensure({ projectId }).then((r) => {
      if (!live) return;
      if (r.ok) setThreadId(r.value.threadId);
      else
        setProblem(
          r.failure.code === "AGENT_START_FAILED"
            ? `Point couldn't start the coordinator's agent (${r.failure.detail.code}). Check that Claude Code is installed and signed in, then try again.`
            : `Point answered ${r.failure.code}. Try again.`,
        );
    });
    return () => {
      live = false;
    };
  }, [projectId, attempt]);

  if (threadId && !problem) return <Conversation threadId={threadId} onOpenThread={onOpenThread} {...frame} />;

  return (
    <>
      <PaneHeader title="Project chat" subtitle={frame.subtitle} actions={frame.actions} />
      <PaneBody>
      {frame.notice}
      {problem ? (
        <Alert tone="danger" title="The coordinator didn't start">
          <Stack gap={8}>
            <Text>{problem}</Text>
            <Button
              onClick={() => {
                setProblem(undefined);
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
          </Stack>
        </Alert>
      ) : (
        <ProgressBar label="Starting the coordinator…" />
      )}
      </PaneBody>
    </>
  );
}

/** A reason as a sentence: capitalized, ending in a period. */
function sentence(text: string): string {
  const t = text.trim();
  return `${t.charAt(0).toUpperCase()}${t.slice(1)}${/[.!?]$/.test(t) ? "" : "."}`;
}

/** What the coordinator's status means to the person, in a few words. */
const statusWords = {
  starting: "is starting",
  running: "is working",
  parked: "is waiting for your approval",
  paused: "is paused",
  idle: "is ready",
  stopped: "is ready",
  interrupted: "was interrupted. Send a message to carry on",
} as const;

function Conversation({
  threadId,
  onOpenThread,
  subtitle,
  actions,
  notice,
}: Frame & {
  threadId: string;
  onOpenThread?: ((threadId: string) => void) | undefined;
}) {
  const agent = useAgent(threadId);
  const me = useRpc(rpc.coordinator.whoami, undefined);
  const [text, setText] = useState("");
  const [sendProblem, setSendProblem] = useState<string>();
  const name = me.data?.name;
  const busy = agent.status === "running" || agent.status === "parked" || agent.status === "paused";
  const send = async (message: string, turn: "queue" | "steer") => {
    if (!message.trim()) return;
    setSendProblem(undefined);
    // Recorded under the person's name, so the coordinator's threads say who asked.
    const r = await (name
      ? rpc.agents.send({ threadId, text: message, turn, by: name })
      : rpc.agents.send({ threadId, text: message, turn }));
    if (!r.ok) setSendProblem(`Your message didn't reach the coordinator (${r.failure.code}). Send it again.`);
    else if (r.value === "rejected") setSendProblem("The coordinator couldn't take that message just now. Send it again.");
  };
  const submit = (turn: "queue" | "steer") => {
    void send(text, turn);
    setText("");
  };
  const steers = new Map<string, string>();
  let lastError: { id: string; message: string } | undefined;
  for (const e of agent.events) {
    if (e.type === "steer.delivered") steers.set(e.steerId, "steered");
    else if (e.type === "steer.failed") steers.set(e.steerId, `steer failed: ${e.reason}`);
    else if (e.type === "error") lastError = { id: e.id, message: e.message };
    // A new message from the person starts over: an error from an earlier turn no longer applies.
    else if (e.type === "user") lastError = undefined;
  }
  // The person's request each tool call answers, so a failed thread start can offer to ask again.
  const askedFor = new Map<string, string>();
  let latest = "";
  for (const m of agent.messages) {
    if (m.role === "user" && !m.text.startsWith(UPDATE_PREFIX)) latest = m.text;
    else if (m.role === "tool") askedFor.set(m.id, latest);
  }

  return (
    <>
      <PaneHeader
        title="Project chat"
        badge={busy ? <Badge tone="info">working</Badge> : undefined}
        subtitle={subtitle}
        actions={actions}
      />
      <PaneBody>
      {notice}
      {agent.messages.length === 0 && (
        <EmptyState title="Start the project chat">
          Ask the coordinator about the project, or describe a change to the repository and it starts a thread for
          it. Type below and press Enter.
        </EmptyState>
      )}
      <MessageList>
        {agent.messages.flatMap((m) => {
          if (m.role === "user" && m.text.startsWith(UPDATE_PREFIX))
            return [
              <Message key={m.id} from="note">
                {m.text.slice(UPDATE_PREFIX.length).trim()}
              </Message>,
            ];
          if (m.role === "user") {
            const steer = steers.get(m.id);
            return [
              <Message key={m.id} from="you" pending={!m.done}>
                {m.text}
              </Message>,
              ...(steer
                ? [
                    <Text key={`${m.id}:steer`} tone="muted">
                      {steer}
                    </Text>,
                  ]
                : []),
            ];
          }
          if (m.role === "assistant")
            return [
              <Message key={m.id} from="agent" pending={!m.done}>
                {m.text}
              </Message>,
            ];
          if (m.role !== "tool") return [];
          const start = m.done ? threadStart(m.input, m.output) : undefined;
          const asked = askedFor.get(m.id);
          const line = (
            <Message key={m.id} from="tool" title={start ? "Starting a thread" : (m.name ?? "tool")} pending={!m.done} />
          );
          if (!start) return [line];
          if ("started" in start)
            // The card is the record of the start, as in Claude Projects: no tool line above it.
            return [<StartedThread key={`${m.id}:thread`} threadId={start.started} onOpen={onOpenThread} />];
          return [
            line,
            <Alert key={`${m.id}:failed`} tone="danger" title="The thread didn't start">
              <Stack gap={8}>
                <Text>{start.failed}</Text>
                {asked && (
                  <Button onClick={() => void send(asked, "queue")} disabled={busy}>
                    Ask again
                  </Button>
                )}
              </Stack>
            </Alert>,
          ];
        })}
      </MessageList>
      {/* props were validated by the runtime before the ui event */}
      {agent.ui.map((u) => (
        <div key={u.id}>{render(u)}</div>
      ))}
      <ApprovalPrompt pending={agent.pending} onDecide={agent.approve} />
      {lastError && (
        <Alert tone="danger" title="The coordinator hit a problem">
          {sentence(quietLines(lastError.message).at(0) ?? "It stopped without saying why")} Send your message again,
          or rephrase it.
        </Alert>
      )}
      {sendProblem && <Alert tone="danger">{sendProblem}</Alert>}
      </PaneBody>
      <PaneFooter>
        <Composer
          label="Message the coordinator"
          value={text}
          onChange={setText}
          onSubmit={() => submit("queue")}
          sendLabel={busy ? "Queue" : "Send"}
          placeholder={busy ? "Queue a message for after this turn" : "Ask about the project, or hand off work"}
          hint={
            <>
              The coordinator {statusWords[agent.status]}
              {agent.usage.costUsd > 0 ? ` · $${agent.usage.costUsd.toFixed(2)} so far` : ""}
              {name ? ` · you're ${name}` : ""}
            </>
          }
          actions={
            busy ? (
              <Button size="sm" variant="quiet" onClick={() => submit("steer")} disabled={!text.trim()}>
                Steer
              </Button>
            ) : undefined
          }
        />
      </PaneFooter>
    </>
  );
}

// The card for a thread the coordinator started: its title, live state, branch and the work it delivered.
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
  const state = stateLabel[threadState(live.find((t) => t.id === threadId)?.status, row.endedAs, prs, row.lastAttempt)];

  return (
    <Card>
      <Stack gap={12}>
        <Stack direction="row" gap={8} align="center" justify="between">
          <Stack gap={4}>
            <Stack direction="row" gap={8} align="center">
              <Text bold>Started a thread: {row.title}</Text>
              <Badge tone={state.badge}>{state.text}</Badge>
            </Stack>
            <Text tone="muted">
              Asked by {row.requestedBy}
              {row.branch ? ` · ${row.branch}` : ""}
            </Text>
          </Stack>
          {onOpen && (
            <Button size="sm" onClick={() => onOpen(threadId)}>
              Open thread
            </Button>
          )}
        </Stack>
        {prs.map((o) =>
          o.kind === "pr" ? (
            <ThreadPullRequest key={o.id} repo={o.repo} number={o.number} />
          ) : (
            <ThreadLandedCommit key={o.id} repo={o.repo} branch={o.branch} sha={o.sha} title={o.title} />
          ),
        )}
      </Stack>
    </Card>
  );
}
