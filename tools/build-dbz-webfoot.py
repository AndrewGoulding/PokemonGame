# The Dragon Ball realm's maps, people and portraits, from Webfoot's two GBA Dragon Ball Z games on one engine:
# Dragon Ball Z: The Legacy of Goku II (USA, game code ALFE) and Dragonball Z: Buu's Fury (USA, BG3E).
# Only their pictures: the maps, everyone's sprites and the dialogue portraits. None of their game.
#
#   python3 tools/build-dbz-webfoot.py <path to either .gba> [only]
#   python3 tools/build-dbz-webfoot.py ALFE | BG3E [only]   (no cartridge: from tools/data/roms/<its code>.bin, which a run with it keeps;
#                                         tools/lib/romcache.py)
#
# ("only" is maps, people or portraits, to build just that part.)
#
# How the ROM keeps them:
#   Almost everything is packed: an 8-byte header (u32 kind: 0 stored, 1 or 2 packed; u32 unpacked size) then
#   Webfoot's own LZ bitstream (unpack() below, a port of the ARM routine the game copies to IWRAM; 32-bit words,
#   most significant bit first, gamma-coded lengths, a switchable literal width and offset width).
#   A map is an 0x50-byte header:
#     +0  BLDCNT, BLDALPHA          +4  each background's priority (one byte each)
#     +8  width - 240, height - 160 (u16 each; the camera's range)
#     +c  how many animated tiles, +10 a list of them: (frames, tiles, first tile, then each frame's packed
#         tiles behind a u32 delay; we take frame 0)
#     +14..+20  the four backgrounds: each a function pointer, 0x400, 0x400, 0, its number << 16, then the bytes
#         columns, rows, and that many pointers to packed 32x32 screens of u16 entries (0 = an empty screen)
#     +48 the packed list of the map's tiles: u16s, each the last + this + 1 = (bank << 8 | tile in bank)
#     +4c the banks: packed 16 KB sheets of 256 8bpp tiles
#   The palettes are the same everywhere: 256 colours for the backgrounds, then 256 for the sprites.
#   People: a table of pointers to each one's definition. Legacy of Goku II's lists animations (in fours, one a
#   direction), each a run of 12-byte frames (x, y, width, height, OAM flags, packed 8bpp tiles); Buu's Fury's lists
#   animation sets (a count of frames, then frames x 4 directions of pointers), each frame a count of parts, a box,
#   and 12-byte parts.
#   Portraits: a table of packed 64x64 8bpp pictures (plain rows, not tiles).
#
# Writes:
#   assets/dragonball/maps/<LG2|BF>_<nnn>.png, -top.png      each map (the top: what's drawn over people)
#   assets/dragonball/maps/<LG2|BF>_<nnn>-walk.png           where people can walk: a pixel for each 8x8 cell, white
#   assets/dragonball/maps/index.json                       each map's area name, size and where the player starts
#   assets/dragonball/people/<LG2|BF>_<nnn>.png             each person's animations: a row each, in the ROM's
#                                                           order (down, up, left, right for each)
#   assets/dragonball/people/index.json                     each sheet's cell size, the anchor in each cell (the
#                                                           person's position), and how many frames each row has
#   assets/dragonball/portraits/<LG2|BF>_<nnn>.png          each portrait, 64x64
import json, os, struct, sys
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets/dragonball')
GAMES = {
    b'ALFE': dict(prefix='LG2', layer_fn=0x080056a1, bg_pal=0x1da4c8, obj_pal=0x1da6c8,
                  people=0x3b4e80, portraits=0x3ec9f4, n_portraits=107, menu_portraits=(18, 0x1d4f50), strings=0xe2840, utf16=False),
    b'BG3E': dict(prefix='BF', layer_fn=0x08008087, bg_pal=0x5632c, obj_pal=0x5652c,
                  people=0x6b6bd8, portraits=0x6f395c, n_portraits=155, strings=0x6bce8, utf16=True),
}
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib')); import romcache
rom = romcache.load(sys.argv[1] if len(sys.argv) > 1 else None, ['ALFE', 'BG3E'])   # (the cartridge, or tools/data/roms: tools/lib/romcache.py)
G = GAMES.get(rom[0xac:0xb0]) or sys.exit('Not Legacy of Goku II or Buu\'s Fury (USA): its game code is ' + repr(rom[0xac:0xb0]))
ONLY = sys.argv[2] if len(sys.argv) > 2 else None
def R(a): return struct.unpack_from('<I', rom, a & 0x1ffffff)[0]
def H(a): return struct.unpack_from('<H', rom, a & 0x1ffffff)[0]
def isptr(v): return 0x08000000 <= v < 0x08000000 + len(rom)
def palette(o):
    c = np.frombuffer(rom[o:o + 512], '<u2').astype(np.int32)
    r, g, b = c & 31, c >> 5 & 31, c >> 10 & 31
    return np.stack([r << 3 | r >> 2, g << 3 | g >> 2, b << 3 | b >> 2], 1).astype(np.uint8)
BG, OBJ = palette(G['bg_pal']), palette(G['obj_pal'])

# ---------- Webfoot's packing ----------
def unpack(src, lit_bits=1):
    out = bytearray(); p = src; buf = 0; n = 0
    def word():
        nonlocal p
        v = struct.unpack_from('<I', rom, p)[0]; p += 4; return v
    def bit():
        nonlocal buf, n
        n -= 1
        if n < 0: buf = word(); n = 31
        b = buf >> 31; buf = buf << 1 & 0xffffffff; return b
    def bits(k):
        nonlocal buf, n
        if n == 0: buf = word(); n = 32
        f = min(k, n); v = buf >> (32 - f) if f else 0
        buf = buf << f & 0xffffffff; n -= f; k -= f
        if k == 0: return v
        buf = word(); n = 32 - k
        v = (v << k) + (buf >> (32 - k)); buf = buf << k & 0xffffffff
        return v
    def gamma():
        v = 1
        while True:
            v = v * 2 + bit()
            if not bit(): return v
    def copy(dist, k):
        for _ in range(k): out.append(out[-dist])
    obits, last, lit_base = 8, 1, 0
    while True:
        if bit():
            out.append((bits(lit_bits) + lit_base) & 0xff); continue
        if bit():
            k = gamma()
            if k == 2: copy(last, gamma()); continue
            last = bits(obits) + ((k - 3) << obits)
            k = gamma()
            if last >= 0x10000: k += 3
            elif last >= 0x37ff: k += 2
            elif last >= 0x27f: k += 1
            elif last <= 0x7f: k += 4
            copy(last, k); continue
        if bit():
            v = bits(4) - 1
            if v == 0: out.append(0)
            elif v > 0: out.append(out[-v])
            elif bit():
                while True:
                    for _ in range(256): out.append(bits(8))
                    if not bit(): break
            else:
                lit_bits = 7 + bit(); lit_base = bits(8) if lit_bits == 7 else 0
            continue
        v = bits(7)
        if v: last = v; copy(last, bits(2) + 2); continue
        v = bits(2)
        if v == 0: return bytes(out)
        obits = bits(v + 3)
_blobs = {}
def blob(a):
    o = a & 0x1ffffff
    if o not in _blobs:
        kind, size = struct.unpack_from('<II', rom, o)
        _blobs[o] = rom[o + 8:o + 8 + size] if kind == 0 else unpack(o + 8, kind)
    return _blobs[o]
def rgba(idx, pal):
    a = np.zeros(idx.shape + (4,), np.uint8); a[..., :3] = pal[idx]; a[..., 3] = np.where(idx != 0, 255, 0)
    return Image.fromarray(a, 'RGBA')

# ---------- Maps ----------
def find_maps():
    out = []
    for o in range(0, len(rom) - 0x50, 4):
        if all(isptr(R(o + 0x14 + 4 * k)) and R(R(o + 0x14 + 4 * k)) == G['layer_fn'] for k in range(4)): out.append(o + 0x08000000)
    return out
def map_tiles(m):
    raw = blob(R(m + 0x48)); lst = list(struct.unpack('<%dH' % (len(raw) // 2), raw))
    for i in range(1, len(lst)): lst[i] = (lst[i] + lst[i - 1] + 1) & 0xffff
    T = np.zeros((1024, 8, 8), np.uint8); banks = R(m + 0x4c)
    for k, v in enumerate(lst[:1024]):
        T[k] = np.frombuffer(blob(R(banks + 4 * (v >> 8))), np.uint8)[(v & 255) * 64:(v & 255) * 64 + 64].reshape(8, 8)
    for i in range(R(m + 0xc)):
        A = R(R(m + 0x10) + 4 * i); ntile, first = rom[(A & 0x1ffffff) + 1], H(A + 2)
        d = unpack((R(A + 4) & 0x1ffffff) + 4, 0)
        for j in range(min(ntile, len(d) // 64)): T[first + j] = np.frombuffer(d[j * 64:j * 64 + 64], np.uint8).reshape(8, 8)
    return T
def map_layer(m, k, T):
    L = R(m + 0x14 + 4 * k); cols, rows = rom[(L & 0x1ffffff) + 0x14], rom[(L & 0x1ffffff) + 0x15]
    a = np.zeros((rows * 256, cols * 256), np.uint8)
    for cy in range(rows):
        for cx in range(cols):
            p = R(L + 0x18 + 4 * (cy * cols + cx))
            if not p: continue
            e = np.frombuffer(blob(p), '<u2')
            for i in range(1024):
                v = int(e[i]); t = T[v & 0x3ff]
                if v & 0x400: t = t[:, ::-1]
                if v & 0x800: t = t[::-1]
                y, x = cy * 256 + (i // 32) * 8, cx * 256 + (i % 32) * 8; a[y:y + 8, x:x + 8] = t
    return a
def build_map(m):
    T = map_tiles(m)
    # Everything in the map's own coordinates: its rectangle is the camera's range plus a screen, and each
    # background's screens start where its +c and +10 say (in 1/1024ths of a pixel) before the map's corner.
    w, h = H(m + 8) + 239, H(m + 10) + 159
    layers = []
    for k in range(4):
        L = R(m + 0x14 + 4 * k); ox, oy = R(L + 0xc) >> 10, R(L + 0x10) >> 10
        a = map_layer(m, k, T)[oy:oy + h, ox:ox + w]
        layers.append(np.pad(a, ((0, h - a.shape[0]), (0, w - a.shape[1]))))
    prio = [rom[(m & 0x1ffffff) + 4 + k] & 3 for k in range(4)]
    bldcnt, bldalpha = H(m), H(m + 2); eva, evb = min(bldalpha & 31, 16), min(bldalpha >> 8 & 31, 16)
    blending = bldcnt >> 6 & 3 == 1
    lit = [k for k in range(4) if blending and bldcnt >> k & 1]             # see-through light and shade
    # Over people: the backgrounds in front of the sprites' priority (2), unless they're see-through.
    top = [k for k in range(4) if prio[k] < 2 and k not in lit]
    ground = [k for k in range(4) if k not in top]
    def compose(which):
        order = sorted(which, key=lambda k: (prio[k], k))
        first = np.full((h, w), 4, np.int8); second = np.full((h, w), 4, np.int8)
        fc = np.zeros((h, w), np.uint8); sc = np.zeros((h, w), np.uint8)
        for k in reversed(order):
            o = layers[k] != 0
            second = np.where(o, first, second); sc = np.where(o, fc, sc)
            first = np.where(o, k, first); fc = np.where(o, layers[k], fc)
        rgb = BG[fc].astype(np.float32)
        if blending:
            t1 = np.isin(first, [k for k in range(4) if bldcnt >> k & 1])
            t2 = np.isin(second, [k for k in range(4) if bldcnt >> (8 + k) & 1] + ([4] if bldcnt & 0x2000 else []))
            b = t1 & t2; rgb[b] = np.minimum(255, (rgb[b] * eva + BG[sc][b].astype(np.float32) * evb) / 16)
        return rgb.astype(np.uint8), first != 4
    g, gmask = compose(ground)
    tmask = np.zeros((h, w), bool)
    if top:
        t, tmask = compose(top)
    gi = Image.fromarray(g, 'RGB')
    ti = None
    if top and tmask.any():
        a = np.zeros((h, w, 4), np.uint8); a[..., :3] = t; a[..., 3] = tmask * 255
        ti = Image.fromarray(a, 'RGBA')
    # Where people can walk: a bitmap of 8x8-pixel cells, 256 to a row, in the map's own coordinates (header +34).
    walk = None
    if R(m + 0x34):
        bits = np.unpackbits(np.frombuffer(blob(R(m + 0x34)), np.uint8), bitorder='little').reshape(256, 256)
        walk = Image.fromarray((bits[:-(-h // 8), :-(-w // 8)] * 255).astype(np.uint8), 'L')
    return gi, ti, walk

def map_names(maps):
    # Each area's entry (its name, a string number, at +c) points at the place in its level that points at the map.
    where = {}
    for o in range(0, len(rom) - 4, 4):
        v = R(o)
        if v in maps: where[o + 0x08000000] = v
    names = {}
    for o in range(0, len(rom) - 4, 4):
        m = where.get(R(o))
        if m is not None and 0 < R(o - 0x20) < 1000: names.setdefault(m, set()).add(R(o - 0x20))
    def string(i):
        a = R(G['strings'] + 4 * i) & 0x1ffffff; out = []
        while True:
            c = struct.unpack_from('<H', rom, a)[0] if G['utf16'] else rom[a]
            if c == 0: return ''.join(out)
            out.append(chr(c)); a += 2 if G['utf16'] else 1
    return {m: [string(i) for i in sorted(ids)] for m, ids in names.items()}

# ---------- People ----------
def tiles_image(data, w, h):
    tw = w // 8; idx = np.zeros((h, w), np.uint8); d = np.frombuffer(data, np.uint8)
    for t in range(min(len(d) // 64, tw * (h // 8))):
        idx[(t // tw) * 8:(t // tw) * 8 + 8, (t % tw) * 8:(t % tw) * 8 + 8] = d[t * 64:t * 64 + 64].reshape(8, 8)
    return idx
def part(p):
    o = p & 0x1ffffff
    x, y = struct.unpack_from('<bb', rom, o); w, h, flags = rom[o + 2], rom[o + 3], rom[o + 7]
    idx = tiles_image(blob(R(p + 8)), w, h)
    if flags & 0x10: idx = idx[:, ::-1]; x = -x - w
    if flags & 0x20: idx = idx[::-1]; y = -y - h
    return idx, x, y
def is_part(p):
    o = p & 0x1ffffff
    v = R(p + 8)
    return isptr(v) and R(p + 4) & 0x2000 and rom[o + 2] in (8, 16, 32, 64) and rom[o + 3] in (8, 16, 32, 64) and R(v) in (0, 1, 2)
def lg2_person(d):
    # Its animations: the run of pointers to frames after its header; each animation runs on until the next.
    anims, last = [], 0
    for k in range(0, 0x400, 4):
        v = R(d + k)
        if isptr(v) and is_part(v): anims.append(v); last = k
        elif anims and k - last >= 8: break
    starts = set(anims); rows = []
    for a in anims:
        f, o = [], a
        while is_part(o) and (o == a or o not in starts) and len(f) < 32: f.append([o]); o += 12
        rows.append(f)
    return rows
def bf_frame_ok(f):
    n = R(f)
    return 1 <= n <= 12 and all(is_part(f + 8 + 12 * k) for k in range(n))
def bf_person(d):
    rows = []
    for k in range(0, 0x100, 4):
        v = R(d + k)
        if not isptr(v): continue
        n = R(v)
        if not 1 <= n <= 40: continue
        ps = [R(v + 4 + 4 * i) for i in range(n * 4)]
        if all(isptr(p) and bf_frame_ok(p) for p in ps):
            for dr in range(4): rows.append([[ps[f * 4 + dr] + 8 + 12 * j for j in range(R(ps[f * 4 + dr]))] for f in range(n)])
    return rows
def person_sheet(rows):
    # Every frame in a cell of one size, its anchor (where the game puts the person's position) at the same place.
    drawn = [[[part(p) for p in parts] for parts in frames] for frames in rows]
    ps = [q for frames in drawn for parts in frames for q in parts]
    left = max([-x for _, x, _ in ps] + [8]); right = max([x + im.shape[1] for im, x, _ in ps] + [8])
    up = max([-y for _, _, y in ps] + [8]); down = max([y + im.shape[0] for im, _, y in ps] + [0])
    half = -(-max(left, right) // 8) * 8; up = -(-up // 8) * 8; down = -(-down // 8) * 8
    cw, ch = 2 * half, up + down
    cols = max([len(r) for r in rows] + [1])
    idx = np.zeros((len(rows) * ch, cols * cw), np.uint8)
    for r, frames in enumerate(drawn):
        for c, parts in enumerate(frames):
            for im, x, y in parts:
                X, Y = c * cw + half + x, r * ch + up + y
                sub = idx[Y:Y + im.shape[0], X:X + im.shape[1]]
                sub[...] = np.where(im != 0, im, sub)
    return rgba(idx, OBJ), dict(cell=[cw, ch], anchor=[half, up], frames=[len(r) for r in rows])

# ---------- Build ----------
def save(im, *path):
    os.makedirs(os.path.dirname(os.path.join(OUT, *path)), exist_ok=True); im.save(os.path.join(OUT, *path), optimize=True)
pre = G['prefix']
if ONLY in (None, 'maps'):
    maps = find_maps(); names = map_names(set(maps))
    index_path = os.path.join(OUT, 'maps', 'index.json')
    index = json.load(open(index_path)) if os.path.exists(index_path) else {}
    index = {k: v for k, v in index.items() if not k.startswith(pre + '_')}
    for i, m in enumerate(maps):
        g, t, walk = build_map(m)
        if g is None: continue
        name = '%s_%03d' % (pre, i)
        save(g, 'maps', name + '.png')
        if t is not None: save(t, 'maps', name + '-top.png')
        if walk is not None: save(walk, 'maps', name + '-walk.png')
        index[name] = dict(name=(names.get(m) or [''])[0], size=[g.width, g.height], start=[H(m + 0x30), H(m + 0x32)])
        if len(names.get(m, [])) > 1: index[name]['also'] = names[m][1:]
    json.dump(dict(sorted(index.items())), open(index_path, 'w'), indent=0, separators=(',', ':'))
    print(len(maps), 'maps', sum(1 for m in maps if names.get(m)), 'named')
if ONLY in (None, 'people'):
    o = G['people']; defs = []
    while isptr(R(o)): defs.append(R(o)); o += 4
    index_path = os.path.join(OUT, 'people', 'index.json')
    index = json.load(open(index_path)) if os.path.exists(index_path) else {}
    index = {k: v for k, v in index.items() if not k.startswith(pre + '_')}
    for i, d in enumerate(defs):
        rows = lg2_person(d) if pre == 'LG2' else bf_person(d)
        if not rows: continue
        im, info = person_sheet(rows)
        save(im, 'people', '%s_%03d.png' % (pre, i)); index['%s_%03d' % (pre, i)] = info
    json.dump(dict(sorted(index.items())), open(index_path, 'w'), separators=(',', ':'))
    print(sum(k.startswith(pre + '_') for k in index), 'people')
if ONLY in (None, 'portraits'):
    for i in range(G['n_portraits']):
        idx = np.frombuffer(blob(R(G['portraits'] + 4 * i)), np.uint8).reshape(64, 64)
        # (The first few are the status screen's, drawn with its palette.)
        n, menu = G.get('menu_portraits', (0, 0))
        save(Image.fromarray((palette(menu) if i < n else OBJ)[idx], 'RGB'), 'portraits', '%s_%03d.png' % (pre, i))
    print(G['n_portraits'], 'portraits')
