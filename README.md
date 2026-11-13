# KIPSIAN Web — student & parent portal for the browser

A web rebuild of the KIPSIAN Android app (`com.kipsedupk.spa`, Flutter) for KIPS Colleges.
It reuses the existing backend — **`https://students.kips.edu.pk/api/v1`** plus the legacy PHP
services on `377.kips.edu.pk` — so there is no new database, no migration and no sync job.
Sign-in uses the same registration number and password as the mobile app.

Stack: **React 19 · Vite 7 · TypeScript 5.9 · Tailwind v4 · lucide-react · react-router 7**.
~3,400 lines across 21 source files. Production bundle ≈ 346 kB JS / 105 kB gzip.

---

## Read this first (handover notes)

| Thing | Where |
| --- | --- |
| Web app (this repo) | `/home/opforever/kipsian-web` |
| Android APK + extracted analysis | `/home/opforever/extracted_app/com.kipsedupk.spa-Kj_iPCZcDlYSpE4KR3XGgQ==` |
| — security review of the app | `…/KIPSIAN-security-review.md` |
| — what a logged-in account can pull | `…/KIPSIAN-post-login-data.md` |
| — a live session token | `…/.auth.json` (mode 600, access 24 h / refresh 30 d) |
| Scratch (APK unpack, `libapp_strings.txt`, captured API JSON, screenshots, replay mock) | `/home/opforever/.hermes/cache/scratch` — **pruned after 24 h**, re-derive if needed |

Commands:

```bash
cd /home/opforever/kipsian-web
npm install
npm run dev      # http://localhost:5173 — Vite proxies /api/* to KIPS
npx tsc --noEmit # typecheck (also runs as part of build)
npm run build    # tsc + vite build → dist/
vercel           # deploy (framework auto-detects; the api/ function ships with it)
```

`bun` is **not** installed on this box; use npm. `npm run preview` does **not** proxy `/api`,
so API calls only work under `npm run dev` or `vercel dev`.

Test accounts (both from `RMB1.pdf` in the APK folder — passwords deliberately not copied here):

* **Student** — username is the registration number (`26-4-9-1-1574857`), password from the
  `Student Password` column.
* **Parent** — username is the **guardian's CNIC _with dashes_** (`37405-4395094-1`, not
  `3740543950941` — the undashed form returns `User does not exists.`), password from the
  `Parent Password` column. `userType` is case-sensitive: `parent`.

⚠️ **Parent payload shape**: for `userType: 'parent'` the top-level `user` object comes back
**empty** — every field is `null`. The child record lives in `users[]` (43 fields, same shape as a
student's). `api.ts` therefore stores `users[0]` as `session.user` and keeps the guardian in
`session.guardian`; the sidebar shows a child switcher when `users.length > 1`.

---

## Architecture: why there is a serverless proxy

The KIPS API sends **no `Access-Control-Allow-Origin`** header. Preflight (`OPTIONS`) returns
204 with `Access-Control-Allow-Methods`/`Allow-Headers` but no ACAO, and `authorization` is not in
the allowed headers — so a browser on any other origin (Vercel, a college subdomain, localhost)
cannot call the API directly. Everything therefore goes through a thin pipe:

| Browser calls | Forwarded to | Notes |
| --- | --- | --- |
| `/api/proxy/v1/*` | `https://students.kips.edu.pk/api/v1/*` | `Authorization` passed through |
| `/api/proxy/legacy/*` | `https://377.kips.edu.pk/apis/portal/students/*` | adds `X-API-KEY` server-side |

* On Vercel: one function `api/proxy.ts`. **It is not a catch-all file** — `vercel.json` rewrites
  `/api/proxy/:ns/:path*` → `/api/proxy?ns=:ns&p=:path`, and the function reads `ns`/`p` (falling
  back to parsing `req.url`, so a direct hit also works). See *Deployment notes* below for why.
* `api/ping.ts` is a canary: `curl https://<site>/api/ping` must return `{"ok":true}`. If it 404s,
  the functions are not deploying at all — check the build log for a typecheck error.
* Locally: Vite `server.proxy` in `vite.config.ts` with the same two routes
  (`KIPS_API_TARGET` / `KIPS_LEGACY_TARGET` env vars can point it at a mock or staging).
* **If the backend team ever allow-lists the web origin**, the proxy can be dropped by changing
  the two constants at the top of `src/lib/api.ts`.
* Cost of the proxy: every visitor shares the function's egress IP, and the API throttles
  ~5,000 req / 15 min **per IP**. A page load is 3–6 calls, fine for a campus; ask for an
  allow-list before a high-traffic launch.

---

## File map

```
api/proxy/[...path].ts     serverless pass-through proxy (+ X-API-KEY for legacy)
src/lib/api.ts             fetch client, token store, refresh, every endpoint wrapper, sessionIdFor()
src/lib/types.ts           response shapes for the v1 API
src/lib/format.ts          money/date/label helpers, friendlyError(), lectureDays()
src/lib/hooks.ts           useAsync(fn, deps) — loading/error/reload
src/lib/useSession.ts      subscribes to the session store
src/components/Shell.tsx   sidebar rail, mobile top bar, bottom tabs + "More" sheet
src/components/ui.tsx      Card, Stat, Ring, Pill, Progress, Avatar, EmptyState, ErrorNote, Skeleton
src/pages/*.tsx            Login, Dashboard, Attendance, Fees, Timetable, AcademicCalendar,
                           Results, Leave, Notifications, Profile
src/styles.css             Tailwind v4 @theme tokens + .card/.input/.btn component classes
public/                    KIPS mark + app icon (lifted from the APK assets)
screenshots/               captured screens (see list at the bottom)
```

Routing lives in `src/App.tsx`: `/login` is public, everything else is wrapped in `<Guard>` →
`<Shell>` with an `<Outlet/>`.

---

## API reference (as used by this app)

Base: `https://students.kips.edu.pk/api/v1`. Every response is
`{ statusCode, isSuccess, error: { name, property, message }, data }` — success is
`isSuccess === true`, and `error.property` names the offending field on validation failures.

| Method | Path | Body / query | Returns |
| --- | --- | --- | --- |
| POST | `/auth/login` | `{userType: 'student'\|'parent', username, password}` | `{user, users[], userType, tokenData{token,iat,exp}, refreshTokenData{…}}` |
| POST | `/auth/refresh-token` | `{refreshToken}` | same `tokenData` / `refreshTokenData` shape |
| POST | `/auth/change-password` | `{oldPassword, newPassword, confirmPassword}` | — |
| POST | `/auth/change-password-for-first-time` | exists in the app; **not used here** | — |
| GET | `/auth/get-logged-in-user` | — | `{user, users[], userType}` — 56-field student record |
| GET | `/attendance/get-attendance` | — | `{totalPresents, totalAbsents, totalLeaves, totalAttendance}` |
| GET | `/attendance/get-attendance-history` | — | `[{attDatetime, attStatus: 'P'\|'A'\|'L'}]` |
| GET | `/fee/get-fee` | — | `{totalFee, paidFee}` |
| GET | `/fee/get-fee-history` | — | `[{feeDate, feeNo, feeReceivedAmount, feeBalance, feeSessionId}]` |
| GET | `/challan/get-all-challans` | — | `[{cNo, cId, cRefNo, cMonth, cDueDate, cExpiryDate, cGrandTotal, isPaid, canPayChallan, …}]` |
| GET | `/timetable/get-timetable` | — | `[{secId, sosScheduleRoomNumber, lecture1…lecture9}]`, each lecture `{subTitle, sFName, sLName, sosLectureDays, sosScheduleTimeStart/End}` |
| GET | `/notifications` | — | `[{tfnId, tfnTitle, tfnBody, tfnCreated, tfnStatus}]` |
| GET | `/notice-board/get-notifications` | — | same shape |
| GET | `/notification-token/get-notification-status` | — | `[{sfntDeviceType, sfntDeviceId, sfntSendPushNotifications, …}]` |
| GET | `/test/get-test` | — | `{testTotalMarks, testObtainedMarks, testResults:{subjects[], rows[], subjectTotals[], grandTotal}}` |
| GET | `/leave` | — | `[leave]` (empty for the test account) |
| POST | `/leave` | `{aLeaveDateFrom, aLeaveDateTo, aLeaveDescription, aLeaveReason, aLeaveType}` | **403 for students — see below** |
| DELETE | `/leave/{id}` | — | 403 "You are not allowed to delete leaves." |
| GET | `/suggestions/rating-status` | — | `{hasRated, rating, detail}` |
| GET | `/feedback-main/get-active-forms` | — | `[]` today |

Legacy PHP (POST, `X-API-KEY` header, via `/api/proxy/legacy`):

| Path | Body | Returns |
| --- | --- | --- |
| `api_student_details.php` | `{reg, applicantNo, sessionId}` | `{board: 'PB', term, sos_type, subjects[9]{subjectId, subjectTitle}}` |
| `api_academic_calendar.php` | see below | `{subjectId, subject, week, weekStart, weekEnd, lectures, courseCoverage, testDue, coCurricular{...}}` |

Other hosts the app touches: `ipg.kips.edu.pk/bop/checkoutPage.php` (Bank of Punjab checkout,
opened in a new tab), `377.kips.edu.pk/{cl,ec,fr,sc}/rpt-roster-result-card-all-ptm.php` (mark sheet).

### Auth details

* Login returns **two JWTs**: access (24 h) and refresh (30 d), claims
  `{username, userType, type: access|refresh, iat, exp}`.
* Client sends `Authorization: Bearer <access>`; on 401 it calls `/auth/refresh-token` once and
  retries. **Only an explicit 401/403 from the refresh endpoint ends the session** — a 5xx or a
  DB hiccup must not sign the user out (this bug was hit for real during the API outage).
* Session persists in `localStorage` under `kipsian.session.v1` (`{user, users, userType, token,
  tokenExp, refresh, refreshExp}`). Sign-out clears it; the API has **no revoke endpoint**, so a
  stolen token lives until expiry.

---

## Recovered parameters (the non-obvious part)

The Flutter app composes these URLs at runtime, so the contracts were recovered by reading the
APK's Dart string table and then probing the live services (read-only, validation-first).

**Academic calendar** — `session` is the **ERP row id, not the year**: `26`, not `2026`
(`2026` → `session not found`; ids 6, 8, 12–31 are valid). `board` must be **`PB`** (Punjab
Board, comes from `api_student_details.php` — `FBISE` fails). `sessionIdFor()` maps 2026 → 26.
One call per subject; returns the plan for the week containing `date`.

**Mark sheet** — `…/rpt-roster-result-card-all-ptm.php?vs=<secNo>&vsession=<year>&oauth_token=<token>`
where **`vs` is the numeric section id** (`user.secNo`, e.g. 108317). The app sends `vs=0`, which
returns the whole campus (33 MB). With the section id it is 2.5 MB and contains the student's
sheet; `vroll` makes no difference. The `oauth_token` is a hardcoded literal in the APK.

**Leave** — body keys are raw ERP column names (`aLeaveDateFrom` … `aLeaveType`). Submission is
currently refused: `403 "You are not allowed to create leaves."` for student accounts; the UI
surfaces that message verbatim. Enable it in the ERP and the form starts working with no change.

---

## Screen behaviour worth knowing

* **Overview** — six calls in one `Promise.allSettled`, so a single failing endpoint doesn't blank
  the page; if *all* fail the error state shows instead of zeros, and a partial failure shows a
  "may be out of date" banner. Shows the current period (from timetable) highlighted, recent
  absences, next installment and last attendance mark.
* **Attendance** — ring from `presents/totalAttendance`, day-by-day list grouped by month.
  Note the upstream counters are inconsistent (below), so the UI avoids implying arithmetic.
* **Fees** — `get-all-challans` is de-duplicated by `cId` (the ERP really returns some rows
  twice), overdue challans are flagged from `cDueDate`, "Pay now" opens the IPG page in a new tab.
* **Timetable** — grid built from `sosLectureDays` (`"1-6"` = Mon–Sat, `"1-3"`, `"0"` = none),
  break rows shown when a slot has times but no subject, today's column highlighted.
* **Calendar** — subject chips + week stepping, per `(subjectId, date)` in-memory cache because
  the endpoint takes ~2.5 s. `date` is the anchor for the week; the response carries weekStart/End.
* **Results** — subject totals from `/test/get-test` (all zero for this account until papers are
  posted) plus the campus mark-sheet link.
* **Leave** — client validation mirrors the app: end ≥ start, neither date on a Sunday.
* **Profile** — masked guardian CNIC with reveal, device row from the notification-token endpoint,
  change password (12+ chars, upper/lower/digit/symbol) which signs out on success.
* **Mobile** — desktop rail collapses to a top bar + 5 tabs (Overview, Attendance, Fees, Results,
  More); "More" is a bottom sheet with Timetable, Calendar, Leave, Notifications, Profile, Sign out.

---

## Design system

* Brand palette pulled from the APK icon: brand `#1878C0` / `#2D8ECC` family, canvas `#F1F6FB`,
  ink `#0C2A3E`…`#4A6C83`, gold `#F2B21B` for warnings, good/bad greens/reds for status.
  Tokens live in `src/styles.css` under `@theme`; use `bg-brand-600`, `text-ink-500`, `shadow-soft`.
* Inter (Google Fonts), tabular numerals via `.tnum` on money/dates.
* Reusable classes: `.card`, `.input`, `.label`, `.btn-primary`, `.btn-ghost`, `.chip`, `.nav-link`.
* Components: `Stat` (label/value/hint/icon/optional progress + target marker), `Ring`, `Pill`,
  `Progress`, `Avatar` (photo only if `aPic` is an absolute URL, else initials), `EmptyState`,
  `ErrorNote`, `Skeleton`.
* 22 px radii, 1 px `#E2ECF5` borders, soft two-layer shadows; reduced-motion respected.

---

## Known upstream quirks (not our bugs)

1. **Attendance counters don't add up**: `totalPresents 24`, `totalAbsents 7`,
   `totalAttendance 25` → the app's own 96 % comes from `presents/totalAttendance`. The web shows
   the same percentage and labels the counters as register entries rather than doing arithmetic.
2. **Challan list contains duplicates** (same `cId`, e.g. `012641035592`) — de-duped in `api.ts`.
3. **Challan status lags the ledger**: two "open" challans (2 × Rs 28,334) versus a ledger balance
   of Rs 28,332; receipts show one of them as already paid. UI labels the balance and the open
   count separately and notes that challan status is synced from the ERP.
4. **`aPic` is a bare filename** (`img_1574857_1793853218_4297.jpg`); the app builds the URL at
   runtime and that base was not recoverable (8 plausible bases 404'd), so avatars fall back to
   initials. **Needs one line from the Flutter source.**
5. **API availability**: during this build the whole API returned
   `400 {"error":{"name":"DatabaseError","message":"Database operation failed. Please try again later."}}`
   for ~20 minutes, including login. `friendlyError()` maps it to "KIPS servers are busy…".
6. **Legacy PHP is slow** (~2.5 s per calendar call) and unversioned; treat its strings as stable
   but brittle.

---

## Verified vs not

Verified live against the real API (see `screenshots/`): login, overview numbers, attendance,
fees + challans, timetable, results, notifications, profile, academic calendar, mark-sheet link.
The 401 → refresh → retry path was exercised; the session-drop bug was found and fixed under a
real outage.

Not verified / not built:

* **Leave submission** — code path correct, server answers 403 for students.
* **`…-ptm-json.php`** — every parameter combination tried returns `Missing required parameters`;
  the HTML sheet is used instead.
* **Push notifications** — FCM tokens don't apply to browsers; needs Web Push + a subscription store.
* **Suggestions / surveys / app rating** — endpoints exist, screens not built (empty for this account).
* **Shop (books & uniforms)** — links only.
* **Multi-child switcher** — built (sidebar `<select>` when `users.length > 1`), but no account
  with two children has been tested.
* **Forced first-login password change** — the web shows a dismissible banner instead of blocking.

---

## Screenshots

`02-fees.png` was captured during the API outage and `06-profile.png` from the replay mock, so
neither is a live-data shot; everything else is live. `05-mobile.png` is the 390 px layout.

| File | Screen |
| --- | --- |
| `01-overview.png` | dashboard, live data |
| `02-fees.png` | fees (replayed data) |
| `03-timetable.png` | weekly grid with break + free cells |
| `04-attendance.png` | attendance ring + month groups |
| `05-mobile.png` | mobile dashboard, bottom tabs |
| `06-profile.png` | profile + change password (replayed data) |
| `07-results.png` | results before the mark-sheet card was added |
| `08-calendar.png` | academic calendar, week 2 · Physics |
| `09-leave.png` | leave form open |
| `10-results-marksheet.png` | results + campus mark-sheet link |

## Probing rules (if more endpoints are needed)

* Prefer **validation-first probing**: send `{}` (or one deliberately invalid field) and read
  `error.property` — the API names the next required field. That is how the leave body and the
  calendar params were recovered without creating any records.
* Never POST a fully valid leave/feedback/suggestion payload against a real student account — it
  creates records. Keep one field invalid so the request is rejected at validation.
* Keep volume low: 5,000 req / 15 min per IP is a global cap, and the legacy PHP has no obvious
  limit but is shared infrastructure.
* The APK's Dart strings are the source of truth for literal paths: unpack `base.apk`, then
  `strings libapp.so` (the `split_config.x86_64.apk` holds it). `blutter` **cannot** decompile the
  x86_64 snapshot (`Unsupport architecture: EM_X86_64`) — an arm64 split is needed for that.