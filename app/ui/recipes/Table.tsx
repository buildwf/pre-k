import { useState } from "react";
import { Button } from "../Button";
import { EmptyState } from "../EmptyState";
import { Field } from "../Field";
import { Heading } from "../Heading";
import { SegmentedControl } from "../SegmentedControl";
import { Select } from "../Select";
import { Stack } from "../Stack";
import { Table } from "../Table";
import { TextField } from "../TextField";
import { Window } from "../Window";

// Recipe: a table with filters. The title and its primary action, a row of filters (search, status, owner), and a
// sortable Table; an EmptyState while there are no rows, and one that offers to clear the filters when they match
// nothing.

type Run = { id: string; name: string; status: "open" | "done"; owner: string; cost: number };

type Filter = "all" | "open" | "done";

const filters = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
] as const;

// Sample: the story's rows. point generate window starts this empty, so the window opens on its EmptyState.
const sampleRuns: Run[] = [
  { id: "r1", name: "Fix the export button", status: "done", owner: "Ada", cost: 0.042 },
  { id: "r2", name: "Add a settings window", status: "open", owner: "Grace", cost: 0.118 },
  { id: "r3", name: "Bump the theme tokens", status: "done", owner: "Grace", cost: 0.007 },
  { id: "r4", name: "Write the import guide", status: "open", owner: "Ada", cost: 0.064 },
];

export function TableRecipe() {
  // TODO: replace with useQuery(api.<table>.list, {}) from point/cloud/react for a cloud table, or useRpc for rows
  // that come from a procedure in main.
  const [runs] = useState<Run[]>(sampleRuns);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Filter>("all");
  const [owner, setOwner] = useState("anyone");

  const owners = [
    { value: "anyone", label: "Anyone" },
    ...[...new Set(runs.map((r) => r.owner))].map((o) => ({ value: o, label: o })),
  ];

  const shown = runs.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) &&
      (status === "all" || r.status === status) &&
      (owner === "anyone" || r.owner === owner),
  );

  const clear = () => {
    setSearch("");
    setStatus("all");
    setOwner("anyone");
  };

  return (
    <Window>
      <Stack padding={24} gap={16} maxWidth={960}>
        <Stack direction="row" gap={8} align="center" justify="between">
          <Heading>Runs</Heading>
          <Button variant="primary">New run</Button>
        </Stack>
        <Stack direction="row" gap={12} align="end" wrap>
          <Field label="Search">
            <TextField
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name contains…"
            />
          </Field>
          <SegmentedControl label="Status" value={status} options={filters} onChange={setStatus} />
          <Field label="Owner">
            <Select value={owner} options={owners} onChange={setOwner} />
          </Field>
        </Stack>
        {!runs.length ? (
          <EmptyState title="No runs yet" action={<Button variant="primary">New run</Button>}>
            Runs show up here as they start.
          </EmptyState>
        ) : shown.length ? (
          <Table
            rows={shown}
            rowKey={(r) => r.id}
            defaultSort={{ column: "Cost", direction: "descending" }}
            columns={[
              { label: "Run", cell: (r) => r.name, sort: (a, b) => a.name.localeCompare(b.name) },
              { label: "Status", cell: (r) => (r.status === "done" ? "Done" : "Open") },
              {
                label: "Owner",
                cell: (r) => r.owner,
              },
              {
                label: "Cost",
                cell: (r) => `$${r.cost.toFixed(3)}`,
                align: "end",
                sort: (a, b) => a.cost - b.cost,
              },
            ]}
          />
        ) : (
          <EmptyState
            title="Nothing matches these filters"
            action={
              <Button variant="quiet" onClick={clear}>
                Clear filters
              </Button>
            }
          />
        )}
      </Stack>
    </Window>
  );
}
