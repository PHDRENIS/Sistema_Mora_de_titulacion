-- Esquema del Sistema Mora de titulación (Cloudflare D1)
CREATE TABLE IF NOT EXISTS estado (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  datos TEXT NOT NULL,
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sesiones (
  token TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  expira_en TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sesiones_expira ON sesiones (expira_en);
