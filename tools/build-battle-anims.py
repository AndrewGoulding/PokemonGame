#!/usr/bin/env python3
# Every move's battle animation, from pokeemerald-expansion
# (rh-hideout/pokeemerald-expansion): its animation scripts, the C that runs
# them (the sprite callbacks and visual tasks), and their pictures.
#
#   python3 tools/build-battle-anims.py <path to pokeemerald-expansion>
#
# Needs: a pokeemerald-expansion checkout (data/battle_anim_scripts.s, src/,
# include/, asm/, constants/, graphics/battle_anims/, tools/preproc/,
# charmap.txt), clang with Python's libclang (pip install libclang),
# arm-none-eabi-as (binutils-arm-none-eabi), pyelftools and Pillow.
#
# Writes:
#   ui/battle-anim-code.js   the C, translated (tools/battle_anims/c2js.py):
#                            window.BattleAnimC(E) -> every function and table
#   ui/battle-anim-data.js   window.BATTLE_ANIM_DATA: the scripts, assembled as
#                            the ROM has them (bytes; each pointer an id into
#                            `ptrs`), their labels, each move's script, the
#                            pictures, palettes and tilemaps the C names (GBA
#                            formats, base64), sound effect names, the sine table
# ui/battle-anim.js runs them (the GBA's sprites, tasks, palettes, VRAM and
# registers, as much as the animations use).
import base64
import glob
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(HERE, "battle_anims"))

PTR_BASE = 0x10000000   # (a script's pointers: PTR_BASE + an index into `ptrs`)

# The C functions ui/battle-anim.js replaces (E.<name>): where the battlers
# are (this game's pictures, not the GBA's tables), the background
# attributes (a cast of a register to a bitfield struct), and one written
# with a GNU statement expression.
OVERRIDES = ["GetBattlerSpriteCoord", "GetBattlerSpriteFinal_Y", "GetBattlerSpriteCoordAttr",
             "SetAnimBgAttribute", "GetAnimBgAttribute", "AnimTask_RandomBool"]


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, **kw)
    if r.returncode != 0:
        sys.exit("failed: " + " ".join(cmd if isinstance(cmd, list) else [cmd]) + "\n" + r.stderr.decode(errors="replace")[-2000:])
    return r.stdout


def stubs_dir(pex):
    """Generated headers a source checkout lacks (empty will do for the animation code)."""
    d = os.path.join(HERE, "battle_anims", "stubs")
    for h in ["map_groups.h", "constants/map_groups.h", "constants/region_map_sections.h"]:
        p = os.path.join(d, h)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        if not os.path.exists(p):
            open(p, "w").close()
    return d


# ---------- the scripts ----------
def assemble(pex, stubs):
    preproc = os.path.join(pex, "tools/preproc/preproc")
    if not os.path.exists(preproc):
        run(["make", "-s", "-C", os.path.join(pex, "tools/preproc")])
    src = os.path.join(pex, "data/battle_anim_scripts.s")
    obj = os.path.join(HERE, "battle_anims", "battle_anim_scripts.o")
    cpp = ["cpp", "-iquote", os.path.join(pex, "include"), "-I", stubs, "-Wno-trigraphs", "-DMODERN=1", "-DTESTING=0", "-DEMERALD", "-std=gnu17", "-"]
    a = run([preproc, "-s", src, os.path.join(pex, "charmap.txt")], cwd=pex)
    b = run(cpp, input=a, cwd=pex)
    c = run([preproc, "-ie", src, os.path.join(pex, "charmap.txt")], input=b, cwd=pex)
    run(["arm-none-eabi-as", "-mcpu=arm7tdmi", "-march=armv4t", "-meabi=5", "--defsym", "MODERN=1", "--defsym", "EMERALD=1", "-o", obj], input=c, cwd=pex)
    from elftools.elf.elffile import ELFFile
    with open(obj, "rb") as fh:
        f = ELFFile(fh)
        sec = f.get_section_by_name("script_data")
        idx = f.get_section_index("script_data")
        data = bytearray(sec.data())
        symtab = f.get_section_by_name(".symtab")
        labels = {}
        for s in symtab.iter_symbols():
            if s["st_shndx"] == idx and s.name and s["st_info"]["type"] != "STT_SECTION":
                labels[s.name] = s["st_value"]
        ptrs, ptr_index = [], {}
        rel = f.get_section_by_name(".relscript_data") or f.get_section_by_name(".rel.script_data")
        for r in rel.iter_relocations():
            if r["r_info_type"] != 2:   # (R_ARM_ABS16: the Safari Zone's message ids, not a move's)
                continue
            o = r["r_offset"]
            sym = symtab.get_symbol(r["r_info_sym"])
            addend = int.from_bytes(data[o:o + 4], "little")
            if sym["st_shndx"] == idx:
                key = ("off", sym["st_value"] + addend)
            else:
                key = ("sym", sym.name)
            if key not in ptr_index:
                ptr_index[key] = len(ptrs)
                ptrs.append(key)
            data[o:o + 4] = (PTR_BASE + ptr_index[key]).to_bytes(4, "little")
    os.remove(obj)
    return bytes(data), labels, ptrs


def move_scripts(pex):
    """Each move's name (as the games write it) -> its script's label."""
    s = open(os.path.join(pex, "src/data/moves_info.h"), encoding="utf-8").read()
    out = {}
    starts = list(re.finditer(r"^    \[MOVE_(\w+)\]\s*=", s, re.M))
    for i, m in enumerate(starts):
        body = s[m.end():starts[i + 1].start() if i + 1 < len(starts) else len(s)]
        n = re.search(r'\.name\s*=\s*COMPOUND_STRING\("([^"]*)"\)', body)
        a = re.search(r"\.battleAnimScript\s*=\s*([^\n]*)", body)
        if not (n and a):
            continue
        # (one chosen by a config, "cond ? gBattleAnimMove_Snowscape : gBattleAnimMove_Hail": the move's own)
        labels = re.findall(r"gBattleAnim\w+", a.group(1))
        if not labels:
            continue
        own = [l for l in labels if l.lower().endswith(re.sub(r"[^a-z0-9]", "", n.group(1).lower()))]
        out[n.group(1)] = {"script": (own or labels)[-1], "const": "MOVE_" + m.group(1)}
    return out


def enum_values(pex, stubs, header, prefix):
    """An enum's (or #define's) constants: { name: value }, through clang."""
    import clang.cindex as ci
    res = subprocess.run(["clang", "-print-resource-dir"], capture_output=True, text=True).stdout.strip()
    tmp = os.path.join(HERE, "battle_anims", "_enum.c")
    text = open(os.path.join(pex, "include", header), encoding="utf-8").read()
    names = re.findall(r"#define\s+(" + prefix + r"\w*)\b", text) + re.findall(r"^\s*(" + prefix + r"\w*)\s*[=,]", text, re.M)
    with open(tmp, "w") as fh:
        fh.write('#include "global.h"\n#include "' + header + '"\nlong long _v[] = {\n' + ",\n".join(sorted(set(names))) + "\n};\n")
    tu = ci.Index.create().parse(tmp, args=["-isystem", os.path.join(res, "include"), "-iquote", os.path.join(pex, "include"), "-I", stubs,
                                            "-DMODERN=1", "-DTESTING=0", "-DEMERALD", "-std=gnu17", "-w"])
    from c2js import const_int, K
    out = {}
    order = sorted(set(names))
    for c in tu.cursor.get_children():
        if c.spelling == "_v":
            init = [x for x in c.get_children() if x.kind == K.INIT_LIST_EXPR][0]
            for name, x in zip(order, init.get_children()):
                v = const_int(x)
                if v is not None:
                    out[name] = v
    os.remove(tmp)
    return out


# ---------- the pictures ----------
def png_indexed(path):
    from PIL import Image
    im = Image.open(path)
    if im.mode != "P":
        sys.exit("not an indexed PNG: " + path)
    return im


def tiles_from_png(path, bpp):
    """A PNG as the GBA's tiles (8x8, row by row across the picture), 4bpp or 8bpp."""
    im = png_indexed(path)
    w, h = im.size
    px = im.load()
    out = bytearray()
    for ty in range(0, h, 8):
        for tx in range(0, w, 8):
            for y in range(8):
                row = [px[tx + x, ty + y] for x in range(8)]
                if bpp == 4:
                    for x in range(0, 8, 2):
                        out.append((row[x] & 15) | ((row[x + 1] & 15) << 4))
                else:
                    out.extend(v & 255 for v in row)
    return bytes(out)


def pal_from(path):
    """A palette (JASC .pal or a PNG's) as GBA colours, little-endian bytes."""
    if path.endswith(".pal"):
        lines = open(path, encoding="utf-8").read().split()
        n = int(lines[2])
        cols = [tuple(int(v) for v in lines[3 + 3 * i:6 + 3 * i]) for i in range(n)]
    else:
        im = png_indexed(path)
        raw = im.getpalette() or []
        n = len(raw) // 3
        cols = [tuple(raw[3 * i:3 * i + 3]) for i in range(n)]
        # (gbagfx writes as many colours as the PNG's palette has, rounded to 16)
        n = max(16, (n + 15) // 16 * 16)
        cols += [(0, 0, 0)] * (n - len(cols))
    out = bytearray()
    for r, g, b in cols:
        v = (r >> 3) | ((g >> 3) << 5) | ((b >> 3) << 10)
        out += v.to_bytes(2, "little")
    return bytes(out)


def graphics_symbols(pex):
    """src/graphics.c's (and the others') INCGFX/INCBIN symbols: { name: (path, ext) }."""
    out = {}
    for f in glob.glob(os.path.join(pex, "src/**/*.c"), recursive=True) + glob.glob(os.path.join(pex, "src/**/*.h"), recursive=True):
        try:
            s = open(f, encoding="utf-8").read()
        except Exception:
            continue
        for m in re.finditer(r'const\s+u(8|16|32)\s+(\w+)\[\]\s*=\s*INCGFX_U\d+\("([^"]+)",\s*"([^"]+)"', s):
            out[m.group(2)] = (m.group(3), m.group(4), int(m.group(1)))
        for m in re.finditer(r'const\s+u(8|16|32)\s+(\w+)\[\]\s*=\s*INCBIN_U\d+\("([^"]+)"\)', s):
            out.setdefault(m.group(2), (m.group(3), "raw", int(m.group(1))))
    return out


CONCAT = None


def concat_rules(pex):
    """graphics_file_rules.mk's pictures made of others: { target: [parts] } (paths from the checkout)."""
    global CONCAT
    if CONCAT is None:
        CONCAT = {}
        s = open(os.path.join(pex, "graphics_file_rules.mk"), encoding="utf-8").read()
        dirs = dict(re.findall(r"^(\w+)\s*:=\s*(\S+)", s, re.M))
        sub = lambda p: re.sub(r"\$\((\w+)\)", lambda m: dirs.get(m.group(1), ""), p)
        for m in re.finditer(r"^(\S+\.(?:4bpp|8bpp|gbapal|bin)):\s*((?:[^\n]*\\\n)*[^\n]*)\n\t@?cat \$\^", s, re.M):
            parts = [sub(p) for p in m.group(2).replace("\\\n", " ").split()]
            CONCAT[sub(m.group(1))] = parts
    return CONCAT


def convert(pex, path, ext):
    """(kind, bytes) of a graphics symbol, as the ROM has it once decompressed."""
    full = os.path.join(pex, path)
    base, fext = os.path.splitext(full)
    if fext in (".4bpp", ".8bpp", ".gbapal") and path in concat_rules(pex):
        out = b""
        for p in concat_rules(pex)[path]:
            pb, pe = os.path.splitext(p)
            out += convert(pex, pb + ".png" if pe in (".4bpp", ".8bpp") else p, pe if pe != ".gbapal" else ".gbapal")[1]
        return ("pal" if fext == ".gbapal" else "tiles"), out
    if ext.startswith(".4bpp") or ext.startswith(".8bpp"):
        bpp = 4 if ext.startswith(".4bpp") else 8
        if os.path.exists(full) and fext == ".png":
            return "tiles", tiles_from_png(full, bpp)
        parts = sorted(glob.glob(base + "_[0-9]*.png"), key=lambda p: int(re.search(r"_(\d+)\.png$", p).group(1)))
        if parts:
            return "tiles", b"".join(tiles_from_png(p, bpp) for p in parts)
        if os.path.exists(base + ".png"):
            return "tiles", tiles_from_png(base + ".png", bpp)
        raise FileNotFoundError(full)
    if ext == ".gbapal":
        for p in (full, base + ".pal", base + ".png"):
            if os.path.exists(p) and os.path.splitext(p)[1] in (".pal", ".png"):
                return "pal", pal_from(p)
        raise FileNotFoundError(full)
    if ext in (".smolTM", ".smol", "raw", ".lz", ".bin"):
        if fext == ".png":
            return "tiles", tiles_from_png(full, 4)
        if not os.path.exists(full):
            raise FileNotFoundError(full)
        return "raw", open(full, "rb").read()
    raise ValueError("unknown kind " + ext + " for " + path)


def sine_table(pex):
    s = open(os.path.join(pex, "src/trig.c"), encoding="utf-8").read()
    m = re.search(r"gSineTable\[\]\s*=\s*\{(.*?)\};", s, re.S)
    vals = []
    for v in re.findall(r"Q_8_8\(([-\d.]+)\)|(-?0x[0-9a-fA-F]+|-?\d+)", m.group(1)):
        if v[0]:
            vals.append(int(float(v[0]) * 256))
        else:
            vals.append(int(v[1], 0))
    return vals


def main():
    pex = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("POKEEMERALD_EXPANSION")
    if not pex or not os.path.exists(os.path.join(pex, "data/battle_anim_scripts.s")):
        sys.exit("Usage: python3 tools/build-battle-anims.py <path to pokeemerald-expansion>")
    pex = os.path.abspath(pex)
    stubs = stubs_dir(pex)

    from translate import translate
    lines, funcs, exports, problems = translate(pex, stubs, OVERRIDES)
    lets = set(re.match(r"let (\w+) =", l).group(1) for l in lines if l.startswith("let "))
    # (a variable, read and set through the object: gReservedSpritePaletteCount...)
    accessor = lambda e: ("get " + e + "() { return " + e + "; }, set " + e + "(v) { " + e + " = v; }") if e in lets else e
    code = ("// Auto-generated by tools/build-battle-anims.py from pokeemerald-expansion's\n"
            "// src/battle_anim*.c (tools/battle_anims/c2js.py). Do not edit by hand.\n"
            "window.BattleAnimC = function (E) {\n\"use strict\";\n" + "\n".join(lines) + "\n\n" + "\n\n".join(funcs) +
            "\nreturn { " + ", ".join(accessor(e) for e in exports) + " };\n};\n")
    code = code.replace(pex + "/", "pokeemerald-expansion/")
    with open(os.path.join(ROOT, "ui/battle-anim-code.js"), "w", encoding="utf-8") as fh:
        fh.write(code)

    script, labels, ptrs = assemble(pex, stubs)
    moves = move_scripts(pex)
    move_ids = enum_values(pex, stubs, "constants/moves.h", "MOVE_")
    for name, m in moves.items():
        m["id"] = move_ids.get(m["const"])
    songs = enum_values(pex, stubs, "constants/songs.h", "SE_")
    species = enum_values(pex, stubs, "constants/species.h", "SPECIES_")
    types = enum_values(pex, stubs, "constants/pokemon.h", "TYPE_")

    # The pictures, palettes and tilemaps the C names.
    syms = graphics_symbols(pex)
    used = sorted(set(re.findall(r"\bE\.(\w+)", code)) & set(syms))
    gfx, missing = {}, []
    for name in used:
        path, ext, width = syms[name]
        try:
            kind, data = convert(pex, path, ext)
        except (FileNotFoundError, ValueError) as e:
            missing.append(name + " (" + str(e) + ")")
            continue
        gfx[name] = [kind, width // 8, base64.b64encode(data).decode()]

    data = {
        "script": base64.b64encode(script).decode(),
        "labels": labels,
        "ptrs": [[k, v] for k, v in ptrs],
        "ptrBase": PTR_BASE,
        "moves": moves,
        "songs": {v: k for k, v in songs.items()},
        "sine": sine_table(pex),
        "species": species,
        "types": types,
        "gfx": gfx,
    }
    with open(os.path.join(ROOT, "ui/battle-anim-data.js"), "w", encoding="utf-8") as fh:
        fh.write("// Auto-generated by tools/build-battle-anims.py from pokeemerald-expansion. Do not edit by hand.\n")
        fh.write("window.BATTLE_ANIM_DATA = " + json.dumps(data, separators=(",", ":")) + ";\n")
    print("ui/battle-anim-code.js: %d tables, %d functions (%d not translated: %s)" % (len(lines), len(funcs), len(problems),
          ", ".join(p[0] for p in problems)))
    print("ui/battle-anim-data.js: %d bytes of scripts, %d labels, %d moves, %d pictures%s" % (len(script), len(labels), len(moves), len(gfx),
          ("; missing: " + ", ".join(missing)) if missing else ""))


if __name__ == "__main__":
    main()
