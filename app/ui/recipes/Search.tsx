import { useState } from "react";
import { Alert } from "../Alert";
import { Button } from "../Button";
import { EmptyState } from "../EmptyState";
import { Field } from "../Field";
import { Heading } from "../Heading";
import { List, ListItem } from "../List";
import { ProgressBar } from "../ProgressBar";
import { Stack } from "../Stack";
import { Text } from "../Text";
import { TextField } from "../TextField";
import { Window } from "../Window";

// Recipe: search. A box and a Search button, a progress bar while the call runs, the matches best first (each with its
// title, a line of detail and how close it is, in words), an EmptyState when nothing matches, an Alert with Try again
// when the call fails, and a status line for screen readers that says how many matches there are.

type Match = { id: string; title: string; detail: string; score: number };

// Sample: the story's cards. point generate window starts this empty, so the window opens on its search box.
const sampleItems: Match[] = [
  { id: "1", title: "Cut the weekly sync to 15 minutes", detail: "Standing agenda, no slides, decisions only.", score: 0 },
  { id: "2", title: "Write meeting notes in the doc, not chat", detail: "Everyone can catch up without a call.", score: 0 },
  { id: "3", title: "Plan the launch party", detail: "Venue, food and a playlist.", score: 0 },
];

/** How close a match is, in words: a bare number means nothing to a person. */
function closeness(score: number): string {
  if (score >= 0.75) return "Strong match";

  if (score >= 0.5) return "Good match";

  return "Possible match";
}

type State = "idle" | "searching" | "done" | "failed";

export function SearchRecipe() {
  const [text, setText] = useState("");
  // What was searched for, so the results and the status line name the search they answer, not what is typed since.
  const [asked, setAsked] = useState("");
  const [state, setState] = useState<State>("idle");
  const [matches, setMatches] = useState<Match[]>([]);

  // TODO: replace the body with the call: `const search = useAction(api.<table>Search.search)` from point/cloud/react
  // (it answers [{ doc, score }], best first, score 0 to 1), then map each doc to { id: doc._id, title, detail, score }.
  const run = async (query: string): Promise<Match[]> => {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const words = query.toLowerCase().split(/\s+/);

    const items: Match[] = sampleItems;

    const scored = items.flatMap((item) => {
      const score = words.filter((w) => `${item.title} ${item.detail}`.toLowerCase().includes(w)).length / words.length;

      return score > 0 ? [{ ...item, score }] : [];
    });

    return scored.sort((a, b) => b.score - a.score);
  };

  const search = async () => {
    const query = text.trim();

    if (!query) return;
    setAsked(query);
    setState("searching");

    try {
      setMatches(await run(query));
      setState("done");
    } catch {
      setState("failed");
    }
  };

  return (
    <Window>
      <Stack padding={24} gap={16} maxWidth={640}>
        <Heading>Search</Heading>
        <SearchView
          text={text}
          onText={setText}
          onSearch={() => void search()}
          asked={asked}
          state={state}
          matches={matches}
        />
      </Stack>
    </Window>
  );
}

/** The screen for a search at any point, from what the container holds: the stories draw each state with it. */
export function SearchView({
  text,
  onText,
  onSearch,
  asked,
  state,
  matches,
}: {
  text: string;
  onText: (text: string) => void;
  onSearch: () => void;
  /** What the shown results answer. */
  asked: string;
  state: State;
  matches: Match[];
}) {
  const status =
    state === "searching"
      ? "Searching…"
      : state === "done"
          ? `${matches.length === 0 ? "No" : matches.length} ${matches.length === 1 ? "match" : "matches"} for “${asked}”`
          : "";

  return (
    <Stack gap={16}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
      >
        <Stack direction="row" gap={8} align="end">
          <Field label="Search for" wide>
            <TextField
              wide
              type="search"
              value={text}
              onChange={(e) => onText(e.target.value)}
              placeholder="Words, or what you mean"
            />
          </Field>
          <Button variant="primary" type="submit" disabled={state === "searching"}>
            Search
          </Button>
        </Stack>
      </form>
      {/* Always rendered, so the text put into it is what a screen reader announces. */}
      <Text role="status" tone="muted">
        {status}
      </Text>
      {state === "searching" && <ProgressBar label="Searching" />}
      {/* Always rendered, like the status above: an alert that mounts with its text can go unannounced. */}
      <Alert tone="danger" title={state === "failed" ? "Couldn't search" : undefined}>
        {state === "failed" && (
          <Stack direction="row">
            <Button onClick={onSearch}>Try again</Button>
          </Stack>
        )}
      </Alert>
      {state === "idle" && (
        <EmptyState title="Search to begin">Type a word or what you mean, and press Search.</EmptyState>
      )}
      {state === "done" && matches.length === 0 && (
        <EmptyState title="No matches">Nothing is close to “{asked}”. Try other words.</EmptyState>
      )}
      {state === "done" && matches.length > 0 && (
        <List label="Matches">
          {matches.map((match) => (
            <ListItem key={match.id}>
              <Stack gap={4}>
                <Text bold>{match.title}</Text>
                <Text tone="muted">{match.detail}</Text>
                <Text tone="muted">{closeness(match.score)}</Text>
              </Stack>
            </ListItem>
          ))}
        </List>
      )}
    </Stack>
  );
}
