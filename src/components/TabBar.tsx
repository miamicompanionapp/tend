import { useLanguage } from "../i18n/LanguageContext";

export type TabId = "goals" | "today" | "week" | "assistant";

export function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  const { t } = useLanguage();
  const tabs: { id: TabId; label: string }[] = [
    { id: "goals", label: t.tabs.goals },
    { id: "today", label: t.tabs.today },
    { id: "week", label: t.tabs.week },
    { id: "assistant", label: t.tabs.assistant },
  ];

  return (
    <nav className="tab-bar">
      {tabs.map((tab) => (
        <button key={tab.id} className={tab.id === active ? "active" : ""} onClick={() => onChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
