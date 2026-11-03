import { fileURLToPath } from "node:url";
import stylex from "@stylexjs/unplugin";
import type { UserConfig } from "vite";

// sevenyears (buildwf/sevenyears) is pre-k's design system: Base UI primitives styled with StyleX. StyleX compiles its
// stylex.create calls at build time, so the renderer needs the plugin; dedupe keeps one React and one StyleX runtime.
// StyleX only reads variables from an import whose path ends in ".stylex", and sevenyears exports its tokens as
// "sevenyears/tokens", so app/ui imports "sevenyears/tokens.stylex" and this alias (with tsconfig's paths) points it at
// the exported file.
const tokens = fileURLToPath(import.meta.resolve("sevenyears/tokens"));
export default {
  plugins: [stylex.vite({
      useCSSLayers: true,
      aliases: { "sevenyears/tokens.stylex": [tokens] },
      // Electron 45 is Chromium 142: keep light-dark() and color-mix() instead of lowering them.
      lightningcssOptions: { targets: { chrome: 142 << 16 } },
    })],
  resolve: {
    alias: { "sevenyears/tokens.stylex": tokens },
    dedupe: ["react", "react-dom", "@stylexjs/stylex", "@base-ui/react"] },
} satisfies UserConfig;
