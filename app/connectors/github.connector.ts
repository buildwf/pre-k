// Point's built-in github connector, registered for this app's agents and code. To let people connect their own
// accounts, give it your OAuth app: export default withOAuth(github, { clientId }) with withOAuth from
// 'point/connectors'. See node_modules/point/docs/site/ai/reference/connectors/github.md; integration guide: node_modules/point/docs/site/guides/integrations.md.
export { github as default } from 'point/connectors/github'
