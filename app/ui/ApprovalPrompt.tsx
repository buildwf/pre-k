import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { Card } from "./Card";
import { Stack } from "./Stack";
import { Text } from "./Text";

/** One tool call waiting for the person: an entry of `useAgent(threadId).pending`. */
export interface ApprovalRequest {
  requestId: string;
  /** The tool's name, as the agent calls it. */
  name: string;
  /** What the agent passes it. Shown as plain text. */
  input: unknown;
  /** What the call does to the world; `unknown` and anything missing are treated as the riskiest. */
  effect?: string | undefined;
}

// What each effect means to the person, and whether it is risky enough that Allow should not be the pulled-forward button.
const effects = new Map([
  ["read", { says: "Reads data. Changes nothing.", careful: false }],
  ["workspace-write", { says: "Changes files in the agent's workspace.", careful: false }],
  ["network-read", { says: "Reads from the internet.", careful: false }],
  ["local-process", { says: "Runs a command on this computer.", careful: true }],
  ["network-write", { says: "Sends data over the internet.", careful: true }],
  ["external-irreversible", { says: "Does something that can't be undone.", careful: true }],
]);

const unknownEffect = { says: "What this does isn't known.", careful: true };

const LONGEST = 300;

const Arguments = z.record(z.string(), z.json());
const Value = z.json();

/** One argument as text: a string as it is, anything else as JSON, cut when long so one value can't fill the screen. */
function shown(value: z.infer<typeof Value>): string {
  const text = z.string().safeParse(value).data ?? JSON.stringify(value);

  return text.length > LONGEST ? `${text.slice(0, LONGEST)}…` : text;
}

/** The arguments as `name: value` lines, or the one value when the input is not an object. */
function lines(input: ApprovalRequest["input"]): { name: string; text: string }[] {
  const named = Arguments.safeParse(input);

  if (named.success) return Object.entries(named.data).map(([name, value]) => ({ name, text: shown(value) }));
  const one = Value.safeParse(input);

  return one.success && one.data !== null ? [{ name: "", text: shown(one.data) }] : [];
}

/**
 * The question "may this agent run this tool?" for every call waiting on the person: the tool's name, what it does to
 * the world, exactly what it was given (as plain text, never markup), and Allow and Deny. A risky effect (a command,
 * sending data, something that can't be undone) says so and does not make Allow the main button. Bind it to the agent
 * and put it in the conversation: `<ApprovalPrompt pending={agent.pending} onDecide={agent.approve} agent="Planner" />`.
 * It stays mounted so screen readers announce each new request, and after an answer focus moves to the next
 * request's first button.
 *
 * @import import { ApprovalPrompt } from '../../ui/ApprovalPrompt'
 */
export function ApprovalPrompt({
  pending,
  onDecide,
  agent = "The assistant",
}: {
  /** `useAgent(threadId).pending`. */
  pending: ApprovalRequest[];
  /** `useAgent(threadId).approve`. A call that fails shows in an Alert. */
  onDecide: (
    requestId: string,
    decision: "allow" | "deny",
  ) => Promise<{ ok: boolean }> | undefined | void;
  /** Who is asking, when the window has more than one agent. */
  agent?: string;
}) {
  const [error, setError] = useState("");
  // A request answered once can't be answered again while the answer is on its way.
  const [sent, setSent] = useState<string[]>([]);

  const box = useRef<HTMLDivElement>(null);
  const before = useRef(pending.length);

  // Answering removes the card the person was on, and focus would fall to the page. Move it to the next card's first
  // button, or to the (empty) prompt itself, so the keyboard goes on from here.
  useEffect(() => {
    const had = before.current;

    before.current = pending.length;

    if (pending.length >= had) return;
    const active = document.activeElement;

    if (active !== document.body && active !== null && !box.current?.contains(active)) return;
    const next = box.current?.querySelector("button:not(:disabled)");

    if (next instanceof HTMLElement) next.focus();
    else box.current?.focus();
  }, [pending.length]);

  const decide = (request: ApprovalRequest, decision: "allow" | "deny") => {
    setSent([...sent, request.requestId]);
    setError("");

    const failed = (why: string) => {
      setSent((now) => now.filter((id) => id !== request.requestId));
      setError(`Couldn't ${decision === "allow" ? "allow" : "deny"} ${request.name}: ${why}`);
    };

    Promise.resolve(onDecide(request.requestId, decision)).then(
      (r) => {
        if (r && !r.ok) failed("try again");
      },
      (e: Error) => failed(e.message),
    );
  };

  return (
    <Stack gap={8}>
      <div role="status" ref={box} tabIndex={-1}>
        <Stack gap={8}>
        {pending.map((request) => {
          const effect = effects.get(request.effect ?? "") ?? unknownEffect;
          const waiting = sent.includes(request.requestId);
          const given = lines(request.input);

          return (
            <Card key={request.requestId} tone="attention">
              <Stack gap={12}>
                <Stack gap={4}>
                  <Text bold>
                    {agent} wants to use <Text mono>{request.name}</Text>
                  </Text>
                  <Text tone={effect.careful ? "danger" : "muted"}>{effect.says}</Text>
                </Stack>
                {given.length > 0 && (
                  <Stack gap={0}>
                    {given.map((line) => (
                      <Text key={line.name}>
                        {line.name !== "" && <Text tone="muted">{line.name}: </Text>}
                        {line.text}
                      </Text>
                    ))}
                  </Stack>
                )}
                <Stack direction="row" gap={8}>
                  <Button
                    variant={effect.careful ? "default" : "primary"}
                    aria-label={`Allow ${request.name}`}
                    disabled={waiting}
                    onClick={() => decide(request, "allow")}
                  >
                    Allow
                  </Button>
                  <Button
                    aria-label={`Deny ${request.name}`}
                    disabled={waiting}
                    onClick={() => decide(request, "deny")}
                  >
                    Deny
                  </Button>
                </Stack>
              </Stack>
            </Card>
          );
        })}
        </Stack>
      </div>
      <Alert tone="danger">{error}</Alert>
    </Stack>
  );
}
