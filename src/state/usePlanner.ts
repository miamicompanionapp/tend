import { useCallback, useRef, useState } from "react";
import type { CalendarEvent, Goal, PlanQuality } from "../types";
import { addDays, getMonday, toISODate } from "../lib/date";
import { replaceRange } from "../lib/planMerge";
import { useLanguage } from "../i18n/LanguageContext";

const PLAN_HORIZON_WEEKS = 4;

const GOALS_KEY = "tend.goals";
const EVENTS_KEY = "tend.events";
const QUALITY_KEY = "tend.planQuality";
const NOTES_KEY = "tend.planningNotes";
const ONBOARDED_KEY = "tend.onboarded";

function loadOrSeed<T>(key: string, seed: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return seed;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

function loadQuality(): PlanQuality {
  return localStorage.getItem(QUALITY_KEY) === "fast" ? "fast" : "careful";
}

export function usePlanner() {
  const { lang, t } = useLanguage();
  const langRef = useRef(lang);
  langRef.current = lang;
  const tRef = useRef(t);
  tRef.current = t;
  const [goals, setGoals] = useState<Goal[]>(() => loadOrSeed<Goal[]>(GOALS_KEY, []));
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadOrSeed<CalendarEvent[]>(EVENTS_KEY, []));
  const [quality, setQualityState] = useState<PlanQuality>(loadQuality);
  const [notes, setNotesState] = useState<string>(() => localStorage.getItem(NOTES_KEY) ?? "");
  const [onboarded, setOnboarded] = useState<boolean>(() => localStorage.getItem(ONBOARDED_KEY) === "1");
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [weekGenLoading, setWeekGenLoading] = useState<string | null>(null);

  // Lets regeneratePlan/generateWeek always read the latest goals/quality/notes/events
  // without needing to be recreated every time any of them changes.
  const goalsRef = useRef(goals);
  goalsRef.current = goals;
  const qualityRef = useRef(quality);
  qualityRef.current = quality;
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const applyEvents = useCallback((next: CalendarEvent[]) => {
    setEvents(next);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(next));
  }, []);

  const requestPlan = useCallback(async (startDate: string, days: number, existingEvents?: CalendarEvent[]): Promise<CalendarEvent[]> => {
    const res = await fetch("/api/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goals: goalsRef.current,
        startDate,
        days,
        quality: qualityRef.current,
        notes: notesRef.current || undefined,
        language: langRef.current,
        existingEvents,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || `Request failed (${res.status})`);
    }
    const data = (await res.json()) as { events: CalendarEvent[] };
    return data.events;
  }, []);

  // Generation is manual only — the user taps "Generate plan" (or
  // Regenerate). We deliberately don't auto-trigger on goal/quality changes
  // anymore: that burned an API call on every small edit before the user
  // was ready to commit to a plan.
  //
  // Covers the next PLAN_HORIZON_WEEKS weeks with one request per week
  // (rather than one big multi-week request) to stay well under the model's
  // output token limit, feeding each week's results forward as
  // `existingEvents` so goals like "once a month" aren't scheduled again in
  // a later week that has no idea the first occurrence already happened.
  const regeneratePlan = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    setPlanLoading(true);
    setPlanError(null);
    try {
      const baseMonday = toISODate(getMonday(new Date()));
      let working = eventsRef.current;
      let context: CalendarEvent[] = [];
      for (let w = 0; w < PLAN_HORIZON_WEEKS; w++) {
        const weekStart = addDays(baseMonday, w * 7);
        const weekEvents = await requestPlan(weekStart, 7, context);
        working = replaceRange(working, weekEvents, weekStart, 7);
        context = [...context, ...weekEvents];
      }
      applyEvents(working);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : tRef.current.app.genericPlanError;
      setPlanError(message);
      return { ok: false, error: message };
    } finally {
      setPlanLoading(false);
    }
  }, [applyEvents, requestPlan]);

  /** Fills in a single week that's within the plan horizon but wasn't generated yet, without touching any other week. */
  const generateWeek = useCallback(
    async (weekStart: string): Promise<{ ok: boolean; error?: string }> => {
      setWeekGenLoading(weekStart);
      setPlanError(null);
      try {
        const weekEvents = await requestPlan(weekStart, 7, eventsRef.current);
        applyEvents(replaceRange(eventsRef.current, weekEvents, weekStart, 7));
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : tRef.current.app.genericPlanError;
        setPlanError(message);
        return { ok: false, error: message };
      } finally {
        setWeekGenLoading(null);
      }
    },
    [applyEvents, requestPlan],
  );

  const setQuality = useCallback((next: PlanQuality) => {
    setQualityState(next);
    localStorage.setItem(QUALITY_KEY, next);
  }, []);

  const setNotes = useCallback((next: string) => {
    setNotesState(next);
    localStorage.setItem(NOTES_KEY, next);
  }, []);

  const completeOnboarding = useCallback(() => {
    setOnboarded(true);
    localStorage.setItem(ONBOARDED_KEY, "1");
  }, []);

  const addGoal = useCallback((goal: Goal) => {
    setGoals((prev) => {
      const next = [...prev, goal];
      localStorage.setItem(GOALS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeGoal = useCallback((id: string) => {
    setGoals((prev) => {
      const next = prev.filter((g) => g.id !== id);
      localStorage.setItem(GOALS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return {
    goals,
    events,
    quality,
    setQuality,
    notes,
    setNotes,
    onboarded,
    completeOnboarding,
    addGoal,
    removeGoal,
    applyEvents,
    regeneratePlan,
    generateWeek,
    planLoading,
    planError,
    weekGenLoading,
  };
}
