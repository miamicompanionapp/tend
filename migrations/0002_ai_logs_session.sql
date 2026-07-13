ALTER TABLE ai_request_logs ADD COLUMN session_id TEXT;
ALTER TABLE ai_request_logs ADD COLUMN user_agent TEXT;
CREATE INDEX idx_ai_logs_session ON ai_request_logs(session_id);
