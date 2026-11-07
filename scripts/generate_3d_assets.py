"""
Procedural 3D Asset Generator for Soldiers (Paper War 1v1)
Executed via Blender 5.2.3 CLI:
blender --background --python scripts/generate_3d_assets.py
"""

import bpy
import bmesh
import math
import os

OUTPUT_DIR = os.path.abspath("public/models")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_pbr_material(name, base_color=(1, 1, 1, 1), roughness=0.5, metallic=0.0, emission_color=(0, 0, 0, 1), emission_strength=0.0, transmission=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = base_color
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if "Transmission Weight" in bsdf.inputs:
            bsdf.inputs["Transmission Weight"].default_value = transmission
        elif "Transmission" in bsdf.inputs:
            bsdf.inputs["Transmission"].default_value = transmission
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = emission_color
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat

def export_gltf(filepath):
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_materials='EXPORT'
    )
    print(f"--> Exported: {filepath}")

# ==============================================================================
# 1. GENERATE BALLPOINT PEN (BLUE & RED)
# ==============================================================================
def generate_ballpoint_pen(color_name="blue", ink_rgb=(0.05, 0.15, 0.85, 1.0)):
    clear_scene()
    
    # Materials
    mat_plastic_barrel = create_pbr_material("BarrelClear", base_color=(0.92, 0.94, 0.96, 1.0), roughness=0.15, transmission=0.75)
    mat_ink = create_pbr_material(f"Ink_{color_name}", base_color=ink_rgb, roughness=0.3)
    mat_brass_tip = create_pbr_material("BrassTip", base_color=(0.85, 0.65, 0.2, 1.0), roughness=0.25, metallic=0.9)
    mat_tungsten_ball = create_pbr_material("TungstenBall", base_color=(0.2, 0.2, 0.2, 1.0), roughness=0.1, metallic=0.95)
    mat_colored_plug = create_pbr_material(f"Plug_{color_name}", base_color=ink_rgb, roughness=0.35)

    # Tip Ball at origin (0, 0, 0)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.0008, location=(0, 0, 0.0008))
    ball = bpy.context.active_object
    ball.name = "Pen_BallTip"
    ball.data.materials.append(mat_tungsten_ball)

    # Brass Cone Tip
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.0028, radius2=0.0008, depth=0.012, location=(0, 0, 0.0068))
    tip_cone = bpy.context.active_object
    tip_cone.name = "Pen_BrassCone"
    tip_cone.data.materials.append(mat_brass_tip)

    # Hexagonal Barrel (Bic style 6-sided cylinder)
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.0042, depth=0.115, location=(0, 0, 0.070))
    barrel = bpy.context.active_object
    barrel.name = "Pen_HexBarrel"
    barrel.data.materials.append(mat_plastic_barrel)

    # Inner Ink Tube
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.0016, depth=0.105, location=(0, 0, 0.065))
    ink_tube = bpy.context.active_object
    ink_tube.name = "Pen_InkTue"
    ink_tube.data.materials.append(mat_ink)

    # Top End Plug
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.0039, depth=0.012, location=(0, 0, 0.133))
    plug = bpy.context.active_object
    plug.name = "Pen_TopPlug"
    plug.data.materials.append(mat_colored_plug)

    # Export model
    out_path = os.path.join(OUTPUT_DIR, f"ballpoint_pen_{color_name}.glb")
    export_gltf(out_path)

# ==============================================================================
# 2. GENERATE DESK ENVIRONMENT SCENE
# ==============================================================================
def generate_desk_scene():
    clear_scene()

    # Materials
    mat_wood = create_pbr_material("DeskWood", base_color=(0.28, 0.18, 0.11, 1.0), roughness=0.65)
    mat_lamp_metal = create_pbr_material("LampDarkMetal", base_color=(0.08, 0.09, 0.10, 1.0), roughness=0.35, metallic=0.7)
    mat_lamp_brass = create_pbr_material("LampBrassJoint", base_color=(0.82, 0.62, 0.22, 1.0), roughness=0.25, metallic=0.9)
    mat_bulb_light = create_pbr_material("LampBulbWarm", base_color=(1.0, 0.95, 0.8, 1.0), roughness=0.1, emission_color=(1.0, 0.88, 0.65, 1.0), emission_strength=8.0)
    mat_eraser_rubber = create_pbr_material("EraserRubber", base_color=(0.95, 0.95, 0.95, 1.0), roughness=0.9)
    mat_eraser_sleeve = create_pbr_material("EraserSleeve", base_color=(0.1, 0.35, 0.75, 1.0), roughness=0.5)
    mat_sharpener_metal = create_pbr_material("SharpenerMetal", base_color=(0.75, 0.77, 0.80, 1.0), roughness=0.28, metallic=0.85)
    mat_paperclip = create_pbr_material("PaperclipSteel", base_color=(0.85, 0.87, 0.90, 1.0), roughness=0.2, metallic=0.95)

    # 1. Wooden Desk Slab (Center origin, top surface at z = 0)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, -0.025))
    desk = bpy.context.active_object
    desk.scale = (1.2, 0.8, 0.05)
    desk.name = "Desk_Surface"
    desk.data.materials.append(mat_wood)

    # 2. Desk Lamp on Top-Right Corner
    # Lamp Base
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.07, depth=0.015, location=(0.42, 0.26, 0.0075))
    lamp_base = bpy.context.active_object
    lamp_base.name = "Lamp_Base"
    lamp_base.data.materials.append(mat_lamp_metal)

    # Lower Arm
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.007, depth=0.22, location=(0.38, 0.24, 0.11))
    arm1 = bpy.context.active_object
    arm1.rotation_euler = (math.radians(-15), math.radians(-18), 0)
    arm1.name = "Lamp_ArmLower"
    arm1.data.materials.append(mat_lamp_metal)

    # Brass Elbow Joint
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.013, location=(0.34, 0.21, 0.21))
    joint = bpy.context.active_object
    joint.name = "Lamp_Joint"
    joint.data.materials.append(mat_lamp_brass)

    # Upper Arm
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.006, depth=0.20, location=(0.26, 0.15, 0.25))
    arm2 = bpy.context.active_object
    arm2.rotation_euler = (math.radians(30), math.radians(-40), 0)
    arm2.name = "Lamp_ArmUpper"
    arm2.data.materials.append(mat_lamp_metal)

    # Lamp Shade (Conical dome pointing toward center of desk)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.065, radius2=0.025, depth=0.09, location=(0.18, 0.10, 0.27))
    shade = bpy.context.active_object
    shade.rotation_euler = (math.radians(45), math.radians(-30), 0)
    shade.name = "Lamp_Shade"
    shade.data.materials.append(mat_lamp_metal)

    # Warm Light Bulb inside shade
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.02, location=(0.17, 0.09, 0.26))
    bulb = bpy.context.active_object
    bulb.name = "Lamp_Bulb"
    bulb.data.materials.append(mat_bulb_light)

    # 3. Vinyl Eraser (Top-Left of Desk)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.38, 0.22, 0.009))
    eraser = bpy.context.active_object
    eraser.scale = (0.055, 0.025, 0.018)
    eraser.rotation_euler = (0, 0, math.radians(22))
    eraser.name = "Desk_Eraser"
    eraser.data.materials.append(mat_eraser_rubber)

    # Eraser Blue Cardboard Sleeve
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.39, 0.225, 0.0095))
    sleeve = bpy.context.active_object
    sleeve.scale = (0.035, 0.026, 0.019)
    sleeve.rotation_euler = (0, 0, math.radians(22))
    sleeve.name = "Desk_EraserSleeve"
    sleeve.data.materials.append(mat_eraser_sleeve)

    # 4. Metal Pencil Sharpener (Next to eraser)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.44, 0.14, 0.007))
    sharpener = bpy.context.active_object
    sharpener.scale = (0.028, 0.018, 0.014)
    sharpener.rotation_euler = (0, 0, math.radians(-15))
    sharpener.name = "Desk_Sharpener"
    sharpener.data.materials.append(mat_sharpener_metal)

    # 5. Paperclips on Desk
    for i, (px, py, rot) in enumerate([(-0.35, 0.11, 45), (-0.33, 0.09, 70), (0.42, 0.10, -25)]):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.014, minor_radius=0.0012, location=(px, py, 0.0015))
        clip = bpy.context.active_object
        clip.scale = (1.8, 0.6, 1.0)
        clip.rotation_euler = (0, 0, math.radians(rot))
        clip.name = f"Desk_Paperclip_{i+1}"
        clip.data.materials.append(mat_paperclip)

    out_path = os.path.join(OUTPUT_DIR, "desk_scene.glb")
    export_gltf(out_path)

# ==============================================================================
# 3. GENERATE PAPER SHEET MESH (A4 LANDSCAPE WITH CREASE)
# ==============================================================================
def generate_paper_sheet():
    clear_scene()

    mat_paper = create_pbr_material("PaperStock", base_color=(0.96, 0.95, 0.93, 1.0), roughness=0.88)

    # Create subdivided plane for smooth folding and subtle corner curl
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0, 0, 0.0005))
    paper = bpy.context.active_object
    paper.name = "Paper_NotebookSheet"
    paper.scale = (0.297, 0.210, 1.0)  # A4 proportion: 297mm x 210mm
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # Subdivide paper mesh
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(paper.data)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=16, use_grid_fill=True)
    bmesh.update_edit_mesh(paper.data)
    bpy.ops.object.mode_set(mode='OBJECT')

    # Apply subtle upward curl on the 4 outer corners for authentic paper feel
    for v in paper.data.vertices:
        dist_from_corner = math.sqrt(v.co.x**2 + v.co.y**2)
        if dist_from_corner > 0.12:
            # Lift outer edges slightly (0.5mm - 1.5mm)
            v.co.z += (dist_from_corner - 0.12)**2 * 0.18

    paper.data.materials.append(mat_paper)

    out_path = os.path.join(OUTPUT_DIR, "paper_sheet.glb")
    export_gltf(out_path)

if __name__ == "__main__":
    print("=== Generating 3D Assets for Soldiers ===")
    generate_ballpoint_pen("blue", (0.05, 0.18, 0.85, 1.0))
    generate_ballpoint_pen("red", (0.85, 0.08, 0.12, 1.0))
    generate_desk_scene()
    generate_paper_sheet()
    print("=== All 3D Assets Generated Successfully! ===")
