import { useState } from "react";
import { Alert } from "../Alert";
import { Button } from "../Button";
import { EmptyState } from "../EmptyState";
import { Heading } from "../Heading";
import { ProgressBar } from "../ProgressBar";
import { SegmentedControl } from "../SegmentedControl";
import { Stack } from "../Stack";
import { Table } from "../Table";
import { Text } from "../Text";
import { Window } from "../Window";

// Recipe: an outbox. The messages the app has sent by email, newest first, each with its recipient, subject, where it
// stands in words (waiting, sending, retrying, sent, failed) and when; a filter (All, Sent, Failed, Retrying); a Retry
// on each failed message; an Alert when a retry can't be started; and a status line for screen readers.

type Delivery = "queued" | "sending" | "sent" | "failed";

type Message = {
  id: string;
  to: string;
  subject: string;
  status: Delivery;
  attempts: number;
  /** Why the last attempt failed, for a failed message. */
  error?: string | undefined;
  /** When it was sent, or queued while it has not been. */
  at: number;
};

type Filter = "all" | "sent" | "failed" | "retrying";

// Sample: the story's messages. point generate window starts this empty, so the window opens on its EmptyState.
const sampleMessages: Message[] = [
  { id: "1", to: "bo@example.com", subject: "Ada invited you to Board", status: "sent", attempts: 1, at: Date.now() - 3_600_000 },
  { id: "2", to: "cy@example.com", subject: "Ada invited you to Board", status: "sending", attempts: 2, at: Date.now() - 600_000 },
  { id: "3", to: "dee@example.net", subject: "Your receipt for Pro", status: "failed", attempts: 4, error: "The mailbox does not exist", at: Date.now() - 86_400_000 },
  { id: "4", to: "ed@example.com", subject: "Your receipt for Pro", status: "queued", attempts: 0, at: Date.now() - 20_000 },
];

const filters = [
  { value: "all", label: "All" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "retrying", label: "Retrying" },
] as const;

/** Where a message stands, in words. A message being sent for the second time or more is a retry. */
function wording(message: Message): string {
  if (message.status === "sent") return "Sent";

  if (message.status === "failed") return "Failed";

  if (message.status === "queued") return "Waiting to send";

  return message.attempts > 1 ? `Retrying (attempt ${message.attempts})` : "Sending";
}

const when = (at: number) => new Date(at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export function OutboxRecipe() {
  // TODO: replace with the backend's list and retry: `usePaginatedQuery(api.outbox.list, team ? { team } : 'skip', {
  // initialNumItems: 20 })` and `useMutation(api.outbox.retry)` from point/cloud/react, mapping each row to a Message.
  const [messages, setMessages] = useState<Message[]>(sampleMessages);
  const [filter, setFilter] = useState<Filter>("all");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const retry = (message: Message) => {
    setError("");
    setNotice(`Retrying ${message.to}`);
    setMessages(messages.map((m) => (m.id === message.id ? { ...m, status: "sending", attempts: m.attempts + 1 } : m)));
  };

  return (
    <Window>
      <Stack padding={24} gap={16} maxWidth={960}>
        <Heading>Outbox</Heading>
        <OutboxView
          messages={messages}
          loading={false}
          needsTeam={false}
          filter={filter}
          onFilter={setFilter}
          onRetry={retry}
          notice={notice}
          error={error}
        />
      </Stack>
    </Window>
  );
}

/** The outbox at any point, from what the container holds: the stories draw each state with it. */
export function OutboxView({
  messages,
  loading,
  needsTeam,
  filter,
  onFilter,
  onRetry,
  notice,
  error,
}: {
  messages: readonly Message[];
  loading: boolean;
  /** The person belongs to no team yet, so there is no outbox to show. */
  needsTeam: boolean;
  filter: Filter;
  onFilter: (filter: Filter) => void;
  onRetry: (message: Message) => void;
  /** What just happened, announced politely: "Retrying bo@example.com". */
  notice: string;
  /** Why a retry could not start, or empty. */
  error: string;
}) {
  const shown = messages.filter(
    (m) =>
      filter === "all" ||
      (filter === "sent" && m.status === "sent") ||
      (filter === "failed" && m.status === "failed") ||
      (filter === "retrying" && m.status === "sending" && m.attempts > 1),
  );

  return (
    <Stack gap={16}>
      <SegmentedControl label="Show" value={filter} options={filters} onChange={onFilter} />
      {/* Always rendered, so the text put into it is what a screen reader announces; no gap between the two, so an idle window shows none. */}
      <Stack gap={0}>
        <Text role="status" tone="muted">
          {notice}
        </Text>
        <Alert tone="danger" title={error ? "Couldn't retry" : undefined}>
          {error}
        </Alert>
      </Stack>
      {loading && <ProgressBar label="Loading the outbox" />}
      {!loading && needsTeam && (
        <EmptyState title="No team yet">An outbox belongs to a team. Create or join one, and the email it sends shows up here.</EmptyState>
      )}
      {!loading && !needsTeam && messages.length === 0 && (
        <EmptyState title="Nothing sent yet">Email the app sends, like invites and receipts, shows up here.</EmptyState>
      )}
      {!loading && !needsTeam && messages.length > 0 && (
        <Table
          caption="Sent and queued email"
          rows={shown}
          rowKey={(m) => m.id}
          empty={`No ${filter} messages`}
          columns={[
            { label: "To", cell: (m) => m.to },
            {
              label: "Subject",
              cell: (m) => (
                <Stack gap={4}>
                  <Text>{m.subject}</Text>
                  {m.status === "failed" && m.error && <Text tone="danger">{m.error}</Text>}
                </Stack>
              ),
            },
            { label: "Status", cell: wording },
            { label: "Tries", align: "end", cell: (m) => String(m.attempts) },
            { label: "When", cell: (m) => when(m.at) },
            {
              label: "Actions",
              align: "end",
              cell: (m) =>
                m.status === "failed" ? (
                  <Button variant="quiet" aria-label={`Retry sending to ${m.to}`} onClick={() => onRetry(m)}>
                    Retry
                  </Button>
                ) : null,
            },
          ]}
        />
      )}
    </Stack>
  );
}
