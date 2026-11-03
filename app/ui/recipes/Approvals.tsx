import { useEffect, useRef, useState } from "react";
import { Alert } from "../Alert";
import { Button } from "../Button";
import { EmptyState } from "../EmptyState";
import { Heading } from "../Heading";
import { List, ListItem } from "../List";
import { Stack } from "../Stack";
import { Text } from "../Text";
import { Window } from "../Window";

// Recipe: what an agent drafted, for the person to approve or discard. Pending drafts in a List, each with every
// field it would save, shown as plain text, and an Approve and a Discard; an EmptyState while nothing waits; the
// approved ones under Saved. Nothing is saved until Approve. `point generate window <name> --recipe approvals --store
// <drafts> --router <name> [--saved <store>]` writes it over a store of pending drafts and the router's approve and
// discard (docs/site/guides/approve-agent-drafts.md).

type Draft = { id: string; text: string; when: string };

// Sample: the story's drafts. The generated window reads them with useStore('<drafts>') and calls
// rpc.<router>.approve and rpc.<router>.discard.
const sampleDrafts: Draft[] = [
  { id: "1", text: "Call the dentist", when: "tomorrow at 9" },
  { id: "2", text: "Send the invoice to Kim", when: "Friday" },
];

const sampleSaved: Draft[] = [{ id: "0", text: "Renew the passport", when: "next week" }];

export function ApprovalsRecipe({
  startWith = sampleDrafts,
  saved: savedStart = sampleSaved,
  fail = false,
}: {
  startWith?: Draft[];
  saved?: Draft[];
  /** The story's failing call: Approve and Discard answer an error. */
  fail?: boolean;
}) {
  const [pending, setPending] = useState<Draft[]>(startWith);
  const [saved, setSaved] = useState<Draft[]>(savedStart);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // A resolved draft's buttons go with it: focus moves to the next draft's, so a keyboard person keeps reviewing.
  const acted = useRef(false);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!acted.current) return;
    acted.current = false;
    list.current?.querySelector("button")?.focus();
  }, [pending.length]);

  const resolve = (draft: Draft, approve: boolean) => {
    if (fail) {
      setNotice("");
      setError(`Couldn't ${approve ? "approve" : "discard"} “${draft.text}”: try again.`);

      return;
    }

    setError("");
    setNotice(`${approve ? "Saved" : "Discarded"} “${draft.text}”`);
    setPending(pending.filter((d) => d.id !== draft.id));

    if (approve) setSaved([...saved, draft]);
    acted.current = true;
  };

  return (
    <Window>
      <Stack padding={24} gap={16} maxWidth={640}>
        <Stack gap={4}>
          <Stack direction="row" gap={8} align="baseline">
            <Heading>Drafts</Heading>
            <Text tone="muted">{pending.length} to review</Text>
          </Stack>
          <Text tone="muted">Nothing is saved until you approve it.</Text>
        </Stack>
        <Alert tone="danger">{error}</Alert>
        <Alert>{notice}</Alert>
        {pending.length ? (
          <div ref={list}>
            <List label="Drafts to review">
              {pending.map((draft) => (
                <ListItem
                  key={draft.id}
                  actions={
                    <>
                      <Button variant="primary" aria-label={`Approve ${draft.text}`} onClick={() => resolve(draft, true)}>
                        Approve
                      </Button>
                      <Button variant="quiet" aria-label={`Discard ${draft.text}`} onClick={() => resolve(draft, false)}>
                        Discard
                      </Button>
                    </>
                  }
                >
                  <Stack gap={0}>
                    <Text>{draft.text}</Text>
                    <Text tone="muted">When: {draft.when}</Text>
                  </Stack>
                </ListItem>
              ))}
            </List>
          </div>
        ) : (
          <EmptyState title="No drafts to review">Drafts the assistant makes show up here for you to approve or discard.</EmptyState>
        )}
        <Stack direction="row" gap={8} align="baseline">
          <Heading level={2}>Saved</Heading>
          <Text tone="muted">{saved.length}</Text>
        </Stack>
        {saved.length ? (
          <List label="Saved">
            {saved.map((item) => (
              <ListItem key={item.id}>
                <Stack gap={0}>
                  <Text>{item.text}</Text>
                  <Text tone="muted">When: {item.when}</Text>
                </Stack>
              </ListItem>
            ))}
          </List>
        ) : (
          <Text tone="muted">Nothing saved yet.</Text>
        )}
      </Stack>
    </Window>
  );
}
