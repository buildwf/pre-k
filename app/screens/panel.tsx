import type { ReactNode } from "react";
import type { Project } from "../schemas/project";
import { Button } from "../ui/Button";
import { Section } from "../ui/Section";
import { Text } from "../ui/Text";

/**
 * The right-hand panel beside the project chat: what every agent in the project reads (its instructions and memory),
 * at a glance. Edit opens Project settings.
 */
export function ProjectPanel({ project, memory, onEdit }: { project: Project; memory: ReactNode; onEdit: () => void }) {
  return (
    <>
      <Section
        compact
        title="Instructions"
        description="Every agent in this project reads these first."
        action={
          <Button size="sm" variant="quiet" onClick={onEdit}>
            Edit
          </Button>
        }
      >
        {project.instructions.trim() ? (
          <Text>{project.instructions}</Text>
        ) : (
          <Text tone="muted">None yet. Add how agents should work here: tools, conventions, what to avoid.</Text>
        )}
      </Section>
      <Section compact title="Memory" description="What threads saved for later ones. Agents read it too.">
        {memory}
      </Section>
    </>
  );
}
