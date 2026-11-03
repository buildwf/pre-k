import { rpc, useRpc, useStore } from "point/client";
import { Field } from "../ui/Field";
import { TextField } from "../ui/TextField";

/** What project chat calls the person, so the threads they ask for say who asked. Saves on blur. */
export function YourName() {
  const [settings, setSettings] = useStore("settings");
  const me = useRpc(rpc.coordinator.whoami, undefined);

  if (!settings) return null;

  return (
    <Field
      label="Your name"
      hint={`Threads you ask for say you asked. Leave it empty to use your GitHub name${me.data?.name ? ` (now ${me.data.name})` : ""}.`}
    >
      <TextField
        defaultValue={settings.name ?? ""}
        onBlur={(e) => {
          const next = e.target.value.trim();
          if (next === (settings.name ?? "")) return;
          const { repo, theme } = settings;
          void setSettings(next ? { repo, theme, name: next } : { repo, theme }).then(() => void me.refetch());
        }}
      />
    </Field>
  );
}
