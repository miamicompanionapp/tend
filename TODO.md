# Session log

Running log of work done per session. Newest first.

## 2026-07-13

**Calendar duration picker** — `src/components/GoalsScreen.tsx`
- Replaced the capped 15–120 min duration dropdown with separate hour (0–10) / minute (00/15/30/45) selects, so events longer than 2h can be entered.

**App icon / logo** — `public/favicon.svg`, `src/components/Logo.tsx`
- Replaced the old off-brand purple favicon with a new teal sprout mark matching the app's actual accent color.
- Added a reusable `<Logo>` component and wired it into the app-bar, language picker, and install gate (previously plain text / an emoji placeholder).

**Assistant composer full-width fix** — `src/index.css`
- `.app-content-flush` was `display: flex` with no `flex-direction`, defaulting to `row` and shrinking the Assistant screen (and its composer) to content width. Added `flex-direction: column`.

**Persistent AI request logging + analytics + admin page**
- Provisioned a Cloudflare D1 database (`tend-db`), bound as `DB` in `wrangler.jsonc`. Schema in `migrations/0001_init.sql`: `ai_request_logs` (full request/response body, model, quality, success, duration, timestamp) and `analytics_events` (event name, properties, session id).
- `functions/api/generate-plan.ts` and `functions/api/replan.ts` log every request/response via `context.waitUntil` (non-blocking, best-effort).
- New `functions/api/track.ts` + `src/lib/analytics.ts` (`track()`, fire-and-forget via `sendBeacon`) — wired into tab changes, goal add/remove, assistant message sent/diff applied, onboarding completion, install-gate bypass, and plan/week generation outcomes.
- New token-gated admin page at `/?admin=1` (`src/components/AdminScreen.tsx`, `functions/api/admin/logs.ts`, `functions/api/admin/analytics.ts`) — lists raw AI request logs (expandable full JSON) and analytics event counts/recent stream. Token lives in `.dev.vars` (`ADMIN_TOKEN`) and as a Cloudflare Pages secret.
- Added `npm run dev:functions` (`wrangler pages dev --proxy 5173 -- npm:dev`) for local full-stack testing — not yet gotten working end-to-end in this sandbox (see Follow-ups).

**Rolling 4-week plan**
- `regeneratePlan()` now generates 4 weeks ahead (one request per week, not one 28-day request, to stay under the model's output token limit), feeding each week's results forward as `existingEvents` context so "once a month" goals aren't duplicated across weeks.
- New `generateWeek(weekStart)` fills in a single missing week without touching any other week (`src/lib/planMerge.ts#replaceRange`).
- Both return `{ ok, error }` directly instead of only setting state, so callers can react to the outcome immediately.

**Week navigation + sticky header** — `src/components/WeekScreen.tsx`, `src/App.tsx`, `src/index.css`
- Added `‹ ›` navigation around the day-strip (portrait) and week-header (wide), backed by a lifted `weekOffset` state in `App.tsx`.
- Day-strip/header row is now `position: sticky` so it stays visible while the hour grid scrolls.
- Per-week empty states: "Generate this week" CTA when the viewed week is within the 4-week horizon and unplanned; a plain "not planned"/"too far ahead" message otherwise (no CTA past the horizon or in the past).

**Dynamic hour grid** — `src/lib/timeGridLayout.ts`, `HourRuler.tsx`, `DayTrack.tsx`, `TodayScreen.tsx`, `WeekScreen.tsx`
- Grid now defaults to 6:00–23:00 and widens outward (floor/ceil) to fit any event that starts earlier or ends later, instead of silently clipping it.

**Generation success/failure toast** — `src/components/Toast.tsx`, `src/App.tsx`
- Plan/week generation now shows a dismissible toast on completion (success with a "View week" CTA, or failure with the error message) instead of the spinner just vanishing with no feedback.

**Scheduling-conflict self-correction** — `functions/api/generate-plan.ts`, new `functions/api/_lib/conflicts.ts`, `functions/api/_lib/replanCore.ts`
- Added a deterministic overlap checker (`findOverlaps`) run against every generated plan.
- If conflicts are found, retries in-conversation (up to 2 times) by sending Claude a `tool_result` describing exactly which events overlap and asking it to fix only those.
- If conflicts still remain, falls back to `replan.ts`'s own conflict-resolution prompt/schema (extracted into shared `_lib/replanCore.ts` so both routes use the same logic) — treats the leftover overlaps as a synthetic disruption and applies the resulting diff.
- Every attempt (retries used, whether the fallback fired) is captured in the `ai_request_logs` row for that generation.

### Follow-ups / not yet done
- `npm run dev:functions` (wrangler pages dev) hung on networking in this sandbox — worked fine via plain `wrangler pages dev dist` for schema/migration purposes, but full request-serving wasn't verified locally end-to-end. Worth a real test on a normal machine.
- No automated tests exist for the conflict-retry loop or `replaceRange` merge logic — verified via typecheck + build + manual Playwright screenshots only.
