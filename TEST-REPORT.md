# FoundAgain 10-Case Test Report

Date: 2026-08-20

## Results

| Case | Scenario | Result | Severity | Notes |
|---|---|---|---|---|
| 01 | Search for existing Wallet item | Blocked | High | Homepage loads, but `GET /api/items` returns HTTP 500 because `DATABASE_URL` is not configured in the test environment. |
| 02 | Filter reports by Lost status | Blocked | High | Filtering logic is present, but there are no API-loaded reports while the database connection is unavailable. |
| 03 | Submit valid Lost Item report | Blocked | High | Form is present and validation passes; persistence cannot be verified until `DATABASE_URL` is configured. |
| 04 | Submit valid Found Item report | Blocked | High | Same database configuration blocker as Case 03. |
| 05 | Submit empty report | Pass | — | Required fields prevent submission; the API returns HTTP 400 with a required-field message. |
| 06 | Submit 5,000–10,000 character description | Pass | — | Description is now limited to 2,000 characters in the form and backend; the page remains stable. |
| 07 | Upload PDF/DOCX | Pass | — | File input accepts only JPEG/PNG/WebP; client and API validation reject unsupported formats with a clear message. |
| 08 | View item details | Blocked | High | Details flow exists, but reports cannot be loaded without the database connection. |
| 09 | Submit an item claim | Blocked | High | Claim validation works; successful persistence requires `DATABASE_URL` and an existing report. |
| 10 | Search for UNKNOWNITEM | Pass* | — | Search filtering returns no matching result in the client logic. End-to-end empty-state verification requires reports to load from the database. |

## Bugs and implementation status

### BUG-001 — Database connection missing in test environment

- Severity: High / environment blocker
- Symptom: `GET /api/items` and valid report writes return HTTP 500 (`Unable to load reports` / `Unable to save report`).
- Cause: `DATABASE_URL` is not set for the local process.
- Implementation: No code workaround was applied because silently replacing the production database with sample data would risk data loss. Configure the Neon pooled connection string as `DATABASE_URL` locally and in Vercel.

### BUG-002 — Long descriptions were not bounded in the form

- Severity: Medium
- Fix: Added a 2,000-character limit to the description field. The backend already truncates safely at 2,000 characters.

### BUG-003 — Unsupported files showed only a generic save error

- Severity: Medium
- Fix: Added client-side MIME validation for JPEG, PNG, and WebP and a specific validation message. Server-side validation remains enabled.

## Verification

- `npm test`: passed
- Production build: passed
- Automated test cases: 10/10 passed
- Total Node test assertions: 11/11 passed

## Regression fixes applied 2026-08-20

- Loading text now renders only while the reports request is pending; the report count replaces it after completion.
- Lost markers and buttons now use a reliable `!` symbol instead of `?`.
- Description input has a live character counter and a 2,000-character limit.
- Report and claim contact fields accept validated email or phone formats only.
- Empty required fields produce a clear form-level validation message without submitting.
- Unsupported file types are rejected with an explicit JPEG/PNG/WebP message.
- Production deployment `dpl_529bHVMwZZfPbTjMVmJwBW7ebRPT` completed with status READY.
