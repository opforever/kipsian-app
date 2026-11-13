# KIPSIAN Web

The KIPSIAN student & parent portal, rebuilt for the browser. Same data, same accounts —
`students.kips.edu.pk/api/v1` — no new database, no sync jobs.

React 19 + Vite + Tailwind v4 + TypeScript.

## Why there is a proxy

The KIPS API answers without an `Access-Control-Allow-Origin` header, so a browser on any
other domain cannot call it directly (preflight returns 204 but with no ACAO). Every call
therefore goes through `api/proxy/[...path].ts`, a serverless function that pipes the request
to KIPS and returns the JSON unchanged. Locally the same paths are proxied by Vite.

| Browser calls | Proxied to |
| --- | --- |
| `/api/proxy/v1/*` | `https://students.kips.edu.pk/api/v1/*` |
| `/api/proxy/legacy/*` | `https://377.kips.edu.pk/apis/portal/students/*` (adds `X-API-KEY`) |

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173  (Vite proxies /api/* to KIPS)
```

Sign in with any student/parent registration number issued by the campus.

`npm run preview` serves the built bundle **without** the proxy, so use `npm run dev` or
`vercel dev` when you need API calls locally.

## What has been verified end-to-end

* Login with a real registration number → dashboard renders live attendance, fees, challans,
  timetable and alerts (96%, Rs 28,332 due, 2 open challans, 5 periods today).
* All seven screens load against the live API; the timetable grid parses `sosLectureDays`
  (`1-6` → Mon–Sat) and highlights the current period.
* 401 → refresh → retry works; a failing refresh no longer signs you out (only an explicit
  401/403 from `/auth/refresh-token` does).
* Duplicate challans returned by the ERP (same `cId` twice) are collapsed in the client, and
  overdue challans are flagged from `cDueDate`.
* Responsive down to 390 px: rail collapses to a top bar + bottom tab bar.

During testing the API went down for ~20 minutes (`DatabaseError` on every endpoint, including
login). The screens were finished against those same captured responses replayed from a local
mock; final verification was re-run against the live API once it recovered.

## Deploy to Vercel

1. `vercel` (or import the repo in the Vercel dashboard). Framework auto-detects as **Vite**;
   `api/proxy/[...path].ts` is picked up as a function automatically.
2. Optional env var `KIPS_API_KEY` — the key the legacy PHP endpoints expect. A working value
   is already the fallback in `vite.config.ts` and `api/proxy/[...path].ts`.
3. Done. No database, no build step beyond `npm run build`, nothing to sync.

## Screens

| Route | Data source |
| --- | --- |
| `/login` | `POST /auth/login` |
| `/` overview | attendance, fee, challans, timetable, notifications (parallel, partial failures tolerated) |
| `/attendance` | `/attendance/get-attendance`, `/attendance/get-attendance-history` |
| `/fees` | `/fee/get-fee`, `/fee/get-fee-history`, `/challan/get-all-challans` + IPG checkout link |
| `/timetable` | `/timetable/get-timetable` (Mon–Sat grid from `sosLectureDays`) |
| `/calendar` | legacy `api_academic_calendar.php` — weekly plan per subject |
| `/results` | `/test/get-test` + campus mark sheet (`rpt-roster-result-card-all-ptm.php`) |
| `/leave` | `GET /leave`, `POST /leave` (apply) |
| `/notifications` | `/notifications`, `/notice-board/get-notifications` |
| `/profile` | `/auth/get-logged-in-user`, `/notification-token/get-notification-status`, `POST /auth/change-password` |

## How the missing endpoints were recovered

The Android app builds these URLs at runtime, so the parameters were worked out by probing the
live services (read-only) and cross-checking the APK's string table:

* **Academic calendar** (`api_academic_calendar.php`, POST + `X-API-KEY`) needs
  `programId`, `disciplineId`, `term`, `board`, `sosType`, `subjectId`, `date`, `session`.
  Two non-obvious bits: `board` must be **`PB`** (Punjab Board — taken from
  `api_student_details.php`, not `FBISE`), and `session` is the **ERP row id `26`**, not the
  year `2026` (`2026` returns `session not found`). `sessionIdFor()` maps 2026 → 26.
* **Mark sheet**: `rpt-roster-result-card-all-ptm.php?vs=<secNo>&vsession=<year>&oauth_token=…`
  where `vs` is the numeric **section id** (`user.secNo`). The app sends `vs=0`, which is why its
  WebView pulls the entire campus (33 MB); the section form is 2.5 MB.
* **Leave**: `POST /leave` takes the raw ERP field names —
  `aLeaveDateFrom`, `aLeaveDateTo`, `aLeaveDescription`, `aLeaveReason`, `aLeaveType`
  (discovered by walking the validation chain, one 400 at a time). The campus currently answers
  **403 "You are not allowed to create leaves."** for student accounts, so the form submits and
  surfaces that message; flip it on server-side and it starts working.

## Session handling

Access + refresh JWTs from the login response are kept in `localStorage`
(`kipsian.session.v1`). A 401 triggers `POST /auth/refresh-token` once and retries the
call; if the refresh fails the session is dropped and the user is sent to `/login`.
Sign out clears the store — the API has no revoke endpoint.

## Not wired up

* **Push notifications** — web push would need a separate subscription store; the app's FCM
  token model does not apply to browsers.
* **Suggestions / surveys / app rating** — endpoints exist (`/suggestions*`, `/feedback-*`),
  screens not built (both return empty lists for this account today).
* **Shop (books & uniforms)** — marketing links only (`kipspublications.com`, `uniformers.pk`).
* **Report-card JSON endpoint** (`…-ptm-json.php`) — still rejects every parameter combination
  we could derive; the HTML sheet covers the same need.

## Rate limits

The API throttles ~5,000 requests / 15 min per IP. On Vercel every visitor shares the
function's egress IP, so the ceiling is shared. A page load is 3–6 calls; fine for a campus,
but if you expect thousands of concurrent users ask the backend team to allow-list the
Vercel origin (`Access-Control-Allow-Origin` + `authorization` in
`Access-Control-Allow-Headers`) and drop the proxy.