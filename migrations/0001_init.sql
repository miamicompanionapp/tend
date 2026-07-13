CREATE TABLE ai_request_logs (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  model TEXT,
  quality TEXT,
  request_body TEXT,
  response_body TEXT,
  success INTEGER NOT NULL,
  error TEXT,
  duration_ms INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_ai_logs_created ON ai_request_logs(created_at DESC);

CREATE TABLE analytics_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  properties TEXT,
  session_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_analytics_created ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_event ON analytics_events(event_name);
