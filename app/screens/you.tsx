import { rpc, useRpc, useStore } from "point/client";
import { Field } from "../ui/Field";
import { SegmentedControl } from "../ui/SegmentedControl";
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

const themes = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export type Theme = (typeof themes)[number]["value"];

/** Light, dark, or following the system. Point applies it to every window, the menus and the title bars. */
export function Appearance() {
  const [settings, setSettings] = useStore("settings");

  if (!settings) return null;

  return (
    <SegmentedControl
      label="Appearance"
      value={settings.theme}
      options={themes}
      onChange={(theme) => void setSettings({ ...settings, theme })}
    />
  );
}

/** Sets the appearance from outside Settings (the ⌘K palette). */
export function useSetTheme() {
  const [settings, setSettings] = useStore("settings");
  return (theme: Theme) => {
    if (settings) void setSettings({ ...settings, theme });
  };
}
