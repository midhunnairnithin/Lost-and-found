# FoundAgain

FoundAgain is an accessible lost-and-found portal for campuses, workplaces,
residential communities, and shared facilities. People can search reports,
post lost or found items, view details, and submit a private ownership claim —
without creating an account.

## Core concepts

- **Search-first homepage:** Search by item, description, category, location,
  status, and date.
- **Lost and found reports:** Both report types use the same validated form;
  photos are optional and image descriptions support screen readers.
- **Private claims:** Claimant and reporter contact details, plus verification
  notes, are stored privately and never rendered on public item cards.
- **Accessible by default:** Semantic labels, skip navigation, keyboard focus,
  live status messages, reduced motion, high contrast, larger text, and light or
  dark themes are included.
- **Persistent records:** Item reports and claims are stored in Cloudflare D1
  through the API routes under `app/api/`.

## Project structure

```text
app/page.tsx                 Accessible homepage and client interactions
app/globals.css              Design tokens, responsive layout, themes
app/api/items/               Item list and report endpoints
app/api/items/[id]/claim/    Private claim endpoint
db/runtime.ts                D1 initialization and access helper
db/schema.ts                 Drizzle table definitions
```

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful checks:

```bash
npm run lint
npm run build
```

No environment variables are required for the local setup. Hosted deployments
use the `DB` binding declared in `.openai/hosting.json`.
