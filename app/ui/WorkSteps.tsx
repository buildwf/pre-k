import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "sevenyears/components/Collapsible";
import { Spinner } from "sevenyears/components/Spinner";
import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { colors, font, radius, space, text } from "sevenyears/tokens.stylex";
import { Icon, type IconName } from "./Icon";

/** One thing an agent did: ran a command, edited a file, read one, searched. */
export interface WorkStep {
  id: string;
  kind: "command" | "edit" | "read" | "search" | "web" | "tool";
  /** "Ran", "Edited"; "Running" while it runs. */
  verb: string;
  /** The command, the file or the pattern, on one line. */
  target: string;
  /** What it answered, shown when the step is opened. */
  output?: string | undefined;
  running: boolean;
  failed: boolean;
}

const icons: Record<WorkStep["kind"], IconName> = {
  command: "terminal",
  edit: "pencil",
  read: "file",
  search: "search",
  web: "globe",
  tool: "wrench",
};

const s = stylex.create({
  group: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
    width: "100%",
    boxSizing: "border-box",
    paddingBlock: space[2],
    paddingInline: space[3],
    borderWidth: 0,
    backgroundColor: { default: "transparent", ":hover": colors.muted },
    color: colors.mutedForeground,
    fontFamily: "inherit",
    fontSize: text.caption,
    textAlign: "start",
    cursor: "pointer",
  },
  chevron: { display: "inline-flex", transitionProperty: "transform", transitionDuration: "120ms" },
  chevronOpen: { transform: "rotate(90deg)" },
  summary: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  list: {
    margin: 0,
    paddingBlock: space[1],
    paddingInline: 0,
    listStyle: "none",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
    width: "100%",
    boxSizing: "border-box",
    paddingBlock: space[1],
    paddingInline: space[3],
    borderWidth: 0,
    backgroundColor: { default: "transparent", ":hover": colors.muted },
    color: colors.foreground,
    fontFamily: "inherit",
    fontSize: text.caption,
    textAlign: "start",
  },
  clickable: { cursor: "pointer" },
  icon: { display: "inline-flex", color: colors.mutedForeground },
  verb: { fontWeight: 500, flexShrink: 0 },
  target: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontFamily: font.mono,
    fontSize: text.xs,
    color: colors.mutedForeground,
  },
  failed: { color: colors.destructiveText, fontSize: text.xs, fontWeight: 500, flexShrink: 0 },
  output: {
    margin: 0,
    marginInline: space[3],
    marginBottom: space[2],
    paddingBlock: space[2],
    paddingInline: space[3],
    maxHeight: "15rem",
    overflow: "auto",
    borderRadius: radius.sm,
    backgroundColor: colors.muted,
    fontFamily: font.mono,
    fontSize: text.xs,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    color: colors.foreground,
  },
});

/** One step: its icon, verb and target; a spinner while it runs; its output when opened. */
function Step({ step }: { step: WorkStep }) {
  const head = (
    <>
      <span {...stylex.props(s.icon)}>
        {step.running ? <Spinner size={14} /> : <Icon name={icons[step.kind]} size={14} />}
      </span>
      <span {...stylex.props(s.verb)}>{step.verb}</span>
      <span {...stylex.props(s.target)} title={step.target}>
        {step.target}
      </span>
      {step.failed && <span {...stylex.props(s.failed)}>failed</span>}
    </>
  );
  if (!step.output) return <li {...stylex.props(s.row)}>{head}</li>;
  return (
    <li>
      <Collapsible>
        <CollapsibleTrigger {...stylex.props(s.row, s.clickable)}>{head}</CollapsibleTrigger>
        <CollapsibleContent>
          <pre {...stylex.props(s.output)}>{step.output}</pre>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

/**
 * The steps an agent took between two messages (commands run, files edited, files read), shown live: open while it
 * works, with a spinner on the step running now, then folded into one line ("Ran 2 commands, edited 1 file") once it
 * is done. The person can open or close it either way, and open a step to see its output. Tool output is shown as
 * plain text.
 *
 * @import import { WorkSteps } from '../../ui/WorkSteps'
 */
export function WorkSteps({ steps, summary, running }: { steps: readonly WorkStep[]; summary: string; running: boolean }) {
  // Follows `running` until the person opens or closes it themselves.
  const [chosen, setChosen] = useState<boolean>();
  const open = chosen ?? running;
  const current = steps.findLast((step) => step.running);
  return (
    <Collapsible open={open} onOpenChange={setChosen} {...stylex.props(s.group)}>
      <CollapsibleTrigger {...stylex.props(s.header)}>
        <span {...stylex.props(s.chevron, open && s.chevronOpen)}>
          <Icon name="chevronRight" size={14} />
        </span>
        <span {...stylex.props(s.summary)}>
          {running ? `Working: ${current ? `${current.verb} ${current.target}` : "…"}` : summary}
        </span>
        {running && <Spinner size={14} />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul {...stylex.props(s.list)} aria-label="Steps">
          {steps.map((step) => (
            <Step key={step.id} step={step} />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
