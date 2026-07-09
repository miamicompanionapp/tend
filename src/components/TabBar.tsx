export type TabId = "goals" | "today" | "week" | "assistant";

const TABS: { id: TabId; label: string }[] = [
  { id: "goals", label: "Goals" },
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "assistant", label: "Assistant" },
];

export function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav className="tab-bar">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={t.id === active ? "active" : ""}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
