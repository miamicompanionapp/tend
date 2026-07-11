import { useMemo, useState } from "react";
import { TabBar, type TabId } from "./components/TabBar";
import { GoalsScreen } from "./components/GoalsScreen";
import { TodayScreen } from "./components/TodayScreen";
import { WeekScreen } from "./components/WeekScreen";
import { AssistantScreen } from "./components/AssistantScreen";
import { usePlanner } from "./state/usePlanner";
import { addDays, getMonday, todayISODate, toISODate } from "./lib/date";
import { applyDiff } from "./lib/diff";
import type { PlanDiffEntry } from "./types";

function App() {
  const [tab, setTab] = useState<TabId>("today");
  const { goals, events, quality, setQuality, addGoal, removeGoal, applyEvents, regeneratePlan, planLoading, planError } =
    usePlanner();

  const weekStart = useMemo(() => toISODate(getMonday(new Date())), []);
  const today = todayISODate();
  const todayEvents = useMemo(() => events.filter((e) => e.date === today), [events, today]);

  const subtitle = useMemo(() => {
    if (tab === "goals") return "Goals";
    if (tab === "assistant") return "Assistant";
    const fmtDay = (iso: string) =>
      new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (tab === "today") return fmtDay(today);
    const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(weekStart)} – ${fmt(addDays(weekStart, 6))}`;
  }, [tab, today, weekStart]);

  const handleApplyDiff = (diff: PlanDiffEntry[]) => applyEvents(applyDiff(events, diff));

  return (
    <div className="app-shell">
      <div className="app-bar">
        <span className="app-name">Tend</span>
        <span className="app-subtitle">{subtitle}</span>
      </div>
      {(tab === "today" || tab === "week") && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 10px", gap: 10 }}>
          <div className="quality-toggle">
            <button className={quality === "careful" ? "active" : ""} onClick={() => setQuality("careful")}>
              Careful
            </button>
            <button className={quality === "fast" ? "active" : ""} onClick={() => setQuality("fast")}>
              Fast
            </button>
          </div>
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
            {planLoading ? "Planning…" : "↻ Regenerate"}
          </button>
        </div>
      )}
      {planError && (tab === "today" || tab === "week") && (
        <p style={{ margin: 0, padding: "0 16px 10px", fontSize: 11.5, color: "var(--warm)" }}>
          Couldn't generate plan: {planError}
        </p>
      )}
      <div className={`app-content${tab === "assistant" ? " app-content-flush" : ""}`}>
        {tab === "goals" && <GoalsScreen goals={goals} onAdd={addGoal} onRemove={removeGoal} />}
        {tab === "today" && <TodayScreen events={events} loading={planLoading} />}
        {tab === "week" && <WeekScreen events={events} weekStart={weekStart} />}
        {tab === "assistant" && <AssistantScreen goals={goals} events={todayEvents} onApplyDiff={handleApplyDiff} />}
      </div>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}

export default App;
