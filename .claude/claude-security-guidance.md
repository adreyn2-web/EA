# Compass security rules

- Bank/brokerage credentials (Plaid, Schwab, Gmail app password, dashboard auth) live only in
  `.env`. Never log, print, echo, or commit their values — including in commit messages, debug
  output, or error messages.
- Files under `projects/finance/data/` (account balances, transaction snapshots) contain real
  financial data. Treat as sensitive: don't paste contents into external services or third-party
  tools.
- `dashboard/server.js` is exposed via an ngrok tunnel (`NGROK_DOMAIN`) — any change to its auth
  or session handling needs extra scrutiny since it's reachable from the public internet.
- The `gws` CLI runs with real Google Workspace OAuth scopes (Gmail send, Drive, Calendar,
  Sheets write). Code paths that call non-read `gws` commands (send, insert, upload, write) are
  higher risk than read paths — an accidental unintended send/write is a real-world side effect,
  not just a bug.
