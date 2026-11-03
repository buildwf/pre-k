import { Alert } from "./Alert";
import { Button } from "./Button";
import { Heading } from "./Heading";
import { ProgressBar } from "./ProgressBar";
import { Stack } from "./Stack";
import { Text } from "./Text";
import { color } from "./theme";
import type { UpdateState } from "./UpdateBanner";

/**
 * The About screen: the app's icon, its name and version, a few links, and where updating stands (up to date, checking,
 * downloading, ready to restart, failed or off) with the button that fits. Links open in the system browser. Put it in a
 * `<Window>`: `<About icon="/favicon.svg" name={info.name} version={info.version} update={useUpdate()} />`, with
 * `useAppInfo()` and `useUpdate()` from point/client. `point generate window about --recipe about` writes that window.
 * The update line stays mounted, so screen readers announce each change.
 *
 * @import import { About } from '../../ui/About'
 */
export function About({
  icon,
  name,
  version,
  update,
  links = [],
}: {
  /** The icon's URL: `/favicon.svg` from `point generate icon`, or a file in public/. */
  icon?: string | undefined;
  name: string;
  version: string;
  update: UpdateState;
  /** `https:` links shown under the version, like the website and the license. */
  links?: readonly { label: string; href: string }[];
}) {
  const { status, error, progress } = update;
  const next = update.version ? `Version ${update.version}` : "A new version";

  const percent =
    progress === undefined ? "" : ` · ${Math.round(progress * 100)}%`;

  const line =
    status === "checking"
      ? "Checking for updates…"
      : status === "downloading"
        ? `Downloading ${next.toLowerCase()}${percent}`
        : status === "ready"
          ? `${next} is ready. Restart to update.`
          : status === "idle"
            ? "You have the latest version."
            : status === "off"
              ? (update.reason ?? "Updates are off.")
              : undefined;

  return (
    <Stack padding={32} gap={16} maxWidth={420} align="center">
      {/* The icon has its own transparent margin, so no box or crop behind it (Image would draw both). */}
      {icon !== undefined && (
        <img
          src={icon}
          alt=""
          width={96}
          height={96}
          style={{ display: "block" }}
        />
      )}
      <Stack gap={4} align="center">
        <Heading>{name}</Heading>
        <Text tone="muted">Version {version}</Text>
      </Stack>
      {links.length > 0 && (
        <Stack direction="row" gap={16} justify="center" wrap>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              style={{ color: color.accent }}
            >
              {link.label}
            </a>
          ))}
        </Stack>
      )}
      <Stack gap={8} align="center">
        <Alert>{line}</Alert>
        {status === "downloading" && (
          <ProgressBar value={progress} label="Update download" />
        )}
        <Alert tone="danger">
          {status === "error"
            ? (error ?? "Something went wrong while updating.")
            : ""}
        </Alert>
        {status === "idle" && (
          <Button onClick={update.check}>Check for updates</Button>
        )}
        {status === "ready" && (
          <Button variant="primary" onClick={update.install}>
            Restart
          </Button>
        )}
        {status === "error" && (
          <Button onClick={update.check}>Try again</Button>
        )}
      </Stack>
    </Stack>
  );
}
