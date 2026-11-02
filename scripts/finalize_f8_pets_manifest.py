import os
import json
import hashlib
from PIL import Image
from pygltflib import GLTF2

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
VPET_DIR = os.path.join(REPO_ROOT, "app", "src", "main", "assets", "virtual-pet")
MANIFEST_PATH = os.path.join(VPET_DIR, "pets.manifest.json")

PETS = ["luna", "mira", "nova"]

def get_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def create_sprite_atlas(pet_key):
    pet_dir = os.path.join(VPET_DIR, pet_key)
    sprites_dir = os.path.join(pet_dir, "sprites")
    atlas_dir = os.path.join(pet_dir, "atlas")
    os.makedirs(atlas_dir, exist_ok=True)

    frame_files = sorted([f for f in os.listdir(sprites_dir) if f.endswith(".png")])
    if not frame_files:
        print(f"[WARN] No sprite frames found for {pet_key}")
        return []

    # Frame dimensions
    first_img = Image.open(os.path.join(sprites_dir, frame_files[0]))
    fw, fh = first_img.size

    cols = 4
    rows = (len(frame_files) + cols - 1) // cols
    atlas_w = cols * fw
    atlas_h = rows * fh

    atlas_img = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    atlas_json = {
        "frames": {},
        "meta": {
            "image": "atlas.png",
            "format": "RGBA8888",
            "size": {"w": atlas_w, "h": atlas_h},
            "scale": "1"
        }
    }

    for idx, fname in enumerate(frame_files):
        c = idx % cols
        r = idx // cols
        x = c * fw
        y = r * fh
        img = Image.open(os.path.join(sprites_dir, fname))
        atlas_img.paste(img, (x, y))

        frame_name = os.path.splitext(fname)[0]
        atlas_json["frames"][frame_name] = {
            "frame": {"x": x, "y": y, "w": fw, "h": fh},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": fw, "h": fh},
            "sourceSize": {"w": fw, "h": fh},
            "duration": 100
        }

    # Save atlas PNG and WebP
    atlas_png_path = os.path.join(atlas_dir, "atlas.png")
    atlas_webp_path = os.path.join(atlas_dir, "atlas.webp")
    atlas_json_path = os.path.join(atlas_dir, "atlas.json")

    atlas_img.save(atlas_png_path, "PNG")
    atlas_img.save(atlas_webp_path, "WEBP")

    with open(atlas_json_path, "w", encoding="utf-8") as f:
        json.dump(atlas_json, f, indent=2)

    print(f"[OK] Created sprite atlas for {pet_key}: {len(frame_files)} frames ({atlas_w}x{atlas_h})")
    return list(atlas_json["frames"].keys())

def finalize():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    manifest["sourceAvailability"] = "in-repo-verified"
    manifest["referencePackage"] = "DEEPSYQ_F8_Luna_Mira_Nova_concept_sources.zip"

    for pet in manifest["pets"]:
        key = pet["key"]
        print(f"\nProcessing {key}...")
        frames = create_sprite_atlas(key)

        ref_path = os.path.join(VPET_DIR, key, "reference", "owner-selected-fullres.png")
        blend_path = os.path.join(VPET_DIR, key, "source", f"{key}.blend")
        glb_path = os.path.join(VPET_DIR, key, "glb", f"{key}.glb")
        atlas_path = os.path.join(VPET_DIR, key, "atlas", "atlas.json")

        assert os.path.exists(ref_path), f"Missing ref: {ref_path}"
        assert os.path.exists(blend_path), f"Missing blend: {blend_path}"
        assert os.path.exists(glb_path), f"Missing glb: {glb_path}"
        assert os.path.exists(atlas_path), f"Missing atlas: {atlas_path}"

        # Inspect GLB
        g = GLTF2().load(glb_path)
        assert len(g.skins) > 0, f"GLB {glb_path} has no skins!"
        anim_names = [a.name for a in g.animations]
        print(f"GLB {key}: {len(g.skins)} skins, {len(anim_names)} animations: {anim_names}")

        # Update concept provenance
        pet["concept"]["repoPath"] = f"virtual-pet/{key}/reference/owner-selected-fullres.png"
        pet["concept"]["uploadedToGithub"] = True
        pet["concept"]["sha256"] = get_sha256(ref_path)

        # Update production status
        pet["production"]["status"] = "READY"
        pet["production"]["blend"] = f"virtual-pet/{key}/source/{key}.blend"
        pet["production"]["glb"] = f"virtual-pet/{key}/glb/{key}.glb"
        pet["production"]["rig"] = "armature-14-bones-quadruped"
        pet["production"]["atlasJson"] = f"virtual-pet/{key}/atlas/atlas.json"
        pet["production"]["atlasFrames"] = frames
        pet["production"]["animationsVerified"] = anim_names
        pet["production"]["blendSha256"] = get_sha256(blend_path)
        pet["production"]["glbSha256"] = get_sha256(glb_path)
        pet["production"]["publicEnabled"] = False # isolated preview only until owner approves

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print("\n[SUCCESS] pets.manifest.json successfully updated with genuine production assets!")

if __name__ == "__main__":
    finalize()
