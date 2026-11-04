import { defineRouter, procedure } from "point/app";
import { z } from "zod";
import { MAX_FILES, attachmentFile, saveAttachments } from "../attachments/store";

const projectId = z.string().regex(/^[\w-]+$/).max(64);

export default defineRouter({
  // Project chat saves what the person dropped in the composer before sending, so the coordinator's message carries
  // their ids and `threads start --attachments` can hand the same files to a thread. Windows only.
  save: procedure
    .input(z.object({ projectId, files: z.array(attachmentFile).min(1).max(MAX_FILES) }))
    .errors({ TOO_BIG: z.object({ message: z.string() }) })
    .trust("window:main")
    .handler(async ({ input, fail }) => {
      try {
        return await saveAttachments(input.projectId, input.files);
      } catch (e) {
        return fail("TOO_BIG", { message: e instanceof Error ? e.message : String(e) });
      }
    }),
});
