# The Dragon Ball realm's side-on sprites, from Dragon Ball: Advanced Adventure (GBA, Banpresto/Dimps, 2004; the
# USA cartridge, game code BDVE): the first series, Goku as a boy. Only its sprites' pictures. None of its game.
#
#   python3 tools/build-dbz-advanced-adventure.py <path to the .gba>
#   python3 tools/build-dbz-advanced-adventure.py   (no cartridge: from tools/data/roms/BDVE.bin, which a run with it keeps;
#                                                    tools/lib/romcache.py)
#
# How the ROM keeps them (nothing's packed), from the sprite set at 0x811855c:
#   +0   each object's list of animations (214 objects)
#   +4   each object's frames: 12 bytes each (first part, how many parts, width, height, anchor x, anchor y)
#   +8   each object's parts: 6 bytes each (OAM attributes 0, 1 and 2; the tile counts from the loaded block)
#   +c   the palettes, 16 colours each
#   +10  the 4bpp tiles; +14 the 8bpp tiles
#   An animation is a script of words: a duration then a frame, or a command (a negative number):
#   -1 n size  load tiles (n >= 0: 4bpp tile n, size & 0x7ff of them; else 8bpp), -2 p count  load palette p (each
#   frame is drawn in the palette loaded before it),
#   -3 loop, -4 stop; the rest take 1, 2 or 3 more words and don't change the picture.
#
# Writes:
#   assets/dragonball/side/DBA_<nnn>.png     each object's animations: a row each, its frames in order
#   assets/dragonball/side/index.json        each sheet's cell size, the anchor in each cell, each row's frames
import functools, json, os, struct, sys
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets/dragonball/side')
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib')); import romcache
rom = romcache.load(sys.argv[1] if len(sys.argv) > 1 else None, ['BDVE'])   # (the cartridge, or tools/data/roms: tools/lib/romcache.py)
if rom[0xac:0xb0] != b'BDVE': sys.exit('Not Dragon Ball: Advanced Adventure (USA): its game code is ' + repr(rom[0xac:0xb0]))
def R(a): return struct.unpack_from('<I', rom, a & 0x1ffffff)[0]
def isptr(v): return 0x08000000 <= v < 0x08000000 + len(rom)
SET = 0x811855c
ANIMS, FRAMES, PARTS, PALS, TILES4, TILES8 = [R(SET + 4 * i) for i in range(6)]
SIZES = {(0, 0): (8, 8), (0, 1): (16, 16), (0, 2): (32, 32), (0, 3): (64, 64), (1, 0): (16, 8), (1, 1): (32, 8),
         (1, 2): (32, 16), (1, 3): (64, 32), (2, 0): (8, 16), (2, 1): (8, 32), (2, 2): (16, 32), (2, 3): (32, 64)}
ARGS = {-1: 2, -2: 2, -5: 1, -6: 2, -7: 1, -8: 2, -9: 1, -10: 3, -11: 1, -12: 1}
def s32(v): return v - (1 << 32) if v & 0x80000000 else v
def palette(p):
    c = np.frombuffer(rom[(PALS & 0x1ffffff) + 32 * p:(PALS & 0x1ffffff) + 32 * p + 32], '<u2').astype(np.int32)
    r, g, b = c & 31, c >> 5 & 31, c >> 10 & 31
    return np.stack([r << 3 | r >> 2, g << 3 | g >> 2, b << 3 | b >> 2], 1).astype(np.uint8)
@functools.lru_cache(maxsize=None)
def tile(block, k, bpp8):
    if block is None: return np.zeros((8, 8), np.uint8)
    if bpp8:
        a = block + 64 * k; return np.frombuffer(rom[a:a + 64], np.uint8).reshape(8, 8)
    a = block + 32 * k; d = np.frombuffer(rom[a:a + 32], np.uint8)
    t = np.zeros(64, np.uint8); t[0::2] = d & 15; t[1::2] = d >> 4
    return t.reshape(8, 8)
def frame(obj, f, block, bpp8):
    first, count = struct.unpack_from('<HH', rom, (R(FRAMES + 4 * obj) + 12 * f) & 0x1ffffff)
    ax, ay = struct.unpack_from('<hh', rom, (R(FRAMES + 4 * obj) + 12 * f + 8) & 0x1ffffff)
    parts = []
    if count > 32 or first > 4096: return parts                    # (not a frame: a few objects' lists run on)
    for k in range(count):
        a0, a1, a2 = struct.unpack_from('<HHH', rom, (R(PARTS + 4 * obj) + 6 * (first + k)) & 0x1ffffff)
        w, h = SIZES.get((a0 >> 14, a1 >> 14), (8, 8))
        y = (a0 & 0xff) - 256 * (a0 & 0x80 != 0); x = (a1 & 0x1ff) - 512 * (a1 & 0x100 != 0)
        img = np.zeros((h, w), np.uint8); tw = w // 8; t = a2 & 0x3ff
        for i in range(tw * (h // 8)):
            img[(i // tw) * 8:(i // tw) * 8 + 8, (i % tw) * 8:(i % tw) * 8 + 8] = tile(block, t // (2 if bpp8 else 1) + i, bpp8)
        if a1 & 0x1000: img = img[:, ::-1]
        if a1 & 0x2000: img = img[::-1]
        if abs(x - ax) > 256 or abs(y - ay) > 256: continue          # (not a picture: a few objects' tables run on)
        parts.append((img, x - ax, y - ay))
    return parts
def animation(script):
    out, seen, block, bpp8, pal, o = [], set(), None, False, None, script & 0x1ffffff
    for _ in range(400):
        v = s32(R(o))
        if v in (-3, -4) or v < -12: break
        if v < 0:
            if v == -1:
                n, size = s32(R(o + 4)), R(o + 8)
                if n >= 0: block, bpp8 = (TILES4 & 0x1ffffff) + 32 * n, False
                else: block, bpp8 = (TILES8 & 0x1ffffff) + 64 * n, True
            if v == -2: pal = R(o + 4)
            o += 4 * (1 + ARGS.get(v, 0)); continue
        f = R(o + 4)
        if (block, f, pal) not in seen: seen.add((block, f, pal)); out.append((block, f, bpp8, pal))
        o += 8
    return out

starts = sorted({R(ANIMS + 4 * t) for t in range(214)})
os.makedirs(OUT, exist_ok=True)
index = {}
for obj in range(214):
    A = R(ANIMS + 4 * obj)
    nxt = next((s for s in starts if s > A), A + 4 * 200)
    rows, pals = [], []
    for k in range(min((nxt - A) // 4, 128)):
        s = R(A + 4 * k)
        if not isptr(s): break
        frames = animation(s)[:64]
        row = [frame(obj, f, b, bpp8) for b, f, bpp8, p in frames]
        if not any(row): break
        rows.append(row); pals.append([p for *_, p in frames])
    # Each frame in the palette its script had loaded by then; before any, the one the object loads most.
    loaded = [p for r in pals for p in r if p is not None]
    usual = max(set(loaded), key=loaded.count) if loaded else 0
    ps = [q for r in rows for f in r for q in f]
    if not ps: continue
    left = max([-x for _, x, _ in ps] + [8]); right = max([x + im.shape[1] for im, x, _ in ps] + [8])
    up = max([-y for _, _, y in ps] + [8]); down = max([y + im.shape[0] for im, _, y in ps] + [0])
    half = -(-max(left, right) // 8) * 8; up = -(-up // 8) * 8; down = -(-down // 8) * 8
    cw, ch, cols = 2 * half, up + down, max(len(r) for r in rows) or 1
    rgba = np.zeros((len(rows) * ch, cols * cw, 4), np.uint8)
    for r, fs in enumerate(rows):
        for c, parts in enumerate(fs):
            P = palette(pals[r][c] if pals[r][c] is not None else usual)
            for im, x, y in parts:
                X, Y = c * cw + half + x, r * ch + up + y
                sub = rgba[Y:Y + im.shape[0], X:X + im.shape[1]]; im = im[:sub.shape[0], :sub.shape[1]]
                sub[im != 0, :3] = P[im[im != 0] & 15]; sub[im != 0, 3] = 255
    name = 'DBA_%03d' % obj
    Image.fromarray(rgba, 'RGBA').save(os.path.join(OUT, name + '.png'), optimize=True)
    index[name] = dict(cell=[cw, ch], anchor=[half, up], frames=[len(r) for r in rows])
json.dump(index, open(os.path.join(OUT, 'index.json'), 'w'), separators=(',', ':'))
print(len(index), 'objects')
