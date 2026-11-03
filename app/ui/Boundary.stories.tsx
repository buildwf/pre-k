import { use, type ReactNode } from "react";
import { Boundary } from "./Boundary";
import { Text } from "./Text";

export default { component: Boundary };

const forever = new Promise<string>(() => {});

function Waiting(): ReactNode {
  return <Text>{use(forever)}</Text>;
}

function Broken(): ReactNode {
  throw new Error("The notes service didn't answer.");
}

export const Loading = { args: { what: "notes", children: <Waiting /> } };

export const Failed = {
  args: { what: "notes", children: <Broken /> },
};

export const Loaded = { args: { children: <Text>Everything arrived.</Text> } };
