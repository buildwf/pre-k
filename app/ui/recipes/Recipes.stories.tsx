import { AboutRecipe } from "./About";
import { ApprovalsRecipe } from "./Approvals";
import { PlanRecipe } from "./Plan";
import { ChatRecipe } from "./Chat";
import { DetailRecipe } from "./Detail";
import { FirstRunRecipe } from "./FirstRun";
import { ListRecipe } from "./List";
import { Heading } from "../Heading";
import { Stack } from "../Stack";
import { Window } from "../Window";
import { OutboxRecipe, OutboxView } from "./Outbox";
import { SearchRecipe, SearchView } from "./Search";
import { SettingsRecipe } from "./Settings";
import { TableRecipe } from "./Table";
import { SignInRecipe, SignInView } from "./SignIn";
import { TeamListRecipe } from "./TeamList";

// Whole screens built only from the kit, to start a window from: `point generate window <name> --recipe <recipe>`
// writes the same JSX into app/windows/<name>/page.tsx. Each draws its own Window, so the preview's is left off.
export default { title: "Recipes", parameters: { window: false, layout: "fullscreen" } };

export const List = { render: () => <ListRecipe /> };
export const Detail = { render: () => <DetailRecipe /> };
export const Settings = { render: () => <SettingsRecipe /> };
export const Table = { name: "Table", render: () => <TableRecipe /> };
export const FirstRun = { name: "First run", render: () => <FirstRunRecipe /> };
export const Chat = { render: () => <ChatRecipe /> };
export const TeamList = { name: "Team list", render: () => <TeamListRecipe /> };
export const TeamListEmpty = { name: "Team list, no team yet", render: () => <TeamListRecipe startWith={[]} /> };
export const Approvals = { render: () => <ApprovalsRecipe /> };
export const ApprovalsEmpty = { name: "Approvals, nothing to review", render: () => <ApprovalsRecipe startWith={[]} saved={[]} /> };
export const ApprovalsFailed = { name: "Approvals, call failed", render: () => <ApprovalsRecipe fail /> };

export const Plan = { render: () => <PlanRecipe /> };
export const PlanAtLimit = { name: "Plan, limit reached", render: () => <PlanRecipe used={10} /> };
export const PlanPending = { name: "Plan, waiting for payment", render: () => <PlanRecipe start="pending" /> };
export const PlanPro = { name: "Plan, Pro", render: () => <PlanRecipe start="pro" /> };
export const PlanFailed = { name: "Plan, payment failed", render: () => <PlanRecipe start="failed" /> };

export const About = { render: () => <AboutRecipe /> };
export const AboutReady = { name: "About, update ready", render: () => <AboutRecipe status="ready" /> };
export const AboutFailed = { name: "About, update failed", render: () => <AboutRecipe status="error" /> };

const noop = () => undefined;

const found: { id: string; title: string; detail: string; score: number }[] = [
  { id: "1", title: "Cut the weekly sync to 15 minutes", detail: "Standing agenda, no slides, decisions only.", score: 0.82 },
  { id: "2", title: "Write meeting notes in the doc, not chat", detail: "Everyone can catch up without a call.", score: 0.61 },
  { id: "3", title: "Plan the launch party", detail: "Venue, food and a playlist.", score: 0.31 },
];

const view = (asked: string, state: "idle" | "searching" | "done" | "failed", matches: typeof found) => (
  <Window>
    <Stack padding={24} gap={16} maxWidth={640}>
      <Heading>Search</Heading>
      <SearchView text={asked} onText={noop} onSearch={noop} asked={asked} state={state} matches={matches} />
    </Stack>
  </Window>
);

export const Search = { render: () => <SearchRecipe /> };
export const SearchResults = { name: "Search, results", render: () => view("ways to make meetings shorter", "done", found) };
export const SearchNoMatches = { name: "Search, no matches", render: () => view("zebra", "done", []) };
export const SearchSearching = { name: "Search, searching", render: () => view("meetings", "searching", []) };
export const SearchFailed = { name: "Search, call failed", render: () => view("meetings", "failed", []) };

const signInView = (status: "signedOut" | "signingIn" | "signedIn", error = "") => (
  <SignInView status={status} name="Ada Lovelace" email="ada@example.com" picture="" error={error} onSignIn={noop} onSignOut={noop} />
);

export const SignIn = { name: "Sign in", render: () => <SignInRecipe /> };
export const SignInWaiting = { name: "Sign in, waiting for the browser", render: () => signInView("signingIn") };
export const SignInFailed = { name: "Sign in, failed", render: () => signInView("signedOut", "The provider answered access_denied. Try again, or ask the person who runs the app.") };
export const SignedIn = { name: "Signed in", render: () => signInView("signedIn") };

const now = Date.now();

const outboxMessages = [
  { id: "1", to: "bo@example.com", subject: "Ada invited you to Board", status: "sent" as const, attempts: 1, at: now - 3_600_000 },
  { id: "2", to: "cy@example.com", subject: "Ada invited you to Board", status: "sending" as const, attempts: 2, at: now - 600_000 },
  { id: "3", to: "dee@example.net", subject: "Your receipt for Pro", status: "failed" as const, attempts: 4, error: "The mailbox does not exist", at: now - 86_400_000 },
];

const outbox = (messages: typeof outboxMessages, extra: { filter?: "all" | "failed"; loading?: boolean; needsTeam?: boolean; error?: string } = {}) => (
  <Window>
    <Stack padding={24} gap={16} maxWidth={960}>
      <Heading>Outbox</Heading>
      <OutboxView
        messages={messages}
        loading={extra.loading ?? false}
        needsTeam={extra.needsTeam ?? false}
        filter={extra.filter ?? "all"}
        onFilter={noop}
        onRetry={noop}
        notice=""
        error={extra.error ?? ""}
      />
    </Stack>
  </Window>
);

export const Outbox = { render: () => <OutboxRecipe /> };
export const OutboxFailedOnly = { name: "Outbox, failed only", render: () => outbox(outboxMessages, { filter: "failed" }) };
export const OutboxEmpty = { name: "Outbox, nothing sent", render: () => outbox([]) };
export const OutboxNoTeam = { name: "Outbox, no team yet", render: () => outbox([], { needsTeam: true }) };
export const OutboxLoading = { name: "Outbox, loading", render: () => outbox([], { loading: true }) };
export const OutboxRetryFailed = { name: "Outbox, retry failed", render: () => outbox(outboxMessages, { error: "Only an owner of the team can retry a message." }) };
