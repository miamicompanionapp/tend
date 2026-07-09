// TODO: derive this from `goals` + the scheduling engine once it exists.
// For now it's a static illustration of the week-grid layout described in the mockup.
const WEEK = [
  { label: "MON", chips: [{ t: "Work", c: "" }, { t: "Run", c: "health" }, { t: "Tidy", c: "home" }] },
  { label: "TUE", chips: [{ t: "Work", c: "" }, { t: "Tidy", c: "home" }] },
  { label: "WED", today: true, chips: [{ t: "Work", c: "" }, { t: "Run", c: "health" }, { t: "Tidy", c: "home" }] },
  { label: "THU", chips: [{ t: "Work", c: "" }, { t: "Nails", c: "home" }, { t: "Tidy", c: "home" }] },
  { label: "FRI", chips: [{ t: "Work", c: "" }, { t: "Run", c: "health" }, { t: "Tidy", c: "home" }] },
  { label: "SAT", chips: [{ t: "Biking", c: "health" }, { t: "Dinner — wife", c: "social" }] },
  { label: "SUN", chips: [{ t: "Tidy", c: "home" }] },
];

export function WeekScreen() {
  return (
    <div>
      <div className="week-portrait-hint">
        <p style={{ fontSize: 13, color: "var(--ink-soft)", maxWidth: "22ch", margin: 0 }}>
          The week view needs a bit more room. Rotate your phone to see it.
        </p>
      </div>
      <div className="week-grid">
        {WEEK.map((day) => (
          <div className={`week-day${day.today ? " today" : ""}`} key={day.label}>
            <span className="week-day-label">{day.label}</span>
            {day.chips.map((chip, i) => (
              <span className={`week-chip ${chip.c}`} key={i}>
                {chip.t}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
