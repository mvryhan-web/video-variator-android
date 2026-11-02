CREATE TABLE IF NOT EXISTS vv_ai_inspiration (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK(kind IN ('image','video')),
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  preview_url TEXT NOT NULL,
  preview_poster_url TEXT,
  prompt TEXT NOT NULL,
  default_model TEXT,
  aspect_ratio TEXT NOT NULL CHECK(aspect_ratio IN ('1:1','16:9','9:16','2:3','3:2','4:3','3:4')),
  required_input_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_target TEXT NOT NULL DEFAULT 'studio' CHECK(action_target IN ('studio','agent')),
  rights_basis TEXT NOT NULL CHECK(rights_basis IN ('owned','licensed')),
  rights_note TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT FALSE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS vv_ai_inspiration_public_idx ON vv_ai_inspiration(active,featured,kind,sort_order,title);
CREATE INDEX IF NOT EXISTS vv_ai_inspiration_category_idx ON vv_ai_inspiration(category,kind,active,sort_order);
