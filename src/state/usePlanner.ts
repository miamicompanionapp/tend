import { useCallback, useRef, useState } from "react";
import type { CalendarEvent, Goal, PlanQuality } from "../types";
import { seedGoals } from "../data/seed";
import { getMonday, toISODate } from "../lib/date";

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
  const [goals, setGoals] = useState<Goal[]>(() => loadOrSeed(GOALS_KEY, seedGoals));
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadOrSeed<CalendarEvent[]>(EVENTS_KEY, []));
  const [quality, setQualityState] = useState<PlanQuality>(loadQuality);
  const [notes, setNotesState] = useState<string>(() => localStorage.getItem(NOTES_KEY) ?? "");
  const [onboarded, setOnboarded] = useState<boolean>(() => localStorage.getItem(ONBOARDED_KEY) === "1");
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  // Lets regeneratePlan always read the latest goals/quality/notes without
  // needing to be recreated every time any of them changes.
  const goalsRef = useRef(goals);
  goalsRef.current = goals;
  const qualityRef = useRef(quality);
  qualityRef.current = quality;
  const notesRef = useRef(notes);
  notesRef.current = notes;

  const applyEvents = useCallback((next: CalendarEvent[]) => {
    setEvents(next);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(next));
  }, []);

  // Generation is manual only — the user taps "Generate plan" (or
  // Regenerate). We deliberately don't auto-trigger on goal/quality changes
  // anymore: that burned an API call on every small edit before the user
  // was ready to commit to a plan.
  const regeneratePlan = useCallback(async () => {
    setPlanLoading(true);
    setPlanError(null);
    try {
      const startDate = toISODate(getMonday(new Date()));
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals: goalsRef.current,
          startDate,
          days: 7,
          quality: qualityRef.current,
          notes: notesRef.current || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as { events: CalendarEvent[] };
      applyEvents(data.events);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Failed to generate this week's plan");
    } finally {
      setPlanLoading(false);
    }
  }, [applyEvents]);

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
    planLoading,
    planError,
  };
}
