import { defineCollection } from "point/app";
import { memoryNote } from "../schemas/memory";

// Project memory, kept on this computer and live in every window via useCollection('memory').
export default defineCollection({ schema: memoryNote, key: "id" });
