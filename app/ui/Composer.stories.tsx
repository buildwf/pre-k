import { useState } from "react";
import { Button } from "./Button";
import { Composer } from "./Composer";

export default { component: Composer };

function Live(props: { busy?: boolean; initial?: string }) {
  const [text, setText] = useState(props.initial ?? "");
  return (
    <Composer
      label="Message the coordinator"
      value={text}
      onChange={setText}
      onSubmit={() => setText("")}
      placeholder="Ask about the project, or hand off work"
      hint={props.busy ? "Enter queues it for after this turn" : "The coordinator is ready"}
      sendLabel={props.busy ? "Queue" : "Send"}
      actions={
        props.busy ? (
          <Button size="sm" variant="quiet">
            Steer
          </Button>
        ) : undefined
      }
    />
  );
}

export const Empty = { render: () => <Live /> };
export const Typed = { render: () => <Live initial="Add a README badge" /> };
export const Busy = { render: () => <Live busy initial="Also add a license badge" /> };
