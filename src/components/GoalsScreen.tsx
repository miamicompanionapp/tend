import { useState, type CSSProperties } from "react";
import type { Category, Goal, GoalKind, Priority, RepeatFreq, TimePreference } from "../types";
import { describeGoalSchedule } from "../lib/schedule";
import { useLanguage } from "../i18n/LanguageContext";

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

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

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
  const { t, lang } = useLanguage();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft());

  const GROUP_ORDER: { kind: GoalKind; label: string }[] = [
    { kind: "fixed", label: t.goals.groupFixed },
    { kind: "recurring", label: t.goals.groupRecurring },
    { kind: "flexible", label: t.goals.groupFlexible },
  ];

  const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
    { value: "work", label: t.goals.categoryWork },
    { value: "health", label: t.goals.categoryHealth },
    { value: "home", label: t.goals.categoryHome },
    { value: "social", label: t.goals.categorySocial },
  ];

  const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
    { value: "low", label: t.goals.priorityLow },
    { value: "medium", label: t.goals.priorityMedium },
    { value: "high", label: t.goals.priorityHigh },
  ];

  const KIND_OPTIONS: { value: GoalKind; label: string; hint: string }[] = [
    { value: "fixed", label: t.goals.typeFixed, hint: t.goals.typeFixedHint },
    { value: "recurring", label: t.goals.typeRecurring, hint: t.goals.typeRecurringHint },
    { value: "flexible", label: t.goals.typeFlexible, hint: t.goals.typeFlexibleHint },
  ];

  const REPEAT_OPTIONS: { value: RepeatFreq; label: string }[] = [
    { value: "once", label: t.goals.repeatOnce },
    { value: "daily", label: t.goals.repeatDaily },
    { value: "weekdays", label: t.goals.repeatWeekdays },
    { value: "weekly", label: t.goals.repeatWeekly },
    { value: "monthly", label: t.goals.repeatMonthly },
  ];

  const TIME_PREFERENCE_OPTIONS: { value: TimePreference; label: string }[] = [
    { value: "morning", label: t.timePreference.morning },
    { value: "afternoon", label: t.timePreference.afternoon },
    { value: "evening", label: t.timePreference.evening },
    { value: "any", label: t.timePreference.any },
  ];

  const chipLabel = (goal: Goal): string =>
    goal.priority === "high"
      ? t.goals.chipHighPriority
      : goal.kind === "fixed"
        ? t.goals.chipFixed
        : goal.priority === "low"
          ? t.goals.chipLowPriority
          : t.goals.chipFlexible;

  const grouped = GROUP_ORDER.map((g) => ({ ...g, goals: goals.filter((goal) => goal.kind === g.kind) }));

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
                  <p className="goal-meta">{describeGoalSchedule(goal, lang)}</p>
                </div>
                <span className={`goal-chip ${CHIP_CLASS[goal.kind]}`}>{chipLabel(goal)}</span>
                <button className="goal-remove" onClick={() => onRemove(goal.id)} aria-label={t.goals.removeAria(goal.title)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        ),
      )}

      {adding ? (
        <div className="goal-card goal-form" style={{ flexDirection: "column", alignItems: "stretch", gap: 14 }}>
          <div>
            <p className="field-label">{t.goals.formTitleLabel}</p>
            <input
              placeholder={t.goals.formTitlePlaceholder}
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
              style={inputStyle}
              autoFocus
            />
          </div>

          <div>
            <p className="field-label">{t.goals.categoryLabel}</p>
            <Segmented options={CATEGORY_OPTIONS} value={draft.category} onChange={(v) => update("category", v)} />
          </div>

          <div>
            <p className="field-label">{t.goals.priorityLabel}</p>
            <Segmented options={PRIORITY_OPTIONS} value={draft.priority} onChange={(v) => update("priority", v)} />
          </div>

          <div>
            <p className="field-label">{t.goals.typeLabel}</p>
            <Segmented options={KIND_OPTIONS} value={draft.kind} onChange={(v) => update("kind", v)} />
            <p className="field-hint">{KIND_OPTIONS.find((k) => k.value === draft.kind)?.hint}</p>
          </div>

          <div>
            <p className="field-label">{t.goals.repeatsLabel}</p>
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
              <p className="field-label">{t.goals.daysLabel}</p>
              <div className="day-picker">
                {t.weekday.narrow.map((label, i) => (
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
                    {t.goals.timesPerWeekPrefix}
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
            <p className="field-label">{t.goals.whenLabel}</p>
            <Segmented
              options={[
                { value: "flexible", label: t.goals.timeOfDay },
                { value: "specific", label: t.goals.specificTime },
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
            <p className="field-label">{t.goals.durationLabel}</p>
            <select
              value={draft.durationMinutes}
              onChange={(e) => update("durationMinutes", Number(e.target.value))}
              style={inputStyle}
            >
              {DURATION_OPTIONS.map((min) => (
                <option key={min} value={min}>
                  {min < 60 ? t.goals.durationMin(min) : t.goals.durationHr(min / 60)}
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
              {t.goals.cancel}
            </button>
            <button className="btn primary" onClick={submitNewGoal}>
              {t.goals.addGoal}
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
            border: "none",
            borderRadius: 16,
            padding: 16,
            textAlign: "center",
            fontSize: 14.5,
            color: "#f6f4ee",
            fontWeight: 700,
            background: "var(--accent)",
            cursor: "pointer",
          }}
        >
          {t.goals.addGoalCta}
        </button>
      )}

      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <p className="field-label">{t.goals.notesLabel}</p>
        <textarea
          placeholder={t.goals.notesPlaceholder}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
        <p className="field-hint">{t.goals.notesHint}</p>
      </div>

      <button
        className="btn primary"
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        onClick={onGeneratePlan}
        disabled={planLoading}
      >
        {planLoading && <span className="spinner" style={{ borderColor: "rgba(246,244,238,0.35)", borderTopColor: "#f6f4ee" }} />}
        {planLoading ? t.goals.generating : t.goals.generatePlan}
      </button>
      <p className="field-hint" style={{ textAlign: "center" }}>
        {t.goals.generateHint}
      </p>
    </div>
  );
}
