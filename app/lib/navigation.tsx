import { createContext, useContext } from "react";
import type { z } from "zod";
import type { CommitRef } from "../schemas/delivery";

/**
 * Opens a landed commit's diff in the main pane. The workspace provides it; a card anywhere (a thread, project chat,
 * Delivered) offers "View changes" only when it is there.
 */
export const OpenCommitContext = createContext<((commit: z.infer<typeof CommitRef>) => void) | null>(null);

export const useOpenCommit = () => useContext(OpenCommitContext);
