# Tend — Backlog & Working Notes

Last updated: 2026-07-11
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
9. [x] Overlap layout: short events inset over longer ones — DONE 2026-07-10.
       `layoutDay()` now finds, per overlap cluster, a "host" event (≥120
       min) that fully contains a short event (≤60 min) and renders the
       short one as a smaller layered card over the host's right edge
       (`.day-track-event.inset` — elevated z-index + shadow) instead of
       splitting both into half-width columns. Events that don't fit that
       host/short-guest pattern (e.g. two genuinely concurrent meetings)
       still use the side-by-side column split from #7. Verified visually:
       Lunch now insets into Work instead of shrinking it to half width.
10. [x] Wire the Assistant screen's diff-approval flow to actually call
        `applyEvents()` — DONE 2026-07-10. `PlanDiffEntry` gained an
        optional `event` field (the resulting `CalendarEvent` state) —
        required for "moved"/"added", omitted for "cancelled"/"kept".
        `/api/replan`'s schema and system prompt updated to require it.
        New `src/lib/diff.ts` (`applyDiff`) turns a diff into a new events
        array: cancelled → filtered out, moved/added → upserted by id,
        kept → no-op. `AssistantScreen` takes an `onApplyDiff` prop wired
        in `App.tsx` to `applyEvents(applyDiff(events, diff))`, and posts
        an "Applied — your calendar is updated." confirmation bubble.
        Verified end-to-end via Playwright: sent a vet-emergency
        disruption, clicked Apply, confirmed Today actually re-rendered
        with Exercise moved 17:30→18:00 and a new "Emergency vet visit"
        event added — this exercises "moved" and "added" both applying
        correctly in one real Claude response, not just the mock.

**Phase 3 complete.**

13. [x] Generate-plan latency fix — DONE 2026-07-11. Live testing found
        `/api/generate-plan` legitimately takes 24-29s on `claude-opus-4-8`
        for a full week (confirmed via direct curl + Playwright against
        prod, not a client bug — the request does complete, it's just
        slow with no feedback). Fixed two ways:
        - **Loading UX**: `TodayScreen`'s empty-loading state now shows a
          spinner + honest copy ("this can take up to 30 seconds") instead
          of static unchanging text that reads as frozen. Added a `.spinner`
          CSS class (reused on the app-bar Regenerate button too).
        - **Quality toggle**: new `PlanQuality` ("careful" | "fast") on
          `GeneratePlanRequest`, persisted in `usePlanner` (localStorage
          `tend.planQuality`), sent with every generate-plan call.
          `functions/api/generate-plan.ts` maps careful→`claude-opus-4-8`,
          fast→`claude-sonnet-5`. New `.quality-toggle` segmented control
          in the app bar (Today/Week tabs only), changing it re-triggers
          generation like a goal change does. Measured in testing:
          careful ~24.3s, fast ~18.6s — a real but modest gain, not
          dramatic; some of the latency floor is inherent to generating
          ~40-60 structured events regardless of model.

### Phase 4 — Ship & validate
11. [ ] Confirm the Cloudflare Pages "Connect to Git" step was completed
        (GitHub App access was granted 2026-07-10) so pushes actually
        auto-deploy once Abdullah approves a push.
12. [ ] Manual end-to-end test on a phone: add a goal, regenerate the week,
        report a disruption in Assistant, confirm the diff applies.

### Phase 5 — Pre-beta polish (requested 2026-07-11)
14. [ ] Preserve Assistant chat history. `turns` in `AssistantScreen.tsx` is
        local component state — switching tabs or reloading loses the whole
        conversation. Persist it (localStorage, same pattern as
        goals/events in `usePlanner.ts`) so it survives navigation/reload.
15. [ ] Show a loading spinner in the Assistant chat itself after the user
        sends a message, until the `/api/replan` response arrives. Right
        now the only feedback is the composer's send button going disabled
        — nothing in the conversation flow signals "thinking."
17. [x] Onboarding + manual-only generation — DONE 2026-07-11. Auto-generation
        was too eager: it fired on mount and on every goal/quality change,
        burning an API call before the user had finished setting things up.
        Reworked the whole first-run and generation flow:
        - **Onboarding**: new `OnboardingScreen.tsx`, shown once (localStorage
          `tend.onboarded`) before the tab UI. Explains the 3-step flow (set
          goals → tap Generate plan → tell the Assistant when life happens),
          and lets the user set their quality preference and "planning
          notes" up front. "Let's set up your goals" completes onboarding
          and lands on the Goals tab.
        - **Manual generation only**: removed the `useEffect` in
          `usePlanner.ts` that auto-called `regeneratePlan()` on mount and
          on every goals/quality change. Generation now only happens when
          the user explicitly taps a button. Verified via Playwright: no
          `/api/generate-plan` request fires during onboarding, right after
          completing it, or on visiting an empty Today/Week.
        - **Generate plan button**: added to `GoalsScreen.tsx` as the
          primary CTA below the goal list (goals → review → generate is
          the intended order). `TodayScreen`/`WeekScreen` also show a
          "Generate plan" button in their empty state as a convenience
          shortcut, so a user who already has goals set doesn't have to
          detour through Goals just to trigger it. The header's manual
          "↻ Regenerate" link (Today/Week) is unchanged — still a one-tap
          re-run once a plan exists.
        - **Quality toggle relocated**: moved from the Today/Week app-bar
          into `AssistantScreen.tsx` (top of the chat), since that's where
          the user is thinking about plan behavior, not on every calendar
          view. Toggling it only updates the stored preference — it no
          longer triggers a regeneration itself (supersedes that part of
          Phase 3 item 13).
        - **Planning notes**: new `notes` field in `usePlanner`
          (localStorage `tend.planningNotes`), editable from both
          onboarding and a persistent textarea on the Goals screen ("Anything
          Tend should know?"). Sent as `GeneratePlanRequest.notes` on every
          generate-plan call; `functions/api/generate-plan.ts`'s system
          prompt now includes it as an instruction Claude should follow
          when it doesn't conflict with a fixed/locked goal.
16. [ ] Tapping an event box in the calendar (Today/Week time-grid) should
        open a popup/detail card with the full event info (title, category,
        exact time range, duration, locked/auto-added status). Small
        time-grid blocks (especially inset ones) truncate their title —
        users sometimes can't tell what a short bubble actually is without
        this.
20. [x] Assistant replan correctness bugs — DONE 2026-07-11, reported by
        Abdullah with a real transcript: asked for a 6-9pm art exhibit
        while dinner (5:30-7pm) and a rideshare shift (7:30pm-1:30am)
        already existed. Tend moved dinner to 4:15pm — in the past, since
        it was already past 5pm — then in a follow-up turn claimed the
        current time was "16:52" (fabricated) and never actually resolved
        the rideshare/exhibit overlap across 3 turns. Three real bugs, all
        fixed:
        - **No time grounding.** `/api/replan` never told Claude what time
          it actually was — it only had the user's message text to infer
          from, so it hallucinated a "current time" instead of reading a
          clock. Added `ReplanRequest.now` (local `YYYY-MM-DDTHH:mm` via
          new `lib/date.ts` `nowLocalISO()`), sent on every Assistant
          message. The system prompt states it as ground truth and
          explicitly forbids scheduling anything before it.
        - **Forced tool_choice suppressed reasoning.** Grounding alone
          wasn't enough — first attempt still moved dinner into the past
          even with `now` in the prompt. Root cause: `tool_choice: {type:
          "tool", ...}` forces an immediate structured answer with no
          deliberation. Switched to `tool_choice: "auto"` + `thinking:
          {type: "adaptive"}` and added an explicit self-check instruction
          ("work through the arithmetic... if a first attempt lands in the
          past, it's invalid, find a real slot"). Verified this was the
          fix, not just the grounding — same test scenario, dinner now
          correctly lands after the exhibit (9-10:30pm) instead of before
          "now".
        - **No conversation memory.** Each Assistant message was a fully
          independent request — the backend never saw what it had
          previously proposed, which is why the "it's already 4:55"
          follow-up produced a non-sequitur (Claude had no idea what
          "4:15" referred to). Added `ReplanRequest.history` (prior turns
          as plain user/assistant content, diffs serialized to text via
          `describeDiffForHistory()`, noting whether each was actually
          applied), threaded from `AssistantScreen.tsx` through to real
          multi-turn `messages[]` in `functions/api/replan.ts`.
        - **Bonus fix, same investigation**: diff-card before/after text
          was free text Claude wrote itself and drifted in format
          (`"5:30 PM–7:00 PM"` in one turn, `"2026-07-11 17:30"` in
          another). `AssistantScreen.tsx` now computes before/after
          display purely from the actual event data (new
          `schedule.ts` `formatEventSlot()`) instead of trusting the AI's
          strings for anything except the reason text.
        - Verified end-to-end via Playwright reproducing the reported
          scenario almost exactly (art exhibit vs. dinner vs. rideshare,
          real device clock ~5:10pm): dinner and rideshare both land after
          the exhibit, nothing overlaps, nothing is scheduled in the past.
21. [x] Planning notes weren't sent to replan — DONE 2026-07-11, flagged by
        Abdullah asking whether a standing preference like "never go to bed
        later than 2 AM" would actually reach the Assistant when resolving
        a conflict. It didn't: `ReplanRequest` had no `notes` field,
        `AssistantScreen` didn't even receive `notes` as a prop, so
        onboarding/Goals-page preferences only ever influenced the initial
        `/api/generate-plan` call and were invisible to every disruption
        message after that. Added `notes` to `ReplanRequest`, threaded
        `usePlanner`'s `notes` through `App.tsx` → `AssistantScreen.tsx` →
        `requestReplan`, and `functions/api/replan.ts`'s system prompt now
        includes them as standing constraints the disruption-resolution
        logic must also respect. Verified via curl with a "never past 2
        AM" note: the assistant explicitly cited "your 2 AM cutoff" and
        moved a 6-hour shift to the next day entirely, instead of the
        previous behavior of pushing it to end at 4:30am.
22. [x] Moved "Generate plan" CTA on the Goals screen — DONE 2026-07-11,
        requested by Abdullah. Was directly under the goal list, above
        "+ Add a goal"; now sits at the very bottom, after the "Anything
        Tend should know?" notes textarea, so notes are naturally filled
        in before generating rather than being easy to miss above the fold.
18. [x] PWA install gate — DONE 2026-07-11. Ported the same pattern used in
        `miami-ride-companion` (a full-screen "add to home screen" page that
        auto-hides once the app is actually installed), adapted to React:
        - `src/lib/pwa.ts`: `isRunningAsPwa()` checks
          `matchMedia('(display-mode: standalone)')`,
          `navigator.standalone` (iOS Safari's legacy flag), and a
          `tend.installGateBypass` localStorage flag. Also `detectPlatform()`
          (ios/android/desktop via UA, incl. iPadOS-in-desktop-mode) and
          `detectAndroidBrowser()` (chrome/samsung/firefox/edge).
        - `src/components/InstallGate.tsx`: wraps `<App />` in `main.tsx`,
          so it gates everything (including onboarding) until installed.
          Shows platform tabs (+ a browser `<select>` on Android) with
          tailored numbered install steps, auto-detected but user-
          overridable — same UX shape as the miami-companion gate.
        - **Deviation from miami-companion on purpose**: that app has no
          visible skip (only a hidden 5-tap-icon secret + a `pwa-bypass`
          key nothing ever sets). Tend adds a plain, always-visible
          "Continue in browser instead" link that sets the bypass flag —
          reasonable for pre-beta testers who may be on desktop/testing
          contexts where installing isn't practical. Flag this to Abdullah;
          revert to a hard block (matching miami-companion exactly) if
          that's not wanted.
        - Verified via Playwright: Android UA → Chrome steps shown by
          default, switching to iOS/Desktop tabs swaps instructions
          correctly; "Continue in browser" hides the gate; a mocked
          `display-mode: standalone` media query also hides it without
          touching the bypass flag.
19. [x] English + Turkish language support — DONE 2026-07-11. Reviewed the
        whole app for user-facing strings and added a proper i18n layer:
        - `src/i18n/translations.ts`: a single `en` object covering every
          static string in the app (tabs, install gate, onboarding, goals
          form, today/week, assistant, weekday names, mock replan fallback
          — ~130 keys), plus a `tr` object typed as `typeof en` so
          TypeScript itself enforces the two languages stay in sync — a
          missing/extra key in `tr` is a compile error, not a runtime gap.
        - `src/i18n/LanguageContext.tsx`: React context (`useLanguage()` →
          `{ lang, setLang, t }`), persisted to localStorage
          (`tend.language`).
        - `src/components/LanguagePicker.tsx`: shown before anything else
          (even the install gate) on first visit — "English" / "Türkçe"
          buttons in their own language (chicken-and-egg: can't localize
          the picker asking which language to use). Wired in `main.tsx` as
          the outermost gate: LanguagePicker → InstallGate → Onboarding →
          App.
        - Every component swept to replace hardcoded strings with `t.*`
          calls: `TabBar`, `InstallGate`, `OnboardingScreen`, `GoalsScreen`
          (biggest one — all form labels/options moved from module-level
          consts to per-render arrays built from `t`), `TodayScreen`,
          `WeekScreen`, `AssistantScreen`, `HourRuler`. `lib/schedule.ts`
          and `lib/date.ts` now take a `lang` param (weekday names, time
          format — Turkish uses 24-hour "14:30", English keeps "2:30pm").
        - Seed goals (`data/seed.ts`) are now `getSeedGoals(lang)` with a
          Turkish variant, not just the UI chrome — caught in testing when
          "Biking"/"Tidy up" showed up untranslated in an otherwise-Turkish
          plan (correct behavior given the AI is told not to translate
          user-authored goal titles, but wrong since seed goals should
          count as app content, not user content).
        - **Backend also honors language**, not just static UI: `Lang`
          added to `GeneratePlanRequest`/`ReplanRequest`, threaded through
          `usePlanner`/`AssistantScreen`. `functions/api/generate-plan.ts`
          and `functions/api/replan.ts` both add a language instruction to
          their system prompts (explicitly: translate generated text, but
          never the user's own goal/event titles) and generate-plan uses
          localized meal names (Kahvaltı/Öğle Yemeği/Akşam Yemeği) instead
          of relying on the free-form instruction alone for those three
          fixed labels.
        - Verified end-to-end via Playwright in Turkish: language picker →
          install gate → onboarding → goals form → generate plan → Today
          grid (24-hour times, Turkish meal names, Turkish seeded goal
          titles) → Assistant disruption message in Turkish → fluent
          Turkish AI response and diff card. English flow re-verified for
          regression after the refactor.
        - Known minor rough edge: Claude's dynamically-generated text
          (Assistant reasons, invented event titles) occasionally mixes in
          an English word or mangles a Turkish diacritic (e.g. "İş" → "Is"
          in one run) — inherent LLM variance, not a bug in the string
          dictionary; worth a follow-up prompt tune if it shows up often
          in real use, not blocking for pre-beta.

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
