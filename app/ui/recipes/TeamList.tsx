import { useState } from "react";
import { Button } from "../Button";
import { EmptyState } from "../EmptyState";
import { Field } from "../Field";
import { Heading } from "../Heading";
import { List, ListItem } from "../List";
import { SegmentedControl } from "../SegmentedControl";
import { Select } from "../Select";
import { Stack } from "../Stack";
import { Text } from "../Text";
import { TextField } from "../TextField";
import { Window } from "../Window";

// Recipe: a team and its members. The team's name with a picker for the caller's other teams and New team; its
// members in a List, where an owner adds people and removes them; and "Create your first team" while the caller is in
// none. `point generate window <name> --recipe team-list [--table <t>]` writes it over the cloud's api.teams
// functions, with a --team table's rows above the members.

type Role = "owner" | "member";

type Team = { id: string; name: string; role: Role };

type Member = { user: string; role: Role };

// Sample: the story's teams and members. The generated window reads them with useQuery(api.teams.mine) and
// useQuery(api.teams.members, { team }).
const sampleTeams: Team[] = [
  { id: "t1", name: "Design", role: "owner" },
  { id: "t2", name: "Launch", role: "member" },
];

const sampleMembers: Member[] = [
  { user: "ada", role: "owner" },
  { user: "grace", role: "member" },
  { user: "kim", role: "member" },
];

export function TeamListRecipe({ startWith = sampleTeams }: { startWith?: Team[] }) {
  const [teams, setTeams] = useState<Team[]>(startWith);
  const [members, setMembers] = useState<Member[]>(sampleMembers);
  const [chosen, setChosen] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [member, setMember] = useState("");
  const team = teams.find((t) => t.id === chosen) ?? teams[0];
  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));

  const create = () => {
    if (!name.trim()) return;
    const id = String(Date.now());
    setTeams([...teams, { id, name: name.trim(), role: "owner" }]);
    setChosen(id);
    setName("");
    setCreating(false);
  };

  const add = () => {
    if (!member.trim()) return;
    setMembers([...members, { user: member.trim(), role: "member" }]);
    setMember("");
  };

  const newTeam = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        create();
      }}
    >
      <Stack direction="row" gap={8} align="end">
        <Field label="Team name" wide>
          <TextField wide value={name} onChange={(e) => setName(e.target.value)} placeholder="Design" />
        </Field>
        <Button variant="primary" type="submit">
          Create team
        </Button>
      </Stack>
    </form>
  );

  if (!team)
    return (
      <Window>
        <Stack padding={48} gap={16} align="center">
          <EmptyState title="Create your first team" action={newTeam}>
            Everyone in a team sees and changes the team's work. You can add people once it exists.
          </EmptyState>
        </Stack>
      </Window>
    );

  return (
    <Window>
      <Stack padding={24} gap={16} maxWidth={640}>
        <Stack direction="row" gap={8} align="center" justify="between">
          <Heading>{team.name}</Heading>
          <Stack direction="row" gap={8} align="center">
            {teams.length > 4 ? (
              <Select label="Team" value={team.id} options={teamOptions} onChange={setChosen} />
            ) : (
              teams.length > 1 && (
                <SegmentedControl label="Team" value={team.id} options={teamOptions} onChange={setChosen} />
              )
            )}
            <Button variant="quiet" aria-expanded={creating} onClick={() => setCreating(!creating)}>
              New team
            </Button>
          </Stack>
        </Stack>
        {creating && newTeam}
        <Stack direction="row" gap={8} align="baseline">
          <Heading level={2}>Members</Heading>
          <Text tone="muted">{members.length}</Text>
        </Stack>
        <List label="Members">
          {members.map((m) => (
            <ListItem
              key={m.user}
              actions={
                team.role === "owner" && m.role !== "owner" ? (
                  <Button
                    variant="quiet"
                    aria-label={`Remove ${m.user}`}
                    onClick={() => setMembers(members.filter((x) => x.user !== m.user))}
                  >
                    Remove
                  </Button>
                ) : undefined
              }
            >
              <Text>{m.user}</Text>
              {m.role === "owner" && <Text tone="muted">Owner</Text>}
            </ListItem>
          ))}
        </List>
        {team.role === "owner" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <Stack direction="row" gap={8} align="end">
              <Field label="Member's sign-in id" wide>
                <TextField wide value={member} onChange={(e) => setMember(e.target.value)} />
              </Field>
              <Button variant="primary" type="submit">
                Add member
              </Button>
            </Stack>
          </form>
        )}
      </Stack>
    </Window>
  );
}
