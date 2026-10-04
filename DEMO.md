# Demo mode (no backend needed)

The frontend ships with an in-browser mock of the whole API + realtime socket, so it runs on Vercel
with no server. It is ON by default.

- Any email/password signs in. Quick-login buttons on /login: User, General Guard, Rapid Guard.
- `user@demo.com` (user), `guard1@demo.com` (guard), `rapidguard@demo.com` (rapid guard).
  Emails containing "guard"/"rapid" create guard accounts; anything else creates a user.
- Data is stored in the browser (localStorage) and survives refresh. Use /demo -> "Reset Demo" to clear a running incident.
- SOS flow: 10s cancel window -> Guard notified. A simulated responder then accepts/responds/arrives/resolves
  (22s/30s/38s/48s). A real guard (second tab, signed in as guard) who acts first takes over.
  Set `AUTO_RESPOND = false` in src/services/mockServer.js to disable the simulated responder.

## Switching to the real backend later
Deploy the API, then build with `VITE_DEMO_MODE=false` (Vercel -> Settings -> Environment Variables).
The mock layer is then completely bypassed (see src/config.js, src/services/mockAdapter.js, mockSocket.js).
Make sure the real API is reachable at `/api` (Vercel rewrite/proxy) and `/socket.io`.
