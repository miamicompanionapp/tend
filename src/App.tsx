import { useMemo, useState } from "react";
import { TabBar, type TabId } from "./components/TabBar";
import { GoalsScreen } from "./components/GoalsScreen";
import { TodayScreen } from "./components/TodayScreen";
import { WeekScreen } from "./components/WeekScreen";
import { AssistantScreen } from "./components/AssistantScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { Logo } from "./components/Logo";
import { Toast, type ToastState } from "./components/Toast";
import { usePlanner } from "./state/usePlanner";
import { addDays, getMonday, todayISODate, toISODate } from "./lib/date";
import { applyDiff } from "./lib/diff";
import type { PlanDiffEntry } from "./types";
import { useLanguage } from "./i18n/LanguageContext";
import { track } from "./lib/analytics";

function App() {
  const { t, lang } = useLanguage();
  const [tab, setTabState] = useState<TabId>("today");
  const setTab = (next: TabId) => {
    track("tab_change", { tab: next });
    setTabState(next);
  };
  const {
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
    weekGenLoading,
  } = usePlanner();

  const [weekOffset, setWeekOffset] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);
  const currentWeekStart = useMemo(() => toISODate(getMonday(new Date())), []);
  const viewedWeekStart = useMemo(() => addDays(currentWeekStart, weekOffset * 7), [currentWeekStart, weekOffset]);
  const today = todayISODate();
  const todayEvents = useMemo(() => events.filter((e) => e.date === today), [events, today]);

  const locale = lang === "tr" ? "tr-TR" : "en-US";
  const subtitle = useMemo(() => {
    if (tab === "goals") return t.tabs.goals;
    if (tab === "assistant") return t.tabs.assistant;
    const fmtDay = (iso: string) =>
      new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
    if (tab === "today") return fmtDay(today);
    const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { month: "short", day: "numeric" });
    return `${fmt(viewedWeekStart)} – ${fmt(addDays(viewedWeekStart, 6))}`;
  }, [tab, today, viewedWeekStart, locale, t]);

  const handleApplyDiff = (diff: PlanDiffEntry[]) => applyEvents(applyDiff(events, diff));

  async function handleRegenerate() {
    const { ok, error } = await regeneratePlan();
    track("plan_generated", { ok, weeks: 4 });
    setToast(
      ok
        ? { type: "success", message: t.toast.planReady, actionLabel: t.toast.viewWeek, onAction: () => { setWeekOffset(0); setTab("week"); } }
        : { type: "error", message: error || t.app.genericPlanError },
    );
  }

  async function handleGenerateFromGoals() {
    const result = await regeneratePlan();
    track("plan_generated", { ok: result.ok, weeks: 4, source: "goals" });
    return result;
  }

  async function handleGenerateWeek(startDate: string) {
    const { ok, error } = await generateWeek(startDate);
    track("week_generated", { ok });
    setToast(
      ok
        ? { type: "success", message: t.toast.weekReady, actionLabel: t.toast.viewWeek, onAction: () => setTab("week") }
        : { type: "error", message: error || t.app.genericPlanError },
    );
  }

  if (!onboarded) {
    return (
      <OnboardingScreen
        quality={quality}
        onQualityChange={setQuality}
        onComplete={() => {
          completeOnboarding();
          setTab("goals");
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="app-bar">
        <span className="app-name" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Logo size={22} />
          Tend
        </span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          {(tab === "today" || tab === "week") && (
            <button
              onClick={handleRegenerate}
              disabled={planLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                border: "none",
                background: "none",
                color: "var(--accent)",
                fontSize: 11,
                fontWeight: 600,
                cursor: planLoading ? "default" : "pointer",
                padding: 0,
                opacity: planLoading ? 0.6 : 1,
              }}
            >
              {planLoading && <span className="spinner" />}
              {planLoading ? t.app.planning : `↻ ${t.app.regenerate}`}
            </button>
          )}
          <span className="app-subtitle">{subtitle}</span>
        </div>
      </div>
      <div className={`app-content${tab === "assistant" ? " app-content-flush" : ""}`}>
        {tab === "goals" && (
          <GoalsScreen
            goals={goals}
            onAdd={addGoal}
            onRemove={removeGoal}
            notes={notes}
            onNotesChange={setNotes}
            onGeneratePlan={handleGenerateFromGoals}
            onViewWeek={() => { setWeekOffset(0); setTab("week"); }}
            planLoading={planLoading}
          />
        )}
        {tab === "today" && <TodayScreen events={events} loading={planLoading} onGeneratePlan={handleRegenerate} />}
        {tab === "week" && (
          <WeekScreen
            events={events}
            weekStart={viewedWeekStart}
            weekOffset={weekOffset}
            onPrevWeek={() => setWeekOffset((o) => o - 1)}
            onNextWeek={() => setWeekOffset((o) => o + 1)}
            onGeneratePlan={handleRegenerate}
            onGenerateWeek={handleGenerateWeek}
            weekGenLoading={weekGenLoading}
          />
        )}
        {tab === "assistant" && (
          <AssistantScreen
            goals={goals}
            events={todayEvents}
            notes={notes}
            onApplyDiff={handleApplyDiff}
            quality={quality}
            onQualityChange={setQuality}
          />
        )}
      </div>
      <TabBar active={tab} onChange={setTab} />
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export default App;
