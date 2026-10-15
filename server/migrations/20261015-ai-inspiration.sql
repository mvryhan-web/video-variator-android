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


-- Original Deepsyq Block 3 concept media. These are repository-owned assets, not copied from Lumina
-- or another provider. Production still requires AI_INSPIRATION_ENABLED=true before the public API exposes them.
INSERT INTO vv_ai_inspiration(
 id,title,slug,kind,category,description,preview_url,preview_poster_url,prompt,default_model,
 aspect_ratio,required_input_types,default_settings,action_target,rights_basis,rights_note,
 active,featured,sort_order,created_by
) VALUES
(
 'block3-original-editorial-orbit','Editorial Orbit','editorial-orbit','image','Editorial',
 'Original Deepsyq concept preview for a sculptural editorial portrait.','/inspiration/editorial-orbit.svg',NULL,
 'Create a sculptural editorial portrait with soft directional light, refined natural texture, a deep architectural background and one restrained organic accent. Keep the composition premium and uncluttered; avoid logos and invented text.',NULL,
 '2:3','[]'::jsonb,'{"ratio":"2:3"}'::jsonb,'studio','owned',
 'Original Deepsyq concept artwork created in this repository for Block 3.',TRUE,TRUE,10,NULL
),
(
 'block3-original-product-mint','Mint Product Study','mint-product-study','image','Product',
 'Original Deepsyq product-lighting concept. Add your own product reference in Studio.','/inspiration/product-mint.svg',NULL,
 'Create a premium product photograph on a dark studio set with a soft mint key light, controlled reflections and generous negative space. Preserve the supplied product exactly, including its shape, colors and branding; do not invent labels or features.',NULL,
 '1:1','["image"]'::jsonb,'{"ratio":"1:1"}'::jsonb,'studio','owned',
 'Original Deepsyq concept artwork created in this repository for Block 3.',TRUE,TRUE,20,NULL
),
(
 'block3-original-fashion-night','Night Fashion Study','night-fashion-study','image','Fashion',
 'Original Deepsyq vertical fashion concept designed for a 9:16 composition.','/inspiration/fashion-night.svg',NULL,
 'Create a full-length night fashion editorial in a vertical composition, with a warm distant light, deep plum shadows and one fresh green styling accent. Keep anatomy natural, fabric detail crisp and the background minimal; no text or logos.',NULL,
 '9:16','[]'::jsonb,'{"ratio":"9:16"}'::jsonb,'studio','owned',
 'Original Deepsyq concept artwork created in this repository for Block 3.',TRUE,TRUE,30,NULL
),
(
 'block3-original-food-still','Warm Table Still','warm-table-still','image','Food',
 'Original Deepsyq warm tabletop concept for food and hospitality ideas.','/inspiration/food-still.svg',NULL,
 'Create a warm editorial tabletop food photograph with soft side light, subtle shadows, restrained styling and realistic texture. Keep the composition appetizing but natural and avoid fabricated packaging text or restaurant branding.',NULL,
 '4:3','[]'::jsonb,'{"ratio":"4:3"}'::jsonb,'studio','owned',
 'Original Deepsyq concept artwork created in this repository for Block 3.',TRUE,FALSE,40,NULL
),
(
 'block3-original-cinematic-motion','Cinematic Horizon','cinematic-horizon','video','Cinematic',
 'Original Deepsyq motion concept poster for a cinematic landscape video. The preview is a concept poster, not a claimed provider output.','/inspiration/cinematic-poster.svg','/inspiration/cinematic-poster.svg',
 'Create a short cinematic landscape sequence at blue hour: a warm sun crosses a layered horizon while foreground shapes move with subtle parallax. Use slow controlled camera motion, natural atmospheric depth and no text or logos.',NULL,
 '16:9','[]'::jsonb,'{"ratio":"16:9"}'::jsonb,'studio','owned',
 'Original Deepsyq concept poster created in this repository for Block 3; it represents a video idea rather than a provider-generated result.',TRUE,TRUE,50,NULL
),
(
 'block3-original-social-motion','Social Motion Card','social-motion-card','video','Social',
 'Original Deepsyq vertical motion concept. Replace the source subject with your own reference in Studio.','/inspiration/social-poster.svg','/inspiration/social-poster.svg',
 'Create a punchy vertical social clip with a clean first-second hook, a central subject, subtle depth motion and a warm gradient environment. If a reference image is supplied, preserve the subject faithfully. Avoid logos, captions and fabricated claims.',NULL,
 '9:16','["image"]'::jsonb,'{"ratio":"9:16"}'::jsonb,'studio','owned',
 'Original Deepsyq concept poster created in this repository for Block 3; it represents a video idea rather than a provider-generated result.',TRUE,TRUE,60,NULL
)
ON CONFLICT (slug) DO NOTHING;
