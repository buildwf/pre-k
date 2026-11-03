import { useState } from "react";
import { Button } from "./Button";
import { Stack } from "./Stack";
import { Table, type Column } from "./Table";
import { Text } from "./Text";

const runs = [
  { id: "r1", name: "Fix the export button", status: "done", cost: 0.042 },
  { id: "r2", name: "Add a settings window", status: "running", cost: 0.118 },
  { id: "r3", name: "Bump the theme tokens", status: "done", cost: 0.007 },
];

type Run = (typeof runs)[number];

const columns: Column<Run>[] = [
  { label: "Run", cell: (r: Run) => r.name },
  { label: "Status", cell: (r: Run) => r.status },
  { label: "Cost", cell: (r: Run) => `$${r.cost.toFixed(3)}`, align: "end" },
];

const sortable: Column<Run>[] = [
  {
    label: "Run",
    cell: (r: Run) => r.name,
    sort: (a: Run, b: Run) => a.name.localeCompare(b.name),
  },
  { label: "Status", cell: (r: Run) => r.status },
  {
    label: "Cost",
    cell: (r: Run) => `$${r.cost.toFixed(3)}`,
    align: "end",
    sort: (a: Run, b: Run) => a.cost - b.cost,
  },
];

export default { component: Table };

export const Default = { args: { columns, rows: runs, rowKey: (r: Run) => r.id } };

export const Empty = {
  args: { columns, rows: [], rowKey: (r: Run) => r.id, empty: "No runs yet" },
};

// Run and Cost sort: click a header for ascending, again for descending, a third time for the rows' own order.
export const Sortable = {
  args: {
    columns: sortable,
    rows: runs,
    rowKey: (r: Run) => r.id,
    defaultSort: { column: "Cost", direction: "descending" },
  },
};

// Loaded rows stay still. Add eases in only the run the person just added.
function AddedRun() {
  const [rows, setRows] = useState(runs);
  const [entering, setEntering] = useState<string | undefined>();

  const add = () => {
    const id = `r${rows.length + 1}`;
    setRows([...rows, { id, name: "Write the import guide", status: "open", cost: 0.064 }]);
    setEntering(id);
  };

  return (
    <Stack gap={8}>
      <Button onClick={add}>Add</Button>
      <Table caption="Runs" columns={columns} rows={rows} rowKey={(r) => r.id} entering={entering} />
    </Stack>
  );
}

export const JustAdded = { render: () => <AddedRun /> };

// A sortable header in every state side by side, forced with storybook-addon-pseudo-states, so a screenshot shows them all.
const states = [
  { name: "rest" },
  { name: "hover" },
  { name: "focus" },
  { name: "ascending", sort: { column: "Cost", direction: "ascending" } },
  { name: "descending", sort: { column: "Cost", direction: "descending" } },
] as const;

export const States = {
  parameters: {
    pseudo: { hover: ['[data-state="hover"] *'], focusVisible: ['[data-state="focus"] *'] },
  },
  render: () => (
    <Stack direction="row" gap={16} align="start">
      {states.map((s) => (
        <Stack key={s.name} gap={4}>
          <Text tone="muted">{s.name}</Text>
          <span data-state={s.name}>
            <Table
              columns={sortable.slice(2)}
              rows={runs.slice(0, 2)}
              rowKey={(r) => r.id}
              {...("sort" in s ? { defaultSort: s.sort } : {})}
            />
          </span>
        </Stack>
      ))}
    </Stack>
  ),
};
