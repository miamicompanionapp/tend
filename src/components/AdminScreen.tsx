import { useEffect, useState } from "react";

const TOKEN_KEY = "tend.adminToken";

interface AiLogRow {
  id: string;
  endpoint: string;
  model: string | null;
  quality: string | null;
  request_body: string | null;
  response_body: string | null;
  success: number;
  error: string | null;
  duration_ms: number | null;
  created_at: string;
  session_id: string | null;
  user_agent: string | null;
}

interface AnalyticsEventRow {
  id: string;
  event_name: string;
  properties: string | null;
  session_id: string | null;
  created_at: string;
}

interface AnalyticsSummaryRow {
  event_name: string;
  count: number;
}

/** Short "Browser / OS" label parsed from a User-Agent string, for telling sessions apart at a glance. */
function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return "unknown device";
  const ua = userAgent;
  const os = /iphone|ipad/i.test(ua) ? "iOS" : /android/i.test(ua) ? "Android" : /mac os x/i.test(ua) ? "macOS" : /windows/i.test(ua) ? "Windows" : /linux/i.test(ua) ? "Linux" : "unknown OS";
  const browser = /edg\//i.test(ua) ? "Edge" : /chrome\//i.test(ua) ? "Chrome" : /crios/i.test(ua) ? "Chrome" : /firefox\//i.test(ua) ? "Firefox" : /safari\//i.test(ua) ? "Safari" : "unknown browser";
  return `${browser} / ${os}`;
}

function sessionShort(sessionId: string | null): string {
  return sessionId ? sessionId.slice(0, 8) : "no-session";
}

const page: React.CSSProperties = {
  minHeight: "100%",
  background: "#111",
  color: "#e8e8e8",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12.5,
  padding: 16,
};

const button: React.CSSProperties = {
  background: "#2a2a2a",
  color: "#e8e8e8",
  border: "1px solid #444",
  borderRadius: 6,
  padding: "6px 12px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 12.5,
};

async function authedFetch(path: string, token: string): Promise<Response> {
  return fetch(path, { headers: { "x-admin-token": token } });
}

function TokenGate({ onUnlock }: { onUnlock: (token: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div style={page}>
      <p style={{ marginTop: 40 }}>Enter admin token</p>
      <div style={{ display: "flex", gap: 8, maxWidth: 360 }}>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && value && onUnlock(value)}
          style={{ flex: 1, background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: 6, padding: "6px 10px", fontFamily: "inherit" }}
        />
        <button style={button} onClick={() => value && onUnlock(value)}>
          Unlock
        </button>
      </div>
    </div>
  );
}

function JsonBlock({ label, raw }: { label: string; raw: string | null }) {
  if (!raw) return null;
  let pretty = raw;
  try {
    pretty = JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    // leave as raw text
  }
  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ margin: "0 0 4px", color: "#888" }}>{label}</p>
      <pre style={{ margin: 0, background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: 10, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{pretty}</pre>
    </div>
  );
}

function LogsTab({ token }: { token: string }) {
  const [logs, setLogs] = useState<AiLogRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionFilter, setSessionFilter] = useState<string>("all");

  useEffect(() => {
    authedFetch("/api/admin/logs?limit=100", token)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => setLogs(data.logs))
      .catch((err) => setError(err.message));
  }, [token]);

  if (error) return <p style={{ color: "#f66" }}>{error}</p>;

  const sessions = Array.from(new Set(logs.map((l) => l.session_id))).map((sessionId) => ({
    sessionId,
    label: `${sessionShort(sessionId)} — ${deviceLabel(logs.find((l) => l.session_id === sessionId)?.user_agent ?? null)}`,
    count: logs.filter((l) => l.session_id === sessionId).length,
  }));

  const visibleLogs = sessionFilter === "all" ? logs : logs.filter((l) => l.session_id === sessionFilter);

  return (
    <div>
      {sessions.length > 1 && (
        <select
          value={sessionFilter}
          onChange={(e) => setSessionFilter(e.target.value)}
          style={{ background: "#1a1a1a", color: "#e8e8e8", border: "1px solid #444", borderRadius: 6, padding: "6px 10px", fontFamily: "inherit", marginBottom: 12, width: "100%" }}
        >
          <option value="all">All sessions ({logs.length})</option>
          {sessions.map((s) => (
            <option key={s.sessionId ?? "none"} value={s.sessionId ?? "no-session"}>
              {s.label} ({s.count})
            </option>
          ))}
        </select>
      )}
      {visibleLogs.map((log) => (
        <div key={log.id} style={{ border: "1px solid #333", borderRadius: 6, padding: 10, marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", flexWrap: "wrap" }} onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
            <span style={{ color: log.success ? "#7dd87d" : "#f66" }}>{log.success ? "✓" : "✕"}</span>
            <span style={{ fontWeight: 700 }}>{log.endpoint}</span>
            <span style={{ color: "#888" }}>{log.model}</span>
            <span style={{ color: "#888" }}>{log.quality}</span>
            <span style={{ color: "#888" }}>{log.duration_ms}ms</span>
            <span style={{ color: "#5b8dd6", border: "1px solid #2a4a6b", borderRadius: 4, padding: "1px 6px", fontSize: 11 }}>
              {sessionShort(log.session_id)} · {deviceLabel(log.user_agent)}
            </span>
            <span style={{ marginLeft: "auto", color: "#666" }}>{log.created_at}</span>
          </div>
          {expanded === log.id && (
            <div>
              {log.error && <JsonBlock label="error" raw={JSON.stringify(log.error)} />}
              <JsonBlock label="request" raw={log.request_body} />
              <JsonBlock label="response" raw={log.response_body} />
            </div>
          )}
        </div>
      ))}
      {visibleLogs.length === 0 && <p style={{ color: "#666" }}>No AI requests logged yet.</p>}
    </div>
  );
}

function AnalyticsTab({ token }: { token: string }) {
  const [summary, setSummary] = useState<AnalyticsSummaryRow[]>([]);
  const [recent, setRecent] = useState<AnalyticsEventRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authedFetch("/api/admin/analytics", token)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        setSummary(data.summary);
        setRecent(data.recent);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  if (error) return <p style={{ color: "#f66" }}>{error}</p>;

  return (
    <div>
      <p style={{ color: "#888", marginBottom: 6 }}>Event counts</p>
      <div style={{ border: "1px solid #333", borderRadius: 6, padding: 10, marginBottom: 16 }}>
        {summary.map((row) => (
          <div key={row.event_name} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
            <span>{row.event_name}</span>
            <span style={{ color: "#888" }}>{row.count}</span>
          </div>
        ))}
        {summary.length === 0 && <p style={{ color: "#666", margin: 0 }}>No events tracked yet.</p>}
      </div>

      <p style={{ color: "#888", marginBottom: 6 }}>Recent events</p>
      {recent.map((row) => (
        <div key={row.id} style={{ display: "flex", gap: 10, borderBottom: "1px solid #222", padding: "4px 0", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700 }}>{row.event_name}</span>
          <span style={{ color: "#5b8dd6" }}>{sessionShort(row.session_id)}</span>
          <span style={{ color: "#888", flex: 1 }}>{row.properties}</span>
          <span style={{ color: "#666" }}>{row.created_at}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminScreen() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [invalid, setInvalid] = useState(false);
  const [tab, setTab] = useState<"logs" | "analytics">("logs");

  function unlock(candidate: string) {
    authedFetch("/api/admin/logs?limit=1", candidate)
      .then((res) => {
        if (res.status === 401) {
          setInvalid(true);
          return;
        }
        localStorage.setItem(TOKEN_KEY, candidate);
        setToken(candidate);
        setInvalid(false);
      })
      .catch(() => setInvalid(true));
  }

  if (!token) {
    return (
      <div>
        <TokenGate onUnlock={unlock} />
        {invalid && <p style={{ ...page, paddingTop: 0, color: "#f66" }}>Invalid token.</p>}
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 16, margin: 0 }}>Tend Admin</h1>
        <button
          style={button}
          onClick={() => {
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
          }}
        >
          Sign out
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button style={{ ...button, background: tab === "logs" ? "#3b5d63" : "#2a2a2a" }} onClick={() => setTab("logs")}>
          AI Requests
        </button>
        <button style={{ ...button, background: tab === "analytics" ? "#3b5d63" : "#2a2a2a" }} onClick={() => setTab("analytics")}>
          Analytics
        </button>
      </div>
      {tab === "logs" ? <LogsTab token={token} /> : <AnalyticsTab token={token} />}
    </div>
  );
}
