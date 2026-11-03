import { ApprovalPrompt } from "./ApprovalPrompt";
import { Stack } from "./Stack";

export default { component: ApprovalPrompt, parameters: { layout: "padded" } };

const decide = () => Promise.resolve({ ok: true });

const request = (over: Partial<Parameters<typeof ApprovalPrompt>[0]["pending"][number]>) => ({
  requestId: "r1",
  name: "bookmarks.add",
  input: { title: "Point docs", url: "https://example.com/docs" },
  effect: "workspace-write",
  ...over,
});

const show = (props: Partial<Parameters<typeof ApprovalPrompt>[0]>) => ({
  render: () => (
    <Stack maxWidth={560}>
      <ApprovalPrompt pending={[request({})]} onDecide={decide} {...props} />
    </Stack>
  ),
});

export const Default = show({});

export const Reads = show({
  pending: [request({ name: "bookmarks.list", input: {}, effect: "read" })],
});

export const RunsACommand = show({
  agent: "Planner",
  pending: [request({ name: "shell", input: { command: "pnpm install && pnpm build" }, effect: "local-process" })],
});

export const CannotBeUndone = show({
  pending: [
    request({
      name: "email.send",
      input: { to: "kim@example.com", subject: "Invoice", body: "Hi Kim, the invoice is attached." },
      effect: "external-irreversible",
    }),
  ],
});

export const EffectUnknown = show({ pending: [request({ effect: undefined })] });

export const LongArgument = show({
  pending: [request({ name: "notes.add", input: { text: "A very long note. ".repeat(40) } })],
});

export const Several = show({
  pending: [
    request({}),
    request({ requestId: "r2", name: "bookmarks.list", input: {}, effect: "read" }),
    request({ requestId: "r3", name: "shell", input: { command: "rm -rf build" }, effect: "local-process" }),
  ],
});

export const NothingWaiting = show({ pending: [] });

export const AnswerFails = show({ onDecide: () => Promise.resolve({ ok: false }) });
