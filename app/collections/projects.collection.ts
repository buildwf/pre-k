import { defineCollection } from "point/app";
import { project } from "../schemas/project";

// One row per project, kept on this computer (main's SQLite) and live in every window via useCollection('projects').
export default defineCollection({ schema: project, key: "id" });
