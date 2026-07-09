import { useCallback, useState } from "react";
import type { CalendarEvent, Goal } from "../types";
import { seedEvents, seedGoals } from "../data/seed";

const GOALS_KEY = "tend.goals";
const EVENTS_KEY = "tend.events";

function loadOrSeed<T>(key: string, seed: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return seed;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

export function usePlanner() {
  const [goals, setGoals] = useState<Goal[]>(() => loadOrSeed(GOALS_KEY, seedGoals));
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadOrSeed(EVENTS_KEY, seedEvents));

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

  const applyEvents = useCallback((next: CalendarEvent[]) => {
    setEvents(next);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(next));
  }, []);

  return { goals, events, addGoal, removeGoal, applyEvents };
}
