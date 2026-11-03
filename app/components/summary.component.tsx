import { defineComponent } from "point/app";
import { z } from "zod";
import { Card } from "../ui/Card";
import { Text } from "../ui/Text";

// Agents render this with the built-in render_component tool; useAgent().ui lists the instances.
export default defineComponent({
  description: "A titled summary with bullet points, for reporting what changed.",
  props: z.object({ title: z.string(), points: z.array(z.string()) }),
  render: ({ title, points }) => (
    <Card>
      <Text bold>{title}</Text>
      <ul>
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </Card>
  ),
});
