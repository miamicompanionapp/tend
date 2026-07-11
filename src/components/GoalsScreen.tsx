import { useMemo, useState, type CSSProperties } from "react";
import type { Category, Goal, GoalKind, Priority, RepeatFreq, TimePreference } from "../types";
import { describeGoalSchedule } from "../lib/schedule";

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

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "work", label: "Work" },
  { value: "health", label: "Health" },
  { value: "home", label: "Home" },
  { value: "social", label: "Social" },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const KIND_OPTIONS: { value: GoalKind; label: string; hint: string }[] = [
  { value: "fixed", label: "Fixed", hint: "Locked to its time, never moved" },
  { value: "recurring", label: "Recurring", hint: "Repeats, fit in automatically" },
  { value: "flexible", label: "Flexible", hint: "Happens when it happens" },
];

const REPEAT_OPTIONS: { value: RepeatFreq; label: string }[] = [
  { value: "once", label: "Just once" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays (Mon–Fri)" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const TIME_PREFERENCE_OPTIONS: { value: TimePreference; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "any", label: "Any time" },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const inputStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: 8,
  font: "inherit",
  color: "inherit",
  background: "var(--surface)",
  width: "100%",
};

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`segmented-btn${value === opt.value ? " active" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function emptyDraft() {
  return {
    title: "",
    category: "home" as Category,
    priority: "medium" as Priority,
    kind: "flexible" as GoalKind,
    freq: "weekly" as RepeatFreq,
    daysOfWeek: [] as number[],
    timesPerWeek: 1,
    timeMode: "flexible" as "specific" | "flexible",
    startTime: "09:00",
    timePreference: "any" as TimePreference,
    durationMinutes: 30,
  };
}

export function GoalsScreen({
  goals,
  onAdd,
  onRemove,
  notes,
  onNotesChange,
  onGeneratePlan,
  planLoading,
}: {
  goals: Goal[];
  onAdd: (goal: Goal) => void;
  onRemove: (id: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onGeneratePlan: () => void;
  planLoading: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft());

  const grouped = useMemo(
    () => GROUP_ORDER.map((g) => ({ ...g, goals: goals.filter((goal) => goal.kind === g.kind) })),
    [goals],
  );

  function update<K extends keyof ReturnType<typeof emptyDraft>>(key: K, value: ReturnType<typeof emptyDraft>[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDay(day: number) {
    setDraft((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day) ? prev.daysOfWeek.filter((d) => d !== day) : [...prev.daysOfWeek, day].sort((a, b) => a - b),
    }));
  }

  function submitNewGoal() {
    if (!draft.title.trim()) return;

    const repeat =
      draft.freq === "weekly"
        ? draft.daysOfWeek.length > 0
          ? { freq: "weekly" as const, daysOfWeek: draft.daysOfWeek }
          : { freq: "weekly" as const, timesPerWeek: draft.timesPerWeek }
        : { freq: draft.freq };

    onAdd({
      id: `goal-${Date.now()}`,
      title: draft.title.trim(),
      kind: draft.kind,
      category: draft.category,
      priority: draft.priority,
      repeat,
      durationMinutes: draft.durationMinutes,
      ...(draft.timeMode === "specific" ? { startTime: draft.startTime } : { timePreference: draft.timePreference }),
    });
    setDraft(emptyDraft());
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
                  <p className="goal-meta">{describeGoalSchedule(goal)}</p>
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

      <button
        className="btn primary"
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 14 }}
        onClick={onGeneratePlan}
        disabled={planLoading}
      >
        {planLoading && <span className="spinner" style={{ borderColor: "rgba(246,244,238,0.35)", borderTopColor: "#f6f4ee" }} />}
        {planLoading ? "Generating your week…" : "Generate plan"}
      </button>

      {adding ? (
        <div className="goal-card goal-form" style={{ flexDirection: "column", alignItems: "stretch", gap: 14 }}>
          <div>
            <p className="field-label">What is it?</p>
            <input
              placeholder="e.g. Piano practice"
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
              style={inputStyle}
              autoFocus
            />
          </div>

          <div>
            <p className="field-label">Category</p>
            <Segmented options={CATEGORY_OPTIONS} value={draft.category} onChange={(v) => update("category", v)} />
          </div>

          <div>
            <p className="field-label">Priority</p>
            <Segmented options={PRIORITY_OPTIONS} value={draft.priority} onChange={(v) => update("priority", v)} />
          </div>

          <div>
            <p className="field-label">Type</p>
            <Segmented options={KIND_OPTIONS} value={draft.kind} onChange={(v) => update("kind", v)} />
            <p className="field-hint">{KIND_OPTIONS.find((k) => k.value === draft.kind)?.hint}</p>
          </div>

          <div>
            <p className="field-label">Repeats</p>
            <select value={draft.freq} onChange={(e) => update("freq", e.target.value as RepeatFreq)} style={inputStyle}>
              {REPEAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {draft.freq === "weekly" && (
            <div>
              <p className="field-label">On which days?</p>
              <div className="day-picker">
                {DAY_LABELS.map((label, i) => (
                  <button
                    type="button"
                    key={i}
                    className={`day-chip${draft.daysOfWeek.includes(i) ? " active" : ""}`}
                    onClick={() => toggleDay(i)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {draft.daysOfWeek.length === 0 && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="field-hint" style={{ margin: 0 }}>
                    or, times per week:
                  </span>
                  <select
                    value={draft.timesPerWeek}
                    onChange={(e) => update("timesPerWeek", Number(e.target.value))}
                    style={{ ...inputStyle, width: 70 }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        {n}x
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="field-label">When</p>
            <Segmented
              options={[
                { value: "flexible", label: "Time of day" },
                { value: "specific", label: "Specific time" },
              ]}
              value={draft.timeMode}
              onChange={(v) => update("timeMode", v)}
            />
            {draft.timeMode === "specific" ? (
              <input
                type="time"
                value={draft.startTime}
                onChange={(e) => update("startTime", e.target.value)}
                style={{ ...inputStyle, marginTop: 8 }}
              />
            ) : (
              <div style={{ marginTop: 8 }}>
                <Segmented options={TIME_PREFERENCE_OPTIONS} value={draft.timePreference} onChange={(v) => update("timePreference", v)} />
              </div>
            )}
          </div>

          <div>
            <p className="field-label">Duration</p>
            <select
              value={draft.durationMinutes}
              onChange={(e) => update("durationMinutes", Number(e.target.value))}
              style={inputStyle}
            >
              {DURATION_OPTIONS.map((min) => (
                <option key={min} value={min}>
                  {min < 60 ? `${min} min` : `${min / 60} hr${min > 60 ? "s" : ""}`}
                </option>
              ))}
            </select>
          </div>

          <div className="action-row">
            <button
              className="btn secondary"
              onClick={() => {
                setDraft(emptyDraft());
                setAdding(false);
              }}
            >
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

      <div style={{ marginTop: 20 }}>
        <p className="field-label">Anything Tend should know?</p>
        <textarea
          placeholder="e.g. I have two kids, keep mornings flexible. No exercise before 6am."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
        <p className="field-hint">Shared with the planner every time you tap "Generate plan".</p>
      </div>
    </div>
  );
}
