"""
Import wavy-tray.glb, apply matte translucent PP material, export GLB.
Run: Blender --background --python scripts/texture_tray.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[1]
BACKUP = ROOT / "wavy-tray.glb"
SRC_GLB = BACKUP if BACKUP.exists() else ROOT / "public" / "wavy-tray.glb"
OUT_GLB = ROOT / "public" / "wavy-tray.glb"
TEX_DIR = ROOT / "textures"
ROUGH = TEX_DIR / "plaster_rough_1k.jpg"


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures):
        for item in list(block):
            block.remove(item)


def ensure_uv(obj: bpy.types.Object) -> None:
    if obj.type != "MESH":
        return
    if obj.data.uv_layers:
        return
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.02)
    bpy.ops.object.mode_set(mode="OBJECT")


def load_image(path: Path, *, colorspace: str) -> bpy.types.Image | None:
    if not path.exists():
        return None
    image = bpy.data.images.load(str(path), check_existing=True)
    try:
        image.colorspace_settings.name = colorspace
    except Exception:
        pass
    return image


def set_input(bsdf, name: str, value) -> None:
    if name in bsdf.inputs:
        bsdf.inputs[name].default_value = value


def build_pp_material() -> bpy.types.Material:
    """Matte translucent polypropylene — milky, soft, low gloss."""
    mat = bpy.data.materials.new(name="MatteTranslucentPP")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out = nodes.new("ShaderNodeOutputMaterial")
    out.location = (520, 0)

    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (220, 0)

    # Milky warm-white PP
    set_input(bsdf, "Base Color", (0.93, 0.90, 0.86, 1.0))
    set_input(bsdf, "Metallic", 0.0)
    set_input(bsdf, "Roughness", 0.82)
    set_input(bsdf, "IOR", 1.49)  # polypropylene
    set_input(bsdf, "Alpha", 1.0)
    # Transmission (Blender 4+/5 naming)
    set_input(bsdf, "Transmission Weight", 0.42)
    set_input(bsdf, "Transmission", 0.42)
    set_input(bsdf, "Coat Weight", 0.0)
    set_input(bsdf, "Coat Roughness", 1.0)
    set_input(bsdf, "Specular IOR Level", 0.22)
    set_input(bsdf, "Specular", 0.22)

    # Subtle roughness variation only (keeps matte PP, exports as texture)
    rough_img = load_image(ROUGH, colorspace="Non-Color")
    if rough_img is not None:
        tex_coord = nodes.new("ShaderNodeTexCoord")
        tex_coord.location = (-560, -40)
        mapping = nodes.new("ShaderNodeMapping")
        mapping.location = (-360, -40)
        mapping.inputs["Scale"].default_value = (2.0, 2.0, 2.0)

        rough_tex = nodes.new("ShaderNodeTexImage")
        rough_tex.location = (-160, -40)
        rough_tex.image = rough_img

        ramp = nodes.new("ShaderNodeMapRange")
        ramp.location = (40, -40)
        ramp.inputs["From Min"].default_value = 0.0
        ramp.inputs["From Max"].default_value = 1.0
        ramp.inputs["To Min"].default_value = 0.72
        ramp.inputs["To Max"].default_value = 0.92

        links.new(tex_coord.outputs["UV"], mapping.inputs["Vector"])
        links.new(mapping.outputs["Vector"], rough_tex.inputs["Vector"])
        links.new(rough_tex.outputs["Color"], ramp.inputs["Value"])
        try:
            links.new(ramp.outputs["Result"], bsdf.inputs["Roughness"])
        except Exception:
            links.new(rough_tex.outputs["Color"], bsdf.inputs["Roughness"])

    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    # Help viewport / export treat as translucent
    try:
        mat.blend_method = "HASHED"
    except Exception:
        pass
    try:
        mat.use_transparency_overlap = True
    except Exception:
        pass

    return mat


def main() -> None:
    if not SRC_GLB.exists():
        print(f"Missing source GLB: {SRC_GLB}", file=sys.stderr)
        sys.exit(1)

    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(SRC_GLB))

    mesh_objs = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    print(f"Source: {SRC_GLB}")
    print(f"Imported meshes: {[obj.name for obj in mesh_objs]}")
    if not mesh_objs:
        print("No mesh in GLB", file=sys.stderr)
        sys.exit(1)

    mat = build_pp_material()
    for obj in mesh_objs:
        ensure_uv(obj)
        if not obj.data.materials:
            obj.data.materials.append(mat)
        for i in range(len(obj.data.materials)):
            obj.data.materials[i] = mat

    OUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    for image in bpy.data.images:
        try:
            image.pack()
        except Exception as exc:
            print(f"pack skip {image.name}: {exc}")

    bpy.ops.export_scene.gltf(
        filepath=str(OUT_GLB),
        export_format="GLB",
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_yup=True,
    )
    print(f"Exported: {OUT_GLB} ({OUT_GLB.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
