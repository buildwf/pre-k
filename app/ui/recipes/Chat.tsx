import { useState } from "react";
import { Button } from "../Button";
import { EmptyState } from "../EmptyState";
import { Message } from "../Message";
import { MessageList } from "../MessageList";
import { Stack } from "../Stack";
import { Text } from "../Text";
import { TextField } from "../TextField";
import { Window } from "../Window";

// Recipe: a chat with an assistant. The messages in a MessageList, a "Replying…" line while the answer comes, and the
// composer at the end, which keeps what was typed and disables Send until the reply is in.

type Turn = { id: string; from: "you" | "agent"; text: string };

// Sample: the story's conversation. point generate window starts this empty, so the window opens on its EmptyState.
const sampleTurns: Turn[] = [
  { id: "1", from: "you", text: "What's on my list for today?" },
  { id: "2", from: "agent", text: "Three things: **review the draft**, call the printer, and book the venue." },
];

export function ChatRecipe() {
  // TODO: replace reply with the real answer: an rpc procedure in app/rpc/ (rpc.<router>.<procedure>({ text })) or a
  // cloud function (useMutation(api.<module>.<fn>)). For an agent with tools and approvals, use useAgent(threadId) from
  // point/client, as the chat template's main window does.
  const reply = (text: string) => new Promise<string>((resolve) => setTimeout(() => resolve(text), 1000));

  const [turns, setTurns] = useState<Turn[]>(sampleTurns);
  const [text, setText] = useState("");
  const [replying, setReplying] = useState(false);

  const send = () => {
    const said = text.trim();

    if (!said || replying) return;
    setTurns((all) => [...all, { id: crypto.randomUUID(), from: "you", text: said }]);
    setText("");
    setReplying(true);
    void reply(said)
      .then((answer) => setTurns((all) => [...all, { id: crypto.randomUUID(), from: "agent", text: answer }]))
      .finally(() => setReplying(false));
  };

  return (
    <Window>
      <Stack padding={24} gap={12} maxWidth={800}>
        {turns.length ? (
          <MessageList>
            {turns.map((t) => (
              <Message key={t.id} from={t.from}>
                {t.text}
              </Message>
            ))}
          </MessageList>
        ) : (
          <EmptyState title="No messages yet">Say something to start.</EmptyState>
        )}
        <Text tone="muted" role="status">
          {replying ? "Replying…" : ""}
        </Text>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <Stack direction="row" gap={8}>
            <TextField
              wide
              aria-label="Message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message"
            />
            <Button variant="primary" type="submit" disabled={replying || !text.trim()}>
              Send
            </Button>
          </Stack>
        </form>
      </Stack>
    </Window>
  );
}
