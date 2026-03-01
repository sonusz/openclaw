CREATE TABLE IF NOT EXISTS session_summaries (
  session_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  created_at TEXT NOT NULL,
  summary TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_summaries_created_at ON session_summaries (created_at DESC);
