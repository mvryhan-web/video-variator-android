CREATE TABLE IF NOT EXISTS vv_ai_template (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  thumbnail TEXT,
  generation_type TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  default_model TEXT,
  required_input_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS vv_ai_template_public_idx
  ON vv_ai_template(active,featured,sort_order,title);
CREATE INDEX IF NOT EXISTS vv_ai_template_category_idx
  ON vv_ai_template(category,generation_type,active,sort_order);
