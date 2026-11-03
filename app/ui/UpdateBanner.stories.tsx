import { Stack } from "./Stack";
import { UpdateBanner, type UpdateState } from "./UpdateBanner";

export default { component: UpdateBanner, parameters: { layout: "padded" } };

const actions = { check: () => {}, install: () => {} };

const show = (state: Pick<UpdateState, "status"> & Partial<UpdateState>) => ({
  render: () => (
    <Stack maxWidth={640}>
      <UpdateBanner update={{ ...actions, ...state }} />
    </Stack>
  ),
});

export const Downloading = show({
  status: "downloading",
  version: "2.1.0",
  progress: 0.4,
});

export const DownloadingUnknown = show({
  status: "downloading",
  version: "2.1.0",
});

export const Ready = show({ status: "ready", version: "2.1.0" });

export const Failed = show({
  status: "error",
  error: "The update server didn't answer. Check your connection.",
});

export const UpToDate = show({ status: "idle" });

export const Off = show({
  status: "off",
  reason: "Updates are off in development builds.",
});
