import { About } from "./About";
import type { UpdateState } from "./UpdateBanner";

export default { component: About };

// An inline icon, so the stories need no file.
const icon =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect x="100" y="100" width="824" height="824" rx="185" fill="%232f855a"/><text x="512" y="512" font-family="sans-serif" font-weight="700" font-size="560" fill="white" text-anchor="middle" dominant-baseline="central">C</text></svg>';

const links = [
  { label: "Website", href: "https://example.com" },
  { label: "Release notes", href: "https://example.com/changes" },
];

const update = (state: Partial<UpdateState>): UpdateState => ({
  status: "idle",
  check: () => {},
  install: () => {},
  ...state,
});

const base = { icon, name: "Cardboard", version: "1.4.2", links };

export const UpToDate = { args: { ...base, update: update({}) } };

export const Checking = {
  args: { ...base, update: update({ status: "checking" }) },
};

export const Downloading = {
  args: {
    ...base,
    update: update({ status: "downloading", version: "1.5.0", progress: 0.4 }),
  },
};

export const Ready = {
  args: { ...base, update: update({ status: "ready", version: "1.5.0" }) },
};

export const Failed = {
  args: {
    ...base,
    update: update({
      status: "error",
      error: "Couldn't reach the update server.",
    }),
  },
};

export const UpdatesOff = {
  args: {
    ...base,
    update: update({
      status: "off",
      reason: "Updates are off in development builds.",
    }),
  },
};

export const NoIconNoLinks = {
  args: { name: "Cardboard", version: "1.4.2", update: update({}) },
};
