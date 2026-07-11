# Tend — Backlog & Working Notes

Last updated: 2026-07-10
Owner: Abdullah


## WORKING POLICY

- **PUSH STATUS:** Do not `git push` to `origin/master` unless Abdullah explicitly
  says so. Cloudflare Pages auto-deploys on every push to `master` — free tier,
  don't burn builds on speculative or unreviewed commits. Commit locally as
  normal; just hold the push.
- **Hosting:** Cloudflare Pages project `tend` → https://tend-dma.pages.dev,
  same Cloudflare account as `miami-ride-companion`. GitHub repo:
  github.com/miamicompanionapp/tend. Credentials for both live in
  `~/projects/miami-ride-companion/.dev.vars` (GITHUB_API_KEY,
  CLOUDFLARE_PAGES_EDIT_TOKEN) — shared across projects intentionally.
- **Local dev:** `npm run dev` (Vite). `npm run build` outputs `dist/`.


## MVP PLAN (added 2026-07-10)

**Definition of done:** a user adds real goals (not just title + cadence),
gets an actual week schedule generated from those goals by Claude, sees it in
the time-grid Today/Week views, and can tell the Assistant about a disruption
and have it actually change the plan — with nothing left hardcoded to seed
data. Phases below are ranked; work top to bottom.

### Phase 1 — Backend endpoints
1. [x] `/api/generate-plan` (Cloudflare Pages Function, `functions/api/generate-plan.ts`):
       takes `goals[]` + `startDate` (+ optional `days`), calls Claude
       (`claude-opus-4-8`, forced tool call for structured output), returns
       `{ events: CalendarEvent[] }` covering the requested date range —
       expands each goal's `repeat` pattern into concrete dated events and
       auto-adds breakfast/lunch/dinner. DONE 2026-07-10.
2. [x] `/api/replan` (Cloudflare Pages Function, `functions/api/replan.ts`):
       takes `{ message, goals, events }`, calls Claude, returns
       `{ summary, diff: PlanDiffEntry[] }`. `src/lib/replan.ts` already
       pointed at `/api/replan` with a mock fallback — the mock is now only
       used if the endpoint is unreachable. DONE 2026-07-10.
3. [x] Stored `ANTHROPIC_API_KEY` as an encrypted secret on the Pages project
       (`wrangler pages secret put`), not a plaintext build var — same
       gotcha noted in `miami-ride-companion/backlog.txt` (plain vars are
       build-time only and get wiped on redeploy). DONE 2026-07-10. Local
       dev reads the same key from `tend/.dev.vars` (gitignored) via
       `wrangler pages dev`; `wrangler.jsonc` sets `nodejs_compat` (needed
       by `@anthropic-ai/sdk`'s credential-chain module) and points
       `pages_build_output_dir` at `dist`.

### Phase 2 — Goals screen can actually feed a scheduler
4. [x] Extend the Add-goal form in `GoalsScreen.tsx` to capture `kind`,
       `category`, `priority`, and `durationMinutes` — DONE 2026-07-10. Form
       now has category/priority/type segmented pickers, a repeat-frequency
       select (once/daily/weekdays/weekly/monthly), a day-of-week picker or
       "Nx per week" fallback, and specific-time vs. time-of-day-preference
       inputs, calendar-app style.
5. [x] Structured `cadence` — DONE 2026-07-10. Replaced the free-text
       `cadence: string` field with a structured `repeat: Repeat` object
       (`{freq, daysOfWeek?, timesPerWeek?}`) plus `startTime`/`timePreference`
       on `Goal`. Human-readable summaries (e.g. "Tue, Thu · 6:30pm–7pm") are
       derived on demand via `describeGoalSchedule()` in `src/lib/schedule.ts`,
       used for both the goal card and future AI prompt text.

### Phase 3 — Wire real data through the UI
6. [x] Call `/api/generate-plan` when goals change (or on a manual "Regenerate
       week" action) and store the result via `usePlanner` — DONE 2026-07-10.
       `usePlanner` now calls the endpoint on mount and whenever `goals`
       changes (add/remove), storing the real week of events via
       `applyEvents`. `seedEvents` and the hardcoded 2026-07-09 date are
       gone entirely — `src/data/seed.ts` only seeds goals now. Added
       `src/lib/date.ts` (local-timezone-safe ISO date helpers) so
       Today/Week compute the real current date and Monday-start week
       instead of hardcoding "Wed, Jul 9". Added a manual "↻ Regenerate"
       button in the app bar and a loading/error state surfaced on
       Today/Week. `TodayScreen` now filters `events` to just today's date
       (it previously rendered every event with no date filter — harmless
       with one seed day, would've been wrong with a real week). Verified
       via Playwright against `wrangler pages dev`: real dates render,
       today's column highlights in the Week grid, adding a goal
       re-triggers generation.
7. [x] Port the time-grid Week view mock into `WeekScreen.tsx` — DONE
       2026-07-10. Built a shared time-grid: `src/lib/timeGridLayout.ts`
       (pixel positioning by `startTime`/`durationMinutes`, greedy
       overlap-column assignment), `HourRuler.tsx` (hour labels) and
       `DayTrack.tsx` (one day's events, absolutely positioned) used by
       both `TodayScreen.tsx` (single day) and `WeekScreen.tsx`. Resolved
       the open design question below: phone/portrait `WeekScreen` now
       shows a day-strip (tap any day, defaults to today) + that day's
       time-grid, replacing the old "rotate your phone" hint; landscape /
       ≥768px still shows the full 7-column grid. `TodayScreen`'s old flat
       agenda-row list is gone — it's a single-day time-grid now too.
8. [x] Live current-time indicator line on Week/Today — DONE 2026-07-10.
       `src/lib/useNow.ts` re-renders every 60s; `DayTrack` draws a red
       line (`--now-line` CSS var, themed for dark mode) at the correct
       pixel offset whenever the displayed day is today. This is the
       actual code — previously this only existed in a one-off design
       artifact and was never in `WeekScreen.tsx`, which is why it never
       showed up after deploying. Verified via Playwright at 9:30pm local:
       line renders exactly between the 9pm and 10pm gridlines.
9. [ ] Overlap layout: short events (e.g. Lunch) inset over longer ones (e.g.
       Work) instead of stacking flush. Current `layoutDay()` in
       `timeGridLayout.ts` does side-by-side column splitting (a real
       improvement over the old static chip-stack, and correct for
       genuinely concurrent events) but not the "small event insets into
       big event" treatment the mock had — still open.
10. [ ] Wire the Assistant screen's diff-approval flow to actually call
        `applyEvents()` (already exists in `usePlanner.ts`, just unused) —
        see the TODO in `src/components/AssistantScreen.tsx`.

### Phase 4 — Ship & validate
11. [ ] Confirm the Cloudflare Pages "Connect to Git" step was completed
        (GitHub App access was granted 2026-07-10) so pushes actually
        auto-deploy once Abdullah approves a push.
12. [ ] Manual end-to-end test on a phone: add a goal, regenerate the week,
        report a disruption in Assistant, confirm the diff applies.

### Not in MVP scope (parked)
- [ ] Decide whether localStorage-only persistence (`usePlanner.ts`) is
      sufficient long-term or if goals/events need a real backend/sync —
      fine for MVP (single device), revisit after.


## DONE

- [x] Scaffold: React/Vite PWA with goals/today/week/assistant screens —
      DONE 2026-07-09 (commit `f09ccac`)
- [x] Create GitHub repo `miamicompanionapp/tend`, push `master` — DONE 2026-07-09
- [x] Create Cloudflare Pages project `tend`, first deploy live at
      tend-dma.pages.dev — DONE 2026-07-09
- [x] Grant Cloudflare's GitHub App access to the `tend` repo (was previously
      scoped to `miami-ride-companion` only) — DONE 2026-07-10
- [x] Design mock: Week screen as hourly time-grid with current-time line,
      compact short-event labels, and overlap inset handling — DONE 2026-07-10
      (artifact only; ported to real code as Phase 3 #7-8, see above)
- [x] Seed goals cleaned up — dropped "Trim dog's nails" (too specific to be
      a relatable default) in favor of generic mundane-life examples: Work,
      Exercise, Biking, Grocery shopping, Tidy up, Family dinner — DONE
      2026-07-10
- [x] Add-goal form rebuilt with Google-Calendar-style configuration (repeat
      cycle, day picker, specific time or time-of-day preference, duration) —
      DONE 2026-07-10, see Phase 2 #4-5 above


## DESIGN DECISIONS STILL OPEN

- [x] Phone Week view: resolved 2026-07-10 — defaults to a day-strip +
      single-day time-grid (tap any day, defaults to today), not the old
      rotate-hint. See Phase 3 #7.
- [x] Shared layout util: resolved 2026-07-10 — `timeGridLayout.ts` +
      `HourRuler`/`DayTrack` are shared by both `TodayScreen` and
      `WeekScreen`. See Phase 3 #7.
- [ ] Inset amount / shadow strength for overlapping events — tune once the
      "small event insets into big event" treatment (Phase 3 #9) is built;
      current side-by-side column split works but wasn't tuned for that case.
