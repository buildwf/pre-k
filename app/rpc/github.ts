import { defineRouter, procedure } from "point/app";
import { connect } from "point/connectors";
import github from "../connectors/github.connector";

/**
 * Who pre-k acts as on GitHub (pre-k#9). The token stays in main: `connectors.require` fails CONNECTOR_NOT_CONNECTED
 * until the person connects (or GITHUB_TOKEN / the keychain item point/github is set), so the window shows its
 * connect button. Nothing here returns the token.
 */
export default defineRouter({
  me: procedure.handler(async ({ connectors }) => {
    const me = await connect(github, { token: await connectors.require("github") }).me({});

    return { login: me.login, name: me.name ?? null, url: me.url };
  }),
});
