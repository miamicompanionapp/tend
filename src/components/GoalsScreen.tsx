import { useMemo, useState } from "react";
import type { Goal, GoalKind } from "../types";

const DOT_COLOR: Record<Goal["category"], string> = {
  work: "var(--accent)",
  health: "var(--good)",
  home: "var(--warm)",
  social: "var(--accent)",
  human: "var(--muted)",
};

const CHIP_CLASS: Record<GoalKind, string> = {
  fixed: "chip-fixed",
  recurring: "chip-recurring",
  flexible: "chip-flexible",
};

const GROUP_ORDER: { kind: GoalKind; label: string }[] = [
  { kind: "fixed", label: "Fixed" },
  { kind: "recurring", label: "Recurring" },
  { kind: "flexible", label: "Flexible" },
];

export function GoalsScreen({
  goals,
  onAdd,
  onRemove,
}: {
  goals: Goal[];
  onAdd: (goal: Goal) => void;
  onRemove: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [cadence, setCadence] = useState("");

  const grouped = useMemo(
    () => GROUP_ORDER.map((g) => ({ ...g, goals: goals.filter((goal) => goal.kind === g.kind) })),
    [goals],
  );

  function submitNewGoal() {
    if (!title.trim()) return;
    onAdd({
      id: `goal-${Date.now()}`,
      title: title.trim(),
      kind: "flexible",
      category: "home",
      priority: "medium",
      cadence: cadence.trim() || "as needed",
    });
    setTitle("");
    setCadence("");
    setAdding(false);
  }

  return (
    <div>
      {grouped.map((group) =>
        group.goals.length === 0 ? null : (
          <div key={group.kind}>
            <p className="goal-group-label">{group.label}</p>
            {group.goals.map((goal) => (
              <div className="goal-card" key={goal.id}>
                <span className="goal-dot" style={{ background: DOT_COLOR[goal.category] }} />
                <div className="goal-body">
                  <p className="goal-title">{goal.title}</p>
                  <p className="goal-meta">{goal.cadence}</p>
                </div>
                <span className={`goal-chip ${CHIP_CLASS[goal.kind]}`}>
                  {goal.priority === "high" ? "High priority" : goal.kind === "fixed" ? "Fixed" : goal.priority === "low" ? "Low priority" : "Flexible"}
                </span>
                <button className="goal-remove" onClick={() => onRemove(goal.id)} aria-label={`Remove ${goal.title}`}>
                  ×
                </button>
              </div>
            ))}
          </div>
        ),
      )}

      {adding ? (
        <div className="goal-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
          <input
            placeholder="Goal title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 8, font: "inherit" }}
            autoFocus
          />
          <input
            placeholder="Cadence, e.g. 2x per week"
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
            style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 8, font: "inherit" }}
          />
          <div className="action-row">
            <button className="btn secondary" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button className="btn primary" onClick={submitNewGoal}>
              Add goal
            </button>
          </div>
        </div>
      ) : (
        <button
          className="add-goal"
          onClick={() => setAdding(true)}
          style={{
            width: "100%",
            marginTop: 14,
            border: "1.5px dashed var(--line)",
            borderRadius: 16,
            padding: 13,
            textAlign: "center",
            fontSize: 13,
            color: "var(--muted)",
            fontWeight: 600,
            background: "none",
            cursor: "pointer",
          }}
        >
          + Add a goal or commitment
        </button>
      )}
    </div>
  );
}
