# FoundAgain

FoundAgain is a responsive lost-and-found portal for campuses, workplaces, residential communities, and shared facilities. Users can search community reports, submit lost or found items, view report details, and send private ownership claims without creating an account.

## Core architecture

- **Frontend:** Next.js 16 App Router, React 19, TypeScript, and shared CSS design tokens in `app/globals.css`.
- **Backend:** Next.js server route handlers under `app/api/`.
- **Database:** Neon Serverless Postgres through `@neondatabase/serverless` and `DATABASE_URL`.
- **Validation:** Strict manual client and server validation. No separate validation package is required.
- **Tests:** Node's built-in test runner, plus production builds and ESLint.
- **Hosting:** Vercel, with server-side functions for report, claim, and AI requests.

The official category list lives in `lib/categories.mjs` and is shared by the browser form, report API, and AI endpoint. It is the only category source of truth.

## Smart Category Detection

Both the **Report Lost Item** and **Report Found Item** forms include an optional **Suggest Category with AI** action. It sends the entered item name, description, and report type to a server route. The server asks the configured free OpenRouter model to choose only from FoundAgain's official categories.

The result includes a recommendation, confidence percentage, input-specific explanation, up to two alternatives, actual model metadata, and generation time. A user must explicitly apply the suggestion and can always choose or override the category manually. Changing the item details marks an earlier suggestion as potentially outdated. AI failures never block normal report submission.

### Data flow

```text
Lost/Found form
  -> POST /api/ai/detect-category
  -> strict input validation and per-instance rate check
  -> OpenRouter chat/completions (server only)
  -> configured OpenRouter model JSON response
  -> server schema/category sanitization
  -> accessible suggestion panel
  -> user explicitly applies or ignores the suggestion
```

Only the item name, item description, report type, and official category labels are sent to OpenRouter. Email addresses, phone numbers, claimant details, verification notes, images, report IDs, IP addresses, and other reports are not included.

## Environment variables

Copy `.env.example` to `.env.local` and replace placeholders:

```dotenv
DATABASE_URL=replace_with_your_neon_pooled_database_url
OPENROUTER_API_KEY=replace_with_your_openrouter_api_key
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Create an OpenRouter account, add credit, and create an API key in the OpenRouter dashboard. The key is read only by `app/api/ai/detect-category/route.js`; never prefix it with `NEXT_PUBLIC_`.

The configured free model is `nvidia/nemotron-3-super-120b-a12b:free`. The model is selected explicitly; the server does not silently replace it at runtime.

## Local development

Requirements: Node.js 22.13 or newer and a Neon database. The runtime creates the required Postgres tables and indexes idempotently through `db/postgres.ts` on first database access.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Manual category selection and report submission remain available when the OpenRouter variables are absent.

## Quality checks

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

`npm test` runs a production build and all `tests/*.test.mjs` files. The AI tests mock only the external OpenRouter transport. Production code always uses a real server-side `fetch` call.

## Manual live verification

After configuring a real OpenRouter key, open either report form and run **Suggest Category with AI** for at least three meaningfully different inputs, for example:

1. Silver house keys with three metal keys on a blue fabric loop.
2. A compact black leather wallet with card slots and a silver emblem.
3. A white wireless-earbuds charging case.
4. An employee identification card with a photograph and employee number.
5. A blue jacket whose description attempts to instruct the AI to create a new category.

For each response, record the entered text, recommendation, confidence, reason, alternatives, model, generated time, and OpenRouter generation ID if one was returned. Recommendations and explanations should change with the input. The injection example must still return only an official category.

## Vercel deployment

1. Import or link the repository in Vercel.
2. Keep the framework preset as **Next.js**. Do not configure a `dist` output directory; `vercel.json` uses `.next`.
3. Add `DATABASE_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and `NEXT_PUBLIC_APP_URL` in **Project Settings -> Environment Variables** for Production and Preview as appropriate.
4. Use these production values:

   ```dotenv
   OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
   NEXT_PUBLIC_APP_URL=https://lost-and-found-tau-sand.vercel.app/
   ```

5. Redeploy after saving the variables, then repeat the live-verification cases against the deployed URL.

Command-line deployment, once the project and variables are configured:

```bash
vercel
vercel --prod
```

## Security, privacy, and reliability

- The OpenRouter key never enters browser code, API responses, local storage, logs, or committed files.
- User item text is isolated as untrusted JSON data. The system prompt tells the model to ignore embedded instructions, and the server rejects categories outside the official list.
- Provider output is parsed defensively. Invalid JSON, invalid categories, confidence values outside 0-100, duplicates, and excess alternatives are rejected or sanitized.
- OpenRouter calls time out after 18 seconds. Provider 401, 402, 408, and 429 responses receive controlled user-facing messages.
- Successful AI responses use `Cache-Control: no-store`.
- The endpoint currently allows approximately five requests per IP per minute using a bounded, in-memory, per-function-instance limiter. This reduces accidental bursts but is **not globally reliable across Vercel instances**. For stronger production enforcement, add Vercel Firewall rate limiting or a durable Redis/Upstash limiter.
- Configure OpenRouter spending limits and monitoring before public launch.

## Known limitations and cost warning

- Existing duplicate database rows are not automatically deleted. The UI deduplicates repeated references, and a submission lock prevents accidental double submissions going forward.
- The per-instance AI rate limiter resets when a serverless instance restarts and cannot coordinate across regions.
- AI output is probabilistic. The official category allow-list and explicit user approval keep manual selection authoritative.
- Cursor's free plan is separate from OpenRouter usage.
- Free OpenRouter models can be temporarily rate-limited or unavailable. Add a provider key or switch to a paid model if production reliability is required.
- `openrouter/free` does not guarantee an Anthropic model and is not valid proof of a Claude integration.
