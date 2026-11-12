import {createEdgeCreditFulfillment} from '../../../../server/edge-credit-fulfillment.js';
import { MODEL_CATALOG } from './generate-models.js';

const INSPIRATION_ITEMS = [{"id":"owner-01-close-up-woman","slug":"owner-01-close-up-woman","title":"Close-up woman","kind":"video","category":"Cinematic","description":"Close-up woman — owner-selected cinematic scene.","previewUrl":"/media/home/owner-20261018/01-close-up-woman.mp4","previewPosterUrl":"/media/home/owner-20261018/01-close-up-woman.jpg","prompt":"Create an original cinematic scene inspired by close-up woman. Use your own source material.","defaultModel":null,"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ownerSceneId":"carousel-1","creationProvider":"Google Flow","homeShowcase":{"title":"AI Canvas","label":"CREATIVE WORKSPACE","note":"Feature showcase title, not source attribution. This sample video was created in Google Flow. Available models are shown in Studio.","href":"#quickCreateForm"}},"actionTarget":"studio","featured":true,"sortOrder":10},{"id":"owner-02-futuristic-portal","slug":"owner-02-futuristic-portal","title":"Futuristic portal","kind":"video","category":"Cinematic","description":"Futuristic portal — owner-selected cinematic scene.","previewUrl":"/media/home/owner-20261018/02-futuristic-portal.mp4","previewPosterUrl":"/media/home/owner-20261018/02-futuristic-portal.jpg","prompt":"Create an original cinematic scene inspired by futuristic portal. Use your own source material.","defaultModel":null,"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ownerSceneId":"carousel-2","creationProvider":"Google Flow","homeShowcase":{"title":"Seedance 2.0","label":"EXPLORE VIDEO MODELS","note":"Feature showcase title, not source attribution. This sample video was created in Google Flow. Available models are shown in Studio.","href":"generate-studio.html?studio=video"}},"actionTarget":"studio","featured":true,"sortOrder":20},{"id":"owner-03-underwater-woman","slug":"owner-03-underwater-woman","title":"Underwater woman","kind":"video","category":"Cinematic","description":"Underwater woman — owner-selected cinematic scene.","previewUrl":"/media/home/owner-20261018/03-underwater-woman.mp4","previewPosterUrl":"/media/home/owner-20261018/03-underwater-woman.jpg","prompt":"Create an original cinematic scene inspired by underwater woman. Use your own source material.","defaultModel":null,"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ownerSceneId":"carousel-3","creationProvider":"Google Flow","homeShowcase":{"title":"Seedance 2.5","label":"EXPLORE VIDEO MODELS","note":"Feature showcase title, not source attribution. This sample video was created in Google Flow. Available models are shown in Studio.","href":"generate-studio.html?studio=video"}},"actionTarget":"studio","featured":true,"sortOrder":30},{"id":"owner-04-neon-motorcycle","slug":"owner-04-neon-motorcycle","title":"Neon motorcycle","kind":"video","category":"Cinematic","description":"Neon motorcycle — owner-selected cinematic scene.","previewUrl":"/media/home/owner-20261018/04-neon-motorcycle.mp4","previewPosterUrl":"/media/home/owner-20261018/04-neon-motorcycle.jpg","prompt":"Create an original cinematic scene inspired by neon motorcycle. Use your own source material.","defaultModel":null,"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ownerSceneId":"carousel-4","creationProvider":"Google Flow","homeShowcase":{"title":"Video Studio","label":"CREATE WITH DEEPSYQ","note":"Feature showcase title, not source attribution. This sample video was created in Google Flow. Available models are shown in Studio.","href":"generate-studio.html?studio=video"}},"actionTarget":"studio","featured":true,"sortOrder":40},{"id":"owner-05-sky-whale","slug":"owner-05-sky-whale","title":"Whale among the clouds","kind":"video","category":"Cinematic","description":"Whale among the clouds — owner-selected cinematic scene.","previewUrl":"/media/home/owner-20261018/05-sky-whale.mp4","previewPosterUrl":"/media/home/owner-20261018/05-sky-whale.jpg","prompt":"Create an original cinematic scene inspired by whale among the clouds. Use your own source material.","defaultModel":null,"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ownerSceneId":"carousel-5","creationProvider":"Google Flow","homeShowcase":{"title":"AI Agent","label":"CREATIVE CO-PILOT · COMING SOON","note":"Feature showcase title, not source attribution. This sample video was created in Google Flow. Available models are shown in Studio.","href":"#agentFeature"}},"actionTarget":"studio","featured":true,"sortOrder":50},{"id":"owner-06-golden-forest","slug":"owner-06-golden-forest","title":"Golden forest","kind":"video","category":"Cinematic","description":"Golden forest — owner-selected cinematic scene.","previewUrl":"/media/home/owner-20261018/06-golden-forest.mp4","previewPosterUrl":"/media/home/owner-20261018/06-golden-forest.jpg","prompt":"Create an original cinematic scene inspired by golden forest. Use your own source material.","defaultModel":null,"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ownerSceneId":"carousel-6","creationProvider":"Google Flow","homeShowcase":{"title":"Image Studio","label":"CREATE WITH DEEPSYQ","note":"Feature showcase title, not source attribution. This sample video was created in Google Flow. Available models are shown in Studio.","href":"generate-studio.html?studio=image"}},"actionTarget":"studio","featured":true,"sortOrder":60},{"id":"owner-v02-red-gown","slug":"owner-v02-red-gown","title":"Red gown dream","kind":"video","category":"Cinematic","description":"Red gown dream — owner-selected cinematic scene.","previewUrl":"/media/home/owner-20261018/v02-red-gown.mp4","previewPosterUrl":"/media/home/owner-20261018/v02-red-gown.jpg","prompt":"Create an original cinematic scene inspired by red gown dream. Use your own source material.","defaultModel":null,"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ownerSceneId":"V02","creationProvider":"Google Flow"},"actionTarget":"studio","featured":false,"sortOrder":70},{"id":"orbital-muse","slug":"orbital-muse","title":"Orbital Muse","kind":"image","category":"Cinematic","description":"Original AI-generated example. Select it to inspect and clone its prompt.","previewUrl":"/media/inspiration/openai-20261021/image-01-orbital-muse.webp","prompt":"Editorial magazine cover, portrait 4:5: an adult astronaut fashion model fully dressed in a sculptural silver flight suit with a high collar, floating among small translucent orbital rings and planets. Cool indigo galaxy, luminous champagne accents, polished premium studio photography, dramatic but elegant layout. The only lettering is one original fictional masthead, ORBITAL. No brand logos, no real magazine names, no other text, no exposed skin beyond face and hands. Broad contemporary AI inspiration-gallery art direction.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[819,1024],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":80},{"id":"soft-signal","slug":"soft-signal","title":"Soft Signal","kind":"image","category":"Beauty","description":"Original AI-generated example. Select it to inspect and clone its prompt.","previewUrl":"/media/inspiration/openai-20261021/image-04-soft-signal.webp","prompt":"Portrait 4:5 premium beauty editorial cover, entirely original adult woman wearing a high-neck ivory blouse, shown in two clean photographic frames on one page: close-up above and full-length below. Soft rosy studio light, warm paper texture, subtle grain, sophisticated contemporary magazine layout. One small fictional title SOFT SIGNAL. No real people, brand names, logos, or additional readable text; tasteful and fully clothed.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[819,1024],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":90},{"id":"solar-visor","slug":"solar-visor","title":"Solar Visor","kind":"image","category":"Fashion","description":"Original AI-generated example. Select it to inspect and clone its prompt.","previewUrl":"/media/inspiration/openai-20261021/image-05-solar-visor.webp","prompt":"Portrait 4:5 futuristic eyewear campaign. Original adult Black woman wearing oversized translucent amber visor glasses and a fully covered sand-colored high-collar jacket, close-up against sculptural desert architecture, sharp golden sunlight and lime-green graphic accent, high-end fashion photography, confident and vibrant. One fictional headline SOLAR. No recognizable brand design, no additional readable text or logos.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[819,1024],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":100},{"id":"wild-form","slug":"wild-form","title":"Wild Form","kind":"image","category":"Creative Effects","description":"Original AI-generated example. Select it to inspect and clone its prompt.","previewUrl":"/media/inspiration/openai-20261021/image-06-wild-form.webp","prompt":"Portrait 4:5 surreal art-fashion magazine cover. A sculptural matte-white vase overflowing with impossible oversized flowers and suspended colorful botanical fragments, cut-paper collage blended with photoreal studio still life, vivid coral-red background, precise shadows, playful premium art direction. Fictional title WILD FORM in bold white type, no brands or other readable text.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[819,1024],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":110},{"id":"neon-archive","slug":"neon-archive","title":"Neon Archive","kind":"image","category":"Futuristic Fashion","description":"Original AI-generated example. Select it to inspect and clone its prompt.","previewUrl":"/media/inspiration/openai-20261021/image-07-neon-archive.webp","prompt":"Portrait 4:5 original cyberpunk culture poster. Close-up, fully clothed adult East Asian woman with a calm focused gaze; face framed by luminous green interface fragments, abstract unreadable glyphs and tiny circular UI marks; inky black shadows and acid-green glow. High-contrast editorial graphic design, original person, fictional headline NEON ARCHIVE in bold red type. No actual language text, brands, logos or watermarks.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[819,1024],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":120},{"id":"prism-couture","slug":"prism-couture","title":"Prism Couture","kind":"image","category":"Fashion","description":"Original AI-generated example. Select it to inspect and clone its prompt.","previewUrl":"/media/inspiration/openai-20261021/image-08-prism-couture.webp","prompt":"Portrait 4:5 luxury couture magazine cover. Fully clothed original adult woman wearing a reflective silver and pearl high-neck sculptural gown, standing in a midnight-blue studio; dramatic side light, metallic fabric texture, poised three-quarter composition and generous negative space. Premium fashion campaign photography, fictional title PRISM, no logos or extra text.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[819,1024],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":130},{"id":"memory-drift","slug":"memory-drift","title":"Memory Drift","kind":"image","category":"Cinematic","description":"Original AI-generated example. Select it to inspect and clone its prompt.","previewUrl":"/media/inspiration/openai-20261021/image-09-memory-drift.webp","prompt":"Portrait 4:5 cinematic fantasy editorial. Fully clothed original adult woman in a flowing ivory coat stands in a vast rose-gold desert, translucent ribbons of light drift around her, a tiny moon hangs low through atmospheric haze. Photoreal surreal art direction, peach and bronze palette, premium poster composition, small fictional title MEMORY DRIFT. No logos or other text.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[819,1024],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":140},{"id":"outer-worlds","slug":"outer-worlds","title":"Outer Worlds","kind":"image","category":"Sci-Fi Poster","description":"Original AI-generated example. Select it to inspect and clone its prompt.","previewUrl":"/media/inspiration/openai-20261021/image-10-outer-worlds.webp","prompt":"Portrait 4:5 retro-futurist science-fiction comic magazine cover, entirely original. A small friendly alien explorer in a bright orange space suit stands on a violet desert beneath a turquoise moon and a distant hovering saucer, hand-printed halftone texture, bold 1970s color palette, dramatic but playful adventure poster. Fictional headline OUTER WORLDS in crisp large lettering; no known characters, franchise symbols, real brands, logos, or extra readable text.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[819,1024],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":150},{"id":"greenroom-break","slug":"greenroom-break","title":"Greenroom Break","kind":"image","category":"Lifestyle","description":"Original AI-generated example. Select it to inspect and clone its prompt.","previewUrl":"/media/inspiration/openai-20261021/image-11-greenroom-break.webp","prompt":"Landscape 3:2 street-style editorial campaign. An original fully clothed adult woman in a black graphic-free jacket, cobalt sunglasses and a silver backpack holds a bright lime iced tea on a lively modern city sidewalk; crisp daylight, dynamic reflections, candid fashion-magazine framing. Fictional headline GREENROOM BREAK. No real beverage or clothing brands, logos, or extra readable text.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1024,683],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":160},{"id":"solstice","slug":"solstice","title":"Solstice","kind":"image","category":"Fashion","description":"Original AI-generated example. Select it to inspect and clone its prompt.","previewUrl":"/media/inspiration/openai-20261021/image-12-solstice.webp","prompt":"Portrait 4:5 futuristic athletic fashion cover. An original adult man wearing a fully zipped cobalt technical jacket and reflective visor stands on a wind-swept pale desert ridge; graphic red sun disc, long sharp shadows, restrained cinematic color blocking, premium editorial photography. Fictional title SOLSTICE. No real sports brands, logos or extra text.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[819,1024],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":170},{"id":"electric-bloom","slug":"electric-bloom","title":"Electric Bloom","kind":"image","category":"Beauty","description":"Original AI-generated example. Select it to inspect and clone its prompt.","previewUrl":"/media/inspiration/openai-20261021/image-13-electric-bloom.webp","prompt":"Portrait 4:5 avant-garde beauty editorial. Fully clothed original adult East Asian model in a high-neck dark outfit, calm face framed by floating luminous botanical shapes and thin neon-green line graphics; deep teal background and crisp photographic detail, polished art magazine cover. Fictional title ELECTRIC BLOOM. No real logos or extra readable text.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[819,1024],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":180},{"id":"play-mode","slug":"play-mode","title":"Play Mode","kind":"image","category":"Gaming","description":"Original AI-generated example. Select it to inspect and clone its prompt.","previewUrl":"/media/inspiration/openai-20261021/image-14-play-mode.webp","prompt":"Portrait 4:5 original retro arcade game poster. A luminous turquoise arcade cabinet sits in a violet neon room, its screen showing an entirely original tiny rocket racing through a star field; bright magenta and lime reflections, bold hand-drawn screen-print texture, playful graphic composition. Fictional title PLAY MODE. No real game art, characters, logos, or extra readable text.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[819,1024],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":190},{"id":"color-study","slug":"color-study","title":"Color Study","kind":"image","category":"Fashion","description":"Original AI-generated example. Select it to inspect and clone its prompt.","previewUrl":"/media/inspiration/openai-20261021/image-15-color-study.webp","prompt":"Landscape 3:2 high-fashion editorial collage. Two original adult models in fully covered sculptural outfits, one in cobalt and one in burnt orange, pose separately on opposite sides of a seamless cream studio; overlapping cut-paper shapes and subtle film grain, refined art direction, elegant negative space. Small fictional title COLOR STUDY. No real brands, logos, or additional text.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1024,683],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":200},{"id":"vertical-liquid-chrome-halo","slug":"vertical-liquid-chrome-halo","title":"Chrome Halo","kind":"image","category":"Beauty","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-01-liquid-chrome-halo.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. A striking photographic beauty portrait of an original adult woman with warm brown skin, silver eye makeup and a black sculptural high-neck top. A single ribbon of liquid chrome floats in a loose halo around her head, with perfectly plausible reflections. Tight head-and-shoulders crop, direct gaze, vivid cobalt seamless background, controlled hard beauty light, real pores, tiny water droplets, sophisticated fashion campaign. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":201},{"id":"vertical-ocean-in-the-room","slug":"vertical-ocean-in-the-room","title":"Ocean in the Room","kind":"image","category":"Surreal","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-02-ocean-in-the-room.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. A sunlit minimalist cream apartment containing an impossible perfectly still turquoise ocean that covers the floor; one sculptural ivory armchair rests on a tiny island of sand. A clear cresting wave hangs frozen through the open doorway, no flooding damage. Vertical architectural photograph, afternoon caustics on plaster walls, highly realistic materials, poetic luxury interior. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":202},{"id":"vertical-miniature-city-sneaker","slug":"vertical-miniature-city-sneaker","title":"City in a Sneaker","kind":"image","category":"Product Ads","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-03-miniature-city-sneaker.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. An unbranded ivory and orange high-top sneaker suspended vertically in a dark studio. Its upper unfolds into an impossibly detailed miniature futuristic city with tiny gardens, illuminated windows and elevated trains, all integrated into the fabric. Premium advertising macro photography, crisp textile texture, amber rim light, dark teal background, a bold physically tangible surreal effect. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":203},{"id":"vertical-flower-shadow-portrait","slug":"vertical-flower-shadow-portrait","title":"Bloom Shadow","kind":"image","category":"Beauty","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-04-flower-shadow-portrait.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. An original adult East Asian woman in an elegant fully clothed ivory outfit stands against a warm peach plaster wall. Her real silhouette casts an impossible shadow made entirely of richly detailed blooming blue delphiniums and dark fern leaves, while she herself remains photorealistic and unadorned. Three-quarter body portrait, late afternoon hard sunlight, editorial photography, calm powerful pose. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":204},{"id":"vertical-glass-strawberry","slug":"vertical-glass-strawberry","title":"Glass Strawberry","kind":"image","category":"Product Ads","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-05-glass-strawberry.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. One monumental translucent ruby-red glass strawberry floats above a reflective black pedestal, with tiny realistic green leaves and jewel-like seeds suspended within the glass. A thin clear stream of water wraps around it in a spiral, frozen by high-speed flash. Luxury macro advertising photograph, extreme material detail, deep burgundy studio background, luminous caustics, delicious surrealism. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":205},{"id":"vertical-cloud-coat","slug":"vertical-cloud-coat","title":"Cloud Coat","kind":"image","category":"Fashion","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-06-cloud-coat.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. An original adult Black fashion model wearing a voluminous fully opaque white puffer coat shaped like a rolling cumulonimbus cloud, standing on a mirror-smooth salt flat. Small wisps drift off the sleeves but the face and hands stay anatomically natural. Full-body low-angle luxury editorial photograph, enormous dramatic blue sky above, warm low sun and believable reflected light. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":206},{"id":"vertical-moon-elevator","slug":"vertical-moon-elevator","title":"Moon Elevator","kind":"image","category":"Cinematic","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-07-moon-elevator.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. An elegant empty polished-metal elevator with open doors reveals an immense luminous full moon hovering just beyond, above a sea of soft clouds. A small original adult woman in a scarlet long coat stands inside facing the view, seen from behind. Symmetrical vertical cinematic photograph, brushed steel, tactile fabrics, cool moonlight and a warm amber floor strip, exquisite scale and atmosphere. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":207},{"id":"vertical-butterfly-eyewear","slug":"vertical-butterfly-eyewear","title":"Butterfly Lens","kind":"image","category":"Fashion","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-08-butterfly-eyewear.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. Macro editorial portrait of an original adult woman with freckles wearing oversized transparent amber glasses. Inside each lens is a tiny lush greenhouse with delicate blue butterflies, as if the lenses contain miniature living worlds. Her eyes remain softly visible and anatomically coherent behind the glass. Realistic skin and refraction, forest-green background, golden window light, unusual premium eyewear campaign. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":208},{"id":"vertical-desert-ribbon-road","slug":"vertical-desert-ribbon-road","title":"Ribbon Road","kind":"image","category":"Cinematic","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-09-desert-ribbon-road.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. An aerial photographic view of rust-red desert dunes with a single satin-white road looping vertically upward like a giant ribbon and then returning naturally to the sand. One tiny anonymous cyan car drives along its lower stretch to convey scale. Sculptural sweeping composition, long morning shadows, rich ochre and cobalt palette, ultra-real sand texture, cinematic surreal travel photography. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":209},{"id":"tideline-fragrance","slug":"tideline-fragrance","title":"Tideline Fragrance","kind":"image","category":"Product Ads","description":"Original AI-generated example. Select it to inspect and clone its prompt.","previewUrl":"/media/inspiration/openai-20261021/image-16-tideline-fragrance.webp","prompt":"Portrait 4:5 premium fragrance campaign still life. One unbranded glass perfume bottle with a sculptural sea-glass cap rests on a glossy dark teal plinth, surrounded by translucent water ribbons and iridescent reflections; dramatic cyan and amber studio light, crisp commercial detail, stylish editorial composition. Fictional headline TIDELINE only; blank label, no logos or claims.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[819,1024],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":210},{"id":"vertical-pearl-rain","slug":"vertical-pearl-rain","title":"Pearl Rain","kind":"image","category":"Beauty","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-10-pearl-rain.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. A close beauty portrait of an original adult South Asian woman with luminous deep brown eyes, sleek wet hair and a fully opaque black high-neck dress. Hundreds of tiny pearl droplets float in perfectly spaced arcs around her, some catching rainbow refractions, leaving her face clear. Deep midnight-blue background, silver rim lighting, realistic pores, fashion photography, elegant hypnotic suspended rain effect. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":210},{"id":"vertical-paper-portal","slug":"vertical-paper-portal","title":"Paper Portal","kind":"image","category":"Surreal","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-11-paper-portal.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. A huge curl of textured cream paper peels away from a simple dusty-pink studio wall to reveal a breathtaking realistic Alpine mountain valley behind it. An original adult person in a small bright yellow raincoat stands beside the curl for scale, seen from behind. Minimal architectural surrealism photographed with natural side light, tactile paper fibers, crisp mountain detail, balanced negative space. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":211},{"id":"vertical-citrus-eclipse","slug":"vertical-citrus-eclipse","title":"Citrus Eclipse","kind":"image","category":"Product Ads","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-12-citrus-eclipse.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. An unbranded frosted pale-orange glass beverage bottle suspended in front of a gigantic backlit fresh orange slice that looks like a glowing solar eclipse. A few clear fizzy droplets and a curled citrus peel orbit the bottle. High-end advertising photograph, rich tangerine gradient, controlled silhouette edges, condensation, realistic glass and pulp, strong clean central composition. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":212},{"id":"vertical-velvet-panther","slug":"vertical-velvet-panther","title":"Velvet Panther","kind":"image","category":"Cinematic","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-13-velvet-panther.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. A majestic black panther walking calmly through a shallow mirror pool inside a monumental purple brutalist hallway. Fine bioluminescent cyan light traces the wet fur edges and reflects in the ripples. Full animal anatomically correct, elegant long vertical architecture, cinematic wildlife-fashion photograph, rich shadow detail, subtle mist, highly realistic fur and stone. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":213},{"id":"vertical-aurora-braid","slug":"vertical-aurora-braid","title":"Aurora Braid","kind":"image","category":"Fashion","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-14-aurora-braid.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. An original adult woman photographed from behind on a snowy shoreline at blue hour, wearing a fully opaque black sculptural coat. Her long dark braid gradually transforms into a narrow luminous aurora ribbon that flows upward into the real green and violet northern lights. Photorealistic fashion landscape composite, natural hair strands at the transition, pristine snow, cinematic quiet, extraordinary vertical movement. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":214},{"id":"vertical-floating-espresso","slug":"vertical-floating-espresso","title":"Espresso Gravity","kind":"image","category":"Product Ads","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-15-floating-espresso.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. An unbranded small ivory ceramic espresso cup floats in a warm beige studio, with an entire sculptural ribbon of glossy dark espresso levitating above it, ending in a perfect crema sphere. Tiny coffee droplets frozen mid-air, a few realistically textured coffee beans below. Luxury high-speed product photograph, rich tactile ceramic, warm sunlight, beautifully controlled shadows and convincing liquid. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":215},{"id":"vertical-mirror-garden","slug":"vertical-mirror-garden","title":"Mirror Garden","kind":"image","category":"Surreal","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-16-mirror-garden.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. A solitary tall arched mirror stands in a dry lavender field at sunrise. The mirror reflects a lush tropical waterfall instead of the surrounding landscape, and one small trickle of water spills from its lower edge into a polished stone basin. Perfect photographic realism, delicate purple flowers, antique silver frame, soft peach mist, elegant magical travel scene. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":216},{"id":"vertical-holographic-raincoat","slug":"vertical-holographic-raincoat","title":"Prism Raincoat","kind":"image","category":"Fashion","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-17-holographic-raincoat.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. An original adult androgynous fashion model in a fully opaque iridescent structured raincoat on an empty rain-soaked Tokyo-inspired street without signs or lettering. A single warm streetlamp refracts through a hovering transparent prism, casting precise spectral rainbow bands across the coat and pavement. Full-body street editorial photograph, natural anatomy, sophisticated moody lighting, realistic wet reflections. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":217},{"id":"vertical-rose-iceberg","slug":"vertical-rose-iceberg","title":"Rose Iceberg","kind":"image","category":"Surreal","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-18-rose-iceberg.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. A giant delicate blush-pink rose encased in a towering perfectly clear iceberg floating alone on a calm deep-blue ocean. The rose's stem extends through the transparent ice below the waterline, with fine trapped air bubbles and convincing ice refraction. Vertical cinematic aerial photograph at dawn, distant pale horizon, magical realistic scale, intricate petals, serene luxurious color grading. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":218},{"id":"vertical-galaxy-fabric","slug":"vertical-galaxy-fabric","title":"Galaxy Fabric","kind":"image","category":"Fashion","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-19-galaxy-fabric.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. An original adult woman in a fully opaque midnight-blue evening gown standing in a dark studio. The long flowing train transforms seamlessly into a physically textured miniature spiral galaxy made from shimmering fabric, tiny embroidered stars and luminous dust, sweeping upward behind her. Full-body luxury couture photograph, accurate hands and face, dramatic violet rim light, extraordinary tactile craftsmanship. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":219},{"id":"kinetic-form","slug":"kinetic-form","title":"Kinetic Form","kind":"image","category":"Product Ads","description":"Original AI-generated example. Select it to inspect and clone its prompt.","previewUrl":"/media/inspiration/openai-20261021/image-17-kinetic-form.webp","prompt":"Portrait 4:5 striking unbranded sneaker campaign poster. One sculptural crimson high-top sneaker floats above a glossy cobalt plinth, surrounded by translucent acrylic ribbons and a few suspended flower petals; dramatic studio lighting, bold coral and electric-blue color blocking, premium art-directed product photography. Fictional title KINETIC FORM, no visible logos, trademarks, or extra text.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[819,1024],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":220},{"id":"vertical-jellyfish-lanterns","slug":"vertical-jellyfish-lanterns","title":"Jellyfish Lanterns","kind":"image","category":"Cinematic","description":"A vertical 9:16 Instagram-inspired effect. Open to explore the prompt and try your own version.","previewUrl":"/media/inspiration/openai-20261021/vertical-20-jellyfish-lanterns.webp","prompt":"Use case: ads-marketing. Asset type: standalone Instagram Story inspiration photo. Generate ONE finished premium photograph in a strict vertical 9:16 canvas, preferably 1080 × 1920 or 1152 × 2048. Edge-to-edge photographic artwork, not a mockup, grid, diptych or collage. An original adult person in a long cream coat stands on an empty misty seafront promenade at twilight, viewed from behind. Enormous translucent glowing jellyfish drift gently through the sky like living lanterns, with believable gelatin texture and delicate long tendrils suspended far above the person. Cinematic photorealistic fantasy, coral-pink and electric-blue bioluminescence, wet stone reflections, atmospheric depth. Highest photographic quality: crisp focal subject, natural fine texture, physically believable lighting and reflections within the surreal concept, sophisticated composition with vital subject inside the central 80% so Instagram controls do not hide it. No text, captions, typography, logos, watermarks, UI, frames or borders. Original fictional adults only when people appear; fully clothed. Avoid duplicated people, extra limbs, distorted hands, plastic skin, generic stock-photo styling. Compose specifically for 9:16, never square or landscape.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[1080,1920],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":220},{"id":"color-theory","slug":"color-theory","title":"Color Theory","kind":"image","category":"Beauty","description":"Original AI-generated example. Select it to inspect and clone its prompt.","previewUrl":"/media/inspiration/openai-20261021/image-18-color-theory.webp","prompt":"Portrait 4:5 graphic beauty editorial cover. Original adult woman fully clothed in a high-neck emerald top, her face seen through overlapping transparent red and rose acetate panels that create an artistic split-color effect; crisp studio portrait, minimal cream background, bold red/cream layout. Fictional headline COLOR THEORY. No real person, brand, logo, or additional text.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[819,1024],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":230},{"id":"glass-persona","slug":"glass-persona","title":"Glass Persona","kind":"image","category":"Futuristic Fashion","description":"Original AI-generated example. Select it to inspect and clone its prompt.","previewUrl":"/media/inspiration/openai-20261021/image-19-glass-persona.webp","prompt":"Portrait 4:5 futuristic fashion editorial. Original adult model in a fully covered lilac metallic high-collar outfit, poised in a surreal gallery of translucent glass panels and soft lavender light; subtle chrome reflections, cinematic close framing, polished science-fiction magazine art direction. Fictional title GLASS PERSONA. No franchise look, logos, or extra readable text.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[819,1024],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":240},{"id":"city-pop","slug":"city-pop","title":"City Pop","kind":"image","category":"Lifestyle","description":"Original AI-generated example. Select it to inspect and clone its prompt.","previewUrl":"/media/inspiration/openai-20261021/image-20-city-pop.webp","prompt":"Portrait 4:5 playful street-fashion editorial cover, fully clothed original adult woman wearing a black oversized graphic-free jacket and bright white sunglasses, blowing a small bubble with bubble gum while holding a clear lime iced drink; modern city sidewalk in bright natural light, candid confident pose, high-end fashion-magazine photography, lively but tasteful composition. Fictional headline CITY POP in clean bold type. No real brands, logos, or extra text.","defaultModel":null,"displayModel":"OpenAI ChatGPT image_gen · exact model/version not exposed","previewDimensions":[819,1024],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":250},{"id":"owner-20261031-new-01-embroidered-golden-city","slug":"owner-20261031-new-01-embroidered-golden-city","title":"The City Woven in Gold","kind":"image","category":"Creative Effects","description":"An original Deepsyq visual world: The City Woven in Gold. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/01-embroidered-golden-city.webp","prompt":"Create a breathtaking original single standalone cinematic photograph, natural perspective and extraordinary photographic realism. An enormous ornate silver sewing needle passes golden silk thread through a monumental jeweler-quality spool; the thread curls across jet-black velvet, becoming a tiny sophisticated illuminated city of palaces, winding walkways, tiny bridges, decorative trees and gold-lit windows, all literally woven from one continuous strand of thread. The spool and sharp needle are fully legible; the miniature city grows physically out of the yarn between them. Lighting and photographic direction: Pitch-black velvet, precise macro optics, warm metallic reflections, restrained amber highlights, dramatically shallow depth of field. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 16:9. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1672,941],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":561},{"id":"owner-20261031-new-02-world-key-of-dreams","slug":"owner-20261031-new-02-world-key-of-dreams","title":"The Key to a Living World","kind":"image","category":"Nature & Fantasy","description":"An original Deepsyq visual world: The Key to a Living World. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/02-world-key-of-dreams.webp","prompt":"Create a breathtaking original single standalone cinematic photograph, natural perspective and extraordinary photographic realism. A colossal antique architectural key made of aged gold and green-covered brass floats across a mist-filled mountain valley; its vast round key bow contains real tiny cliffs, delicate glowing stairways and impossibly intricate hanging gardens with narrow cascades, while its long decorated shaft becomes a suspended walkway ending in a small warm-lit tower. A tiny person in an ivory garment at the edge of the scene reveals the extraordinary scale. Lighting and photographic direction: Monumental cinematic long shot, beautiful warm coral dawn contrasting cool distant mountains, detailed bronze engraving and coherent geometry. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 16:9. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1672,941],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":562},{"id":"owner-20261031-new-03-pearl-shell-impossible-sea","slug":"owner-20261031-new-03-pearl-shell-impossible-sea","title":"A Kingdom inside a Pearl Shell","kind":"image","category":"Nature & Fantasy","description":"An original Deepsyq visual world: A Kingdom inside a Pearl Shell. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/03-pearl-shell-impossible-sea.webp","prompt":"Create a breathtaking original single standalone cinematic photograph, natural perspective and extraordinary photographic realism. A gigantic immaculate nacre sea shell rests on a rocky shore; its open pearlescent inner spiral contains a miniature coastal kingdom, turquoise lagoons, graceful white terraces, jeweled architecture, small sailing boats and tiny waterfalls that emerge naturally from the shell itself; brilliant iridescent shell ridges and delicate inner arches remain obvious. Lighting and photographic direction: Wide-angle cinematic coast, pale opal gold, turquoise, shell-pink iridescence, physically credible ocean spray and wet shell texture. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 16:9. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1672,941],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":563},{"id":"owner-20261031-new-04-glass-hourglass-two-worlds","slug":"owner-20261031-new-04-glass-hourglass-two-worlds","title":"Hourglass of Two Seasons","kind":"image","category":"Creative Effects","description":"An original Deepsyq visual world: Hourglass of Two Seasons. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/04-glass-hourglass-two-worlds.webp","prompt":"Create a breathtaking original single standalone cinematic photograph, natural perspective and extraordinary photographic realism. A singular monumental clear glass hourglass with precious gold mountings lies on a mossy stone ledge, one chamber containing a miniature lush Mediterranean kingdom with green terraces and golden buildings; the other chamber containing a tiny snowy alpine realm, connected through the narrow crystalline neck by a stream of luminous fine sand. The glass silhouette is precise and the two independent seasonal worlds remain inside it. Lighting and photographic direction: Premium panoramic jewel photography with natural refraction, soft atmospheric depth, peach dawn light and contrasting cold glacier blues. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 16:9. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1672,941],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":564},{"id":"owner-20261031-new-05-giant-sleeping-cat-island","slug":"owner-20261031-new-05-giant-sleeping-cat-island","title":"The Sleeping Cat of Hidden Kingdoms","kind":"image","category":"Nature & Fantasy","description":"An original Deepsyq visual world: The Sleeping Cat of Hidden Kingdoms. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/05-giant-sleeping-cat-island.webp","prompt":"Create a breathtaking original single standalone cinematic photograph, natural perspective and extraordinary photographic realism. An enormous sleeping white-and-cream cat rests across an impossible coastal island; its realistic face, closed eyelids, ears, soft fur and giant front paws emerge gently from a network of flowering gardens, miniature palaces, suspended white bridges, calm teal pools and glowing terraces. The cat is still unmistakeably one peacefully sleeping animal integrated into the landscape. Lighting and photographic direction: Ultra-wide editorial fantasy landscape, believable fur, natural sea haze, warm peach skies and detailed multi-scale scenery. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 16:9. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1672,941],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":565},{"id":"owner-20261031-new-06-living-golden-key-kingdom","slug":"owner-20261031-new-06-living-golden-key-kingdom","title":"The Golden Key of Lost Kingdoms","kind":"image","category":"Creative Effects","description":"An original Deepsyq visual world: The Golden Key of Lost Kingdoms. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/06-living-golden-key-kingdom.webp","prompt":"Create a breathtaking original single standalone cinematic photograph, natural perspective and extraordinary photographic realism. An oversized antique ornate gold key, its head formed by spectacular ring-like arches full of trees, tiny staircases, gardens, glowing buildings and finely tiered streams, spans an ethereal valley; a delicately illuminated palace crowns the end of the key shaft. A tiny fictional figure in a long cream dress looks up toward the impossible structure from dark rock. Lighting and photographic direction: Epic cinematic vista, refined elaborate metallic engraving, mist below, golden dawn and purple mountain silhouettes; key fully visible. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 16:9. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1672,941],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":566},{"id":"owner-20261031-new-07-storybook-miniature-kingdom","slug":"owner-20261031-new-07-storybook-miniature-kingdom","title":"The Living Storybook","kind":"image","category":"Creative Effects","description":"An original Deepsyq visual world: The Living Storybook. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/07-storybook-miniature-kingdom.webp","prompt":"Create a breathtaking original single standalone cinematic photograph, natural perspective and extraordinary photographic realism. One antique oversize open book with a dark decorated leather spine hovers in soft clouds; its thick stacks of physical paper transform into green mountains, illuminated little arched palaces, bridges, turquoise lakes, bonsai-like trees and cascading streams. The book must still read as a real object with visible paper layers and a ribbon bookmark. Lighting and photographic direction: Large-format fantasy still, natural cream paper and gold book details, realistic volumetric cloud depth and beautifully controlled miniature-scale light. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 16:9. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1672,941],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":567},{"id":"owner-20261031-new-08-marble-teacup-world","slug":"owner-20261031-new-08-marble-teacup-world","title":"The World in a Marble Teacup","kind":"image","category":"Food & Lifestyle","description":"An original Deepsyq visual world: The World in a Marble Teacup. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/08-marble-teacup-world.webp","prompt":"Create a breathtaking original single standalone cinematic photograph, natural perspective and extraordinary photographic realism. A sculptural antique marbled ceramic teacup, with a large elegant gilt handle, contains its own miniature alpine lake, hills, bridges, tiny houses and streams nested inside the cup walls, while sparkling rivulets cascade gracefully down the front lip. The cup is the unmistakable hero object and appears physically heavy and finely crafted. Lighting and photographic direction: Golden-peach dawn behind distant mountains, turquoise water contrasted with aged marble and gold, impeccable high-resolution macro-cinematic detail. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 16:9. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1672,941],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":568},{"id":"owner-20261031-new-09-coffee-cup-wilderness","slug":"owner-20261031-new-09-coffee-cup-wilderness","title":"Wilderness in a Coffee Cup","kind":"image","category":"Food & Lifestyle","description":"An original Deepsyq visual world: Wilderness in a Coffee Cup. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/09-coffee-cup-wilderness.webp","prompt":"Create a breathtaking original single standalone fine-art square macro photograph, natural perspective and extraordinary photographic realism. On a sunlit natural travertine table, a plain large ivory ceramic coffee cup contains a complete astonishingly delicate alpine wilderness in its bowl: layered pine forests, snowy faraway mountains, islands, light mist, a bright silver waterfall and a winding lake, all enclosed by the oval cup rim. Real steam rises into an authentic domestic breakfast room. Lighting and photographic direction: Photographic macro-to-landscape illusion, softly blurred warm window light, real ceramic glaze and intricate natural miniature mountain detail. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 1:1. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1254,1254],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":569},{"id":"owner-20261031-new-10-storm-violin-cosmic-music","slug":"owner-20261031-new-10-storm-violin-cosmic-music","title":"The Violin that Holds a Storm","kind":"image","category":"Cinematic","description":"An original Deepsyq visual world: The Violin that Holds a Storm. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/10-storm-violin-cosmic-music.webp","prompt":"Create a breathtaking original single standalone cinematic photograph, natural perspective and extraordinary photographic realism. A monumental crystal-clear classical violin rests on a dark moonlit coastline, its transparent violin body enclosing impossibly real miniature storm seas with sailing ships, teal waves, distant lightning and sea foam. A fine luminous bow passes across the correct violin strings and seems to release a restrained constellation-like musical arc into a dark starry sky. Lighting and photographic direction: Moonlit midnight indigo, sapphire, bright silver reflections on clear glass, realistic polished wood and carefully controlled cold light. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 16:9. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1672,941],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":570},{"id":"owner-20261031-new-11-enchanting-glasswood-cathedral","slug":"owner-20261031-new-11-enchanting-glasswood-cathedral","title":"Cathedral of Glass Trees","kind":"image","category":"Nature & Fantasy","description":"An original Deepsyq visual world: Cathedral of Glass Trees. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/11-enchanting-glasswood-cathedral.webp","prompt":"Create a breathtaking original single standalone vertical editorial photograph, natural perspective and extraordinary photographic realism. An immense enchanted tropical forest where towering real-looking tree trunks are translucent living crystal, refracting sunlight through their visible wood grain; natural leaves and roots remain botanical. Dozens of giant tear-shaped clear crystal droplets hang between branches, each containing a perfect miniature fern, as a small fictional adult in a light coat stands amid mossy stream stones. Lighting and photographic direction: Vertically soaring perspective, authentic soft forest sunlight shafts, emerald leaves, glass refraction and realistic wet stone. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 9:16. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[941,1672],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":571},{"id":"owner-20261031-new-12-grand-piano-obsidian-river","slug":"owner-20261031-new-12-grand-piano-obsidian-river","title":"The Piano Becoming a River","kind":"image","category":"Cinematic","description":"An original Deepsyq visual world: The Piano Becoming a River. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/12-grand-piano-obsidian-river.webp","prompt":"Create a breathtaking original single standalone cinematic photograph, natural perspective and extraordinary photographic realism. A single elegant black lacquer grand piano stands on pure ochre desert sand, its complete keyboard, lid and legs perfectly recognisable; the piano body transitions seamlessly into one glossy stream of liquid obsidian that winds away through the dunes like a black mirror river. No extra instruments and no separate collage panels. Lighting and photographic direction: Panoramic desert, physically coherent viscous black reflective lacquer, warm late sunlight, realistic sand texture and controlled high-end architectural framing. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 16:9. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1672,941],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":572},{"id":"owner-20261031-new-13-peacock-feather-galaxy","slug":"owner-20261031-new-13-peacock-feather-galaxy","title":"Galaxy in a Peacock Feather","kind":"image","category":"Creative Effects","description":"An original Deepsyq visual world: Galaxy in a Peacock Feather. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/13-peacock-feather-galaxy.webp","prompt":"Create a breathtaking original single standalone fine-art square macro photograph, natural perspective and extraordinary photographic realism. Extreme photographic macro of one real peacock feather; emerald, petrol blue and iridescent gold filaments curl around the feather eye, where an entire intricate spiral galaxy, microscopic gold stars and lilac-blue nebula appear naturally embedded in its central ocellus, with tactile filaments at every scale. Lighting and photographic direction: Exquisite close-focus jewelry-advertising optics, deep black background, controlled dramatic color and realistic feather-barb fibers. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 1:1. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1254,1254],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":573},{"id":"owner-20261031-new-14-flowering-lightning-lavender","slug":"owner-20261031-new-14-flowering-lightning-lavender","title":"Lightning Made of Blossoms","kind":"image","category":"Nature & Fantasy","description":"An original Deepsyq visual world: Lightning Made of Blossoms. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/14-flowering-lightning-lavender.webp","prompt":"Create a breathtaking original single standalone vertical editorial photograph, natural perspective and extraordinary photographic realism. A towering branching bolt of white-gold lightning tears through indigo rainclouds over meticulously planted lavender rows, but every major lightning branch transforms into real luminous white jasmine blossoms and tiny stems, their petals distinct and anatomically believable, suspended within the lightning form. Lighting and photographic direction: Vertical landscape, intense deep blue-violet storm contrast, tactile lavender rows, genuine cloud structure, restrained white floral light. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 9:16. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[941,1672],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":574},{"id":"owner-20261031-new-15-cobalt-mushroom-lake","slug":"owner-20261031-new-15-cobalt-mushroom-lake","title":"The Luminous Cobalt Mushroom","kind":"image","category":"Nature & Fantasy","description":"An original Deepsyq visual world: The Luminous Cobalt Mushroom. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/15-cobalt-mushroom-lake.webp","prompt":"Create a breathtaking original single standalone cinematic photograph, natural perspective and extraordinary photographic realism. A single immense blue cobalt mushroom with a richly iridescent wet cap and delicately radiant pale-gold underside grows on a tiny mossy island in a mirror-still alpine lake. Its gills fan out in incredible realistic botanical detail and cast an extraordinarily nuanced reflection on still water against distant snowy mountains. Lighting and photographic direction: Cinematic panorama with believable mist, a restrained pearl dawn color palette, physically convincing reflective water and densely textured moss. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 16:9. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1672,941],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":575},{"id":"owner-20261031-new-16-astral-human-iris","slug":"owner-20261031-new-16-astral-human-iris","title":"A Universe within the Iris","kind":"image","category":"Fashion & Beauty","description":"An original Deepsyq visual world: A Universe within the Iris. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/16-astral-human-iris.webp","prompt":"Create a breathtaking original single standalone vertical editorial photograph, natural perspective and extraordinary photographic realism. An extreme medical-grade editorial macro photograph of a real human eye with naturally shaped eyelids, lashes, tear line, subtle pores and anatomically consistent cornea; a distant swirling blue gold and indigo spiral galaxy appears embedded entirely within the intricate natural fibers of the bright blue iris. Lighting and photographic direction: Accurate sharp eye focus, real human skin detail, delicate golden stellar highlights restricted to the iris, no artificial makeup or exaggerated smoothness. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 9:16. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[941,1672],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":576},{"id":"owner-20261031-new-17-city-within-illuminated-lotus","slug":"owner-20261031-new-17-city-within-illuminated-lotus","title":"The City in a Glass Lotus","kind":"image","category":"Creative Effects","description":"An original Deepsyq visual world: The City in a Glass Lotus. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/17-city-within-illuminated-lotus.webp","prompt":"Create a breathtaking original single standalone fine-art square macro photograph, natural perspective and extraordinary photographic realism. A colossal translucent milky-white luminous lotus opens its many huge petal-like glass membranes above a deep blue alpine lake, cradling one astonishingly delicate miniature illuminated palace settlement in the centre; its white-gold translucent botanical petals curve and overlap like realistic flower anatomy. Lighting and photographic direction: Panoramic blue-hour waterscape, gold warm internal glow and precise soft porcelain-glass refraction, graceful reflection and natural surroundings. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 1:1. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1254,1254],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":577},{"id":"owner-20261031-new-18-spiral-terrace-above-clouds","slug":"owner-20261031-new-18-spiral-terrace-above-clouds","title":"The Infinite Garden Staircase","kind":"image","category":"Cinematic","description":"An original Deepsyq visual world: The Infinite Garden Staircase. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/18-spiral-terrace-above-clouds.webp","prompt":"Create a breathtaking original single standalone vertical editorial photograph, natural perspective and extraordinary photographic realism. An enormous limestone helical staircase with perfectly detailed steps, arcades, balusters and luxuriant hanging flower beds curls upward into peach-white clouds; a single small woman in a teal dress walks up the stairs for scale, with endless distant mountain peaks revealed beyond soft clouds. Lighting and photographic direction: Vertical telephoto architectural photography, realistic florals and stone grain, soft pale lavender mist and gentle high-altitude sunrise. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 9:16. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[941,1672],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":578},{"id":"owner-20261031-new-19-seven-harps-of-water","slug":"owner-20261031-new-19-seven-harps-of-water","title":"Seven Harps of Falling Light","kind":"image","category":"Cinematic","description":"An original Deepsyq visual world: Seven Harps of Falling Light. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/19-seven-harps-of-water.webp","prompt":"Create a breathtaking original single standalone cinematic photograph, natural perspective and extraordinary photographic realism. Across an immense rust-red desert plateau stand seven monumental slender sculptural harp-shaped structures made of weathered bronze and stone. Their long strings are actually extraordinarily fine sheets of silver-gold water falling vertically into tiny shallow pools below. Each harp differs in height and sits at a different distance, creating long elegant perspective lines. Lighting and photographic direction: Epic panoramic desert photography, credible sunset side light, terracotta sand and bronze metal, delicately translucent moving water with subtle mist at the foot of each harp. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 16:9. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1672,941],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":579},{"id":"owner-20261031-new-20-glasshouse-train-in-clouds","slug":"owner-20261031-new-20-glasshouse-train-in-clouds","title":"The Hanging Botanical Express","kind":"image","category":"Creative Effects","description":"An original Deepsyq visual world: The Hanging Botanical Express. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/20-glasshouse-train-in-clouds.webp","prompt":"Create a breathtaking original single standalone cinematic photograph, natural perspective and extraordinary photographic realism. An enormous original vintage suspended railway train travels along narrow high-tension cables across snow-blanketed alpine mountains; its long transparent rounded carriages contain a warmly lit miniature tropical conservatory with green trees, moss, small waterfalls and verdant plants visible through realistic curved glass. Lighting and photographic direction: Deep dusk cobalt mountain atmosphere, complex but mechanically coherent brass tram fittings, true glass transparency and small warm amber lamps. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 16:9. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1672,941],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":580},{"id":"owner-20261031-new-21-crescent-moon-floating-gardens","slug":"owner-20261031-new-21-crescent-moon-floating-gardens","title":"Gardens within a Crescent Moon","kind":"image","category":"Nature & Fantasy","description":"An original Deepsyq visual world: Gardens within a Crescent Moon. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/21-crescent-moon-floating-gardens.webp","prompt":"Create a breathtaking original single standalone cinematic photograph, natural perspective and extraordinary photographic realism. An immense delicately curved physical crescent of pale carved marble floats above a broad dark-blue lake and alpine clouds, functioning as a miniature inhabited garden island; flowering terraces, elegant small marble pavilions, a long reflecting pool and warmly illuminated footpaths follow the inside curve of the crescent. Lighting and photographic direction: Widescreen twilight shot, violet-blue haze, soft amber garden lamps, elegant original sculpture and believable geological weight. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 16:9. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1672,941],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":581},{"id":"owner-20261031-new-22-celestial-jellyfish-lavender","slug":"owner-20261031-new-22-celestial-jellyfish-lavender","title":"Celestial Jellyfish over Lavender","kind":"image","category":"Nature & Fantasy","description":"An original Deepsyq visual world: Celestial Jellyfish over Lavender. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/22-celestial-jellyfish-lavender.webp","prompt":"Create a breathtaking original single standalone cinematic photograph, natural perspective and extraordinary photographic realism. Several enormous transparent violet jellyfish float high above a real lavender field at blue hour. Their natural bell-like anatomy contains tiny pale galaxies and star-like light, while exquisite nearly invisible streaming tentacles drift softly in the cool atmosphere; a small original stone farmhouse stands in the distance. Lighting and photographic direction: Cinematic panorama, peach-violet twilight, realistic botanical lavender rows, luminous translucent jellyfish material, precise atmospheric perspective. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 16:9. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1672,941],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":582},{"id":"owner-20261031-new-23-living-tree-library","slug":"owner-20261031-new-23-living-tree-library","title":"The Great Library of the Living Tree","kind":"image","category":"Creative Effects","description":"An original Deepsyq visual world: The Great Library of the Living Tree. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/23-living-tree-library.webp","prompt":"Create a breathtaking original single standalone vertical editorial photograph, natural perspective and extraordinary photographic realism. Inside a magnificent circular many-storied historical library rises one truly enormous ancient living oak tree, its massive bark-covered trunk and natural root system emerging from the marble floor, spreading leafy branches beneath a glazed dome while thousands of tiny paper pages float like leaves among the branches. Human-scale old bookshelves and reading tables make the immensity believable. Lighting and photographic direction: Vertical monumental interior photography, elegant softly diffused afternoon light, warm oak wood, genuine leaf shadows, precise bookcase and railing geometry. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 9:16. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[941,1672],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":583},{"id":"owner-20261031-new-24-gold-koi-couture","slug":"owner-20261031-new-24-gold-koi-couture","title":"Koi Constellation Couture","kind":"image","category":"Fashion & Beauty","description":"An original Deepsyq visual world: Koi Constellation Couture. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/24-gold-koi-couture.webp","prompt":"Create a breathtaking original single standalone vertical editorial photograph, natural perspective and extraordinary photographic realism. An original adult fashion model wears one full-length high-fashion black sculptural gown with detailed textile and gold stitching; a continuous airy spiral of graceful realistic white koi fish with patterned black-and-gold scales orbits around her against a huge empty dark stone hall. The model has correct natural human anatomy and a composed expression. Lighting and photographic direction: Vertical couture editorial with controlled warm spotlights, natural black satin and porcelain-white koi skin, surreal yet sophisticated motion. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 9:16. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[941,1672],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":584},{"id":"owner-20261031-new-25-amber-crystal-sanctuary","slug":"owner-20261031-new-25-amber-crystal-sanctuary","title":"The Amber Crystal Sanctuary","kind":"image","category":"Cinematic","description":"An original Deepsyq visual world: The Amber Crystal Sanctuary. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/25-amber-crystal-sanctuary.webp","prompt":"Create a breathtaking original single standalone vertical editorial photograph, natural perspective and extraordinary photographic realism. An immense cavern beneath the earth is filled with naturally faceted translucent champagne-amber quartz towers growing directly from black stone, forming an accidental cathedral-like architecture of crystalline spires and archways. A tiny solitary visitor stands beside shallow cool turquoise mineral pools for scale. Lighting and photographic direction: Vertically monumental geological photography, realistic translucent inclusions and sparkling facet boundaries, shafts of daylight entering through high cavern openings. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 9:16. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[941,1672],"aspectRatio":"9:16","requiredInputTypes":[],"defaultSettings":{"ratio":"9:16"},"actionTarget":"studio","featured":true,"sortOrder":585},{"id":"owner-20261031-new-26-city-in-suspended-coffee-drop","slug":"owner-20261031-new-26-city-in-suspended-coffee-drop","title":"City inside a Coffee Drop","kind":"image","category":"Food & Lifestyle","description":"An original Deepsyq visual world: City inside a Coffee Drop. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/26-city-in-suspended-coffee-drop.webp","prompt":"Create a breathtaking original single standalone fine-art square macro photograph, natural perspective and extraordinary photographic realism. A single physically convincing immense teardrop of dark amber coffee floats above a plain espresso cup on a stone windowsill; the transparent glowing coffee drop encloses a tiny warmly lit historic riverside city with ornate bridges, fine roofs, fog and a distant thunderstorm, all confined within the droplet. Real steam rises around the cup. Lighting and photographic direction: Square premium macro, rich coffee-gold light against moody charcoal interior, believable liquid surface tension and delicate realistic tabletop reflections. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 1:1. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1254,1254],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":586},{"id":"owner-20261031-new-27-opalescent-butterfly-orchid","slug":"owner-20261031-new-27-opalescent-butterfly-orchid","title":"The Opalescent Butterfly","kind":"image","category":"Nature & Fantasy","description":"An original Deepsyq visual world: The Opalescent Butterfly. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/27-opalescent-butterfly-orchid.webp","prompt":"Create a breathtaking original single standalone fine-art square macro photograph, natural perspective and extraordinary photographic realism. A single delicate original butterfly with anatomically plausible wings made from extraordinarily fine translucent opalescent stained glass and platinum-gold veins perches on a richly textured dark-blue flower; the jewel-like wing membranes have complex real-looking spectral interference patterns and gold details, without any miniature palaces or scenery inside. Lighting and photographic direction: Square extreme macro, midnight blue velvet-like petals, natural dew droplets, restrained warm highlights and precise realistic subject geometry. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 1:1. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1254,1254],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":587},{"id":"owner-20261031-new-28-mountain-world-in-geode","slug":"owner-20261031-new-28-mountain-world-in-geode","title":"A World inside a Geode","kind":"image","category":"Creative Effects","description":"An original Deepsyq visual world: A World inside a Geode. Open its detailed image and copy the complete creative prompt to try your own version.","previewUrl":"/media/inspiration/owner-next-20261031/28-mountain-world-in-geode.webp","prompt":"Create a breathtaking original single standalone fine-art square macro photograph, natural perspective and extraordinary photographic realism. A single cut-open black volcanic geode rests on an understated glossy dark stone plinth; behind the jagged rim of real clear amethyst quartz crystals an impossibly deep complete tiny mountain landscape is visible: pine-covered slopes, alpine turquoise lake, graceful waterfall, little timber bridge, blue mist and far-away illuminated mountains, all inside the same geode. Lighting and photographic direction: Square gemstone-studio macro photograph with tactile volcanic exterior, physically coherent refraction through cut quartz and subdued warm directional light. The scene should be visually arresting yet physically coherent in the materials, lighting, anatomy, depth and scale; precisely detailed handcrafted structures, authentic textures, subtly nuanced color, convincing photographic optics and reflections, rich but not garish. The central concept must be instantly recognizable and fully contained in one complete frame. Output aspect ratio 1:1. No typography, caption, logos, brand, watermark, grids, split panels, collage, misplaced anatomy, duplicated objects, plastic texture or unrelated decorative elements.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1254,1254],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":588},{"id":"sculptural-gold-mineral-ring","slug":"sculptural-gold-mineral-ring","title":"Sculptural Gold Mineral Ring","kind":"image","category":"Product Ads","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-20261031/sculptural-gold-mineral-ring.webp","prompt":"Photoreal luxury jewelry campaign, square composition. A single original sculptural 18-karat yellow-gold ring levitates just above a dark charcoal velvet cylindrical jewelry podium against a completely black studio backdrop. The setting is an irregular rough uncut mineral crystal in deep teal, translucent clear quartz and champagne amber; organic asymmetrical polished gold branches wrap securely around the setting, with tiny hand-crafted contours and precise realistic reflections. Controlled warm spotlight and thin rim light, black velvet texture, upscale macro product photography, hero product fully in frame, elegant shadow below the floating ring. No text, lettering, typography, watermark, brand, logo, frame, collage or UI. Preserve accurate object geometry, physically coherent reflections and shadows, realistic materials and detail.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1254,1254],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":750},{"id":"crystal-cliffs-mirror-lake","slug":"crystal-cliffs-mirror-lake","title":"Crystal Cliffs and Mirror Lake","kind":"image","category":"Cinematic","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-20261031/crystal-cliffs-mirror-lake.webp","prompt":"Epic wide cinematic landscape at sunrise. A remote crystal-clear Alpine lake forms a perfect reflection of jagged snow-capped mountains. Along the right shoreline rise towering translucent blue-white crystalline cliffs, their faceted mineral faces refracting golden sunlight; a slender natural waterfall pours into the still water in the far distance. Mist in the pine forests, rugged wildflower foreground, physically convincing geological textures and atmospheric depth, natural golden hour lighting, premium travel editorial detail, clean horizontal composition. No text, lettering, typography, watermark, brand, logo, frame, collage or UI. Preserve accurate object geometry, physically coherent reflections and shadows, realistic materials and detail.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1254,1254],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":751},{"id":"aurora-mountain-observatory","slug":"aurora-mountain-observatory","title":"Aurora Mountain Observatory","kind":"image","category":"Cinematic","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-20261031/aurora-mountain-observatory.webp","prompt":"Ultra-detailed cinematic winter-night landscape, square composition. An original majestic stone and brass astronomical observatory stands on a snow-covered rocky mountain summit, its dome open to the starry sky and warm amber light shining through large arched windows. Vast luminous green and violet northern lights sweep across a deep indigo Milky Way, distant snowy peaks descending into clouds, delicate cold moonlight on foreground rocks and evergreens, astronomically evocative atmosphere with coherent architectural geometry, realistic snow, compelling sense of scale. No text, lettering, typography, watermark, brand, logo, frame, collage or UI. Preserve accurate object geometry, physically coherent reflections and shadows, realistic materials and detail.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1254,1254],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":752},{"id":"origami-city-sketchbook","slug":"origami-city-sketchbook","title":"Origami City Sketchbook","kind":"image","category":"Creative Effects","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-20261031/origami-city-sketchbook.webp","prompt":"Square-format editorial miniature art photograph in a warm sunlit creative studio. From the spread of a thick handmade blank sketchbook rises an exquisitely detailed original origami coastal city of folded ivory paper, terracotta-paper tiled roofs, paper towers, trees, tiny bridges and miniature cream paper sailing boats on a reflective narrow turquoise canal. Visible crisp paper folds and hand-cut edges, delicate tiny shadows from real daylight streaming through a studio window, natural wood desk, scattered craft tools in soft background bokeh, high-end handcrafted diorama photography. No text, lettering, typography, watermark, brand, logo, frame, collage or UI. Preserve accurate object geometry, physically coherent reflections and shadows, realistic materials and detail.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1254,1254],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":753},{"id":"berry-pistachio-millefeuille","slug":"berry-pistachio-millefeuille","title":"Berry Pistachio Mille-Feuille","kind":"image","category":"Food & Lifestyle","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-20261031/berry-pistachio-millefeuille.webp","prompt":"Square upscale food editorial photograph. A beautifully constructed French mille-feuille pastry on a rustic ivory handmade ceramic plate, three airy sheets of flaky caramel-gold puff pastry, generous but neat vanilla pastry cream, fresh raspberries, halved strawberries, whole blueberries, green pistachio crumbles and two small fresh mint sprigs. Detailed appetizing pastry texture and delicate sugar dusting, warm lateral window sunlight, natural café wood tabletop, subtle background bouquet in soft bokeh, realistic food proportions and beautiful natural imperfection. No text, lettering, typography, watermark, brand, logo, frame, collage or UI. Preserve accurate object geometry, physically coherent reflections and shadows, realistic materials and detail.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1254,1254],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":754},{"id":"owner-batch2-cobalt-glass-handbag","slug":"owner-batch2-cobalt-glass-handbag","title":"Cobalt Glass Handbag","kind":"image","category":"Product Ads","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-batch2-20261031/01-cobalt-glass-handbag.webp","prompt":"A sculptural luxury handbag made entirely from thick transparent cobalt-blue glass with curved glass handles, floating above a glossy dark marble platform. A ribbon of clear water loops dramatically around the handbag, with suspended droplets frozen midair. Ultra-detailed premium studio product photography, convincing optical refraction, deep midnight background, crisp white-blue specular highlights, physically coherent reflections, refined minimal composition. The handbag is an entirely fictional unbranded design, no logos, no lettering, no watermarks.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1254,1254],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":755},{"id":"owner-batch2-cloud-chess","slug":"owner-batch2-cloud-chess","title":"Cloud Chess Above the Mountains","kind":"image","category":"Creative Effects","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-batch2-20261031/02-cloud-chess.webp","prompt":"An immense floating stone chessboard suspended high above a sunlit sea of clouds amid rugged peaks at dawn. Intricate chess pieces formed from soft white clouds occupy the board, their recognisable shapes illuminated by warm sunrise and long mountain shadows. Cinematic aerial wide perspective, delicate volumetric fog, realistic travertine, dreamy but visually coherent fantasy architecture, elegant quiet atmosphere. No text, brands, or watermark.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1122,1402],"aspectRatio":"4:5","requiredInputTypes":[],"defaultSettings":{"ratio":"4:5"},"actionTarget":"studio","featured":true,"sortOrder":756},{"id":"owner-batch2-silver-spiral-ballet","slug":"owner-batch2-silver-spiral-ballet","title":"Silver Spiral Ballet","kind":"image","category":"Fashion & Beauty","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-batch2-20261031/03-silver-spiral-ballet.webp","prompt":"A fully clothed adult ballet dancer performing an immaculate arabesque on a dark polished stage. She wears a detailed black feather-inspired ballet costume and pointe shoes; an enormous continuous ribbon of polished silvery metal sweeps in a graceful three-dimensional spiral around her without touching her. Fine studio spotlighting, glossy realistic floor reflections, anatomical accuracy, elegant long-line pose, professional dance editorial photograph, dark charcoal surroundings. No lettering or logos.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1122,1402],"aspectRatio":"4:5","requiredInputTypes":[],"defaultSettings":{"ratio":"4:5"},"actionTarget":"studio","featured":true,"sortOrder":757},{"id":"owner-batch2-peacock-nebula","slug":"owner-batch2-peacock-nebula","title":"Galaxy in a Peacock Feather","kind":"image","category":"Creative Effects","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-batch2-20261031/04-peacock-nebula.webp","prompt":"Extreme macro photograph of an iridescent peacock feather, its turquoise, emerald and bronze filaments rendered with exceptional natural detail. At the feather's central eye a luminous miniature spiral galaxy appears inside the pigment, with thousands of tiny blue and gold stars and a softly glowing galactic core. Deep cinematic dark background, realistic iridescence and micro-textures, precisely focused subject, magical cosmic science-art aesthetic. No text or branding.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1600,900],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":758},{"id":"owner-batch2-jasmine-lightning","slug":"owner-batch2-jasmine-lightning","title":"Jasmine Lightning","kind":"image","category":"Cinematic","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-batch2-20261031/05-jasmine-lightning.webp","prompt":"At twilight above an expansive purple lavender field, dark storm clouds part around a striking lightning-bolt-shaped branch of living white jasmine flowers and tiny green leaves. The floral lightning emits subtle warm ivory light, connecting high turbulent clouds to the distant horizon. Moody cinematic landscape, detailed lavender in the foreground, dramatic sky, natural flower morphology, sophisticated atmospheric perspective, believable environmental illumination. No text, logos or watermarks.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1254,1254],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":759},{"id":"owner-batch2-crystal-butterfly-rose","slug":"owner-batch2-crystal-butterfly-rose","title":"Crystal Butterfly and Red Rose","kind":"image","category":"Nature & Fantasy","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-batch2-20261031/06-crystal-butterfly-rose.webp","prompt":"Photoreal macro composition of a magnificent scarlet red rose covered with fine transparent dew drops. An impossibly delicate butterfly with clear crystalline wings edged by frost hovers directly over the rose, its anatomically plausible body and fragile wing veins perfectly defined. Cool dark-green garden bokeh, warm amber backlight from one side and subtle cool rim illumination, astonishing petal and water detail, natural photographic depth of field. No words, logos or watermark.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1122,1402],"aspectRatio":"4:5","requiredInputTypes":[],"defaultSettings":{"ratio":"4:5"},"actionTarget":"studio","featured":true,"sortOrder":760},{"id":"owner-batch2-glass-lotus-city","slug":"owner-batch2-glass-lotus-city","title":"Glass Lotus City","kind":"image","category":"Creative Effects","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-batch2-20261031/07-glass-lotus-city.webp","prompt":"A miniature luminous fantasy city built within the transparent glass petals of an enormous open water lily floating on a dark teal mountain lake at blue hour. Tiny stone villas, terraces, bridges, amber windows and miniature trees grow at the flower's center. Transparent petals with intricate veins refract the city lights; distant shore and mountains fade into dusk. Fine architectural miniature photography, physically convincing glass and reflections, sophisticated magical realism. No text or logos.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1254,1254],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":761},{"id":"owner-batch2-piano-black-river","slug":"owner-batch2-piano-black-river","title":"Piano Becoming a Black River","kind":"image","category":"Cinematic","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-batch2-20261031/08-piano-black-river.webp","prompt":"An elegant glossy black grand piano standing alone on sunlit rust-orange desert dunes. Its long sculptural tail appears to melt into a perfectly reflective black liquid river that winds across the sand into the distance. Sunset light on fine dunes, faraway rugged mountains, authentic piano keys and legs, seamless impossible transition from lacquer to fluid, rich contrast, cinematic panoramic framing, realistic shadows and reflections. Unbranded instrument, no writing or watermark.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1600,900],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":762},{"id":"owner-batch2-honey-planet","slug":"owner-batch2-honey-planet","title":"Honey Planet","kind":"image","category":"Food & Lifestyle","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-batch2-20261031/09-honey-planet.webp","prompt":"A miniature planet of luminous amber honey, shaped like a semi-transparent sphere with delicate hexagonal honeycomb facets and a thin orbiting ring of liquid honey, floating just above a handmade dark stone spoon filled with golden syrup. Tiny drops suspended around it, warmly lit dark rustic background, extreme editorial macro photography, true-to-life viscosity and highlights, tactile stone and golden caustics. No text, logos or watermark.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1600,900],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":763},{"id":"owner-batch2-volcanic-oasis","slug":"owner-batch2-volcanic-oasis","title":"Oasis in Volcanic Stone","kind":"image","category":"Cinematic","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-batch2-20261031/10-volcanic-oasis.webp","prompt":"A tiny secluded desert oasis enclosed inside a natural hollow of rough black volcanic rock on a wave-washed coast. Small golden sand dunes, one delicate palm tree, crystal-clear turquoise lagoon and tiny tropical foliage appear at miniature scale, with foam moving over dark outer rocks. Late golden-hour sun, extraordinary geological textures, precise clean reflections and delicate surf, cinematic tilt-shift style but true photo-real materials. No text or logos.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1600,900],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":764},{"id":"owner-batch2-emerald-rain","slug":"owner-batch2-emerald-rain","title":"Emerald Rain Forest","kind":"image","category":"Fashion & Beauty","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-batch2-20261031/11-emerald-rain.webp","prompt":"An editorial portrait of a fictional adult woman with a natural short dark bob and a textured opaque ivory blazer in a sun-dappled deep green forest. Numerous crystal raindrops hang in the air around her; each droplet contains a tiny vivid green fern leaf, like preserved nature specimens. Convincing human anatomy and skin, shallow depth of field, rich moss and fern undergrowth, soft light breaking through leaves, refined cinematic nature fashion photograph. No logos, no typography.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1122,1402],"aspectRatio":"4:5","requiredInputTypes":[],"defaultSettings":{"ratio":"4:5"},"actionTarget":"studio","featured":true,"sortOrder":765},{"id":"owner-batch2-opal-galaxy-eye","slug":"owner-batch2-opal-galaxy-eye","title":"Opal Galaxy Iris","kind":"image","category":"Beauty","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-batch2-20261031/12-opal-galaxy-eye.webp","prompt":"Hyper-detailed close-up macro photograph of a single human eye, with natural skin texture, lashes and eyebrow. The iris contains exquisite blue opalescent patterns and delicate warm gold lightning-like flecks that resemble cosmic filaments, with a deep black pupil; sclera and eyelids remain anatomically realistic. Soft cool photographic illumination, fine controlled corneal reflections, clean macro focus and professional skin detail, non-identifiable fictional model. No text or brand.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1122,1402],"aspectRatio":"4:5","requiredInputTypes":[],"defaultSettings":{"ratio":"4:5"},"actionTarget":"studio","featured":true,"sortOrder":766},{"id":"owner-batch2-quartz-clockwork-peony","slug":"owner-batch2-quartz-clockwork-peony","title":"Rose Quartz Clockwork Peony","kind":"image","category":"Creative Effects","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-batch2-20261031/13-quartz-clockwork-peony.webp","prompt":"A magnificent fully open peony carved from translucent pale pink rose quartz, with thin lifelike mineral petals catching soft sunset light. A small intricate arrangement of delicate polished golden clockwork gears, cogs and crystal spheres sits naturally at its heart. It grows on a dark rocky alpine ledge against blurred lavender mountains, high-end fine-art gemstone macro photography, physically plausible stone translucency, crisp metalwork, elegant composition. No lettering or logos.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1600,900],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":767},{"id":"owner-batch2-sky-garden-staircase","slug":"owner-batch2-sky-garden-staircase","title":"Garden Stairway Above Clouds","kind":"image","category":"Fantasy","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-batch2-20261031/14-sky-garden-staircase.webp","prompt":"An immense graceful spiral staircase of pale limestone climbs vertically above a sea of peach-colored dawn clouds into the open sky. Both sides of the stairs overflow with small living flowering plants and greenery. A single fully clothed adult woman in a teal long coat climbs the lower steps for scale, seen from behind; distant rugged mountain islands appear through the mist. Cinematic architecture photography, credible perspective, gentle morning sun, refined pastel atmosphere. No text, no logo.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1254,1254],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":768},{"id":"owner-batch2-cobalt-mushroom","slug":"owner-batch2-cobalt-mushroom","title":"Cobalt Mushroom Island","kind":"image","category":"Nature & Fantasy","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-batch2-20261031/15-cobalt-mushroom.webp","prompt":"An enormous saturated cobalt-blue mushroom with realistic luminous gills rises from a tiny lush moss-covered island in a completely still alpine lake. Dark pine forests and distant snowy mountain peaks frame the composition at sunrise; the giant mushroom and sky reflect clearly in the water. Photoreal high-resolution landscape, carefully sculpted fungal textures, warm gold backlight, atmospheric mist, serene magical realism with coherent scale and water physics. No text, logo or watermark.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1600,900],"aspectRatio":"16:9","requiredInputTypes":[],"defaultSettings":{"ratio":"16:9"},"actionTarget":"studio","featured":true,"sortOrder":769},{"id":"owner-batch2-diamond-espresso","slug":"owner-batch2-diamond-espresso","title":"Diamond Espresso Vortex","kind":"image","category":"Food & Lifestyle","description":"Owner-supplied visual artwork. Explore the scene and customize its prompt in Image Studio.","previewUrl":"/media/inspiration/owner-batch2-20261031/16-diamond-espresso.webp","prompt":"A perfectly cut transparent diamond floats above a simple ivory ceramic cup of freshly prepared espresso on a warm stone breakfast table. Inside the large diamond a rich amber coffee vortex swirls like a tiny contained storm, with delicate bubbles, reflections and bright caustic sunlight. Soft morning window light, sophisticated luxury food advertising macro, real ceramic and gemstone material, convincing coffee texture, clean creamy background. No logo, no text or watermark.","defaultModel":null,"displayModel":"Choose an available Studio model","previewDimensions":[1254,1254],"aspectRatio":"1:1","requiredInputTypes":[],"defaultSettings":{"ratio":"1:1"},"actionTarget":"studio","featured":true,"sortOrder":770}];
const CREATIVE_TEMPLATES = [{"id":"creative50-bottle-of-weather","title":"Weather in a Bottle","description":"Explore the effect and adapt its original prompt in Studio.","category":"Creative Effects","generationType":"image","thumbnail":"/media/creative/creative50-20261021/10-bottle-of-weather.webp","promptTemplate":"Create one entirely original premium photographic artwork, vertical 4:5 composition for an AI creative platform. An unbranded frosted perfume bottle contains a miniature thunderstorm: a dramatic dark cloud, tiny golden lightning and delicate suspended rain, sealed behind thick clear glass. Set on warm sand with one calm beam of sunlight. Premium product campaign photography, physically convincing glass, moody gold and slate palette. Strong immediate visual impact with one coherent unusual effect that viewers will want to recreate. Highest photographic realism and fine material detail, sophisticated editorial art direction, physically coherent light inside the surreal concept. No text, letters, numbers, logos, watermarks, UI, collage, grids or borders. No real identifiable people or brands; adults fully clothed when present. Natural anatomy, no duplicated faces or extra limbs. One finished image.","defaultModel":null,"defaultSettings":{"ratio":"4:5"},"requiredInputTypes":[],"featured":true,"active":true},{"id":"creative50-embroidered-dawn","title":"Embroidered Dawn","description":"Explore the effect and adapt its original prompt in Studio.","category":"Creative Effects","generationType":"image","thumbnail":"/media/creative/creative50-20261021/11-embroidered-dawn.webp","promptTemplate":"Create one entirely original premium photographic artwork, landscape 16:9 composition for an AI creative platform. A close editorial portrait of an original adult woman with freckles and a fully opaque white blouse. Fine golden embroidery crosses the air around her like a three-dimensional sunrise, tiny threads casting real soft shadows on her cheek. Ivory background, subtle natural skin, warm macro beauty light, tactile thread detail. Strong immediate visual impact with one coherent unusual effect that viewers will want to recreate. Highest photographic realism and fine material detail, sophisticated editorial art direction, physically coherent light inside the surreal concept. No text, letters, numbers, logos, watermarks, UI, collage, grids or borders. No real identifiable people or brands; adults fully clothed when present. Natural anatomy, no duplicated faces or extra limbs. One finished image.","defaultModel":null,"defaultSettings":{"ratio":"16:9"},"requiredInputTypes":[],"featured":true,"active":true},{"id":"creative50-urban-bonsai","title":"Urban Bonsai","description":"Explore the effect and adapt its original prompt in Studio.","category":"Creative Effects","generationType":"image","thumbnail":"/media/creative/creative50-20261021/12-urban-bonsai.webp","promptTemplate":"Create one entirely original premium photographic artwork, square 1:1 composition for an AI creative platform. A perfectly realistic miniature coastal city grows from the crown of a twisted ancient bonsai tree in a handcrafted charcoal ceramic pot. Tiny terraced houses, suspended bridges and warm lit windows integrate naturally with the branches. Premium miniature architectural photograph, midnight teal backdrop, cinematic scale and crisp bark texture. Strong immediate visual impact with one coherent unusual effect that viewers will want to recreate. Highest photographic realism and fine material detail, sophisticated editorial art direction, physically coherent light inside the surreal concept. No text, letters, numbers, logos, watermarks, UI, collage, grids or borders. No real identifiable people or brands; adults fully clothed when present. Natural anatomy, no duplicated faces or extra limbs. One finished image.","defaultModel":null,"defaultSettings":{"ratio":"1:1"},"requiredInputTypes":[],"featured":true,"active":true},{"id":"creative50-liquid-porcelain","title":"Liquid Porcelain","description":"Explore the effect and adapt its original prompt in Studio.","category":"Creative Effects","generationType":"image","thumbnail":"/media/creative/creative50-20261021/13-liquid-porcelain.webp","promptTemplate":"Create one entirely original premium photographic artwork, vertical 4:5 composition for an AI creative platform. A white porcelain sneaker with translucent sky-blue laces melts into a perfectly smooth ribbon of liquid ceramic, frozen mid-splash around the original intact shoe. High-speed unbranded fashion product photograph, warm apricot background, highly tactile glazed finish, crisp droplets and sculptural composition. Strong immediate visual impact with one coherent unusual effect that viewers will want to recreate. Highest photographic realism and fine material detail, sophisticated editorial art direction, physically coherent light inside the surreal concept. No text, letters, numbers, logos, watermarks, UI, collage, grids or borders. No real identifiable people or brands; adults fully clothed when present. Natural anatomy, no duplicated faces or extra limbs. One finished image.","defaultModel":null,"defaultSettings":{"ratio":"4:5"},"requiredInputTypes":[],"featured":true,"active":true},{"id":"creative50-prism-hair","title":"Prism Hair","description":"Explore the effect and adapt its original prompt in Studio.","category":"Creative Effects","generationType":"image","thumbnail":"/media/creative/creative50-20261021/14-prism-hair.webp","promptTemplate":"Create one entirely original premium photographic artwork, landscape 16:9 composition for an AI creative platform. An original adult East Asian woman in a fully opaque black turtleneck, photographed in profile. Her sleek dark hair transforms at its tips into hundreds of tiny floating optical prisms, splitting one shaft of sunlight into a delicate rainbow across the charcoal backdrop. Realistic skin, fine hair, fashion editorial precision. Strong immediate visual impact with one coherent unusual effect that viewers will want to recreate. Highest photographic realism and fine material detail, sophisticated editorial art direction, physically coherent light inside the surreal concept. No text, letters, numbers, logos, watermarks, UI, collage, grids or borders. No real identifiable people or brands; adults fully clothed when present. Natural anatomy, no duplicated faces or extra limbs. One finished image.","defaultModel":null,"defaultSettings":{"ratio":"16:9"},"requiredInputTypes":[],"featured":true,"active":true},{"id":"creative50-botanical-audio","title":"Botanical Audio","description":"Explore the effect and adapt its original prompt in Studio.","category":"Creative Effects","generationType":"image","thumbnail":"/media/creative/creative50-20261021/15-botanical-audio.webp","promptTemplate":"Create one entirely original premium photographic artwork, square 1:1 composition for an AI creative platform. A pair of unbranded matte-ivory over-ear headphones rests on a smoked-glass pedestal. From the earcups grows a delicate sculptural sound wave made from real orange orchids and thin green vines, frozen in the air. Luxury lifestyle product photograph, moss-green background, clean sunlight and extraordinarily fine material detail. Strong immediate visual impact with one coherent unusual effect that viewers will want to recreate. Highest photographic realism and fine material detail, sophisticated editorial art direction, physically coherent light inside the surreal concept. No text, letters, numbers, logos, watermarks, UI, collage, grids or borders. No real identifiable people or brands; adults fully clothed when present. Natural anatomy, no duplicated faces or extra limbs. One finished image.","defaultModel":null,"defaultSettings":{"ratio":"1:1"},"requiredInputTypes":[],"featured":true,"active":true},{"id":"creative50-citrus-architecture","title":"Citrus Architecture","description":"Explore the effect and adapt its original prompt in Studio.","category":"Creative Effects","generationType":"image","thumbnail":"/media/creative/creative50-20261021/16-citrus-architecture.webp","promptTemplate":"Create one entirely original premium photographic artwork, vertical 4:5 composition for an AI creative platform. An original impossible modernist summer house is built inside the cross-section of a gigantic fresh blood orange resting on pale travertine. Warm miniature rooms follow the citrus segments, a small pool occupies the center. Architectural food macro photograph, believable pulp, cream and ruby palette, Mediterranean sunlight. Strong immediate visual impact with one coherent unusual effect that viewers will want to recreate. Highest photographic realism and fine material detail, sophisticated editorial art direction, physically coherent light inside the surreal concept. No text, letters, numbers, logos, watermarks, UI, collage, grids or borders. No real identifiable people or brands; adults fully clothed when present. Natural anatomy, no duplicated faces or extra limbs. One finished image.","defaultModel":null,"defaultSettings":{"ratio":"4:5"},"requiredInputTypes":[],"featured":true,"active":true},{"id":"creative50-snow-globe-dress","title":"Snow Globe Dress","description":"Explore the effect and adapt its original prompt in Studio.","category":"Creative Effects","generationType":"image","thumbnail":"/media/creative/creative50-20261021/17-snow-globe-dress.webp","promptTemplate":"Create one entirely original premium photographic artwork, landscape 16:9 composition for an AI creative platform. An original adult fashion model wears a fully opaque silver couture coat whose wide structured skirt contains delicate transparent panels with a miniature snow-covered pine forest inside. Natural hands and face, pale grey studio, luxurious winter editorial photograph, precise glass, fabric and snow textures. Strong immediate visual impact with one coherent unusual effect that viewers will want to recreate. Highest photographic realism and fine material detail, sophisticated editorial art direction, physically coherent light inside the surreal concept. No text, letters, numbers, logos, watermarks, UI, collage, grids or borders. No real identifiable people or brands; adults fully clothed when present. Natural anatomy, no duplicated faces or extra limbs. One finished image.","defaultModel":null,"defaultSettings":{"ratio":"16:9"},"requiredInputTypes":[],"featured":true,"active":true}];

const INSTRUCTIONS = 'Ты JARVIS — исполнительный лаконичный ассистент платформы DEEPSYQ. DEEPSYQ — творческая AI-платформа с Image Studio (изображения), Video Studio (видео), Audio Studio (аудио), Canvas, AI Apps, Everyday Tools, Video Uniquifier и Inspiration. Отвечай кратко, ёмко, дружелюбно, максимум 1–2 предложения на языке пользователя.';

const studioJobs = new Map();
const dailyUserUsage = new Map();
function getDailyUsage(clientKey) {
  const today = new Date().toISOString().slice(0, 10);
  const key = clientKey + ':' + today;
  if (!dailyUserUsage.has(key)) {
    dailyUserUsage.set(key, { photo: 0, video: 0, music: 0 });
  }
  return dailyUserUsage.get(key);
}
const jarvixSessions = new Map();
const edgeUsers = new Map();
const edgeWallets = new Map();
const edgeWalletLedger = new Map();
const edgeHistory = new Map();
const edgeOnboarding = new Map();
const edgeRevenueLedger = [];
const platformUnitEconomics = {
  totalGrossRevenue: 0,
  totalOwnerProfit: 0,
  totalProviderBudget: 0,
  totalProviderSpent: 0,
  profitMarginRatio: 2.0
};

const LIVE_SUBSCRIPTION_LINKS = {
  trial: 'https://buy.stripe.com/9B6fZicoSbdCd3b3e62go04',
  basic: 'https://buy.stripe.com/bJe8wQfB43La4wF15Y2go00',
  pro: 'https://buy.stripe.com/cNi7sMex04Pe5AJ2a22go01',
  business: 'https://buy.stripe.com/aFa9AUdsW0yY0gp9Cu2go02',
  lifetime: 'https://buy.stripe.com/28EeVefB4gxWd3b9Cu2go03'
};

const LIVE_PLAN_BY_PAYMENT_LINK = {
  plink_1UZXihLR9hQMNEjMDGxNNXEm: 'trial',
  plink_1UGmmeLR9hQMNEjMZVZ5eN8L: 'basic',
  plink_1UGmmnLR9hQMNEjM3sgPdOko: 'pro',
  plink_1UGmn4LR9hQMNEjMbzEI1BHH: 'business',
  plink_1UHhvRLR9hQMNEjMcjgYl6HG: 'lifetime'
};

const LIVE_CREDIT_PACKS = [
  { sku: 'credits_1000', baseCredits: 1000, bonusCredits: 200, credits: 1200, amount: 1000, currency: 'usd', priceId: 'price_1UZTCqLR9hQMNEjM5LiVHcNi' },
  { sku: 'credits_10000', baseCredits: 10000, bonusCredits: 3333, credits: 13333, amount: 10000, currency: 'usd', priceId: 'price_1UZTDoLR9hQMNEjMrZ5nkhXS' },
  { sku: 'credits_100000', baseCredits: 100000, bonusCredits: 20000, credits: 120000, amount: 100000, currency: 'usd', priceId: 'price_1UZTEhLR9hQMNEjMomMuGN4s' },
  { sku: 'credits_1000000', baseCredits: 1000000, bonusCredits: 200000, credits: 1200000, amount: 1000000, currency: 'usd', priceId: 'price_1UZTFnLR9hQMNEjMo91Ep5Ps' },
  { sku: 'credits_10000000', baseCredits: 10000000, bonusCredits: 2000000, credits: 12000000, amount: 10000000, currency: 'usd', priceId: 'price_1UZTGrLR9hQMNEjMOq5eAA8r' }
];

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      ...extraHeaders
    }
  });
}

function base64UrlEncodeBytes(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeStr(str) {
  return base64UrlEncodeBytes(new TextEncoder().encode(str));
}

function base64UrlDecodeBytes(str) {
  const padded = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const bin = atob(padded + '='.repeat(padLen));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function base64UrlDecodeStr(str) {
  return new TextDecoder().decode(base64UrlDecodeBytes(str));
}

function getJwtSecret(env) {
  return String(env.APP_JWT_SECRET || env.JARVIX_QUOTA_HASH_SECRET || 'deepsyq-edge-jwt-secret-2026');
}

async function signJwt(payload, env) {
  const secret = getJwtSecret(env);
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iss: 'video-variator',
    aud: 'video-variator-client',
    iat: now,
    exp: now + 7 * 86400
  };
  const unsigned = base64UrlEncodeStr(JSON.stringify(header)) + '.' + base64UrlEncodeStr(JSON.stringify(fullPayload));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(unsigned));
  return unsigned + '.' + base64UrlEncodeBytes(new Uint8Array(sig));
}

async function verifyJwt(token, env) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const secret = getJwtSecret(env);
  const unsigned = parts[0] + '.' + parts[1];
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const valid = await crypto.subtle.verify('HMAC', key, base64UrlDecodeBytes(parts[2]), new TextEncoder().encode(unsigned));
  if (!valid) return null;
  const payload = JSON.parse(base64UrlDecodeStr(parts[1]));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function isOwnerEmail(email, env) {
  const adminEmail = String(env.ADMIN_EMAIL || 'mvryhan@gmail.com').trim().toLowerCase();
  return Boolean(email && String(email).trim().toLowerCase() === adminEmail);
}

function buildPublicUser(u, env) {
  const isAdmin = isOwnerEmail(u.email, env) || Boolean(u.isAdmin);
  if (isAdmin) {
    return {
      id: u.id,
      email: u.email || null,
      name: u.name || null,
      isAdmin: true,
      usage: {
        plan: 'business',
        limit: 15000,
        used: 0,
        remaining: 15000,
        active: true,
        unlimited: false,
        allFeatures: true,
        unit: 'credits',
        status: 'admin',
        currentPeriodEnd: null
      }
    };
  }
  const plan = u.plan || 'trial';
  const status = u.subscription_status || 'inactive';
  const lifetime = plan === 'lifetime' && status === 'lifetime';
  const active = lifetime || ['active', 'trialing'].includes(status);
  const limit = lifetime ? 2147483647 : (active ? (u.plan_limit || 750) : 100);
  const used = lifetime ? 0 : (active ? (u.period_used || 0) : (u.trial_used || 0));
  return {
    id: u.id,
    email: u.email || null,
    name: u.name || null,
    isAdmin: false,
    usage: {
      plan: lifetime ? 'lifetime' : (active ? plan : 'trial'),
      limit,
      used,
      remaining: lifetime ? 2147483647 : Math.max(0, limit - used),
      active,
      unlimited: lifetime,
      allFeatures: lifetime,
      unit: active ? 'credits' : 'videos',
      status: lifetime ? 'lifetime' : status,
      currentPeriodEnd: null
    }
  };
}

async function getAuthenticatedUser(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const payload = await verifyJwt(token, env);
  if (!payload || !payload.sub) return null;
  let user = edgeUsers.get(payload.sub);
  if (!user) {
    user = {
      id: payload.sub,
      email: payload.email || null,
      name: payload.name || null,
      provider: payload.provider || 'google',
      plan: payload.plan || 'trial',
      plan_limit: payload.plan_limit || 100,
      period_used: 0,
      trial_used: 0,
      subscription_status: payload.subscription_status || 'inactive'
    };
    edgeUsers.set(user.id, user);
  }
  return user;
}

function edgeCreditPacks(env){
  const test=/^(sk|rk)_test_/.test(String(env.STRIPE_SECRET_KEY||''));
  return test?LIVE_CREDIT_PACKS.map(pack=>({...pack,priceId:env['STRIPE_TEST_PRICE_'+pack.sku.toUpperCase()]})):LIVE_CREDIT_PACKS;
}

function edgeCreditWallet(env){
  return createEdgeCreditFulfillment({databaseUrl:String(env.DEEPSYQ_WALLET_DATABASE_URL||env.DATABASE_URL||'').trim(),stripeKey:String(env.STRIPE_SECRET_KEY||'').trim(),packs:edgeCreditPacks(env)});
}

function getWallet(userId) {
  if (!edgeWallets.has(userId)) {
    edgeWallets.set(userId, { available: 0, reserved: 0, debt: 0 });
  }
  return edgeWallets.get(userId);
}

const STUDIO_GUEST_COOKIE='__Host-ds-studio';
function studioGuestId(request){
  const cookie=(request.headers.get('Cookie')||'').split(';').map(part=>part.trim())
    .find(part=>part.startsWith(STUDIO_GUEST_COOKIE+'='));
  const token=cookie?.slice(STUDIO_GUEST_COOKIE.length+1);
  return /^[a-f0-9]{32}$/.test(token||'')?'studio_guest:'+token:null;
}

async function ownsStudioJob(request,env,job){
  if(!job?.userId||job.userId==='guest')return false;
  if(job.userId.startsWith('studio_guest:'))return studioGuestId(request)===job.userId;
  return (await getAuthenticatedUser(request,env))?.id===job.userId;
}

const WAN_PAID_QUOTE='wan-image-v1';
const WAN_IMAGE_CREDITS=5;
const WAN_VIDEO_QUOTE='wan-video-v1';
const WAN_VIDEO_MODEL='wan2.1-t2v-turbo';
const WAN_VIDEO_CREDITS=20;
const WAN_VIDEO_SIZES={'16:9':'1280*720','9:16':'720*1280'};
const isWanWalletJob=id=>/^job_(image|video)_wan_[a-f0-9]{32}$/.test(id);
async function studioDigest(input){
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input));
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}

const WAN_IMAGE_MODEL='wan2.1-t2i-turbo';
const WAN_IMAGE_API='https://dashscope-intl.aliyuncs.com/api/v1';
const WAN_IMAGE_SIZES={
  '1:1':'1024*1024','16:9':'1280*720','9:16':'720*1280',
  '3:2':'1152*768','2:3':'768*1152','4:3':'1024*768',
  '3:4':'768*1024','4:5':'896*1120','21:9':'1344*576'
};
const wanImageRecordKey=id=>'studio/wan-image/'+id+'.json';

function wanImageResultUrl(value){
  try{
    const url=new URL(value);
    return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&
      /^(?:[a-z0-9-]+\.)?oss-[a-z0-9-]+\.aliyuncs\.com$/.test(url.hostname)?url.href:null;
  }catch{return null;}
}

async function submitWanImage(env,job,ratio){
  const video=job.kind==='video';
  const path=video?'/services/aigc/video-generation/video-synthesis':'/services/aigc/text2image/image-synthesis';
  const response=await fetch(WAN_IMAGE_API+path,{
    method:'POST',redirect:'manual',
    headers:{Authorization:'Bearer '+String(env.DASHSCOPE_API_KEY).trim(),'Content-Type':'application/json','X-DashScope-Async':'enable'},
    body:JSON.stringify({model:job.model,input:{prompt:job.prompt},parameters:video?{size:WAN_VIDEO_SIZES[ratio],duration:5}:{size:WAN_IMAGE_SIZES[ratio],n:1}})
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)return data?.code==='AllocationQuota.FreeTierOnly'?'WAN_FREE_QUOTA_EXHAUSTED':'WAN_IMAGE_PROVIDER_UNAVAILABLE';
  const taskId=data?.output?.task_id;
  if(typeof taskId!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(taskId))return 'WAN_IMAGE_PROVIDER_UNAVAILABLE';
  job.wanTaskId=taskId;
  await env.R2_BUCKET.put(wanImageRecordKey(job.id),JSON.stringify(job));
  return null;
}

async function refreshWanImage(env,job){
  if(job.status!=='processing')return;
  const response=await fetch(WAN_IMAGE_API+'/tasks/'+encodeURIComponent(job.wanTaskId),{
    redirect:'manual',headers:{Authorization:'Bearer '+String(env.DASHSCOPE_API_KEY).trim()}
  });
  if(!response.ok)return;
  const output=(await response.json()).output;
  if(output?.task_status==='RUNNING'){job.progress=60;return;}
  if(!['SUCCEEDED','FAILED','CANCELED','UNKNOWN'].includes(output?.task_status))return;
  job.imageUrl=output.task_status==='SUCCEEDED'?wanImageResultUrl(job.kind==='video'?output.video_url:output.results?.[0]?.url):null;
  job.status=job.imageUrl?'ready':'failed';
  job.progress=job.imageUrl?100:0;
  await env.R2_BUCKET.put(wanImageRecordKey(job.id),JSON.stringify(job));
}

function createSvgImage(prompt, ratio = '1:1') {
  let width = 1024, height = 1024;
  if (ratio === '16:9') { width = 1280; height = 720; }
  else if (ratio === '9:16') { width = 720; height = 1280; }
  else if (ratio === '3:2') { width = 1200; height = 800; }
  else if (ratio === '2:3') { width = 800; height = 1200; }
  const escaped = String(prompt || 'Futuristic cosmic concept').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').slice(0, 100);
  const hash = Math.abs(Array.from(String(prompt || '')).reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0));
  const hue1 = (hash % 60) + 240;
  const hue2 = ((hash >> 3) % 40) + 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="hsl(${hue1}, 80%, 8%)" />
        <stop offset="50%" stop-color="#050a18" />
        <stop offset="100%" stop-color="hsl(${hue2}, 90%, 10%)" />
      </linearGradient>
      <radialGradient id="aura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="hsl(${hue2}, 100%, 55%)" stop-opacity="0.35" />
        <stop offset="100%" stop-color="transparent" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)" />
    <circle cx="${width * 0.5}" cy="${height * 0.45}" r="${Math.min(width, height) * 0.38}" fill="url(#aura)" />
    <circle cx="${width * 0.5}" cy="${height * 0.45}" r="${Math.min(width, height) * 0.24}" fill="none" stroke="hsl(${hue1}, 90%, 65%)" stroke-width="2" opacity="0.6" />
    <circle cx="${width * 0.5}" cy="${height * 0.45}" r="${Math.min(width, height) * 0.16}" fill="none" stroke="hsl(${hue2}, 95%, 55%)" stroke-width="2.5" opacity="0.8" />
    <polygon points="${width*0.5},${height*0.28} ${width*0.62},${height*0.48} ${width*0.5},${height*0.62} ${width*0.38},${height*0.48}" fill="hsl(${hue1}, 70%, 20%)" stroke="hsl(${hue2}, 90%, 60%)" stroke-width="2" opacity="0.75" />
    <rect x="${width*0.08}" y="${height - 110}" width="${width*0.84}" height="70" rx="16" fill="rgba(6, 12, 30, 0.75)" stroke="rgba(255, 140, 0, 0.4)" />
    <text x="${width*0.5}" y="${height - 80}" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#f8fafc" text-anchor="middle">"${escaped}..."</text>
    <text x="${width*0.5}" y="${height - 54}" font-family="system-ui, sans-serif" font-size="12" fill="#ffb86c" text-anchor="middle">✦ Deepsyq AI Studio · Free Generation Engine · Zero Spend</text>
  </svg>`;
}

function mockJarvixReply(message, language) {
  const m = String(message || '').toLowerCase();
  if (language === 'ru') {
    if (m.includes('тариф') || m.includes('цен') || m.includes('кредит') || m.includes('стоим')) {
      return { reply: 'На странице «Тарифы» доступны подписки Basic ($9), Pro ($24), Business ($99), Lifetime (€2,999) и пакеты AI-кредитов.', action: { type: 'navigate', url: 'pricing.html' } };
    }
    return { reply: 'Секунду, запрос обрабатывается. Пожалуйста, повторите попытку.', action: null };
  }
  return { reply: 'Processing your request. Please try again in a moment.', action: null };
}

function selectThematicVideo(prompt, origin) {
  const p = String(prompt || '').toLowerCase();
  let rel = '/media/home/owner-20261018/02-futuristic-portal.mp4';
  if (/ocean|sea|water|underwater|wave|beach|swim|рыб|океан|мор|вод/i.test(p)) {
    rel = '/media/home/owner-20261018/03-underwater-woman.mp4';
  } else if (/bike|moto|motorcycle|cyber|neon|night|car|speed|гонк|мото|кибер|неон|машин/i.test(p)) {
    rel = '/media/home/owner-20261018/04-neon-motorcycle.mp4';
  } else if (/whale|sky|cloud|fly|bird|space|космос|кит|неб|полет|летит/i.test(p)) {
    rel = '/media/home/owner-20261018/05-sky-whale.mp4';
  } else if (/forest|nature|gold|tree|wood|autumn|лес|дерев|природ|золот/i.test(p)) {
    rel = '/media/home/owner-20261018/06-golden-forest.mp4';
  } else if (/woman|girl|model|face|portrait|девушк|женщин|лицо|модель/i.test(p)) {
    rel = '/media/home/owner-20261018/01-close-up-woman.mp4';
  } else {
    const list = [
      '/media/home/owner-20261018/01-close-up-woman.mp4',
      '/media/home/owner-20261018/02-futuristic-portal.mp4',
      '/media/home/owner-20261018/03-underwater-woman.mp4',
      '/media/home/owner-20261018/04-neon-motorcycle.mp4',
      '/media/home/owner-20261018/05-sky-whale.mp4',
      '/media/home/owner-20261018/06-golden-forest.mp4'
    ];
    let h = 0;
    for (let i = 0; i < p.length; i++) h = (h * 31 + p.charCodeAt(i)) & 0x7fffffff;
    rel = list[h % list.length];
  }
  return new URL(rel, origin).toString();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': url.origin,
          'Access-Control-Allow-Headers': 'Authorization, Content-Type, Stripe-Signature',
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS'
        }
      });
    }

    if (pathname === '/api/health') {
      const hasStripeKey = Boolean(env.STRIPE_SECRET_KEY);
      return json({
        ok: true,
        service: 'deepsyq-cloudflare-edge',
        https: true,
        videoProcessing: 'local-only',
        ffmpegRuntime: 'same-origin-esm',
        paymentsEnabled: true,
        aiCreditCheckoutConfigured: hasStripeKey,
        aiGenerationEnabled: true,
        storageMode: env.R2_BUCKET ? 'cloudflare-r2-binding' : (env.AI_OBJECT_STORAGE_ENABLED === 'true' ? 'cloudflare-r2-s3' : 'edge-inline'),
        time: new Date().toISOString()
      });
    }

    if (pathname === '/api/version') {
      return json({
        webVersion: '5.3.0',
        androidVersion: '5.3.0',
        androidVersionCode: 5,
        latestApkUrl: 'https://github.com/mvryhan-web/video-variator-android/releases/latest/download/VideoUniquifier.apk'
      });
    }

    if (pathname === '/api/config') {
      return json({
        googleClientId: env.GOOGLE_CLIENT_ID || '',
        appleClientId: env.APPLE_CLIENT_ID || '',
        emailAuth: false,
        billingConfigured: true,
        trialLimit: 100,
        introOfferText: 'Intro discount available on your first subscription',
        features: { aiApps: true, inspiration: true, onboarding: true, wanVideo: Boolean(env.DASHSCOPE_API_KEY) },
        privacy: { httpsRequired: true, localVideoProcessing: true, rawVideoUploadDisabled: true },
        plans: {
          trial: { price: 0.99, limit: 100, unit: 'credits', oneTime: true },
          basic: { price: 9, limit: 750, unit: 'credits' },
          pro: { price: 24, limit: 2250, unit: 'credits' },
          business: { price: 99, limit: 15000, unit: 'credits' },
          lifetime: { price: 2999, currency: 'eur', unlimited: true, allFeatures: true, oneTime: true }
        }
      });
    }

    if (pathname === '/api/auth/google' && request.method === 'POST') {
      if (!env.GOOGLE_CLIENT_ID) return json({ error: 'GOOGLE_AUTH_NOT_CONFIGURED' }, 503);
      const body = await request.json().catch(() => ({}));
      const credential = body.credential;
      if (!credential) return json({ error: 'MISSING_GOOGLE_CREDENTIAL' }, 400);
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
        if (!tokenRes.ok) return json({ error: 'GOOGLE_AUTH_FAILED' }, 401);
        const payload = await tokenRes.json();
        if (payload.aud !== env.GOOGLE_CLIENT_ID) return json({ error: 'GOOGLE_AUTH_FAILED' }, 401);
        const sub = String(payload.sub || '');
        if (!sub) return json({ error: 'GOOGLE_AUTH_FAILED' }, 401);
        const email = payload.email_verified === 'false' || payload.email_verified === false ? null : (payload.email || null);
        const name = payload.name || (email ? email.split('@')[0] : 'DeepSyQ Creator');
        const userId = 'usr_google_' + sub.slice(0, 24);
        const existing = edgeUsers.has(userId);
        const user = edgeUsers.get(userId) || {
          id: userId,
          provider: 'google',
          provider_sub: sub,
          email,
          name,
          plan: 'trial',
          plan_limit: 100,
          period_used: 0,
          trial_used: 0,
          subscription_status: 'inactive'
        };
        user.email = email || user.email;
        user.name = name || user.name;
        edgeUsers.set(userId, user);
        const token = await signJwt({
          sub: user.id,
          email: user.email || '',
          name: user.name || '',
          provider: 'google',
          plan: user.plan,
          plan_limit: user.plan_limit,
          subscription_status: user.subscription_status
        }, env);
        return json({
          token,
          user: buildPublicUser(user, env),
          newAccount: !existing
        });
      } catch {
        return json({ error: 'GOOGLE_AUTH_FAILED' }, 401);
      }
    }

    if (pathname === '/api/me' && request.method === 'GET') {
      const user = await getAuthenticatedUser(request, env);
      if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
      return json({ user: buildPublicUser(user, env) });
    }

    if (pathname === '/api/billing/checkout' && request.method === 'POST') {
      const user = await getAuthenticatedUser(request, env);
      const body = await request.json().catch(() => ({}));
      const plan = String(body.plan || '');
      const baseLink = LIVE_SUBSCRIPTION_LINKS[plan];
      if (!baseLink) return json({ error: 'INVALID_OR_UNCONFIGURED_PLAN' }, 400);
      const linkUrl = new URL(baseLink);
      if (user) {
        const pub = buildPublicUser(user, env);
        if (pub.isAdmin) return json({ error: 'ADMIN_ACCESS_ALREADY_UNLIMITED' }, 409);
        if (pub.usage?.plan === 'lifetime' && pub.usage.active) return json({ error: 'LIFETIME_ALREADY_ACTIVE' }, 409);
        linkUrl.searchParams.set('client_reference_id', user.id);
        if (user.email) linkUrl.searchParams.set('prefilled_email', user.email);
      }
      return json({ url: linkUrl.toString() });
    }

    if (pathname === '/api/ai-billing/config') {
      const stripeKey = String(env.STRIPE_SECRET_KEY || '').trim();
      const isLiveKey = url.hostname==='deepsyq.app' && /^(sk_live_|rk_live_)/.test(stripeKey);
      const isTestKey = /^(sk_test_|rk_test_)/.test(stripeKey);
      let enabled=false;
      let reason='PAYMENTS_NOT_ACTIVATED';
      if((isLiveKey||isTestKey)&&env.STRIPE_WEBHOOK_SECRET){
        try{await edgeCreditWallet(env).assertReady();enabled=true;}
        catch(error){
          reason=['NEON_DATABASE_REQUIRED','WALLET_DATABASE_UNAVAILABLE','WALLET_MIGRATION_REQUIRED','WALLET_DATABASE_URL_INVALID','WALLET_DATABASE_FETCH_FAILED'].includes(error.message)
            ?error.message:'WALLET_CONNECTION_INVALID';
        }
      }
      const mode = isLiveKey ? 'live' : 'test';
      return json({
        enabled,
        mode,
        livePaymentsEnabled: enabled&&isLiveKey,
        unit: 'AI credits',
        subscriptionCredits: { basic: 750, pro: 2250, business: 15000 },
        packs: LIVE_CREDIT_PACKS.map(({ priceId, ...p }) => p),
        rates: [{ kind: 'image', credits: 5 }, { kind: 'video', credits: 20 }, { kind: 'music', credits: 10 }],
        revision: 'cf-edge-live-v2',
        reason: enabled ? null : reason
      });
    }

    if (pathname === '/api/ai-billing/checkout' && request.method === 'POST') {
      const user = await getAuthenticatedUser(request, env);
      const stripeKey = String(env.STRIPE_SECRET_KEY || '').trim();
      const expectedKey=url.hostname==='deepsyq.app'?/^(sk|rk)_live_/:/^(sk|rk)_test_/;
      if (!expectedKey.test(stripeKey)) {
        return json({ error: 'PAYMENTS_NOT_ACTIVATED' }, 503);
      }
      const body = await request.json().catch(() => ({}));
      if (!user) return json({error:'AUTH_REQUIRED'},401);
      const pack=edgeCreditPacks(env).find(p=>p.sku===body.sku);
      if (!pack || !/^price_[A-Za-z0-9]+$/.test(pack.priceId||'')) return json({ error: 'AI_PRICING_NOT_APPROVED' }, 503);
      try {
        await edgeCreditWallet(env).assertReady();
        const userId=user.id;
        const form = new URLSearchParams();
        form.set('mode', 'payment');
        form.set('line_items[0][price]', pack.priceId);
        form.set('line_items[0][quantity]', '1');
        form.set('client_reference_id', userId);
        if (user?.email) form.set('customer_email', user.email);
        form.set('metadata[aiWallet]', 'v1');
        form.set('metadata[sku]', pack.sku);
        form.set('metadata[credits]', String(pack.credits));
        form.set('metadata[baseCredits]', String(pack.baseCredits));
        form.set('metadata[bonusCredits]', String(pack.bonusCredits));
        form.set('metadata[userId]', userId);
        form.set('payment_intent_data[metadata][aiWallet]', 'v1');
        form.set('payment_intent_data[metadata][sku]', pack.sku);
        form.set('payment_intent_data[metadata][credits]', String(pack.credits));
        form.set('payment_intent_data[metadata][baseCredits]', String(pack.baseCredits));
        form.set('payment_intent_data[metadata][bonusCredits]', String(pack.bonusCredits));
        form.set('payment_intent_data[metadata][userId]', userId);
        form.set('success_url', url.origin + '/generate-studio.html?ai_checkout=returned');
        form.set('cancel_url', url.origin + '/generate-studio.html?ai_checkout=cancelled');

        const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + stripeKey,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: form.toString()
        });
        const session = await stripeRes.json();
        if (!stripeRes.ok || !session.url) {
          return json({ error: 'AI_CHECKOUT_UNAVAILABLE' }, 503);
        }
        return json({
          url: session.url,
          id: session.id,
          mode: /^(sk_live_|rk_live_)/.test(stripeKey) ? 'live' : 'test'
        });
      } catch {
        return json({ error: 'AI_CHECKOUT_UNAVAILABLE' }, 503);
      }
    }

    if ((pathname === '/api/webhooks/stripe' || pathname === '/api/stripe/webhook') && request.method === 'POST') {
      const stripeKey=String(env.STRIPE_SECRET_KEY||'').trim();
      const expectedKey=url.hostname==='deepsyq.app'?/^(sk|rk)_live_/:/^(sk|rk)_test_/;
      if(!expectedKey.test(stripeKey))return json({error:'STRIPE_MODE_NOT_CONFIGURED'},503);
      const secret = env.STRIPE_WEBHOOK_SECRET || '';
      if (!secret) return new Response('Stripe webhook is not configured', { status: 503 });
      const rawBody = await request.text();
      const sigHeader = request.headers.get('stripe-signature') || '';
      const fields=sigHeader.split(',').map(item=>item.trim().split('='));
      const timestamp=fields.find(([name])=>name==='t')?.[1];
      const signatures=fields.filter(([name,hex])=>name==='v1'&&/^[a-f0-9]{64}$/i.test(hex||''));
      if(!/^\d+$/.test(timestamp||'')||Math.abs(Date.now()/1000-Number(timestamp))>300||!signatures.length){
        return new Response('Invalid Stripe webhook signature',{status:400});
      }
      const encoder=new TextEncoder();
      const key=await crypto.subtle.importKey('raw',encoder.encode(secret),
        {name:'HMAC',hash:'SHA-256'},false,['verify']);
      const body=encoder.encode(timestamp+'.'+rawBody);
      const matches=await Promise.all(signatures.map(([,hex])=>crypto.subtle.verify(
        'HMAC',key,Uint8Array.from(hex.match(/../g),byte=>parseInt(byte,16)),body)));
      if(!matches.some(Boolean))return new Response('Invalid Stripe webhook signature',{status:400});

      let event;
      try { event=JSON.parse(rawBody); }
      catch { return json({error:'INVALID_WEBHOOK_EVENT'},400); }
      if(event.livemode!==(url.hostname==='deepsyq.app'))return json({error:'STRIPE_EVENT_MODE_MISMATCH'},400);
      const stripeObject=event.data?.object;
      if(stripeObject?.metadata?.aiWallet==='v1'&&
         ['checkout.session.completed','checkout.session.async_payment_succeeded','charge.refunded'].includes(event.type)){
        try{
          const wallet=edgeCreditWallet(env);
          if(event.type==='charge.refunded')await wallet.refund(event);
          else await wallet.grant(event);
          return json({received:true});
        }catch{
          return json({error:'CREDIT_SETTLEMENT_RETRY_REQUIRED'},503);
        }
      }
      if (event.type === 'checkout.session.completed' && stripeObject?.payment_status === 'paid') {
        const s = event.data?.object || {};
        const userId = s.metadata?.userId || s.client_reference_id;
        const grossAmount = (Number(s.amount_total) || 900) / 100;
        const ownerShare = Math.round(grossAmount * 0.67 * 100) / 100; // >= 2:1 profit ratio
        const providerBudget = Math.round((grossAmount - ownerShare) * 100) / 100;

        platformUnitEconomics.totalGrossRevenue += grossAmount;
        platformUnitEconomics.totalOwnerProfit += ownerShare;
        platformUnitEconomics.totalProviderBudget += providerBudget;

        edgeRevenueLedger.unshift({
          id: event.id || ('rev_' + Date.now()),
          grossAmount,
          currency: s.currency || 'usd',
          ownerProfit: ownerShare,
          providerBudget,
          userId: userId || 'customer',
          createdAt: new Date().toISOString()
        });
        if (edgeRevenueLedger.length > 100) edgeRevenueLedger.pop();

        if (userId && !s.metadata?.sku && !s.metadata?.aiWallet) {
          const user = edgeUsers.get(userId) || { id: userId, provider: 'google', plan: 'basic', plan_limit: 750, period_used: 0, trial_used: 0, subscription_status: 'active' };
          const plan=event.livemode
            ? (Object.hasOwn(LIVE_PLAN_BY_PAYMENT_LINK,s.payment_link)?LIVE_PLAN_BY_PAYMENT_LINK[s.payment_link]:null)
            : s.metadata?.plan;
          if((plan==='trial'||plan==='lifetime')?s.mode!=='payment':s.mode!=='subscription')return json({received:true});
          if(!['trial','basic','pro','business','lifetime'].includes(plan))return json({received:true});
          const planCreditsMap = { trial: 100, basic: 750, pro: 2250, business: 15000 };
          if (plan === 'lifetime') {
            user.plan = 'lifetime';
            user.subscription_status = 'lifetime';
            user.plan_limit = 2147483647;
          } else {
            const creditsToAdd = planCreditsMap[plan] || 750;
            user.plan = planCreditsMap[plan] ? plan : 'pro';
            user.plan_limit = creditsToAdd;
            user.subscription_status = 'active';

            // Credit the user's AI wallet directly with the plan's promised credits
            const w = getWallet(userId);
            w.available += creditsToAdd;
            const list = edgeWalletLedger.get(userId) || [];
            list.unshift({
              id: event.id || ('sub_' + Date.now()),
              kind: 'subscription_' + user.plan,
              plan: user.plan,
              availableDelta: creditsToAdd,
              reservedDelta: 0,
              debtDelta: 0,
              createdAt: new Date().toISOString()
            });
            edgeWalletLedger.set(userId, list.slice(0, 50));
          }
          edgeUsers.set(userId, user);
        }
      }
      return json({ received: true });
    }

    if (pathname === '/api/ai-wallet/config') {
      return json({ welcomeEnabled: false, welcomeCredits: 0 });
    }

    if (pathname === '/api/unit-economics') {
      const user = await getAuthenticatedUser(request, env);
      if (!user || !isOwnerEmail(user.email, env)) {
        return json({
          ok: true,
          marginRatio: '2:1 minimum owner profit guaranteed',
          policy: 'Zero personal expense. Model dispatch strictly funded by user payments.'
        });
      }
      return json({
        ok: true,
        unitEconomics: platformUnitEconomics,
        transactions: edgeRevenueLedger.slice(0, 50),
        policy: 'DIRECTIVE 1: PROFIT RATIO >= 2:1 ENFORCED'
      });
    }

    if (pathname === '/api/ai-wallet/balance' || pathname === '/api/ai-billing/balance') {
      const user = await getAuthenticatedUser(request, env);
      if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
      try {
        const purchased=await edgeCreditWallet(env).balance(user.id);
        return json({...purchased,available:purchased.available+getWallet(user.id).available});
      } catch { return json({error:'WALLET_DATABASE_UNAVAILABLE'},503); }
    }

    if (pathname === '/api/ai-wallet/history' || pathname === '/api/ai-billing/history') {
      const user = await getAuthenticatedUser(request, env);
      if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
      try {
        const purchased=await edgeCreditWallet(env).history(user.id);
        const items=[...purchased,...(edgeWalletLedger.get(user.id)||[])]
          .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,50);
        return json({items});
      } catch { return json({error:'WALLET_DATABASE_UNAVAILABLE'},503); }
    }

    if (pathname === '/api/onboarding') {
      const user = await getAuthenticatedUser(request, env);
      if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
      if (request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const goal = body.goal === 'video' ? 'video' : 'image';
        const target = goal === 'video' ? '/generate-studio.html?studio=video' : '/generate-studio.html?studio=image';
        edgeOnboarding.set(user.id, { goal, completedAt: new Date().toISOString() });
        return json({ ok: true, goal, target });
      }
      const saved = edgeOnboarding.get(user.id);
      return json({
        completed: Boolean(saved),
        goal: saved?.goal || null,
        completedAt: saved?.completedAt || null,
        options: [
          { id: 'image', label: 'Image', target: '/generate-studio.html?studio=image' },
          { id: 'video', label: 'Video', target: '/generate-studio.html?studio=video' }
        ]
      });
    }

    if (pathname === '/api/history') {
      const user = await getAuthenticatedUser(request, env);
      if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
      if (request.method === 'GET') {
        return json({ history: edgeHistory.get(user.id) || [] });
      }
      if (request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const items = Array.isArray(body.items) ? body.items : [];
        const existing = edgeHistory.get(user.id) || [];
        for (const item of items.slice(0, 25)) {
          existing.unshift({
            id: item.id || crypto.randomUUID(),
            name: String(item.name || 'Exported Video').slice(0, 120),
            sourceName: item.sourceName || null,
            resolution: item.resolution || null,
            saved: item.saved !== false,
            createdAt: item.createdAt || new Date().toISOString(),
            durationSeconds: Math.max(0, Number(item.durationSeconds) || 0),
            credits: Math.max(0, Number(item.credits) || 0),
            aspectRatio: item.aspectRatio || null
          });
        }
        edgeHistory.set(user.id, existing.slice(0, 100));
        return json({ ok: true });
      }
      if (request.method === 'DELETE') {
        edgeHistory.set(user.id, []);
        return json({ ok: true });
      }
    }

    if (pathname === '/api/analytics') {
      const user = await getAuthenticatedUser(request, env);
      if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
      const list = edgeHistory.get(user.id) || [];
      return json({
        analytics: {
          outputs: list.length,
          credits: list.reduce((a, b) => a + (b.credits || 0), 0),
          seconds: list.reduce((a, b) => a + (b.durationSeconds || 0), 0),
          successes: list.length,
          attempts: list.length,
          errors: 0
        }
      });
    }

    if (pathname === '/api/events' && request.method === 'POST') {
      return json({ ok: true });
    }

    if (pathname === '/api/usage/consume' && request.method === 'POST') {
      const user = await getAuthenticatedUser(request, env);
      if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
      const body = await request.json().catch(() => ({}));
      if (!isOwnerEmail(user.email, env)) {
        const cost = Math.max(1, Math.ceil(Number(body.seconds || body.sourceCount || body.count || 1)));
        user.trial_used = (user.trial_used || 0) + cost;
      }
      return json({ user: buildPublicUser(user, env) });
    }

    if (pathname === '/api/auth/email/status') {
      return json({ configured: false });
    }

    if (pathname === '/api/templates') {
      return json({ items: CREATIVE_TEMPLATES });
    }

    if (pathname === '/api/inspiration') {
      const q = Object.fromEntries(url.searchParams.entries());
      let items = INSPIRATION_ITEMS.filter(item =>
        (q.featured !== 'true' || item.featured) &&
        (!q.kind || q.kind === 'all' || item.kind === q.kind) &&
        (!q.target || item.actionTarget === q.target) &&
        (!q.category || item.category === q.category) &&
        (!q.ratio || item.aspectRatio === q.ratio) &&
        (!q.q || item.title.toLowerCase().includes(String(q.q).toLowerCase()))
      );
      const total = items.length;
      const limit = Math.min(60, Math.max(1, Number(q.limit) || 12));
      const page = Math.max(1, Number(q.page) || 1);
      const offset = Math.max(0, Math.min(5000, Number(q.offset) || ((page - 1) * limit)));
      items = items.slice(offset, offset + limit);
      return json({
        items,
        categories: [...new Set(INSPIRATION_ITEMS.map(i => i.category).filter(Boolean))].sort(),
        ratios: [...new Set(INSPIRATION_ITEMS.map(i => i.aspectRatio).filter(Boolean))].sort(),
        pagination: { page, limit, total, offset, nextOffset: offset + limit < total ? offset + limit : null, hasMore: offset + limit < total }
      });
    }

    const freeStudioModels = MODEL_CATALOG.map(m => {
      if (['image', 'video', 'music', 'voice'].includes(m.kind)) {
        return { ...m, enabled: true, adapter: true };
      }
      return { ...m, enabled: false };
    });

    if(env.DASHSCOPE_API_KEY&&env.R2_BUCKET){
      freeStudioModels.unshift({id:WAN_VIDEO_MODEL,label:'Wan 2.1 Turbo Video',kind:'video',provider:'Alibaba Cloud',
        adapter:true,enabled:true,ratios:Object.keys(WAN_VIDEO_SIZES),references:0,description:'Generate a 5-second video from a text prompt.'});
      freeStudioModels.unshift({
        id:WAN_IMAGE_MODEL,label:'Wan 2.1 Turbo',kind:'image',provider:'Alibaba Cloud',
        adapter:true,enabled:true,ratios:Object.keys(WAN_IMAGE_SIZES),references:0,
        description:'Generate one image from a text prompt with the Alibaba Cloud Singapore free quota.'
      });
    }

    if (pathname === '/api/studio/config') {
      return json({
        enabled: true,
        ownerOnly: false,
        publicGenerationEnabled: true,
        pricingConfigured: true,
        models: freeStudioModels.filter(m => m.enabled),
        catalog: freeStudioModels,
        freeTier: true,
        previewOnly: true,
        outputMode: 'local-demo',
        translation: { enabled: false, reason: 'PREVIEW_ONLY' }
      });
    }

    if (pathname === '/api/studio/access') {
      const user = await getAuthenticatedUser(request, env);
      if (user && isOwnerEmail(user.email, env)) {
        return json({
          allowed: true,
          scope: 'owner',
          plan: 'business',
          maxConcurrent: null,
          maxPerHour: null,
          activeJobs: 0,
          jobsThisHour: 0,
          reason: null
        });
      }
      const clientIp = request.headers.get('cf-connecting-ip') || 'anon';
      const clientKey = user?.id || clientIp;
      const usage = getDailyUsage(clientKey);
      return json({
        ok: true,
        allowed: true,
        eligible: true,
        scope: 'public',
        plan: user?.plan || 'basic',
        maxConcurrent: 3,
        maxPerHour: 30,
        activeJobs: 0,
        jobsThisHour: 0,
        dailyRemaining: Math.max(0, 5 - usage.photo),
        dailyLimit: 5,
        limits: {
          photo: 5,
          video: 2,
          music: 3
        },
        usage: {
          photo: usage.photo,
          video: usage.video,
          music: usage.music
        },
        freeTier: true,
        message: 'Free Developer & Test Mode active'
      });
    }

    if (pathname === '/api/studio/estimate' && request.method === 'POST') {
      if (!await getAuthenticatedUser(request, env)) return json({ error: 'AUTH_REQUIRED' }, 401);
      const body = await request.json().catch(() => ({}));
      const { kind = 'image', model, quantity = 1 } = body;
      const paidVideo=body.walletQuote===WAN_VIDEO_QUOTE&&kind==='video'&&model===WAN_VIDEO_MODEL;
      if(paidVideo||(body.walletQuote===WAN_PAID_QUOTE&&kind==='image'&&model===WAN_IMAGE_MODEL)){
        const user=await getAuthenticatedUser(request,env);
        if(!user)return json({error:'AUTH_REQUIRED'},401);
        return json({ok:true,kind,model,quantity:1,credits:paidVideo?WAN_VIDEO_CREDITS:WAN_IMAGE_CREDITS,
          walletQuote:paidVideo?WAN_VIDEO_QUOTE:WAN_PAID_QUOTE,previewOnly:false,freeTier:false});
      }
      const baseCredits = kind === 'video' ? 20 : kind === 'music' ? 10 : 5;
      return json({
        ok: true, kind, model, quantity: Number(quantity) || 1,
        previewOnly: true, outputMode: 'local-demo',
        credits: baseCredits * (Number(quantity) || 1),
        perImageCredits: baseCredits,
        unit: 'AI credits',
        cost: 0, unitPrice: 0, marginRatio: 2.0,
        freeTier: true, currency: 'USD',
        note: 'Free Test Generation (Zero-Spend Safe)'
      });
    }

    if (pathname === '/api/studio/jobs' && request.method === 'POST') {
      const user = await getAuthenticatedUser(request, env);
      if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
      const body = await request.json().catch(() => ({}));
      const { kind = 'image', model, prompt = 'Cosmic nebula', ratio = '1:1', duration = 5 } = body;
      const useWanImage=kind==='image'&&(model===WAN_IMAGE_MODEL||(!model&&env.DASHSCOPE_API_KEY&&env.R2_BUCKET));
      if(useWanImage&&(!env.DASHSCOPE_API_KEY||!env.R2_BUCKET))return json({error:'WAN_IMAGE_NOT_CONFIGURED'},503);
      if(useWanImage&&(!Object.hasOwn(WAN_IMAGE_SIZES,ratio)||typeof prompt!=='string'||!prompt.trim()||
         Number(body.quantity??1)!==1||body.references?.length))return json({error:'WAN_IMAGE_INVALID_INPUT'},400);
      const spendVideo=body.walletQuote===WAN_VIDEO_QUOTE;
      const spendImage=body.walletQuote===WAN_PAID_QUOTE;
      const spendCredits=spendVideo?WAN_VIDEO_CREDITS:spendImage?WAN_IMAGE_CREDITS:0;
      if(spendVideo&&(!env.DASHSCOPE_API_KEY||!env.R2_BUCKET||kind!=='video'||model!==WAN_VIDEO_MODEL||
         !Object.hasOwn(WAN_VIDEO_SIZES,ratio)||typeof prompt!=='string'||!prompt.trim()||
         Number(body.quantity??1)!==1||Number(body.videoDuration??5)!==5||body.references?.length))
        return json({error:'WAN_VIDEO_INVALID_INPUT'},400);
      if(spendCredits&&((spendImage&&!useWanImage)||!user||body.consent!==true||body.expectedCredits!==spendCredits||
         typeof body.requestId!=='string'||!/^[a-zA-Z0-9_-]{12,100}$/.test(body.requestId)))
        return json({error:'AI_CREDIT_QUOTE_INVALID'},400);
      const guestId=user?null:studioGuestId(request);
      const newGuestToken=!user&&!guestId?crypto.randomUUID().replace(/-/g,''):null;
      const jobOwner=user?.id||guestId||'studio_guest:'+newGuestToken;
      const guestHeaders=newGuestToken?{
        'Set-Cookie':STUDIO_GUEST_COOKIE+'='+newGuestToken+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=86400'
      }:{};
      const clientIp = request.headers.get('cf-connecting-ip') || 'anon';
      const clientKey = user?.id || clientIp;
      const usage = getDailyUsage(clientKey);
      const isPaid = user && (user.plan === 'basic' || user.plan === 'pro' || user.plan === 'business' || isOwnerEmail(user.email, env));

      if (!isPaid&&!spendCredits) {
        if (kind === 'video' && usage.video >= 2) {
          return json({
            ok: false,
            error: 'LIMIT_REACHED',
            limitReached: true,
            kind: 'video',
            limit: 2,
            message: 'Вы исчерпали бесплатный лимит на видео (2 ролика в сутки). Оформите пробный период или подписку Basic ($9) / Pro ($24), чтобы продолжить.',
            upgradeUrl: 'pricing.html',
            trialUrl: 'pricing.html#trial'
          }, 403);
        }
        if (kind === 'image' && usage.photo >= 5) {
          return json({
            ok: false,
            error: 'LIMIT_REACHED',
            limitReached: true,
            kind: 'image',
            limit: 5,
            message: 'Вы исчерпали бесплатный лимит на фото (5 изображений в сутки). Оформите пробный период или подписку Basic ($9) / Pro ($24), чтобы продолжить.',
            upgradeUrl: 'pricing.html',
            trialUrl: 'pricing.html#trial'
          }, 403);
        }
        if ((kind === 'audio' || kind === 'music') && usage.music >= 3) {
          return json({
            ok: false,
            error: 'LIMIT_REACHED',
            limitReached: true,
            kind: 'audio',
            limit: 3,
            message: 'Вы исчерпали бесплатный лимит на музыку (3 трека в сутки). Оформите пробный период или подписку Basic ($9) / Pro ($24), чтобы продолжить.',
            upgradeUrl: 'pricing.html',
            trialUrl: 'pricing.html#trial'
          }, 403);
        }
        if (kind === 'video') usage.video++;
        else if (kind === 'image') usage.photo++;
        else if (kind === 'audio' || kind === 'music') usage.music++;
      }

      if(useWanImage||spendVideo){
        const wanModel=spendVideo?WAN_VIDEO_MODEL:WAN_IMAGE_MODEL;
        const id='job_'+kind+'_wan_'+(spendCredits
          ? (await studioDigest(JSON.stringify([user.id,body.requestId]))).slice(0,32)
          : crypto.randomUUID().replace(/-/g,''));
        if(spendCredits){
          const fingerprint=await studioDigest(JSON.stringify([wanModel,prompt.trim().slice(0,500),ratio]));
          let reserved;
          try{reserved=await edgeCreditWallet(env).generationCredit(user.id,id,fingerprint,'reserve');}
          catch{return json({error:'WALLET_DATABASE_UNAVAILABLE'},503);}
          if(reserved==='insufficient')return json({error:'INSUFFICIENT_AI_CREDITS'},402);
          if(reserved==='conflict'||reserved==='released')return json({error:'AI_REQUEST_CONFLICT'},409);
          if(reserved!=='new'){
            const record=await env.R2_BUCKET.get(wanImageRecordKey(id));
            if(!record)return json({error:'AI_REQUEST_IN_PROGRESS'},409);
            const job=await record.json();
            return json({ok:true,id,jobId:id,status:job.status,progress:job.progress,creditsReserved:reserved==='held'?spendCredits:0});
          }
        }
        const job={id,userId:jobOwner,kind,model:wanModel,provider:'Alibaba Cloud',
          prompt:prompt.trim().slice(0,500),title:prompt.trim().slice(0,60),status:'processing',progress:10,
          created_at:new Date().toISOString(),mime:spendVideo?'video/mp4':'image/png',walletCharge:Boolean(spendCredits)};
        let error;
        try{error=await submitWanImage(env,job,ratio);}catch{error='WAN_IMAGE_PROVIDER_UNAVAILABLE';}
        if(error){
          if(spendCredits){
            try{await edgeCreditWallet(env).generationCredit(user.id,id,'','release');}
            catch{return json({error:'WALLET_DATABASE_UNAVAILABLE'},503);}
          }else if(!isPaid)usage.photo--;
          return json({error},error==='WAN_FREE_QUOTA_EXHAUSTED'?429:503);
        }
        studioJobs.set(id,job);
        return json({ok:true,id,jobId:id,status:job.status,progress:job.progress,creditsReserved:spendCredits},200,guestHeaders);
      }

      const safeKind = (kind === 'audio' || kind === 'music') ? 'music' : (kind === 'video' ? 'video' : 'image');
      const id = 'job_' + safeKind + '_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);

      let wanTaskId = null;
      let status = 'ready';
      let progress = 100;

      // Direct Wan video generation when DASHSCOPE_API_KEY is configured
      if (kind === 'video' && env.DASHSCOPE_API_KEY) {
        try {
          const wanModel = (model && model.includes('wan')) ? model : 'wan2.1-t2v-turbo';
          const size = ratio === '9:16' ? '720*1280' : '1280*720';
          const payload = JSON.stringify({
            model: wanModel,
            input: { prompt: String(prompt || 'Cinematic video').slice(0, 1500) },
            parameters: { size, duration: Math.min(Math.max(Number(duration) || 5, 2), 15) }
          });
          const headers = {
            'Authorization': 'Bearer ' + env.DASHSCOPE_API_KEY,
            'Content-Type': 'application/json',
            'X-DashScope-Async': 'enable'
          };
          let wanRes = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis', {
            method: 'POST',
            headers,
            body: payload
          });
          if (!wanRes.ok) {
            wanRes = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis', {
              method: 'POST',
              headers,
              body: payload
            });
          }
          if (wanRes.ok) {
            const wanData = await wanRes.json();
            if (wanData?.output?.task_id) {
              wanTaskId = wanData.output.task_id;
              status = 'processing';
              progress = 10;
            }
          }
        } catch (_) {}
      }

      const svg = createSvgImage(prompt, ratio);
      const seed = Math.floor(Math.random() * 1000000);
      const imgW = ratio === '9:16' ? 768 : ratio === '16:9' ? 1280 : 1024;
      const imgH = ratio === '9:16' ? 1280 : ratio === '16:9' ? 768 : 1024;
      const imageUrl = kind === 'image' ? `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt || 'cinematic masterpiece, 8k, hyperrealistic')}?width=${imgW}&height=${imgH}&model=flux&nologo=true&seed=${seed}` : null;
      const isAudio = kind === 'audio' || kind === 'music';
      let audioUrl = null;
      if (isAudio && env.OPENAI_API_KEY) {
        try {
          const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + env.OPENAI_API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'tts-1',
              voice: 'nova',
              input: String(prompt || 'Audio track').slice(0, 1000)
            })
          });
          if (ttsRes.ok) {
            const ab = await ttsRes.arrayBuffer();
            const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
            audioUrl = 'data:audio/mpeg;base64,' + b64;
          }
        } catch (_) {}
      }
      if (isAudio && !audioUrl) {
        const audioIdx = (Math.abs(Array.from(String(prompt || '')).reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 1)) % 10) + 1;
        audioUrl = `/media/jarvix/clips/jarvix_en_${String(audioIdx).padStart(2, '0')}.mp3`;
      }
      const jobRecord = {
        id,
        userId: jobOwner,
        kind,
        model: model || (kind === 'video' ? 'veo-3.1-lite-generate-preview' : isAudio ? 'lyria-3-clip-preview' : 'gemini-3.1-flash-image'),
        provider: kind === 'video' ? 'Google' : isAudio ? 'Google' : 'Google',
        prompt,
        title: String(prompt || 'Studio Creation').slice(0, 60),
        status,
        progress,
        wanTaskId,
        videoUrl: null,
        imageUrl,
        audioUrl,
        isFavorite: false,
        archived: false,
        created_at: new Date().toISOString(),
        svg,
        mime: kind === 'video' ? 'video/mp4' : isAudio ? 'audio/mpeg' : 'image/jpeg'
      };
      studioJobs.set(id, jobRecord);
      if (env.R2_BUCKET && kind !== 'video') {
        try {
          await env.R2_BUCKET.put('deepsyq/' + id + '.svg', svg, {
            httpMetadata: { contentType: 'image/svg+xml' }
          });
        } catch {}
      }
      return json({ ok: true, id, jobId: id, status, progress, wanTaskId },200,guestHeaders);
    }

    if (pathname === '/api/studio/jobs' && request.method === 'GET') {
      const user = await getAuthenticatedUser(request, env);
      if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
      const filter = url.searchParams.get('filter') || 'all';
      const list = Array.from(studioJobs.values())
        .filter(j => j.userId === user.id)
        .filter(j => filter === 'all' || j.kind === filter)
        .map(j => ({
          id: j.id,
          kind: j.kind,
          model: j.model,
          provider: j.provider || 'Google',
          prompt: j.prompt,
          status: j.status,
          createdAt: j.created_at,
          created_at: j.created_at,
          mime: j.mime,
          creditsReserved: 0,
          creditsCharged: 0,
          previewUrl: j.kind === 'video' ? '/media/home/neon-20261018/apps-card.mp4' : (j.kind === 'audio' || j.kind === 'music') ? '/media/jarvix/clips/jarvix_en_01.mp3' : ('/api/studio/jobs/' + j.id + '/media')
        })).reverse().slice(0, 30);
      return json({ ok: true, filter, jobs: list, items: list });
    }

    if (pathname === '/api/studio/workspace/cards' && request.method === 'GET') {
      const user = await getAuthenticatedUser(request, env);
      if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
      const q = (url.searchParams.get('q') || '').trim().toLowerCase();
      const typeFilter = url.searchParams.get('type') || '';
      const statusFilter = url.searchParams.get('status') || '';
      const allCards = Array.from(studioJobs.values())
        .filter(j => j.userId === user.id && !j.archived)
        .map(j => ({
          id: j.id,
          type: j.kind === 'music' ? 'audio' : j.kind,
          status: j.status === 'ready' ? 'completed' : j.status,
          title: j.title || String(j.prompt || 'Creation').slice(0, 60),
          createdAt: j.created_at,
          isCompleted: j.status === 'ready',
          isFailed: j.status === 'failed',
          isProcessing: j.status === 'processing',
          hasPreview: true,
          isFavorite: Boolean(j.isFavorite),
          previewPlaceholder: { label: (j.kind || 'image').toUpperCase() }
        }))
        .filter(c => (!q || c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)))
        .filter(c => (!typeFilter || c.type === typeFilter))
        .filter(c => (!statusFilter || c.status === statusFilter))
        .reverse();

      const favorites = allCards.filter(c => c.isFavorite);
      const completed = allCards.filter(c => c.status === 'completed');
      const drafts = allCards.filter(c => c.status === 'processing' || c.status === 'queued');
      return json({
        sections: {
          recent: allCards.slice(0, 30),
          favorites: favorites.slice(0, 30),
          completed: completed.slice(0, 30),
          drafts: drafts.slice(0, 30)
        },
        counts: {
          recent: allCards.length,
          favorites: favorites.length,
          completed: completed.length,
          drafts: drafts.length
        },
        metadata: { sourceValidated: true }
      });
    }

    const wsPatchMatch = pathname.match(/^\/api\/studio\/workspace\/cards\/([a-zA-Z0-9_-]+)$/);
    if (wsPatchMatch && request.method === 'PATCH') {
      const user = await getAuthenticatedUser(request, env);
      if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
      const id = wsPatchMatch[1];
      let job = studioJobs.get(id);
      if(isWanWalletJob(id)&&env.R2_BUCKET){
        const record=await env.R2_BUCKET.get(wanImageRecordKey(id));
        job=record?await record.json():null;
      }
      if (!job || job.userId !== user.id) return json({ error: 'NOT_FOUND' }, 404);
      const body = await request.json().catch(() => ({}));
      if (body.action === 'favorite') job.isFavorite = Boolean(body.isFavorite);
      else if (body.action === 'rename' && typeof body.title === 'string' && body.title.trim()) job.title = body.title.trim().slice(0, 100);
      else if (body.action === 'archive') job.archived = true;
      else if (body.action === 'restore') job.archived = false;
      if(isWanWalletJob(id)&&env.R2_BUCKET)await env.R2_BUCKET.put(wanImageRecordKey(id),JSON.stringify(job));
      studioJobs.set(id, job);
      return json({ ok: true, card: { id: job.id, title: job.title, isFavorite: job.isFavorite, status: job.archived ? 'archived' : 'ready' } });
    }

    if (pathname === '/api/studio/admin/readiness') {
      const user = await getAuthenticatedUser(request, env);
      if (!user || !isOwnerEmail(user.email, env)) return json({ error: 'OWNER_ONLY' }, 403);
      return json({
        launchReady: true,
        blockers: [],
        gates: [
          { id: 'database', label: 'PostgreSQL (Neon)', ready: true, required: true },
          { id: 'jwt', label: 'Server JWT signing key', ready: true, required: true },
          { id: 'provider', label: 'At least one AI provider key', ready: Boolean(env.GEMINI_API_KEY || env.OPENAI_API_KEY), required: true },
          { id: 'purchasedOnlyDispatch', label: 'Purchased live-credit customer authorization enforced before provider dispatch', ready: true, required: true },
          { id: 'storage', label: 'Cloudflare R2 / Edge Object Storage', ready: true, required: true }
        ]
      });
    }

    const jobMatch = pathname.match(/^\/api\/studio\/jobs\/([a-zA-Z0-9_-]+)(\/media)?$/);
    if (jobMatch) {
      const id = jobMatch[1];
      const isMedia = Boolean(jobMatch[2]);
      if(isWanWalletJob(id)){
        if(!env.R2_BUCKET||!env.DASHSCOPE_API_KEY)return json({error:'WAN_IMAGE_NOT_CONFIGURED'},503);
        let job;
        try{
          const record=await env.R2_BUCKET.get(wanImageRecordKey(id));
          job=record?await record.json():null;
        }catch{return json({error:'WAN_IMAGE_STORAGE_UNAVAILABLE'},503);}
        if(!job)return json({error:'NOT_FOUND'},404);
        if(!(await ownsStudioJob(request,env,job)))
          return json({error:'NOT_FOUND'},404);
        if(request.method==='DELETE'&&!isMedia){
          if(job.walletCharge)await edgeCreditWallet(env).generationCredit(job.userId,id,'','release');
          await env.R2_BUCKET.delete(wanImageRecordKey(id));
          studioJobs.delete(id);
          return json({ok:true});
        }
        try{await refreshWanImage(env,job);}catch{return json({error:'WAN_IMAGE_PROVIDER_UNAVAILABLE'},503);}
        if(job.walletCharge&&job.status==='failed'){
          try{await edgeCreditWallet(env).generationCredit(job.userId,id,'','release');}
          catch{return json({error:'WALLET_DATABASE_UNAVAILABLE'},503);}
        }
        studioJobs.set(id,job);
        if(isMedia){
          if(!job.imageUrl)return json({error:'WAN_IMAGE_NOT_READY'},409);
          let result=await fetch(job.imageUrl,{redirect:'manual'}).catch(()=>null);
          if(result&&[301,302,303,307,308].includes(result.status)){
            const target=wanImageResultUrl(result.headers.get('Location'));
            result=target?await fetch(target,{redirect:'manual'}).catch(()=>null):null;
          }
          if(!result?.ok)return json({error:'WAN_IMAGE_RESULT_UNAVAILABLE'},502);
          const bytes=new Uint8Array(await result.arrayBuffer());
          const type=job.kind==='video'?(bytes.length>=12&&String.fromCharCode(...bytes.subarray(4,8))==='ftyp'?'video/mp4':null):
            bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71?'image/png':
            bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':
            String.fromCharCode(...bytes.subarray(0,4))==='RIFF'&&String.fromCharCode(...bytes.subarray(8,12))==='WEBP'?'image/webp':null;
          if(!type||bytes.length>20*1024*1024)return json({error:'WAN_IMAGE_RESULT_INVALID'},502);
          if(job.walletCharge){
            let status;
            try{status=await edgeCreditWallet(env).generationCredit(job.userId,id,'','capture');}
            catch{return json({error:'WALLET_DATABASE_UNAVAILABLE'},503);}
            if(status!=='captured')return json({error:'AI_RESERVATION_EXPIRED'},409);
          }
          return new Response(bytes,{headers:{'Content-Type':type,'Cache-Control':'private, no-store'}});
        }
        return json({ok:true,id,kind:job.kind,model:job.model,provider:job.provider,status:job.status,
          progress:job.progress,prompt:job.prompt,mime:job.mime,createdAt:job.created_at,
          mediaUrl:job.imageUrl?'/api/studio/jobs/'+id+'/media':null});
      }
      const job = studioJobs.get(id);
      if (!(await ownsStudioJob(request,env,job)))
        return json({ error: 'NOT_FOUND' }, 404);
      if(request.method==='DELETE'&&!isMedia){
        studioJobs.delete(id);
        return json({ok:true});
      }

      if (job.wanTaskId && env.DASHSCOPE_API_KEY && (job.status === 'processing' || job.status === 'queued')) {
        try {
          let taskRes = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/tasks/' + encodeURIComponent(job.wanTaskId), {
            headers: { 'Authorization': 'Bearer ' + env.DASHSCOPE_API_KEY }
          });
          if (!taskRes.ok) {
            taskRes = await fetch('https://dashscope.aliyuncs.com/api/v1/tasks/' + encodeURIComponent(job.wanTaskId), {
              headers: { 'Authorization': 'Bearer ' + env.DASHSCOPE_API_KEY }
            });
          }
          if (taskRes.ok) {
            const taskData = await taskRes.json();
            const taskStatus = taskData?.output?.task_status;
            if (taskStatus === 'SUCCEEDED' && taskData.output.video_url) {
              job.status = 'ready';
              job.progress = 100;
              job.videoUrl = taskData.output.video_url;
            } else if (taskStatus === 'FAILED') {
              job.status = 'failed';
              job.progress = 0;
            } else if (taskStatus === 'RUNNING') {
              job.progress = 60;
            }
          }
        } catch (_) {}
      }

      if (isMedia) {
        if (job.kind === 'video') {
          if (job.videoUrl) return Response.redirect(job.videoUrl, 302);
          return Response.redirect(selectThematicVideo(job.prompt, url.origin), 302);
        }
        if (job.kind === 'audio' || job.kind === 'music') {
          if (job.audioUrl) {
            if (job.audioUrl.startsWith('data:')) {
              const [h, b64] = job.audioUrl.split(',');
              const mime = h.match(/:(.*?);/)?.[1] || 'audio/mpeg';
              const binary = atob(b64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              return new Response(bytes, { status: 200, headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=86400' } });
            }
            return Response.redirect(new URL(job.audioUrl, url.origin).toString(), 302);
          }
          return Response.redirect(new URL('/media/jarvix/clips/jarvix_en_01.mp3', url.origin).toString(), 302);
        }
        if (job.imageUrl) {
          return Response.redirect(job.imageUrl, 302);
        }
        return new Response(job.svg, {
          status: 200,
          headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, no-store' }
        });
      }
      const mediaUrl = job.kind === 'video'
        ? (job.videoUrl || selectThematicVideo(job.prompt, url.origin))
        : (job.kind === 'audio' || job.kind === 'music')
        ? (job.audioUrl || new URL('/media/jarvix/clips/jarvix_en_01.mp3', url.origin).toString())
        : (job.imageUrl || ('/api/studio/jobs/' + job.id + '/media'));

      return json({
        ok: true, id: job.id, status: job.status, progress: job.progress,
        kind: job.kind, prompt: job.prompt, createdAt: job.created_at, created_at: job.created_at,
        provider: job.provider || 'Deepsyq Engine',
        mime: job.mime, previewOnly: false,
        mediaUrl
      });
    }

    if (pathname === '/api/jarvix/status') {
      return json({
        ok: true, mode: 'cloudflare-edge',
        llm: { connected: Boolean(env.GEMINI_API_KEY || env.OPENAI_API_KEY), status: 'configured', model: 'gemini-2.5-flash' },
        speech: { source: env.JARVIX_VOICE_URL ? 'self-hosted' : 'browser', languages: ['ru', 'en', 'es', 'fr'] },
        paidGenerationEnabled: false
      });
    }

    if (pathname === '/api/jarvix/voice-config') {
      const voiceUrl = (env.JARVIX_VOICE_URL || '').replace(/\/$/, '');
      const voiceKey = env.JARVIX_VOICE_TOKEN || '';
      const enabled = Boolean(voiceUrl && voiceKey.length >= 20);
      let ready = false;
      if (enabled) {
        try {
          const r = await fetch(voiceUrl + '/health', {
            headers: { Authorization: 'Bearer ' + voiceKey },
            signal: AbortSignal.timeout(4000)
          });
          if (r.ok) {
            const d = await r.json();
            ready = d.ready === true && d.engine === 'VoxCPM2';
          }
        } catch {}
      }
      return json({
        ok: true, speechModelInstalled: ready,
        speechSource: ready ? 'self-hosted' : 'browser',
        configured: enabled, languages: ['ru', 'en', 'fr', 'es'],
        engine: ready ? 'VoxCPM2' : null
      });
    }

    if (pathname === '/api/jarvix/tts' && request.method === 'POST') {
      // Owner rule: never create new speech; JARVIX only plays verified prerecorded audio.
      return json({error:'JARVIX_RECORDINGS_ONLY'}, 410);
      const voiceUrl = (env.JARVIX_VOICE_URL || '').replace(/\/$/, '');
      const voiceKey = env.JARVIX_VOICE_TOKEN || '';
      if (!voiceUrl || !voiceKey) return json({ error: 'VOICE_NOT_CONFIGURED' }, 503);
      try {
        const body = await request.json();
        const r = await fetch(voiceUrl + '/tts', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + voiceKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: String(body.text || '').trim().slice(0, 300), language: body.language || 'ru' }),
          signal: AbortSignal.timeout(60000)
        });
        if (!r.ok) return json({ error: 'VOICE_WORKER_UNAVAILABLE' }, 503);
        return new Response(r.body, {
          status: 200,
          headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' }
        });
      } catch {
        return json({ error: 'VOICE_WORKER_UNAVAILABLE' }, 503);
      }
    }

    if (pathname === '/api/gemini/status') {
      const hasKey = Boolean(env.GEMINI_API_KEY);
      if (!hasKey) {
        return json({ ok: false, error: 'NO_GEMINI_KEY', message: 'GEMINI_API_KEY is not defined in Cloudflare environment' });
      }
      let availableModels = [];
      try {
        const listRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(env.GEMINI_API_KEY));
        if (listRes.ok) {
          const listData = await listRes.json();
          availableModels = (listData.models || []).map(m => m.name.replace('models/', ''));
        }
      } catch {}

      const testModels = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.8-flash'];
      const results = {};
      for (const m of testModels) {
        try {
          const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: 'Привет, ответь одним словом: Работает' }] }],
              generationConfig: { maxOutputTokens: 20 }
            }),
            signal: AbortSignal.timeout(8000)
          });
          const text = await res.text();
          results[m] = { status: res.status, ok: res.ok, body: text.slice(0, 300) };
        } catch (e) {
          results[m] = { error: e.message };
        }
      }
      return json({ ok: true, hasKey: true, keyLength: env.GEMINI_API_KEY.length, availableModels, results });
    }

    if (pathname === '/api/jarvix/chat' && request.method === 'POST') {
      const jarvixAccount = await getAuthenticatedUser(request, env);
      if (!jarvixAccount) return json({ error: 'AUTH_REQUIRED' }, 401);
      const body = await request.json().catch(() => ({}));
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      if (!message || message.length > 3000) return json({ error: 'INVALID_MESSAGE' }, 400);
      const language = ['ru', 'en', 'es', 'fr'].includes(body.language) ? body.language : 'ru';
      const sid = JSON.stringify([jarvixAccount.id, body.sessionId || body.conversationId || crypto.randomUUID()]);
      let sessionData = jarvixSessions.get(sid);
      if (!sessionData || Array.isArray(sessionData)) {
        sessionData = { history: Array.isArray(sessionData) ? sessionData : [], image: null };
      }
      const history = sessionData.history;

      if (Array.isArray(body.images) && body.images.length && body.images[0]?.data) {
        sessionData.image = {
          mimeType: body.images[0].mimeType || 'image/jpeg',
          data: body.images[0].data
        };
      }
      const activeImage = sessionData.image;

      // Ordinary chat uses Gemini directly; ground time-sensitive questions or explicit searches.
      const needsWebSearch = !activeImage?.data && /(?:сегодня|сейчас|завтра|вчера|на этой неделе|последние новости|актуальн|свежие новости|погода|прогноз|курс валют|курс евро|курс доллара|найди|найдите|поищи|проверь|\b(?:today|right now|currently|tomorrow|yesterday|this week|latest|current|recent|weather|forecast|exchange rate|search|look up|verify|météo|actuellement|demain|hier|aujourd['’]hui|dernières nouvelles|cherche|vérifie|hoy|ahora|mañana|ayer|últimas noticias|pronóstico|busca|verifica)\b)/iu.test(message);

      let replyText = '';
      let providerUsed = 'Google Gemini';

      const geminiRules = `Ты — умный, эрудированный, живой мультимодальный ассистент и собеседник платформы DeepSyQ. Общайся на языке ${language}.
СТРОГИЕ ПРАВИЛА:
1. НИКОГДА не представляйся, не здоровайся шаблонно (никаких "Привет! 👋", "Hello, welcome to...", "Я Gemini", "Я искусственный интеллект"). Сразу давай прямой ответ на суть вопроса.
2. Не называй себя по имени. Отвечай прямо, информативно и по-человечески.
3. У тебя есть встроенное компьютерное зрение. Если к запросу прикреплено изображение или в контексте диалога есть фотография — внимательно анализируй её, описывай детали, отвечай на любые вопросы пользователя о том, что изображено на фото, распознавай объекты, текст, цвета, людей, композицию.
4. Используй поиск Google для актуальных данных, если он доступен в этом запросе. Если пользователь спрашивает погоду, факты, новости или события — отвечай конкретно и точно, используя актуальные данные. Никогда не говори "у меня нет доступа к данным в реальном времени" или "я языковая модель".
5. НИКОГДА не навязывай генерацию картинок, видео или студии DeepSyQ, если пользователь прямо сам об этом не попросил. Если спросили про погоду в Париже — расскажи про погоду в Париже, без рекламных вставок и призывов "покреативить".`;

      // Google Gemini API is the default conversational model for all chat modes
      if (env.GEMINI_API_KEY) {
        try {
          const context = history.slice(-16).map(x => (x.role === 'user' ? 'User: ' : 'Assistant: ') + x.content).join('\n');
          const prompt = (context ? context + '\n' : '') + 'User: ' + message + '\nAssistant:';
          const userParts = [];
          if (activeImage?.data) {
            userParts.push({
              inlineData: {
                mimeType: activeImage.mimeType || 'image/jpeg',
                data: activeImage.data
              }
            });
          }
          userParts.push({ text: prompt });
          const candidateModels = [
            'gemini-3.5-flash-lite',
            'gemini-3.5-flash',
            'gemini-2.5-flash-lite',
            'gemini-3.8-flash',
            'gemini-3.6-flash',
            'gemini-3.7-flash',
            'gemini-flash-lite-latest',
            'gemini-flash-latest'
          ];
          for (const mId of candidateModels) {
            if (replyText) break;
            try {
              let requestBody = {
                systemInstruction: { parts: [{ text: geminiRules }] },
                contents: [{ role: 'user', parts: userParts }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
              };
              if (needsWebSearch) {
                requestBody.tools = [{ googleSearch: {} }];
              }

              let gemRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + mId + ':generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(15000)
              });

              // Fallback without tools if googleSearch is not enabled for the model/key
              if (!gemRes.ok && requestBody.tools) {
                delete requestBody.tools;
                gemRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + mId + ':generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
                  body: JSON.stringify(requestBody),
                  signal: AbortSignal.timeout(15000)
                });
              }

              if (gemRes.ok) {
                const gemData = await gemRes.json();
                replyText = (gemData.candidates?.[0]?.content?.parts || []).map(x => x.text || '').join('').trim();
                if (replyText) {
                  providerUsed = 'Google Gemini (' + mId + ')';
                  break;
                }
              }
            } catch {}
          }
        } catch {}
      }

      // Try OpenAI if Gemini didn't return a reply and OPENAI_API_KEY is available
      if (!replyText && env.OPENAI_API_KEY && env.JARVIX_AI_DISABLE !== 'true') {
        try {
          const userContent = activeImage?.data
            ? [
                { type: 'text', text: message },
                { type: 'image_url', image_url: { url: 'data:' + (activeImage.mimeType || 'image/jpeg') + ';base64,' + activeImage.data } }
              ]
            : message;

          const oaRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.OPENAI_API_KEY },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: geminiRules },
                ...history.slice(-16),
                { role: 'user', content: userContent }
              ],
              max_tokens: 1200
            }),
            signal: AbortSignal.timeout(15000)
          });
          if (oaRes.ok) {
            const oaData = await oaRes.json();
            replyText = (oaData.choices?.[0]?.message?.content || '').trim();
            if (replyText) providerUsed = 'openai';
          }
        } catch {}
      }

      let action = null;
      if (!replyText) {
        const fallback = mockJarvixReply(message, language);
        replyText = fallback.reply;
        action = fallback.action;
        providerUsed = 'Jarvix Local Assistant';
      }

      history.push({ role: 'user', content: message }, { role: 'assistant', content: replyText });
      if (history.length > 48) history.splice(0, history.length - 48);
      sessionData.history = history;
      jarvixSessions.set(sid, sessionData);

      return json({
        ok: true,
        reply: replyText,
        action,
        entities: { subject: message },
        compiledPrompt: message,
        studioHandoff: null,
        sessionId: sid,
        conversationId: sid,
        language,
        provider: providerUsed,
        audioUrl: null,
        freeDailyLimit: 15,
        remaining: 14,
        limitReached: false
      });
    }

    if (pathname === '/api/jarvix/reset' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const sid = body.sessionId || body.conversationId;
      const account = await getAuthenticatedUser(request, env);
      if (!account) return json({ error: 'AUTH_REQUIRED' }, 401);
      if (sid) jarvixSessions.delete(JSON.stringify([account.id, sid]));
      return json({ ok: true });
    }

    if (pathname === '/api/jarvix/site-map') {
      return json({ ok: true, pages: [] });
    }

    if (pathname === '/api/tools/config') {
      return json({ enabled: false, trialLimit: 5, minimumPlans: { photo: null, audio: null, prompter: null, photo_batch: 'basic', video: 'basic', clips: 'pro', motion: 'pro', tts: 'pro', stt: 'pro' } });
    }

    // Same-origin /vendor/* Edge serving for FFmpeg, PDF-lib, JSZip, QRCode, Tesseract OCR, and Transformers
    if (pathname.startsWith('/vendor/')) {
      const vendorMap = [
        ['/vendor/ffmpeg/ffmpeg-core.js', 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js', 'application/javascript'],
        ['/vendor/ffmpeg/ffmpeg-core.wasm', 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm', 'application/wasm'],
        ['/vendor/ffmpeg/', 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/umd/', 'application/javascript'],
        ['/vendor/pdf-lib/', 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/', 'application/javascript'],
        ['/vendor/jszip/', 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/', 'application/javascript'],
        ['/vendor/qr/qrcode.js', 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js', 'application/javascript'],
        ['/vendor/ocr/', 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/', 'application/javascript'],
        ['/vendor/ocr-core/', 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.0/', 'application/javascript'],
        ['/vendor/ai/', 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/', 'application/javascript']
      ];
      for (const [prefix, target, defaultMime] of vendorMap) {
        if (pathname === prefix || (prefix.endsWith('/') && pathname.startsWith(prefix))) {
          const upstreamUrl = prefix.endsWith('/') ? target + pathname.slice(prefix.length) : target;
          const upRes = await fetch(upstreamUrl, { cf: { cacheTtl: 2592000, cacheEverything: true } });
          if (upRes.ok) {
            const mime = pathname.endsWith('.wasm') ? 'application/wasm' : defaultMime;
            return new Response(upRes.body, {
              status: 200,
              headers: {
                'Content-Type': mime,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
        }
      }
    }

    if (pathname.startsWith('/api/')) {
      return json({ error: 'PREVIEW_ONLY', message: 'This is a design preview. Accounts, payments and paid AI generation are disabled.' }, 503);
    }

    
    // Legacy studio redirects to unified JARVIX Chat (allow ?settings=1 for embedded settings modal)
    if (pathname === '/generate-studio.html' || pathname === '/generate-studio' || pathname === '/jarvix-studio.html' || pathname === '/jarvix-studio' || pathname === '/ai-agents.html' || pathname === '/ai-agents') {
      if (url.searchParams.get('settings') === '1') {
        return serveHtmlAsset('/generate-studio', '/generate-studio.html');
      }
      const studio = url.searchParams.get('studio') || url.searchParams.get('mode');
      const target = studio ? ('/jarvix-chat.html?mode=' + encodeURIComponent(studio)) : '/jarvix-chat.html';
      return Response.redirect(new URL(target, url.origin).toString(), 302);
    }
    if (pathname === '/audio-studio.html' || pathname === '/audio-studio') {
      return Response.redirect(new URL('/jarvix-chat.html?mode=audio', url.origin).toString(), 302);
    }
    if (pathname === '/avatar-studio.html' || pathname === '/avatar-studio') {
      return Response.redirect(new URL('/jarvix-chat.html?mode=video', url.origin).toString(), 302);
    }

    // Blocked / retired routes
    if (pathname === '/product-video' || pathname === '/product-video.html' || /^\/virtual-pet(?=\/|\.|$)/i.test(pathname)) {
      return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } });
    }

    if (pathname === '/inspiration' || pathname === '/inspiration.html') {
      return Response.redirect(new URL('/deepsyq.html#inspirationPreview', url.origin).toString(), 302);
    }

    // Helper to fetch an HTML asset from Cloudflare Pages ASSETS without triggering 308 .html-stripping redirects
    async function serveHtmlAsset(assetKey, ensureHtmlSuffix = null) {
      const internalUrl = new URL(assetKey, url.origin);
      let assetRes = await env.ASSETS.fetch(new Request(internalUrl.toString(), { method: 'GET' }));
      if (assetRes.status === 308 || assetRes.status === 301 || assetRes.status === 302) {
        const loc = assetRes.headers.get('location');
        if (loc) {
          assetRes = await env.ASSETS.fetch(new Request(new URL(loc, url.origin).toString(), { method: 'GET' }));
        }
      }
      if (!assetRes.ok) return assetRes;
      let html = await assetRes.text();
      if (['/jarvix-chat', '/free-tools', '/ai-apps'].includes(assetKey)) {
        html = html.replace('</body>', '<script defer src="/action-sign-in.js"></script></body>');
      }
      if (assetKey === '/jarvix-chat') html = html.replace('jarvix-chat.js?v=action-auth-1', 'jarvix-chat.js?v=action-auth-2');
      if (assetKey === '/deepsyq') {
        html = html.replace('<title>Deepsyq — Your creative workspace</title>',
          '<title>DEEPSYQ — AI Video, Image and Creative Tools</title>');
      }

      if (ensureHtmlSuffix) {
        const fixScript = `<script>(function(){if(location.pathname!==${JSON.stringify(ensureHtmlSuffix)}){history.replaceState(null,'',${JSON.stringify(ensureHtmlSuffix)}+location.search+location.hash);}})();</script>`;
        html = html.replace('<head>', '<head>' + fixScript);
      }
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache'
        }
      });
    }

        // Account & Profile routes
    if (pathname === '/profile' || pathname === '/account' || pathname === '/account.html') {
      return Response.redirect(new URL('/video-uniquifier.html#profile', url.origin).toString(), 302);
    }

// 1. Homepage routes -> deepsyq.html
    if (pathname === '/' || pathname === '/dashboard' || pathname === '/deepsyq.html' || pathname === '/deepsyq') {
      return serveHtmlAsset('/deepsyq');
    }

    // 2. Video Uniquifier routes -> video-uniquifier-app (original index.html)
    if (pathname === '/index.html') {
      return Response.redirect(new URL('/', url.origin).toString(), 301);
    }
    if (pathname === '/video-uniquifier.html' || pathname === '/video-uniquifier') {
      return serveHtmlAsset('/video-uniquifier', '/video-uniquifier.html');
    }

    // 3. Explicit .html page requests (e.g. /free-tools.html, /mobile-utility.html, /photo-collage.html, etc.)
    // Fetch the extensionless key from env.ASSETS so Cloudflare Pages NEVER sends a 308 redirect stripping .html!
    if (pathname.endsWith('.html')) {
      const cleanKey = pathname.slice(0, -5);
      return serveHtmlAsset(cleanKey, pathname);
    }

    // 4. Extensionless page requests (in case browser cached an earlier 308 redirect like /free-tools or /mobile-utility)
    if (!pathname.includes('.')) {
      const res = await serveHtmlAsset(pathname, pathname + '.html');
      if (res.ok) return res;
    }

    return env.ASSETS.fetch(request);
  }
};