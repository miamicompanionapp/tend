import { useState } from "react";
import { TabBar, type TabId } from "./components/TabBar";
import { GoalsScreen } from "./components/GoalsScreen";
import { TodayScreen } from "./components/TodayScreen";
import { WeekScreen } from "./components/WeekScreen";
import { AssistantScreen } from "./components/AssistantScreen";
import { usePlanner } from "./state/usePlanner";

const SUBTITLE: Record<TabId, string> = {
  goals: "Goals",
  today: "Wed, Jul 9",
  week: "Jul 6 – 12",
  assistant: "Assistant",
};

function App() {
  const [tab, setTab] = useState<TabId>("today");
  const { goals, events, addGoal, removeGoal } = usePlanner();

  return (
    <div className="app-shell">
      <div className="app-bar">
        <span className="app-name">Tend</span>
        <span className="app-subtitle">{SUBTITLE[tab]}</span>
      </div>
      <div className={`app-content${tab === "assistant" ? " app-content-flush" : ""}`}>
        {tab === "goals" && <GoalsScreen goals={goals} onAdd={addGoal} onRemove={removeGoal} />}
        {tab === "today" && <TodayScreen events={events} />}
        {tab === "week" && <WeekScreen />}
        {tab === "assistant" && <AssistantScreen goals={goals} events={events} />}
      </div>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}

export default App;
