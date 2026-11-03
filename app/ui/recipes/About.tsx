import { About } from "../About";
import { Window } from "../Window";

// Recipe: the About window. The app's icon, name and version, a link or two, and where updating stands (up to date,
// downloading, ready to restart, failed or off). It is written over useAppInfo() and useUpdate() from point/client:
// `point generate window about --recipe about`; this is its story.

type Status = "idle" | "checking" | "downloading" | "ready" | "error" | "off";

// An inline icon, so the story needs no file.
const icon =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect x="100" y="100" width="824" height="824" rx="185" fill="%232f855a"/><text x="512" y="512" font-family="sans-serif" font-weight="700" font-size="560" fill="white" text-anchor="middle" dominant-baseline="central">C</text></svg>';

export function AboutRecipe({ status = "idle" }: { status?: Status }) {
  return (
    <Window>
      <About
        icon={icon}
        name="Cardboard"
        version="1.4.2"
        links={[{ label: "Website", href: "https://example.com" }]}
        update={{
          status,
          version: "1.5.0",
          progress: 0.4,
          error: "Couldn't reach the update server.",
          reason: "Updates are off in development builds.",
          check: () => {},
          install: () => {},
        }}
      />
    </Window>
  );
}
