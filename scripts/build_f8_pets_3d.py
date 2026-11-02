"""
DEEPSYQ F8 — Three 3D Living Pets Production Generator (Blender 4.2 LTS)
Generates high-fidelity rigged 3D models, armatures, PBR materials, 15+ animations,
source .blend files, skinned .glb files, turnaround renders (dark/light), transparent sprites,
and atlas manifests for Luna (dog), Mira (cat), and Nova (fox).
"""

import bpy
import bmesh
import hashlib
import math
import os
import json
from mathutils import Vector, Euler, Matrix

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
ASSETS_DIR = os.path.join(REPO_ROOT, "app", "src", "main", "assets", "virtual-pet")


def aim_camera(camera_obj, target):
    """Point Blender's local -Z camera axis at the requested world-space point."""
    direction = Vector(target) - camera_obj.location
    if direction.length == 0:
        raise ValueError("Camera target must not equal camera position")
    camera_obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def assert_visible_alpha_margin(filepath, minimum_margin=0.025):
    """Fail the asset build if a transparent character render touches its frame."""
    image = bpy.data.images.load(filepath, check_existing=False)
    try:
        width, height = image.size
        if width < 2 or height < 2 or image.channels < 4:
            raise RuntimeError(f"Expected an RGBA render: {filepath}")
        pixels = [0.0] * (width * height * image.channels)
        image.pixels.foreach_get(pixels)
        alpha = pixels[3::4]
        visible = [i for i, value in enumerate(alpha) if value > 0.02]
        if not visible:
            raise RuntimeError(f"Transparent render contains no character: {filepath}")
        xs = [i % width for i in visible]
        ys = [i // width for i in visible]
        margin = min(min(xs), min(ys), width - 1 - max(xs), height - 1 - max(ys))
        if margin / min(width, height) < minimum_margin:
            raise RuntimeError(
                f"Character is clipped or too close to frame edge ({margin}px): {filepath}"
            )
    finally:
        bpy.data.images.remove(image)

# 1. PET DEFINITIONS
PET_CONFIGS = {
    "luna": {
        "id": "dog",
        "key": "luna",
        "displayName": "Луна",
        "species": "dog",
        "palette": {
            "fur": (0.847, 0.569, 0.314, 1.0),       # #D89150 copper
            "cream": (0.965, 0.910, 0.808, 1.0),     # #F6E8CE cream
            "dark": (0.169, 0.114, 0.078, 1.0),      # #2B1D14 nose/mouth
            "eye": (0.545, 0.341, 0.216, 1.0),       # #8B5737 honey
            "brand": (0.251, 0.875, 0.682, 1.0),     # #40DFAE mint turquoise
        },
        "proportions": {
            "body_scale": (0.40, 0.52, 0.38),
            "head_scale": (0.34, 0.32, 0.34),
            "snout_scale": (0.16, 0.18, 0.14),
            "ear_scale": (0.13, 0.05, 0.26),
            "ear_angle": 18,
            "ear_rounded": True,
            "leg_height": 0.28,
            "leg_radius": 0.08,
            "tail_scale": (0.09, 0.20, 0.09),
            "tail_angle": 35,
            "eye_scale": (0.07, 0.04, 0.07)
        },
        "signatures": ["bring_folder_dog", "head_tilt_dog"]
    },
    "mira": {
        "id": "cat",
        "key": "mira",
        "displayName": "Мира",
        "species": "cat",
        "palette": {
            "fur": (0.157, 0.224, 0.306, 1.0),       # #28394E charcoal graphite
            "cream": (0.945, 0.925, 0.902, 1.0),     # #F1ECE6 cream
            "dark": (0.090, 0.110, 0.173, 1.0),      # #171C2C
            "eye": (0.400, 0.769, 0.678, 1.0),       # #66C4AD mint
            "brand": (0.400, 0.769, 0.678, 1.0),     # #66C4AD mint
        },
        "proportions": {
            "body_scale": (0.32, 0.50, 0.32),
            "head_scale": (0.30, 0.28, 0.29),
            "snout_scale": (0.11, 0.10, 0.09),
            "ear_scale": (0.10, 0.04, 0.22),
            "ear_angle": 12,
            "ear_rounded": False,
            "leg_height": 0.38,
            "leg_radius": 0.055,
            "tail_scale": (0.06, 0.70, 0.06),
            "tail_angle": 45,
            "eye_scale": (0.065, 0.035, 0.065)
        },
        "signatures": ["nudge_folder_cat", "curious_cat"]
    },
    "nova": {
        "id": "fox",
        "key": "nova",
        "displayName": "Нова",
        "species": "fox",
        "palette": {
            "fur": (0.918, 0.522, 0.227, 1.0),       # #EA853A russet ginger
            "cream": (1.000, 0.957, 0.875, 1.0),     # #FFF4DF light cream
            "dark": (0.110, 0.098, 0.090, 1.0),      # #1C1917 dark stockings/nose
            "eye": (0.400, 0.769, 0.678, 1.0),       # #66C4AD mint
            "brand": (0.290, 0.867, 0.718, 1.0),     # #4ADDB7 mint emerald
        },
        "proportions": {
            "body_scale": (0.33, 0.48, 0.33),
            "head_scale": (0.30, 0.30, 0.30),
            "snout_scale": (0.10, 0.22, 0.10),
            "ear_scale": (0.13, 0.045, 0.32),
            "ear_angle": 15,
            "ear_rounded": False,
            "leg_height": 0.35,
            "leg_radius": 0.06,
            "tail_scale": (0.18, 0.65, 0.18),
            "tail_angle": 30,
            "eye_scale": (0.065, 0.035, 0.065)
        },
        "signatures": ["fox_reveal_folder", "fox_curious_peek"]
    }
}

def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # Ensure scene exists
    if not bpy.data.scenes:
        bpy.data.scenes.new("Scene")
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.eevee.taa_render_samples = 8

def create_pbr_material(name, base_color, roughness=0.65, metallic=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = base_color
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
    return mat

def build_pet_mesh(cfg):
    p = cfg["proportions"]
    pal = cfg["palette"]

    mat_fur = create_pbr_material(f"{cfg['key']}_fur", pal["fur"], roughness=0.75)
    mat_cream = create_pbr_material(f"{cfg['key']}_cream", pal["cream"], roughness=0.75)
    mat_dark = create_pbr_material(f"{cfg['key']}_dark", pal["dark"], roughness=0.5)
    mat_eye = create_pbr_material(f"{cfg['key']}_eye", pal["eye"], roughness=0.1)
    mat_brand = create_pbr_material(f"{cfg['key']}_brand", pal["brand"], roughness=0.3, metallic=0.6)

    mesh = bpy.data.meshes.new(f"{cfg['key']}_mesh")
    obj = bpy.data.objects.new(f"{cfg['key']}_model", mesh)
    bpy.context.scene.collection.objects.link(obj)

    obj.data.materials.append(mat_fur)      # 0
    obj.data.materials.append(mat_cream)    # 1
    obj.data.materials.append(mat_dark)     # 2
    obj.data.materials.append(mat_eye)      # 3
    obj.data.materials.append(mat_brand)    # 4

    bm = bmesh.new()

    # 1. Torso
    b_scale = p["body_scale"]
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=24, radius=1.0)
    for v in bm.verts:
        v.co.x *= b_scale[0]
        v.co.y *= b_scale[1]
        v.co.z *= b_scale[2]
        v.co.z += 0.50
        v.co.y -= 0.05
    for f in bm.faces:
        f.material_index = 0

    # 2. Chest / Belly cream patch
    belly_verts = bmesh.ops.create_uvsphere(
        bm, u_segments=16, v_segments=12, radius=1.0
    )["verts"]
    for v in belly_verts:
        v.co.x *= b_scale[0] * 0.75
        v.co.y = (v.co.y * b_scale[1] * 0.75) + 0.12
        v.co.z = (v.co.z * b_scale[2] * 0.70) + 0.48
    belly_faces = {face for vertex in belly_verts for face in vertex.link_faces}
    for f in belly_faces:
        f.material_index = 1

    # 3. Head
    h_scale = p["head_scale"]
    head_verts = bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=24, radius=1.0)["verts"]
    for v in head_verts:
        v.co.x *= h_scale[0]
        v.co.y = (v.co.y * h_scale[1]) + 0.40
        v.co.z = (v.co.z * h_scale[2]) + 0.75
    for f in bm.faces:
        if any(v in head_verts for v in f.verts):
            f.material_index = 0

    # 4. Snout / Muzzle
    s_scale = p["snout_scale"]
    snout_verts = bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=12, radius=1.0)["verts"]
    for v in snout_verts:
        v.co.x *= s_scale[0]
        v.co.y = (v.co.y * s_scale[1]) + 0.58
        v.co.z = (v.co.z * s_scale[2]) + 0.68
    for f in bm.faces:
        if any(v in snout_verts for v in f.verts):
            f.material_index = 1

    # 5. Nose
    nose_verts = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=8, radius=0.035)["verts"]
    for v in nose_verts:
        v.co.y += 0.58 + s_scale[1] * 0.85
        v.co.z += 0.70
    for f in bm.faces:
        if any(v in nose_verts for v in f.verts):
            f.material_index = 2

    # 6. Eyes (Left and Right)
    e_scale = p["eye_scale"]
    for side in (-1, 1):
        eye_verts = bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=10, radius=1.0)["verts"]
        eye_surface_y = 0.40 + h_scale[1] * math.sqrt(max(0.0, 1.0 - (0.16 / h_scale[0]) ** 2))
        for v in eye_verts:
            v.co.x = (v.co.x * e_scale[0]) + (side * 0.16)
            # Sit each eye on the visible front surface of the head, not inside it.
            v.co.y = (v.co.y * e_scale[1]) + eye_surface_y + e_scale[1] * 0.38
            v.co.z = (v.co.z * e_scale[2]) + 0.78
        for f in bm.faces:
            if any(v in eye_verts for v in f.verts):
                f.material_index = 3

    # 7. Ears (Left and Right)
    ear_s = p["ear_scale"]
    ear_angle = math.radians(p["ear_angle"])
    for side in (-1, 1):
        ear_verts = bmesh.ops.create_cone(bm, segments=12, radius1=ear_s[0], radius2=0.01 if not p["ear_rounded"] else ear_s[0]*0.4, depth=ear_s[2])["verts"]
        rot_mat = Matrix.Rotation(side * ear_angle, 4, 'Y')
        for v in ear_verts:
            v.co = rot_mat @ v.co
            v.co.x += side * 0.18
            v.co.y += 0.38
            v.co.z += 0.95 + (ear_s[2] * 0.4)
        for f in bm.faces:
            if any(v in ear_verts for v in f.verts):
                f.material_index = 0

    # 8. Legs and Paws (4 legs)
    leg_h = p["leg_height"]
    leg_r = p["leg_radius"]
    leg_positions = [
        (-0.20, 0.22, "front_l"),
        ( 0.20, 0.22, "front_r"),
        (-0.20, -0.22, "back_l"),
        ( 0.20, -0.22, "back_r"),
    ]
    for lx, ly, leg_id in leg_positions:
        leg_verts = bmesh.ops.create_cone(bm, segments=12, radius1=leg_r, radius2=leg_r, depth=leg_h)["verts"]
        for v in leg_verts:
            v.co.x += lx
            v.co.y += ly
            v.co.z += leg_h * 0.5 + 0.05
        # Paw foot
        paw_verts = bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1.0)["verts"]
        for v in paw_verts:
            v.co.x = (v.co.x * leg_r * 1.3) + lx
            v.co.y = (v.co.y * leg_r * 1.6) + ly + 0.04
            v.co.z = (v.co.z * 0.04) + 0.04
        for f in bm.faces:
            if any(v in paw_verts for v in f.verts):
                f.material_index = 1 if cfg["key"] != "nova" else 2
            elif any(v in leg_verts for v in f.verts):
                f.material_index = 0 if cfg["key"] != "nova" else 2

    # 9. Tail
    tail_s = p["tail_scale"]
    tail_angle = math.radians(p["tail_angle"])
    tail_verts = bmesh.ops.create_cone(bm, segments=12, radius1=tail_s[0], radius2=tail_s[0]*0.2, depth=tail_s[1])["verts"]
    tail_rot = Matrix.Rotation(-tail_angle, 4, 'X')
    for v in tail_verts:
        v.co = tail_rot @ v.co
        v.co.y -= 0.35 + (tail_s[1] * 0.45)
        v.co.z += 0.55 + (tail_s[1] * 0.40)
    for f in bm.faces:
        if any(v in tail_verts for v in f.verts):
            f.material_index = 0 if cfg["key"] != "nova" else 0

    # 10. Brand Collar / Shield Accessory
    collar_verts = bmesh.ops.create_cone(bm, segments=16, radius1=0.24, radius2=0.24, depth=0.04)["verts"]
    for v in collar_verts:
        v.co.y += 0.28
        v.co.z += 0.65
    for f in bm.faces:
        if any(v in collar_verts for v in f.verts):
            f.material_index = 4

    # Finish mesh
    for face in bm.faces:
        face.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    return obj

def build_pet_armature(cfg, mesh_obj):
    arm_data = bpy.data.armatures.new(f"{cfg['key']}_armature_data")
    arm_obj = bpy.data.objects.new(f"{cfg['key']}_rig", arm_data)
    bpy.context.scene.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='EDIT')

    # Base Bones
    root = arm_data.edit_bones.new("root")
    root.head = (0, 0, 0)
    root.tail = (0, 0.15, 0)

    hips = arm_data.edit_bones.new("hips")
    hips.head = (0, -0.15, 0.50)
    hips.tail = (0, 0.05, 0.50)
    hips.parent = root

    chest = arm_data.edit_bones.new("chest")
    chest.head = (0, 0.05, 0.50)
    chest.tail = (0, 0.25, 0.55)
    chest.parent = hips

    neck = arm_data.edit_bones.new("neck")
    neck.head = (0, 0.25, 0.55)
    neck.tail = (0, 0.35, 0.70)
    neck.parent = chest

    head = arm_data.edit_bones.new("head")
    head.head = (0, 0.35, 0.70)
    head.tail = (0, 0.45, 0.88)
    head.parent = neck

    ear_l = arm_data.edit_bones.new("ear.L")
    ear_l.head = (-0.16, 0.38, 0.88)
    ear_l.tail = (-0.24, 0.38, 1.12)
    ear_l.parent = head

    ear_r = arm_data.edit_bones.new("ear.R")
    ear_r.head = (0.16, 0.38, 0.88)
    ear_r.tail = (0.24, 0.38, 1.12)
    ear_r.parent = head

    jaw = arm_data.edit_bones.new("jaw")
    jaw.head = (0, 0.45, 0.70)
    jaw.tail = (0, 0.60, 0.68)
    jaw.parent = head

    # Legs & Paws
    # Front-Left
    leg_fl = arm_data.edit_bones.new("leg_fl")
    leg_fl.head = (-0.20, 0.22, 0.45)
    leg_fl.tail = (-0.20, 0.22, 0.20)
    leg_fl.parent = chest

    paw_fl = arm_data.edit_bones.new("paw_fl")
    paw_fl.head = (-0.20, 0.22, 0.20)
    paw_fl.tail = (-0.20, 0.26, 0.0)
    paw_fl.parent = leg_fl

    # Front-Right
    leg_fr = arm_data.edit_bones.new("leg_fr")
    leg_fr.head = (0.20, 0.22, 0.45)
    leg_fr.tail = (0.20, 0.22, 0.20)
    leg_fr.parent = chest

    paw_fr = arm_data.edit_bones.new("paw_fr")
    paw_fr.head = (0.20, 0.22, 0.20)
    paw_fr.tail = (0.20, 0.26, 0.0)
    paw_fr.parent = leg_fr

    # Back-Left
    leg_bl = arm_data.edit_bones.new("leg_bl")
    leg_bl.head = (-0.20, -0.20, 0.45)
    leg_bl.tail = (-0.20, -0.20, 0.20)
    leg_bl.parent = hips

    paw_bl = arm_data.edit_bones.new("paw_bl")
    paw_bl.head = (-0.20, -0.20, 0.20)
    paw_bl.tail = (-0.20, -0.16, 0.0)
    paw_bl.parent = leg_bl

    # Back-Right
    leg_br = arm_data.edit_bones.new("leg_br")
    leg_br.head = (0.20, -0.20, 0.45)
    leg_br.tail = (0.20, -0.20, 0.20)
    leg_br.parent = hips

    paw_br = arm_data.edit_bones.new("paw_br")
    paw_br.head = (0.20, -0.20, 0.20)
    paw_br.tail = (0.20, -0.16, 0.0)
    paw_br.parent = leg_br

    # Tail segments
    tail1 = arm_data.edit_bones.new("tail.01")
    tail1.head = (0, -0.28, 0.52)
    tail1.tail = (0, -0.45, 0.62)
    tail1.parent = hips

    tail2 = arm_data.edit_bones.new("tail.02")
    tail2.head = (0, -0.45, 0.62)
    tail2.tail = (0, -0.65, 0.75)
    tail2.parent = tail1

    tail3 = arm_data.edit_bones.new("tail.03")
    tail3.head = (0, -0.65, 0.75)
    tail3.tail = (0, -0.85, 0.90)
    tail3.parent = tail2

    bpy.ops.object.mode_set(mode='OBJECT')

    # Skin weights assignment
    for bone_name in arm_data.bones.keys():
        mesh_obj.vertex_groups.new(name=bone_name)

    # Compute vertex weights based on vertex coordinates
    mesh = mesh_obj.data
    for v in mesh.vertices:
        co = v.co
        x, y, z = co.x, co.y, co.z
        
        # Head / Ears / Jaw
        if z > 0.80:
            if x < -0.10:
                mesh_obj.vertex_groups["ear.L"].add([v.index], 0.9, 'REPLACE')
            elif x > 0.10:
                mesh_obj.vertex_groups["ear.R"].add([v.index], 0.9, 'REPLACE')
            else:
                mesh_obj.vertex_groups["head"].add([v.index], 0.9, 'REPLACE')
        elif z > 0.62 and y > 0.25:
            if y > 0.50:
                mesh_obj.vertex_groups["jaw"].add([v.index], 0.85, 'REPLACE')
            else:
                mesh_obj.vertex_groups["head"].add([v.index], 0.85, 'REPLACE')
        # Tail
        elif y < -0.28 and z > 0.38:
            if y < -0.60:
                mesh_obj.vertex_groups["tail.03"].add([v.index], 0.9, 'REPLACE')
            elif y < -0.42:
                mesh_obj.vertex_groups["tail.02"].add([v.index], 0.9, 'REPLACE')
            else:
                mesh_obj.vertex_groups["tail.01"].add([v.index], 0.9, 'REPLACE')
        # Legs
        elif z < 0.35:
            if y >= 0:
                if x < 0:
                    mesh_obj.vertex_groups["paw_fl" if z < 0.12 else "leg_fl"].add([v.index], 0.9, 'REPLACE')
                else:
                    mesh_obj.vertex_groups["paw_fr" if z < 0.12 else "leg_fr"].add([v.index], 0.9, 'REPLACE')
            else:
                if x < 0:
                    mesh_obj.vertex_groups["paw_bl" if z < 0.12 else "leg_bl"].add([v.index], 0.9, 'REPLACE')
                else:
                    mesh_obj.vertex_groups["paw_br" if z < 0.12 else "leg_br"].add([v.index], 0.9, 'REPLACE')
        # Body (Chest vs Hips)
        else:
            if y >= 0.05:
                mesh_obj.vertex_groups["chest"].add([v.index], 0.85, 'REPLACE')
            else:
                mesh_obj.vertex_groups["hips"].add([v.index], 0.85, 'REPLACE')

    # Parent mesh to armature
    mesh_obj.parent = arm_obj
    mod = mesh_obj.modifiers.new(name="Armature", type='ARMATURE')
    mod.object = arm_obj
    return arm_obj

# 2. KEYFRAMED ACTION GENERATOR
def create_pet_animations(cfg, arm_obj):
    actions = {}
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')
    
    pbones = arm_obj.pose.bones
    for pb in pbones:
        pb.rotation_mode = 'XYZ'

    def new_action(name):
        act = bpy.data.actions.new(name=name)
        if arm_obj.animation_data is None:
            arm_obj.animation_data_create()
        arm_obj.animation_data.action = act
        actions[name] = act
        return act

    def reset_pose():
        for pb in pbones:
            pb.location = (0, 0, 0)
            pb.rotation_euler = (0, 0, 0)
            pb.scale = (1, 1, 1)

    # 1. idle_breathe (30 frames loop)
    act = new_action("idle_breathe")
    reset_pose()
    for f in (1, 15, 30):
        # chest expansion
        z_scale = 1.05 if f == 15 else 1.0
        pbones["chest"].scale = (z_scale, z_scale, z_scale)
        pbones["chest"].keyframe_insert(data_path="scale", frame=f)
        
        # head gentle bob
        h_rot = math.radians(1.5) if f == 15 else 0.0
        pbones["head"].rotation_euler = (h_rot, 0, 0)
        pbones["head"].keyframe_insert(data_path="rotation_euler", frame=f)
        
        # tail slight sway
        t_rot = math.radians(3.0) if f == 15 else math.radians(-3.0)
        pbones["tail.01"].rotation_euler = (0, 0, t_rot)
        pbones["tail.01"].keyframe_insert(data_path="rotation_euler", frame=f)

    # 2. idle_blink (24 frames)
    act = new_action("idle_blink")
    reset_pose()
    for f, r in [(1, 0), (12, 4), (24, 0)]:
        pbones["head"].rotation_euler = (0, 0, math.radians(r))
        pbones["head"].keyframe_insert(data_path="rotation_euler", frame=f)
        pbones["ear.L"].rotation_euler = (math.radians(r * 1.5), 0, 0)
        pbones["ear.L"].keyframe_insert(data_path="rotation_euler", frame=f)

    # 3. sit_down (30 frames)
    act = new_action("sit_down")
    reset_pose()
    for f, (loc_z, rot_x) in [(1, (0, 0)), (15, (-0.12, 10)), (30, (-0.22, 18))]:
        pbones["hips"].location = (0, 0, loc_z)
        pbones["hips"].rotation_euler = (math.radians(-rot_x), 0, 0)
        pbones["hips"].keyframe_insert(data_path="location", frame=f)
        pbones["hips"].keyframe_insert(data_path="rotation_euler", frame=f)
        pbones["head"].rotation_euler = (math.radians(rot_x * 0.8), 0, 0)
        pbones["head"].keyframe_insert(data_path="rotation_euler", frame=f)

    # 4. sleep_curl (40 frames)
    act = new_action("sleep_curl")
    reset_pose()
    for f, z in [(1, 0), (20, -0.25), (40, -0.32)]:
        pbones["hips"].location = (0, 0, z)
        pbones["hips"].keyframe_insert(data_path="location", frame=f)
        pbones["head"].location = (0, 0, z * 0.8)
        pbones["head"].rotation_euler = (math.radians(25 if f > 1 else 0), 0, math.radians(20 if f > 1 else 0))
        pbones["head"].keyframe_insert(data_path="location", frame=f)
        pbones["head"].keyframe_insert(data_path="rotation_euler", frame=f)
        pbones["tail.02"].rotation_euler = (0, 0, math.radians(45 if f > 1 else 0))
        pbones["tail.02"].keyframe_insert(data_path="rotation_euler", frame=f)

    # 5. wake_stretch (36 frames)
    act = new_action("wake_stretch")
    reset_pose()
    for f, (pz, sx) in [(1, (0, 0)), (18, (0.15, -25)), (36, (0, 0))]:
        pbones["hips"].location = (0, 0, pz)
        pbones["hips"].keyframe_insert(data_path="location", frame=f)
        pbones["chest"].rotation_euler = (math.radians(sx), 0, 0)
        pbones["chest"].keyframe_insert(data_path="rotation_euler", frame=f)

    # 6. walk_loop (24 frames)
    act = new_action("walk_loop")
    reset_pose()
    # Trot cycle: FL + BR vs FR + BL
    gait = [
        (1,   20, -20, -20,  20, 0),
        (6,    0,   0,   0,   0, -0.04),
        (12, -20,  20,  20, -20, 0),
        (18,   0,   0,   0,   0, -0.04),
        (24,  20, -20, -20,  20, 0),
    ]
    for f, fl, fr, bl, br, bz in gait:
        pbones["leg_fl"].rotation_euler = (math.radians(fl), 0, 0)
        pbones["leg_fr"].rotation_euler = (math.radians(fr), 0, 0)
        pbones["leg_bl"].rotation_euler = (math.radians(bl), 0, 0)
        pbones["leg_br"].rotation_euler = (math.radians(br), 0, 0)
        pbones["hips"].location = (0, 0, bz)
        
        for k in ["leg_fl", "leg_fr", "leg_bl", "leg_br"]:
            pbones[k].keyframe_insert(data_path="rotation_euler", frame=f)
        pbones["hips"].keyframe_insert(data_path="location", frame=f)

    # 7. approach_card (36 frames)
    act = new_action("approach_card")
    reset_pose()
    for f, y in [(1, 0), (18, 0.35), (36, 0.65)]:
        pbones["root"].location = (0, y, 0)
        pbones["root"].keyframe_insert(data_path="location", frame=f)

    # 8. sniff (30 frames)
    act = new_action("sniff")
    reset_pose()
    for f, rx in [(1, 0), (10, 20), (15, 14), (20, 22), (30, 0)]:
        pbones["head"].rotation_euler = (math.radians(rx), 0, 0)
        pbones["head"].keyframe_insert(data_path="rotation_euler", frame=f)
        pbones["jaw"].rotation_euler = (math.radians(rx * 0.5), 0, 0)
        pbones["jaw"].keyframe_insert(data_path="rotation_euler", frame=f)

    # 9. point_paw (30 frames)
    act = new_action("point_paw")
    reset_pose()
    for f, rot in [(1, 0), (15, 45), (30, 0)]:
        pbones["leg_fr"].rotation_euler = (math.radians(-rot), 0, 0)
        pbones["leg_fr"].keyframe_insert(data_path="rotation_euler", frame=f)
        pbones["head"].rotation_euler = (0, 0, math.radians(-15 if f == 15 else 0))
        pbones["head"].keyframe_insert(data_path="rotation_euler", frame=f)

    # 10. alert_shield (30 frames)
    act = new_action("alert_shield")
    reset_pose()
    for f, (sc, rz) in [(1, (1.0, 0)), (15, (1.1, 0)), (30, (1.0, 0))]:
        pbones["chest"].scale = (sc, sc, sc)
        pbones["chest"].keyframe_insert(data_path="scale", frame=f)
        pbones["head"].rotation_euler = (math.radians(-10 if f == 15 else 0), 0, 0)
        pbones["head"].keyframe_insert(data_path="rotation_euler", frame=f)

    # 11. success_happy (30 frames)
    act = new_action("success_happy")
    reset_pose()
    for f, (hop, wag) in [(1, (0, 0)), (8, (0.22, 25)), (15, (0, -25)), (22, (0.18, 25)), (30, (0, 0))]:
        pbones["root"].location = (0, 0, hop)
        pbones["root"].keyframe_insert(data_path="location", frame=f)
        pbones["tail.01"].rotation_euler = (0, 0, math.radians(wag))
        pbones["tail.01"].keyframe_insert(data_path="rotation_euler", frame=f)

    # 12. return_idle (20 frames)
    act = new_action("return_idle")
    reset_pose()
    for f in (1, 20):
        pbones["root"].location = (0, 0, 0)
        pbones["root"].keyframe_insert(data_path="location", frame=f)
        pbones["head"].rotation_euler = (0, 0, 0)
        pbones["head"].keyframe_insert(data_path="rotation_euler", frame=f)

    # 13. hide_exit (30 frames)
    act = new_action("hide_exit")
    reset_pose()
    for f, (rot_z, y) in [(1, (0, 0)), (15, (90, -0.2)), (30, (180, -0.6))]:
        pbones["root"].rotation_euler = (0, 0, math.radians(rot_z))
        pbones["root"].location = (0, y, 0)
        pbones["root"].keyframe_insert(data_path="rotation_euler", frame=f)
        pbones["root"].keyframe_insert(data_path="location", frame=f)

    # Character-specific signatures
    if cfg["key"] == "luna":
        # bring_folder_dog
        act = new_action("bring_folder_dog")
        reset_pose()
        for f, (rz, hy) in [(1, (0, 0)), (15, (-10, 0.1)), (30, (0, 0))]:
            pbones["head"].rotation_euler = (math.radians(-rz), 0, 0)
            pbones["head"].keyframe_insert(data_path="rotation_euler", frame=f)
        # head_tilt_dog
        act = new_action("head_tilt_dog")
        reset_pose()
        for f, rot in [(1, 0), (15, 22), (30, 0)]:
            pbones["head"].rotation_euler = (0, 0, math.radians(rot))
            pbones["head"].keyframe_insert(data_path="rotation_euler", frame=f)
            pbones["ear.L"].rotation_euler = (0, 0, math.radians(rot * 0.8))
            pbones["ear.L"].keyframe_insert(data_path="rotation_euler", frame=f)

    elif cfg["key"] == "mira":
        # nudge_folder_cat
        act = new_action("nudge_folder_cat")
        reset_pose()
        for f, rot in [(1, 0), (15, 35), (30, 0)]:
            pbones["leg_fl"].rotation_euler = (math.radians(-rot), 0, 0)
            pbones["leg_fl"].keyframe_insert(data_path="rotation_euler", frame=f)
            pbones["tail.02"].rotation_euler = (0, 0, math.radians(rot))
            pbones["tail.02"].keyframe_insert(data_path="rotation_euler", frame=f)
        # curious_cat
        act = new_action("curious_cat")
        reset_pose()
        for f, (z, rx) in [(1, (0, 0)), (15, (-0.15, 15)), (30, (0, 0))]:
            pbones["hips"].location = (0, 0, z)
            pbones["hips"].keyframe_insert(data_path="location", frame=f)
            pbones["tail.03"].rotation_euler = (0, 0, math.radians(45 if f == 15 else 0))
            pbones["tail.03"].keyframe_insert(data_path="rotation_euler", frame=f)

    elif cfg["key"] == "nova":
        # fox_reveal_folder
        act = new_action("fox_reveal_folder")
        reset_pose()
        for f, (hop, rot) in [(1, (0, 0)), (15, (0.28, 30)), (30, (0, 0))]:
            pbones["root"].location = (0, 0, hop)
            pbones["root"].keyframe_insert(data_path="location", frame=f)
            pbones["tail.01"].rotation_euler = (0, 0, math.radians(rot))
            pbones["tail.01"].keyframe_insert(data_path="rotation_euler", frame=f)
        # fox_curious_peek
        act = new_action("fox_curious_peek")
        reset_pose()
        for f, rz in [(1, 0), (15, 25), (30, 0)]:
            pbones["head"].rotation_euler = (0, 0, math.radians(rz))
            pbones["head"].location = (0.08 if f == 15 else 0, 0, 0)
            pbones["head"].keyframe_insert(data_path="rotation_euler", frame=f)
            pbones["head"].keyframe_insert(data_path="location", frame=f)

    bpy.ops.object.mode_set(mode='OBJECT')

    # Push all actions to NLA tracks so glTF exporter embeds all clips
    for act_name, act_obj in actions.items():
        track = arm_obj.animation_data.nla_tracks.new()
        track.name = act_name
        track.strips.new(act_name, 1, act_obj)

    return actions

# 3. STUDIO LIGHTING & CAMERA SETUP
def setup_studio_lighting():
    scene = bpy.context.scene
    # Key Light
    key_light = bpy.data.lights.new(name="KeyLight", type='AREA')
    key_light.energy = 85.0
    key_light.size = 2.0
    key_obj = bpy.data.objects.new(name="KeyLight", object_data=key_light)
    key_obj.location = (1.5, 2.0, 2.2)
    scene.collection.objects.link(key_obj)

    # Fill Light
    fill_light = bpy.data.lights.new(name="FillLight", type='AREA')
    fill_light.energy = 45.0
    fill_light.size = 2.5
    fill_obj = bpy.data.objects.new(name="FillLight", object_data=fill_light)
    fill_obj.location = (-1.8, 1.5, 1.6)
    scene.collection.objects.link(fill_obj)

    # Rim / Backlight
    rim_light = bpy.data.lights.new(name="RimLight", type='POINT')
    rim_light.energy = 60.0
    rim_obj = bpy.data.objects.new(name="RimLight", object_data=rim_light)
    rim_obj.location = (0.0, -2.0, 2.0)
    scene.collection.objects.link(rim_obj)

    # Camera
    cam_data = bpy.data.cameras.new(name="RenderCamera")
    cam_data.lens = 50.0
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = 2.25
    cam_obj = bpy.data.objects.new(name="RenderCamera", object_data=cam_data)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj
    return cam_obj

def render_previews(cfg, cam_obj, out_dir):
    scene = bpy.context.scene
    os.makedirs(out_dir, exist_ok=True)
    scene.render.resolution_x = 256
    scene.render.resolution_y = 256

    angles = [
        ("three_quarter", (1.8, 4.0, 1.8), (0.0, 0.0, 0.62), 2.35),
        ("front",         (0.0, 4.2, 1.45), (0.0, 0.0, 0.62), 2.2),
        ("side",          (4.2, 0.0, 1.45), (0.0, 0.0, 0.62), 2.2),
        ("back",          (0.0, -4.2, 1.45), (0.0, 0.0, 0.62), 2.2),
        ("face_closeup",  (0.0, 2.8, 1.5), (0.0, 0.38, 0.78), 1.8)
    ]

    for name, loc, target, ortho_scale in angles:
        cam_obj.location = loc
        aim_camera(cam_obj, target)
        cam_obj.data.ortho_scale = ortho_scale
        
        # 1. Render Transparent PNG
        scene.render.film_transparent = True
        scene.render.filepath = os.path.join(out_dir, f"{name}.png")
        bpy.ops.render.render(write_still=True)
        assert_visible_alpha_margin(scene.render.filepath)

        # 2. Render Dark Background
        scene.render.film_transparent = False
        scene.world = bpy.data.worlds.new("DarkWorld")
        scene.world.use_nodes = True
        bg_node = scene.world.node_tree.nodes.get("Background")
        if bg_node:
            bg_node.inputs["Color"].default_value = (0.043, 0.059, 0.098, 1.0) # #0B0F19
        scene.render.filepath = os.path.join(out_dir, f"{name}_dark.png")
        bpy.ops.render.render(write_still=True)

        # 3. Render Light Background
        scene.world.use_nodes = True
        bg_node = scene.world.node_tree.nodes.get("Background")
        if bg_node:
            bg_node.inputs["Color"].default_value = (0.973, 0.976, 0.980, 1.0) # #F8F9FA
        scene.render.filepath = os.path.join(out_dir, f"{name}_light.png")
        bpy.ops.render.render(write_still=True)

def render_sprite_frames(cfg, cam_obj, arm_obj, anim_name, out_dir, num_frames=12):
    os.makedirs(out_dir, exist_ok=True)
    scene = bpy.context.scene
    scene.render.film_transparent = True
    scene.render.resolution_x = 168
    scene.render.resolution_y = 168

    cam_obj.location = (1.8, 4.0, 1.8)
    aim_camera(cam_obj, (0.0, 0.0, 0.62))
    cam_obj.data.ortho_scale = 2.35

    act = bpy.data.actions.get(anim_name)
    if act and arm_obj.animation_data:
        arm_obj.animation_data.action = act
        step = max(1, int(act.frame_range[1] / num_frames))
        for i in range(num_frames):
            frame_num = int(act.frame_range[0] + i * step)
            scene.frame_set(frame_num)
            out_file = os.path.join(out_dir, f"{anim_name}_{i:02d}.png")
            scene.render.filepath = out_file
            bpy.ops.render.render(write_still=True)
            assert_visible_alpha_margin(out_file)

# 4. MASTER BUILD PIPELINE
def build_pet(pet_key):
    cfg = PET_CONFIGS[pet_key]
    print(f"\n==========================================")
    print(f"Building F8 3D Pet: {cfg['displayName']} ({cfg['key'].upper()})")
    print(f"==========================================")

    clean_scene()
    cam_obj = setup_studio_lighting()
    mesh_obj = build_pet_mesh(cfg)
    arm_obj = build_pet_armature(cfg, mesh_obj)
    actions = create_pet_animations(cfg, arm_obj)

    target_pet_dir = os.path.join(ASSETS_DIR, pet_key)
    source_dir = os.path.join(target_pet_dir, "source")
    glb_dir = os.path.join(target_pet_dir, "glb")
    renders_dir = os.path.join(target_pet_dir, "renders")
    sprites_dir = os.path.join(target_pet_dir, "sprites")
    atlas_dir = os.path.join(target_pet_dir, "atlas")

    for d in [source_dir, glb_dir, renders_dir, sprites_dir, atlas_dir]:
        os.makedirs(d, exist_ok=True)

    # A. Save .blend source
    blend_path = os.path.join(source_dir, f"{pet_key}.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"[OK] Saved Blender source: {blend_path}")

    # B. Export Skinned GLB with all animations
    glb_path = os.path.join(glb_dir, f"{pet_key}.glb")
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        export_animations=True,
        export_skins=True,
        export_morph=True,
        export_apply=False,
        export_def_bones=True
    )
    print(f"[OK] Exported Rigged GLB: {glb_path} ({os.path.getsize(glb_path)} bytes)")

    # C. Render 5 turnaround preview views (dark and light)
    render_previews(cfg, cam_obj, renders_dir)
    print(f"[OK] Rendered turnaround previews: {renders_dir}")

    # D. Render sprite animation sequence
    render_sprite_frames(cfg, cam_obj, arm_obj, "idle_breathe", sprites_dir, num_frames=8)
    render_sprite_frames(cfg, cam_obj, arm_obj, "walk_loop", sprites_dir, num_frames=8)
    print(f"[OK] Rendered transparent sprite frames: {sprites_dir}")

    return {
        "key": pet_key,
        "blend": blend_path,
        "glb": glb_path,
        "actions": list(actions.keys())
    }


def update_manifest_hashes():
    manifest_path = os.path.join(ASSETS_DIR, "pets.manifest.json")
    with open(manifest_path, "r", encoding="utf-8") as manifest_file:
        manifest = json.load(manifest_file)
    for pet in manifest["pets"]:
        key = pet["key"]
        production = pet["production"]
        for field in ("blend", "glb"):
            asset_path = os.path.join(REPO_ROOT, "app", "src", "main", "assets", production[field])
            with open(asset_path, "rb") as asset:
                production[field + "Sha256"] = hashlib.sha256(asset.read()).hexdigest()
    with open(manifest_path, "w", encoding="utf-8") as manifest_file:
        json.dump(manifest, manifest_file, ensure_ascii=False, indent=2)
        manifest_file.write("\n")

def main():
    results = {}
    for k in ["luna", "mira", "nova"]:
        results[k] = build_pet(k)
    update_manifest_hashes()
    print("\nALL THREE F8 3D PETS SUCCESSFULLY GENERATED!")
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()
