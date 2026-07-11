import { useCallback, useEffect, useRef, useState } from "react";
import type { CalendarEvent, Goal, PlanQuality } from "../types";
import { seedGoals } from "../data/seed";
import { getMonday, toISODate } from "../lib/date";

const GOALS_KEY = "tend.goals";
const EVENTS_KEY = "tend.events";
const QUALITY_KEY = "tend.planQuality";

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
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  // Lets regeneratePlan always read the latest goals/quality without needing
  // to be recreated (and re-triggered) every time either changes.
  const goalsRef = useRef(goals);
  goalsRef.current = goals;
  const qualityRef = useRef(quality);
  qualityRef.current = quality;

  const applyEvents = useCallback((next: CalendarEvent[]) => {
    setEvents(next);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(next));
  }, []);

  const regeneratePlan = useCallback(async () => {
    setPlanLoading(true);
    setPlanError(null);
    try {
      const startDate = toISODate(getMonday(new Date()));
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: goalsRef.current, startDate, days: 7, quality: qualityRef.current }),
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

  // Regenerate whenever the goal list or quality preference changes —
  // including the first mount, so nothing is left showing stale/hardcoded
  // seed events.
  useEffect(() => {
    regeneratePlan();
  }, [goals, quality, regeneratePlan]);

  return { goals, events, quality, setQuality, addGoal, removeGoal, applyEvents, regeneratePlan, planLoading, planError };
}
