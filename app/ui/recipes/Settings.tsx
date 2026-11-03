import { useState } from "react";
import { Card } from "../Card";
import { Checkbox } from "../Checkbox";
import { Field } from "../Field";
import { Heading } from "../Heading";
import { NotificationsSetting } from "../NotificationsSetting";
import { SegmentedControl } from "../SegmentedControl";
import { Stack } from "../Stack";
import { Text } from "../Text";
import { TextField } from "../TextField";
import { Window } from "../Window";

// Recipe: settings. A section per topic, each a Heading and a Card of its options. A change saves at once, so there is
// no Save button; "Saved" says it did.

type Theme = "system" | "light" | "dark";

type Settings = { name: string; theme: Theme; hidden: boolean; reopen: boolean };

const themes = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export function SettingsRecipe() {
  // TODO: replace with useNotifications() from point/client.
  const [notify, setNotify] = useState(true);

  // TODO: replace with const [settings, setSettings] = useStore('settings') from point/client: it persists on this
  // machine and every window sees the change. It is undefined until it loads, so add if (!settings) return null.
  const [settings, setSettings] = useState<Settings>({
    name: "Ada",
    theme: "system",
    hidden: false,
    reopen: true,
  });

  const [saved, setSaved] = useState(false);

  const change = (next: Partial<Settings>) => {
    setSettings({ ...settings, ...next });
    setSaved(true);
  };

  return (
    <Window>
      <Stack padding={24} gap={24} maxWidth={640}>
        <Stack direction="row" gap={8} align="baseline" justify="between">
          <Heading>Settings</Heading>
          <Text tone="muted" role="status">
            {saved ? "Saved" : ""}
          </Text>
        </Stack>
        <Stack gap={12}>
          <Heading level={2}>Profile</Heading>
          <Card>
            <Field label="Display name" hint="Shown on what you share.">
              <TextField value={settings.name} onChange={(e) => change({ name: e.target.value })} />
            </Field>
          </Card>
        </Stack>
        <Stack gap={12}>
          <Heading level={2}>Appearance</Heading>
          <Card>
            <Stack gap={16}>
              <Stack gap={4} align="start">
                <Text bold>Theme</Text>
                <SegmentedControl
                  label="Theme"
                  value={settings.theme}
                  options={themes}
                  onChange={(theme) => change({ theme })}
                />
              </Stack>
              <Checkbox checked={settings.hidden} onChange={(hidden) => change({ hidden })}>
                Show hidden files
              </Checkbox>
              <Checkbox checked={settings.reopen} onChange={(reopen) => change({ reopen })}>
                Reopen the last project at startup
              </Checkbox>
            </Stack>
          </Card>
        </Stack>
        <Stack gap={12}>
          <Heading level={2}>Notifications</Heading>
          <NotificationsSetting
            notifications={{
              supported: true,
              enabled: notify,
              setEnabled: async (on) => setNotify(on),
              test: async () => ({ shown: notify }),
            }}
          />
        </Stack>
      </Stack>
    </Window>
  );
}
