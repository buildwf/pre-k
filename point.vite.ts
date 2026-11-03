import stylex from "@stylexjs/unplugin";
import type { UserConfig } from "vite";

// sevenyears (buildwf/sevenyears) is pre-k's design system: Base UI primitives styled with StyleX. StyleX compiles its
// stylex.create calls at build time, so the renderer needs the plugin; dedupe keeps one React and one StyleX runtime.
export default {
  plugins: [stylex.vite({
      useCSSLayers: true,
      // Electron 45 is Chromium 142: keep light-dark() and color-mix() instead of lowering them.
      lightningcssOptions: { targets: { chrome: 142 << 16 } },
    })],
  resolve: { dedupe: ["react", "react-dom", "@stylexjs/stylex", "@base-ui/react"] },
} satisfies UserConfig;
