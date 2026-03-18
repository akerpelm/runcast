CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  anon_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT,
  lat REAL,
  lng REAL,
  weather_json TEXT,
  aqi INTEGER,
  recommended_json TEXT,
  prefs_json TEXT,
  clothing_feel TEXT,
  effort_level TEXT,
  shoes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_feedback_anon ON feedback(anon_id);
CREATE INDEX IF NOT EXISTS idx_feedback_date ON feedback(date);
