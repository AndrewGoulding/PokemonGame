# The Dragon Ball realm's Saiyan and Namek places and people, from Dragon Ball Z: The Legacy of Goku (GBA, Webfoot,
# 2002; the USA cartridge, game code ALGE). Only its pictures: the maps and everyone's sprites. None of its game.
#
#   python3 tools/build-dbz-legacy-of-goku.py <path to the .gba>
#
# How the ROM keeps them:
#   Packed pictures go through one routine (0x8009524) with a byte of flags, each a BIOS step in turn: 0x10 Huffman,
#   0x08 LZ77, 0x04 run-length, 0x02 16-bit difference, 0x01 8-bit difference. They're named by {pointer, flags}.
#   0x1c7c48  the maps, 0x34 bytes each (40):
#     +0  width, height in screens (240x160);  +4  width, height in tiles
#     +8, +c, +10  bitmaps, a bit for each 8x8 tile, rows of the whole map, least significant bit first: +8 is where
#                  people can walk (the other two are the air and the ground under things)
#     +1c  a list of pointers to {pointer, flags}: the map's 8bpp tiles, loaded to end at VRAM tile 896
#     +20, +24, +28  the three backgrounds, front to back: a pointer for each screen, to 30x20 u16 entries (0: empty)
#     +2c  the palette (256 colours);  +30  {pointer, flags} of more tiles, loaded just before the map's own
#   People: 0x5c1328 on, 0x2c bytes each: a palette (16 colours), then the animations: 19 actions, a pointer for each
#   of 4 directions (0: none) to a part (16 bytes: x, y, width, height, tiles a frame, flags (8: mirrored), OAM shape,
#   size, and the frames' 4bpp tiles, one after another).
#
# Writes:
#   assets/dragonball/maps/LG1_<nn>.png, -top.png, -walk.png   each map, what's over people, where people can walk
#   assets/dragonball/maps/index.json                          (adds each map's size)
#   assets/dragonball/people/LG1_<nn>.png                      each person: a row per action and direction, its frames
#   assets/dragonball/people/index.json                        (adds each sheet's cell size, anchor and frames a row)
import json, os, struct, sys
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets/dragonball')
rom = open(sys.argv[1], 'rb').read()
if rom[0xac:0xb0] != b'ALGE': sys.exit('Not Dragon Ball Z: The Legacy of Goku (USA): its game code is ' + repr(rom[0xac:0xb0]))
def R(a): return struct.unpack_from('<I', rom, a & 0x1ffffff)[0]
def isptr(v): return 0x08000000 <= v < 0x08000000 + len(rom)
def palette(o, n=256):
    c = np.frombuffer(rom[o & 0x1ffffff:(o & 0x1ffffff) + 2 * n], '<u2').astype(np.int32)
    r, g, b = c & 31, c >> 5 & 31, c >> 10 & 31
    return np.stack([r << 3 | r >> 2, g << 3 | g >> 2, b << 3 | b >> 2], 1).astype(np.uint8)

# ---------- The BIOS's unpacking ----------
def huffman(d, o):
    bits, size = d[o] & 15, d[o + 1] | d[o + 2] << 8 | d[o + 3] << 16
    tree = o + 4; pos = tree + (d[tree] + 1) * 2
    out = bytearray(); node = tree + 1; acc = nacc = 0
    while len(out) < size:
        word = struct.unpack_from('<I', d, pos)[0]; pos += 4
        for b in range(31, -1, -1):
            bit = word >> b & 1; v = d[node]
            nxt = (node & ~1) + (v & 0x3f) * 2 + 2 + bit
            if v & (0x80 >> bit):
                acc |= d[nxt] << nacc; nacc += bits; node = tree + 1
                if nacc == 8: out.append(acc); acc = nacc = 0
                if len(out) >= size: break
            else: node = nxt
    return bytes(out[:size])
def lz77(d, o):
    size = d[o + 1] | d[o + 2] << 8 | d[o + 3] << 16; out = bytearray(); i = o + 4
    while len(out) < size:
        f = d[i]; i += 1
        for b in range(8):
            if len(out) >= size: break
            if f & (0x80 >> b):
                x = d[i] << 8 | d[i + 1]; i += 2
                for _ in range((x >> 12) + 3): out.append(out[-((x & 0xfff) + 1)])
            else: out.append(d[i]); i += 1
    return bytes(out[:size])
def runlength(d, o):
    size = d[o + 1] | d[o + 2] << 8 | d[o + 3] << 16; out = bytearray(); i = o + 4
    while len(out) < size:
        f = d[i]; i += 1
        if f & 0x80: out += bytes([d[i]]) * ((f & 0x7f) + 3); i += 1
        else: out += d[i:i + (f & 0x7f) + 1]; i += (f & 0x7f) + 1
    return bytes(out[:size])
def unfilter(d, o, width):
    size = d[o + 1] | d[o + 2] << 8 | d[o + 3] << 16
    a = np.frombuffer(d[o + 4:o + 4 + size], '<u2' if width == 2 else np.uint8)
    return np.cumsum(a, dtype=np.uint32).astype(a.dtype).tobytes()
def unpack(ptr, flags):
    d, o = rom, ptr & 0x1ffffff
    for flag, step in ((0x10, huffman), (0x08, lz77), (0x04, runlength)):
        if flags & flag: d, o = step(d, o), 0
    if flags & 0x02: d, o = unfilter(d, o, 2), 0
    if flags & 0x01: d, o = unfilter(d, o, 1), 0
    return d[o:] if o else d

def save(im, *path):
    os.makedirs(os.path.dirname(os.path.join(OUT, *path)), exist_ok=True); im.save(os.path.join(OUT, *path), optimize=True)
def merge_index(folder, entries):
    path = os.path.join(OUT, folder, 'index.json')
    index = json.load(open(path)) if os.path.exists(path) else {}
    index = {k: v for k, v in index.items() if not k.startswith('LG1_')}
    index.update(entries)
    json.dump(dict(sorted(index.items())), open(path, 'w'), indent=0 if folder == 'maps' else None, separators=(',', ':'))

# ---------- Maps ----------
maps = []
for o in range(0, len(rom) - 0x34, 4):
    ws, hs, wt, ht = struct.unpack_from('<HHHH', rom, o)
    if 1 <= ws <= 20 and 1 <= hs <= 20 and wt == ws * 30 and ht == hs * 20 and all(isptr(R(o + 0x1c + 4 * k)) for k in range(6)):
        maps.append(o)
entries = {}
for n, e in enumerate(maps):
    ws, hs, wt, ht = struct.unpack_from('<HHHH', rom, e)
    T = np.zeros((1024, 8, 8), np.uint8)
    own = b''.join(unpack(R(p), R(p + 4)) for p in [R(R(e + 0x1c))])
    more = unpack(R(R(e + 0x30)), R(R(e + 0x30) + 4))
    first = 896 - len(own) // 64
    for base, data in ((first, own), (first - len(more) // 64, more)):
        for i in range(len(data) // 64):
            if 0 <= base + i < 1024: T[base + i] = np.frombuffer(data[i * 64:i * 64 + 64], np.uint8).reshape(8, 8)
    P = palette(R(e + 0x2c))
    layers = []
    for k in range(3):
        a = np.zeros((ht * 8, wt * 8), np.uint8); screens = R(e + 0x20 + 4 * k)
        for sy in range(hs):
            for sx in range(ws):
                p = R(screens + 4 * (sy * ws + sx))
                if not p: continue
                for i, v in enumerate(struct.unpack_from('<600H', rom, p & 0x1ffffff)):
                    t = T[v & 0x3ff]
                    if v & 0x400: t = t[:, ::-1]
                    if v & 0x800: t = t[::-1]
                    y, x = sy * 160 + (i // 30) * 8, sx * 240 + (i % 30) * 8; a[y:y + 8, x:x + 8] = t
        layers.append(a)
    ground = np.where(layers[1] != 0, layers[1], layers[2])
    save(Image.fromarray(P[ground], 'RGB'), 'maps', 'LG1_%02d.png' % n)
    if layers[0].any():
        top = np.zeros(layers[0].shape + (4,), np.uint8); top[..., :3] = P[layers[0]]; top[..., 3] = (layers[0] != 0) * 255
        save(Image.fromarray(top, 'RGBA'), 'maps', 'LG1_%02d-top.png' % n)
    bits = np.unpackbits(np.frombuffer(rom[R(e + 8) & 0x1ffffff:][:-(-wt * ht // 8)], np.uint8), bitorder='little')
    save(Image.fromarray((bits[:wt * ht].reshape(ht, wt) * 255).astype(np.uint8), 'L'), 'maps', 'LG1_%02d-walk.png' % n)
    entries['LG1_%02d' % n] = dict(name='', size=[wt * 8, ht * 8])
merge_index('maps', entries)
print(len(maps), 'maps')

# ---------- People ----------
SIZES = {(0, 0): (8, 8), (0, 1): (16, 16), (0, 2): (32, 32), (0, 3): (64, 64), (1, 0): (16, 8), (1, 1): (32, 8),
         (1, 2): (32, 16), (1, 3): (64, 32), (2, 0): (8, 16), (2, 1): (8, 32), (2, 2): (16, 32), (2, 3): (32, 64)}
def is_part(p):
    if not isptr(p): return False
    x, y, w, h, count, flags, shape, size = struct.unpack_from('<hhHHBBBB', rom, p & 0x1ffffff)
    return SIZES.get((shape, size)) == (w, h) and count == w * h // 64 and isptr(R(p + 12))
parts = set()
for o in range(0, len(rom) - 16, 4):
    if is_part(o + 0x08000000): parts.add(R(o + 12))
starts = sorted(parts)
def frames_of(p):
    x, y, w, h, count, flags = struct.unpack_from('<hhHHBB', rom, p & 0x1ffffff); data = R(p + 12)
    nxt = next((s for s in starts if s > data), data + count * 32)
    n = max(1, min(16, (nxt - data) // (count * 32)))
    out = []
    for f in range(n):
        d = np.frombuffer(rom[(data & 0x1ffffff) + f * count * 32:][:count * 32], np.uint8)
        px = np.zeros(count * 64, np.uint8); px[0::2] = d & 15; px[1::2] = d >> 4
        img = np.zeros((h, w), np.uint8); tw = w // 8
        for t in range(count): img[(t // tw) * 8:(t // tw) * 8 + 8, (t % tw) * 8:(t % tw) * 8 + 8] = px[t * 64:t * 64 + 64].reshape(8, 8)
        if flags & 8: img = img[:, ::-1]
        out.append((img, x, y))
    return out
people = {}
o = 0x5c1328; n = 0
while isptr(R(o)) and isptr(R(o + 4)):
    pal, table = R(o), R(o + 4)
    rows = []
    for k in range(76):
        p = R(table + 4 * k)
        if p == 0: continue
        if not is_part(p): break
        rows.append(frames_of(p))
    if rows:
        ps = [q for r in rows for q in r]
        left = max([-x for _, x, _ in ps] + [8]); right = max([x + im.shape[1] for im, x, _ in ps] + [8])
        up = max([-y for _, _, y in ps] + [8]); down = max([y + im.shape[0] for im, _, y in ps] + [0])
        half = -(-max(left, right) // 8) * 8; up = -(-up // 8) * 8; down = -(-down // 8) * 8
        cw, ch, cols = 2 * half, up + down, max(len(r) for r in rows)
        idx = np.zeros((len(rows) * ch, cols * cw), np.uint8)
        for r, fs in enumerate(rows):
            for c, (im, x, y) in enumerate(fs):
                X, Y = c * cw + half + x, r * ch + up + y
                sub = idx[Y:Y + im.shape[0], X:X + im.shape[1]]; im = im[:sub.shape[0], :sub.shape[1]]
                sub[...] = np.where(im != 0, im, sub)
        P = palette(pal, 16)
        rgba = np.zeros(idx.shape + (4,), np.uint8); rgba[..., :3] = P[idx]; rgba[..., 3] = (idx != 0) * 255
        save(Image.fromarray(rgba, 'RGBA'), 'people', 'LG1_%02d.png' % n)
        people['LG1_%02d' % n] = dict(cell=[cw, ch], anchor=[half, up], frames=[len(r) for r in rows])
    o += 0x2c; n += 1
merge_index('people', people)
print(len(people), 'people')
