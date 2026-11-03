import { defineConfig, defineGateway, keychain } from "point/app";

export default defineConfig({
  appId: "dev.point.pre-k",
  name: "pre-k",
  // The settings store's theme field sets light or dark for every window, the menus and the title bars.
  theme: { store: "settings", field: "theme" },
  gateway: defineGateway({
    // Keys live in the macOS keychain (service "point", account = provider) or env (ANTHROPIC_API_KEY); never in a harness.
    keys: { anthropic: keychain("anthropic") },
    models: { default: "anthropic/claude-sonnet-5-5" },
    // USD per million tokens; check against the provider's current price list.
    prices: {
      "anthropic/claude-sonnet-5-5": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
    },
    budget: { perThreadUsd: 5 },
  }),
});
