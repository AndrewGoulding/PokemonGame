# The Dragon Ball realm's battle sprites, from Dragonball Z: Supersonic Warriors (GBA, Banpresto/Arc System Works,
# 2004; the USA cartridge, game code AZJE). Only its fighters' pictures. None of its game.
#
#   python3 tools/build-dbz-ssw.py <path to the .gba>
#
# How the ROM keeps them (nothing's packed):
#   0x608000  "AGBD", then 48 pointers to the fighters (the same one more than once: its slots); 26 different ones,
#             19 fighters and 7 smaller ones
#   a fighter: its animations (offsets), its palettes (16 colours each; we take the first), its 4bpp tiles, and the
#             table of pointers to its frames
#   0x6cc88   for each of those 48 slots, its actions: 63 pointers, each to 32 u16s, the animation it plays at each of
#             32 angles (0x8000: mirrored). The actions are the same for every fighter (labelled below, from playing
#             the game and watching which action each button sets, at fighter +8c, and the rest by their pictures)
#   an animation (at the animations table + its offset): 8 bytes, then 4-byte steps (0, duration, frame) until one
#             that isn't 0
#   a frame (24 bytes): x, y, two u16s, 8 bytes, then pointers to its tile list and its parts
#     the tile list (u16s, to 0xfffe) is what the game copies to VRAM: a tile number; 0x8000 | n then the first of a
#     run of n; 0xc000 | n blank tiles; 0xffff one blank tile
#     the parts (10 bytes each, to 0xffff): OAM shape << 14, y (low byte) and flags, OAM size << 14, x, the first tile
#     in that VRAM copy
#
# Writes:
#   assets/dragonball/fighters/SSW_<nn>.png     every frame of each fighter, 16 to a row, in the ROM's order
#   assets/dragonball/fighters/index.json       each sheet's cell size, the anchor in each cell (the fighter's
#                                               position), how many frames it has, and its animations: each one's
#                                               action, what that is, which of the action's angles it is, and its
#                                               frames (frame number on the sheet, duration in 60ths of a second)
import json, os, struct, sys
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets/dragonball/fighters')
rom = open(sys.argv[1], 'rb').read()
if rom[0xac:0xb0] != b'AZJE': sys.exit('Not Dragonball Z: Supersonic Warriors (USA): its game code is ' + repr(rom[0xac:0xb0]))
def R(a): return struct.unpack_from('<I', rom, a & 0x1ffffff)[0]
def isptr(v): return 0x08000000 <= v < 0x08000000 + len(rom)
SIZES = {(0, 0): (8, 8), (0, 1): (16, 16), (0, 2): (32, 32), (0, 3): (64, 64), (1, 0): (16, 8), (1, 1): (32, 8),
         (1, 2): (32, 16), (1, 3): (64, 32), (2, 0): (8, 16), (2, 1): (8, 32), (2, 2): (16, 32), (2, 3): (32, 64)}
def palette(o):
    c = np.frombuffer(rom[o:o + 32], '<u2').astype(np.int32); r, g, b = c & 31, c >> 5 & 31, c >> 10 & 31
    return np.stack([r << 3 | r >> 2, g << 3 | g >> 2, b << 3 | b >> 2], 1).astype(np.uint8)
def tile_list(lst, base):
    out = []; o = lst & 0x1ffffff
    while True:
        v = struct.unpack_from('<H', rom, o)[0]
        if v == 0xfffe: return out
        if v == 0xffff: out.append(None)
        elif v & 0xc000 == 0xc000: out += [None] * (v & 0x3fff)
        elif v & 0xc000 == 0x8000:
            o += 2; first = struct.unpack_from('<H', rom, o)[0]
            out += [base + (first + k) * 32 for k in range(v & 0x3fff)]
        else: out.append(base + (v & 0x3fff) * 32)
        o += 2
def tile(a):
    if a is None: return np.zeros((8, 8), np.uint8)
    d = np.frombuffer(rom[a & 0x1ffffff:(a & 0x1ffffff) + 32], np.uint8)
    t = np.zeros(64, np.uint8); t[0::2] = d & 15; t[1::2] = d >> 4
    return t.reshape(8, 8)
def frame(rec, base):
    tiles = tile_list(R(rec + 16), base); parts = []; o = R(rec + 20) & 0x1ffffff
    while struct.unpack_from('<H', rom, o)[0] != 0xffff:
        a, b, c, x, t = struct.unpack_from('<HHHhH', rom, o); o += 10
        w, h = SIZES[(a >> 14, c >> 14)]; y = (b & 0xff) - 256 * (b & 0x80 != 0)
        img = np.zeros((h, w), np.uint8); tw = w // 8
        for k in range(tw * (h // 8)):
            img[(k // tw) * 8:(k // tw) * 8 + 8, (k % tw) * 8:(k % tw) * 8 + 8] = tile(tiles[t + k] if t + k < len(tiles) else None)
        parts.append((img, x, y))
    return parts
ACTIONS = ['hover (by angle)', 'rise', 'hover', 'turn', 'turn back', 'stand', 'move', 'fly fast', 'fly fast',
           'guard', 'aura dash', 'aura dash', 'aura dash', 'climb', 'lift off', 'dash: start', 'dash', 'brace',
           'hit: reel', 'hurt', 'hurt (by ki)', 'knocked flying', 'stance', 'pose', 'vanish', 'recover',
           'ki blast 1', 'ki blast 2', 'ki blast 3', 'ki blast 4', 'ki blast 1: after', 'ki blast 2: after',
           'ki blast 3: after', 'ki blast 4: after', 'rush', 'rush: finish', 'combo hit', 'combo hit 2',
           'lunge', 'special', 'dash ki attack', 'dash ki attack 2', 'dash ki attack: finish', 'dash attack',
           'dash attack: finish', 'aimed attack', 'aimed attack 2', 'charge', 'throw', 'clash: ready', 'clash',
           'clash: push', 'knocked down', 'block', 'thrown', 'fall', 'lying down', 'spun', 'bounce', 'tumble',
           'tumble 2', 'get up', 'taunt']
def animations(table, slot):
    A = table; n = 0
    while R(A + 4 * n) < 0x10000 and (n == 0 or R(A + 4 * n) >= R(A + 4 * n - 4)): n += 1
    acts = R(0x6cc88 + 4 * slot); which = {}
    for a in range(63):
        p = R(acts + 4 * a)
        if not isptr(p): break
        seen = []
        for v in struct.unpack_from('<32H', rom, p & 0x1ffffff):
            if (v & 0x7fff) not in seen: seen.append(v & 0x7fff)
        for k, v in enumerate(seen): which.setdefault(v, (a, k))
    out = []
    for i in range(n):
        o = (A + R(A + 4 * i)) & 0x1ffffff; steps = []
        o += 8
        while rom[o] == 0 and len(steps) < 64: steps.append([struct.unpack_from('<H', rom, o + 2)[0], rom[o + 1]]); o += 4
        a, k = which.get(i, (None, None))
        out.append(dict(action=a, label=ACTIONS[a] if a is not None else '', angle=k, frames=steps))
    return out
def valid(rec): return isptr(rec) and isptr(R(rec + 16)) and isptr(R(rec + 20))

fighters, slots = [], []
for i in range(48):
    h = R(0x608004 + 4 * i)
    if h not in fighters: fighters.append(h); slots.append(i)
os.makedirs(OUT, exist_ok=True)
index = {}
for n, h in enumerate(fighters):
    anims, pal, base, table = [R(h + 4 * i) for i in range(4)]
    P = palette(pal & 0x1ffffff)
    count = 0
    while valid(R(table + 4 * count)): count += 1
    frames = [frame(R(table + 4 * i), base) for i in range(count)]
    ps = [p for f in frames for p in f]
    left = max([-x for _, x, _ in ps] + [8]); right = max([x + im.shape[1] for im, x, _ in ps] + [8])
    up = max([-y for _, _, y in ps] + [8]); down = max([y + im.shape[0] for im, _, y in ps] + [0])
    half = -(-max(left, right) // 8) * 8; up = -(-up // 8) * 8; down = -(-down // 8) * 8
    cw, ch, cols = 2 * half, up + down, 16
    idx = np.zeros((-(-count // cols) * ch, cols * cw), np.uint8)
    for i, parts in enumerate(frames):
        for im, x, y in parts:
            X, Y = (i % cols) * cw + half + x, (i // cols) * ch + up + y
            sub = idx[Y:Y + im.shape[0], X:X + im.shape[1]]; sub[...] = np.where(im != 0, im, sub)
    rgba = np.zeros(idx.shape + (4,), np.uint8); rgba[..., :3] = P[idx]; rgba[..., 3] = np.where(idx != 0, 255, 0)
    name = 'SSW_%02d' % n
    Image.fromarray(rgba, 'RGBA').save(os.path.join(OUT, name + '.png'), optimize=True)
    index[name] = dict(cell=[cw, ch], anchor=[half, up], frames=count, animations=animations(anims, slots[n]))
json.dump(index, open(os.path.join(OUT, 'index.json'), 'w'), separators=(',', ':'))
print(len(fighters), 'fighters')
