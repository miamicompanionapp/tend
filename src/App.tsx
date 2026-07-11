import { useMemo, useState } from "react";
import { TabBar, type TabId } from "./components/TabBar";
import { GoalsScreen } from "./components/GoalsScreen";
import { TodayScreen } from "./components/TodayScreen";
import { WeekScreen } from "./components/WeekScreen";
import { AssistantScreen } from "./components/AssistantScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { usePlanner } from "./state/usePlanner";
import { addDays, getMonday, todayISODate, toISODate } from "./lib/date";
import { applyDiff } from "./lib/diff";
import type { PlanDiffEntry } from "./types";
import { useLanguage } from "./i18n/LanguageContext";

function App() {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState<TabId>("today");
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
    planLoading,
    planError,
  } = usePlanner();

  const weekStart = useMemo(() => toISODate(getMonday(new Date())), []);
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
    return `${fmt(weekStart)} – ${fmt(addDays(weekStart, 6))}`;
  }, [tab, today, weekStart, locale, t]);

  const handleApplyDiff = (diff: PlanDiffEntry[]) => applyEvents(applyDiff(events, diff));

  if (!onboarded) {
    return (
      <OnboardingScreen
        quality={quality}
        onQualityChange={setQuality}
        notes={notes}
        onNotesChange={setNotes}
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
        <span className="app-name">Tend</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          {(tab === "today" || tab === "week") && (
            <button
              onClick={() => regeneratePlan()}
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
      {planError && (tab === "today" || tab === "week") && (
        <p style={{ margin: 0, padding: "0 16px 10px", fontSize: 11.5, color: "var(--warm)" }}>{t.app.generateError(planError)}</p>
      )}
      <div className={`app-content${tab === "assistant" ? " app-content-flush" : ""}`}>
        {tab === "goals" && (
          <GoalsScreen
            goals={goals}
            onAdd={addGoal}
            onRemove={removeGoal}
            notes={notes}
            onNotesChange={setNotes}
            onGeneratePlan={regeneratePlan}
            planLoading={planLoading}
          />
        )}
        {tab === "today" && <TodayScreen events={events} loading={planLoading} onGeneratePlan={regeneratePlan} />}
        {tab === "week" && <WeekScreen events={events} weekStart={weekStart} onGeneratePlan={regeneratePlan} />}
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
    </div>
  );
}

export default App;
