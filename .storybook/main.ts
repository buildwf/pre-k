// Storybook for the app's components in app/ui/, at http://localhost:6006. `point mcp` and `point dev` start it (or
// run `bun run storybook`), and `point mcp` serves its MCP tools to coding agents as storybook_*: they list the
// components (docs-list), read one's props and stories (docs-show) and preview stories.
export default {
  framework: "@storybook/react-vite",
  stories: ["../app/ui/**/*.stories.tsx"],
  // addon-pseudo-states forces hover, focus and press for the States stories.
  addons: ["@storybook/addon-mcp", "storybook-addon-pseudo-states"],
  // The components manifest is what the MCP server's docs tools read: each component, its props from the types, and
  // its stories. Without it, agents only see story ids.
  features: { componentsManifest: true },
  // Props come from react-docgen (the default). react-docgen-typescript needs TypeScript's JS API, which the template's
  // TypeScript 7 doesn't have. A component's JSDoc @import line is the import the MCP server shows agents.
  core: { disableTelemetry: true },
  // Build for the Chromium the app's windows run in, as point build does. Vite's default targets lower light-dark()
  // into a polyfill that ignores <Window scheme>, so built stories would lose the kit's colors.
  viteFinal: (config: { build?: object }) => ({
    ...config,
    build: { ...config.build, target: "chrome130", cssTarget: "chrome130" },
  }),
};
