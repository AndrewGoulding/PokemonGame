#!/usr/bin/env python3
# The character creator's looks: the parts you're put together from (a head and a body, or a whole character), each
# with its hair, clothes, trim and skin apart so they can be coloured as you choose.
#
#   python3 tools/build-player-looks.py
#
# (No cartridge or disc: it builds from what's committed. See DATA, SS_DATA, TTYD_DATA and PIT_DATA below for taking them again.)
# Hyrule's people are The Minish Cap's (only their sprites): its townsfolk and children are drawn as a head on a body,
# so any head goes on any body; and Link, whole. The Dragon World's are the Dragon Ball realm's people sheets already
# in the repo (assets/dragonball/people/, from Legacy of Goku II and Buu's Fury), whole characters. Kanto's are
# FireRed's own Red, Leaf and Gary (their overworld sheets in the repo).
#
# Writes:
#   assets/world/sprites/looks/<part>.png   each part: FireRed's nine frames (standing down, up, left; two steps
#                                            down, up, left), 32x32 each, in 17 rows: the part's own colours where
#                                            nothing's to be recoloured, then for its hair, clothes, trim and skin in
#                                            turn, four masks, its darkest shade to its lightest (white where it is):
#                                            a colour you choose is four shades, one for each
#   data/type-chart.js (between its markers) window.PLAYER_LOOK_PARTS, each part's name and which of the four it has
#
# How The Minish Cap keeps its sprites (from the zeldaret/tmc decompilation's notes; the USA cartridge, BZME):
#   0x0029B4  the sprite table: 16 bytes a sprite (its animations, its frames, its tiles)
#   a frame:  numTiles (u8), unk (u8), firstTile (u16): the frame's 4bpp tiles start at tiles + firstTile * 32
#   0x2F3D74  gFrameObjLists: a u32 offset for each sprite, to a u32 offset for each frame, to its pieces: a count,
#             then 5 bytes a piece: x, y (s8, from the sprite's origin), flags (shape << 6 | size << 4 | vflip << 3 |
#             hflip << 2), first tile (u8), palette << 4 (u8)
#   0x9FB770  gExtraFrameOffsets: where a body's frame puts the head on it (s8 x, y)
#   0x133368  the object palettes (from palette 0x16): u32 count << 24 | offset into 0x5A2E80
import json, os, struct, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets/world/sprites/looks')
DB = os.path.join(ROOT, 'assets/dragonball/people')
ROLES = ['hair', 'outfit', 'trim', 'skin']

# The Minish Cap's frames this takes, as the cartridge has them (committed, so no cartridge is needed to build):
#   tools/data/minish-cap-people.png    each frame a 64x64 cell of colour indices (0 is clear), its origin at (32, 48)
#   tools/data/minish-cap-people.json   which cell each sprite's frame is, the palettes, and the heads' places
# `--from-rom <The Minish Cap (USA).gba>` takes them from the cartridge again (and builds as well).
DATA = os.path.join(ROOT, 'tools/data/minish-cap-people')
SHAPES = {(0, 0): (8, 8), (0, 1): (16, 16), (0, 2): (32, 32), (0, 3): (64, 64), (1, 0): (16, 8), (1, 1): (32, 8), (1, 2): (32, 16),
          (1, 3): (64, 32), (2, 0): (8, 16), (2, 1): (8, 32), (2, 2): (16, 32), (2, 3): (32, 64)}

class Cartridge:
    SPRITES, OBJ, EFO, PALS, GFX = 0x29B4, 0x2F3D74, 0x9FB770, 0x133368, 0x5A2E80
    def __init__(self, path):
        self.rom = open(path, 'rb').read()
        if self.rom[0xAC:0xB0] != b'BZME': sys.exit('That isn\'t The Minish Cap (USA).')
        self.frames, self.attaches, self.palettes = {}, {}, {}
    def u8(self, a): return self.rom[a]
    def s8(self, a): return struct.unpack_from('b', self.rom, a)[0]
    def u16(self, a): return struct.unpack_from('<H', self.rom, a)[0]
    def u32(self, a): return struct.unpack_from('<I', self.rom, a)[0]
    def palette(self, pid):
        w = self.u32(self.PALS + (pid - 0x16) * 4); off = w & 0xffffff
        out = [((v & 31) * 255 // 31, ((v >> 5) & 31) * 255 // 31, ((v >> 10) & 31) * 255 // 31)
               for v in (self.u16(self.GFX + off + c * 2) for c in range(16))]
        self.palettes[pid] = out
        return out
    def frame(self, si, fi):
        """A sprite's frame as {(x, y): colour index}, x and y from its origin."""
        rom = self.rom
        frames, tiles = self.u32(self.SPRITES + si * 16 + 4) - 0x08000000, self.u32(self.SPRITES + si * 16 + 8) - 0x08000000
        first = self.u16(frames + fi * 4 + 2)
        p = self.OBJ + self.u32(self.OBJ + self.u32(self.OBJ + si * 4) + fi * 4)
        out, pieces = {}, []
        for k in range(self.u8(p)):
            q = p + 1 + k * 5
            pieces.append((self.s8(q), self.s8(q + 1), self.u8(q + 2), self.u8(q + 3) + ((self.u8(q + 4) & 3) << 8)))
        for x0, y0, fl, t0 in reversed(pieces):   # (the first piece is drawn on top)
            w, h = SHAPES[(fl >> 6, (fl >> 4) & 3)]
            for ty in range(h // 8):
                for tx in range(w // 8):
                    a = tiles + (first + t0 + ty * (w // 8) + tx) * 32
                    for r in range(8):
                        for c in range(8):
                            b = rom[a + r * 4 + c // 2]; v = (b >> 4) if c & 1 else (b & 15)
                            if not v: continue
                            X, Y = tx * 8 + c, ty * 8 + r
                            if fl & 4: X = w - 1 - X
                            if fl & 8: Y = h - 1 - Y
                            out[(x0 + X, y0 + Y)] = v
        self.frames[(si, fi)] = out
        return out
    def attach(self, si, fi):
        E = self.EFO
        p = E + self.u32(E) + self.u8(E + self.u16(E + 0x10 + si * 2) + fi) * 4
        self.attaches[(si, fi)] = (self.s8(p), self.s8(p + 1))
        return self.attaches[(si, fi)]
    def save(self):
        """What was taken, into tools/data."""
        keys = sorted(self.frames); cols = 16
        img = Image.new('P', (64 * cols, 64 * ((len(keys) + cols - 1) // cols)), 0)
        img.putpalette([v for i in range(256) for v in ((i * 17) % 256,) * 3])
        px = img.load()
        for n, k in enumerate(keys):
            for (x, y), v in self.frames[k].items():
                if -32 <= x < 32 and -48 <= y < 16: px[(n % cols) * 64 + x + 32, (n // cols) * 64 + y + 48] = v
        img.save(DATA + '.png', optimize=True)
        json.dump({'frames': {'%d:%d' % k: n for n, k in enumerate(keys)}, 'palettes': {str(k): ['%02x%02x%02x' % c for c in v] for k, v in self.palettes.items()},
                   'attach': {'%d:%d' % k: v for k, v in sorted(self.attaches.items())}}, open(DATA + '.json', 'w'), separators=(',', ':'))

class Committed:
    def __init__(self):
        self.j = json.load(open(DATA + '.json')); self.img = Image.open(DATA + '.png'); self.px = self.img.load()
    def palette(self, pid): return [tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) for h in self.j['palettes'][str(pid)]]
    def frame(self, si, fi):
        n = self.j['frames']['%d:%d' % (si, fi)]; X, Y = (n % 16) * 64, (n // 16) * 64
        return {(x - 32, y - 48): self.px[X + x, Y + y] for y in range(64) for x in range(64) if self.px[X + x, Y + y]}
    def attach(self, si, fi): return tuple(self.j['attach']['%d:%d' % (si, fi)])

if '--from-rom' in sys.argv:
    SRC = Cartridge(sys.argv[sys.argv.index('--from-rom') + 1])
else:
    SRC = Committed()
palette, frame, attach = SRC.palette, SRC.frame, SRC.attach

lum = lambda c: 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]

# ---------- A part: its frames of {(x, y): (role or None, colour)} into a sheet ----------
# FireRed's nine frames (standing down, up, left; two steps down, up, left), then six of this game's own: the frames
# between the steps (down, up, left: each two), so a walk of four frames goes step, between, the other step, between.
# (Where the source has walks of only two steps, they're the standing frames.)
N = 15
FRAME_DIR = [0, 1, 2, 0, 0, 1, 1, 2, 2, 0, 0, 1, 1, 2, 2]
def levels(cols):
    """A role's colours, darkest first, onto its four shades (fewer colours: the lighter shades)."""
    cols = sorted(set(cols), key=lum)
    n = len(cols)
    if n <= 4: return {c: 4 - n + i for i, c in enumerate(cols)}
    return {c: min(3, i * 4 // n) for i, c in enumerate(cols)}
def sheet(name, frames, shift):
    """frames: N dicts {(x, y): (role, (r, g, b))}; shift: where (0, 0) goes in a 32x32 cell."""
    img = Image.new('RGBA', (32 * len(frames), 32 * 17), (0, 0, 0, 0)); px = img.load()
    shade = {r: levels([c for f in frames for (rr, c) in f.values() if rr == r]) for r in ROLES}
    has = set()
    for i, f in enumerate(frames):
        for (x, y), (role, c) in f.items():
            X, Y = x + shift[0], y + shift[1]
            if not (0 <= X < 32 and 0 <= Y < 32): continue
            if role is None: px[i * 32 + X, Y] = c + (255,)
            else:
                px[i * 32 + X, (1 + ROLES.index(role) * 4 + shade[role][c]) * 32 + Y] = (255, 255, 255, 255)
                has.add(role)
    img.save(os.path.join(OUT, name + '.png'), optimize=True)
    # (And its own colours, as a colour you could choose: each shade the colour most drawn in it, a missing one
    # the nearest lighter or darker.)
    own = {}
    for r in sorted(has, key=ROLES.index):
        count = {}
        for f in frames:
            for (rr, c) in f.values():
                if rr == r: count[c] = count.get(c, 0) + 1
        by = [max([c for c in count if shade[r][c] == l] or [None], key=lambda c: count.get(c, 0)) for l in range(4)]
        for l in range(4):
            if by[l] is None: by[l] = next((by[k] for k in list(range(l, 4)) + list(range(l, -1, -1)) if by[k] is not None))
        own[r] = [hexc(c) for c in by]
    return sorted(has, key=ROLES.index), own

# ---------- Bodies, faces and hair: each character in three ----------
# A character (Goku, Mario, Link, ...) is cut into its body, its face and its hair, so you can be one character's
# face with another's hair on a third's body: the characters are the creator's presets, and you're your own.
# Where it's cut: at its neck, the narrowest row from 30% to 60% of the way down it standing facing you, and the same
# height facing every way (its feet are on the same row). Its head (above the neck) is its hair (the pixels that are
# its hair's colours, and the outline round them) and its face (the rest).
# The face and hair are its head standing, each way it faces: on a walk they don't change, but move with the body's
# head, frame by frame, as far as the body's own head moved in its frames (`headAt`: where the neck's middle is,
# each frame; a face's and hair's `ref`: where theirs is). So a head goes on any body of its family and walks as that
# body's own did, and the body's own head is never left peeping out (it's cut off).
def anchor_of(f, shift):
    if not f: return [16, 16]
    y = max(y for x, y in f); xs = [x for x, yy in f if yy == y]
    return [(min(xs) + max(xs) + 1) // 2 + shift[0], y + 1 + shift[1]]
def neck_row(f):
    ys = sorted({y for x, y in f}); top, bot = ys[0], ys[-1]; h = bot - top + 1
    best, at = None, None
    for y in range(top + h * 3 // 10, top + h * 3 // 5 + 1):
        xs = [x for x, yy in f if yy == y]
        if not xs: continue
        w = max(xs) - min(xs) + 1
        if best is None or w < best: best, at = w, y
    return at if at is not None else top + h // 3
def motion(head, f):
    """How far `head` (a standing frame's) has moved in frame f: the shift that lines up most of its pixels."""
    best, at = -1, (0, 0)
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            m = sum(1 for (x, y), v in head.items() if (f.get((x + dx, y + dy)) or (None, None))[1] == v[1])
            if m > best or (m == best and abs(dx) + abs(dy) < abs(at[0]) + abs(at[1])): best, at = m, (dx, dy)
    return at
def dark(v): return v[0] is None and lum(v[1]) < 70
def split_head(head):
    """A head -> (hair, face). Its face: its skin, what the skin holds (two or more of its four round it are the face:
    eyes, a mouth), and the dark outline round that; the rest of it is its hair (and what's in the hair: a ribbon, a
    clip, the hair's own outline). A head with no hair (a bald one) is all face; one with no skin showing (from behind)
    all hair."""
    if not any(v[0] == 'hair' for v in head.values()): return {}, dict(head)
    face = {k for k, v in head.items() if v[0] == 'skin'}
    N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
    for _ in range(3):
        add = {k for k, v in head.items() if k not in face and v[0] != 'hair' and sum((k[0] + a, k[1] + b) in face for a, b in N4) >= 2}
        if not add: break
        face |= add
    face |= {k for k, v in head.items() if k not in face and v[0] != 'hair' and dark(v) and any((k[0] + a, k[1] + b) in face for a, b in N4)}
    return {k: v for k, v in head.items() if k not in face}, {k: v for k, v in head.items() if k in face}

# (Each character's head standing each way, for which hair goes with which face: HEADS[pid] = [(hair, face, neck point)] by way.)
HEADS = {}
SHIFTS = {}   # (each character's: where its (0, 0) is in a cell)
def parts_of(pid, name, family, frames, shift, heads, head_at, ref):
    """A character's body, face and hair sheets. frames: its N bodies; heads: its (hair, face) each way."""
    roles, own = sheet(pid, frames, shift)
    PARTS[pid] = {'name': name, 'kind': 'body', 'family': family, 'roles': roles, 'own': own, 'headAt': head_at}
    roles, own = sheet(pid + '_face', [heads[FRAME_DIR[i]][1] for i in range(N)], shift)
    PARTS[pid + '_face'] = {'name': name, 'kind': 'face', 'family': family, 'roles': roles, 'own': own, 'ref': ref}
    if any(h for h, f in heads):
        roles, own = sheet(pid + '_hair', [heads[FRAME_DIR[i]][0] for i in range(N)], shift)
        PARTS[pid + '_hair'] = {'name': name, 'kind': 'hair', 'family': family, 'roles': roles, 'own': own, 'ref': ref}
# (Where the narrowest row isn't the neck: these are chibi, their heads wider than their shoulders, so it can fall in
# the face. Rows lower (+) or higher (-), each by eye, so the body keeps none of the face and the head all of it.)
NECK = {'krillin': 1, 'tien': 1, 'townswoman': -4, 'piccolo': 4, 'piccolo_gi': 3, 'dende': 3, 'nail': 2, 'moori': 2, 'namekian': 2,
        'android_16': 5, 'android_17': 5, 'android_18': 3, 'android_19': 5, 'android_20': 1, 'frieza': 1, 'frieza_first': 2,
        'mecha_frieza': 2, 'king_cold': -1, 'kid_buu': 1, 'fat_buu': 4, 'super_buu': 4, 'supreme_kai': 2, 'kibito': 4,
        'kibito_kai': 1, 'king_kai': 1, 'peach': 6, 'toad': 3, 'star_toad': 3, 'bowser': 2, 'koops': 1}
# (Facing the side, the neck point is the head's bottom row's middle, and hair hanging behind it (Kibito's) puts it
# back; the Supreme Kai's head has none, so his is forward of the others' and their heads sat forward on him. His,
# pixels further back.)
SIDE_NECK = {'supreme_kai': 2}
def character(pid, name, family, frames, shift, split=True, neck=0, hair=True):
    """frames: N dicts {(x, y): (role, colour)} (standing, steps, betweens). split False: whole (no neck to cut at, the
    Goombas and Piantas). neck: rows lower (+) or higher (-) than the narrowest. hair False: its head's all face."""
    if pid in SIDE_ART: frames = drawn_side(pid, frames)
    SHIFTS[pid] = shift
    if not split:
        roles, own = sheet(pid, frames, shift)
        PARTS[pid] = {'name': name, 'kind': 'whole', 'family': family, 'roles': roles, 'own': own}
        return
    n = neck_row(frames[0]) + neck + NECK.get(pid, 0)
    bodies, head_at, ref, heads = [None] * N, [None] * N, [None] * N, []
    for d in range(3):
        head = {k: v for k, v in frames[d].items() if k[1] < n}
        h, f = split_head(head) if hair else ({}, dict(head))
        # (Hair hanging below the neck, Android 18's or a ponytail, is the hair's, not the body's.)
        if hair: h.update({k: v for k, v in frames[d].items() if k[1] >= n and v[0] == 'hair'})
        # (Its neck point: the middle of the neck, the head's bottom row; not of its face, as from behind there's
        # little of the face, at one side (the townsman's ear), and a head put there sat off to that side.)
        xs = [x for x, y in head if y == n - 1] or [x for x, y in (f or head)]
        np_ = [(min(xs) + max(xs) + 1) // 2 + shift[0] + (SIDE_NECK.get(pid, 0) if d == 2 else 0) if xs else 16, n + shift[1]]
        heads.append((h, f))
        HEADS[pid] = HEADS.get(pid, []) + [(h, f, (np_[0] - shift[0], n))]
        for i in range(N):
            if FRAME_DIR[i] != d: continue
            dx, dy = motion(head, frames[i]) if i != d else (0, 0)
            bodies[i] = {k: v for k, v in frames[i].items() if k[1] >= n + dy and not (hair and v[0] == 'hair')}
            head_at[i] = [np_[0] + dx, np_[1] + dy]; ref[i] = list(np_)
    parts_of(pid, name, family, bodies, shift, heads, head_at, ref)
def steps_of(stand, walk):
    """A walk's four frames -> (its two steps, its two betweens): the steps the two opposite each other in the walk
    (0 and 2, or 1 and 3) the more unlike standing, each between the one after its step, so the walk goes round in
    its own order. (Not simply the two most unlike: those can be side by side, 0 and 1, and the walk then went 0, 2,
    1, 3, back and forth, Supreme Kai's and the Buus' jerking as they walked and turned.)"""
    diff = lambda f: len(set(f.items()) ^ set(stand.items()))
    i = max((0, 1), key=lambda i: diff(walk[i]) + diff(walk[i + 2]))
    return [walk[i], walk[i + 2]], [walk[i + 1], walk[(i + 3) % 4]]
def frames15(stands, walks):
    """stands: [down, up, left]; walks: [[...] down, up, left] (two steps, or four) -> the N frames."""
    out = list(stands) + [None] * 12
    for d in range(3):
        w = walks[d]
        if len(w) >= 4: st, bt = steps_of(stands[d], w)
        else: st, bt = w[:2], [stands[d], stands[d]]
        out[3 + 2 * d], out[4 + 2 * d] = st
        out[9 + 2 * d], out[10 + 2 * d] = bt
    return out
# Which hair goes with which face: a hair can go on a face when it covers (nearly) all of where that face's own
# hair was (else there'd be a gap in the head), each way it faces; a face with no hair of its own (a bald one) takes
# any, or none. -> each face's `hairs` (its hair ids; "" for none).
def hair_fits(h, f):
    worst = 1
    for (hh, _, nh), (fh, _, nf) in zip(HEADS[h], HEADS[f]):
        if not fh: continue
        mine = {(x - nf[0], y - nf[1]) for (x, y) in fh}
        theirs = {(x - nh[0], y - nh[1]) for (x, y) in hh}
        worst = min(worst, len(mine & theirs) / len(mine))
    return worst >= 0.7
def hair_fitting():
    for f in HEADS:
        fp = PARTS.get(f + '_face')
        if not fp: continue
        bald = not any(h for h, _, _ in HEADS[f])
        fp['hairs'] = ([''] if bald else []) + [h + '_hair' for h in HEADS if h + '_hair' in PARTS and PARTS[h + '_hair']['family'] == fp['family']
                                                  and (h == f or hair_fits(h, f))]

# ---------- Hyrule: The Minish Cap's people ----------
# FireRed's nine frames from a Minish Cap body's nine (down 0-2, up 3-5, the side 6-8, facing left).
BODY_SLOTS = [0, 3, 6, 1, 2, 4, 5, 7, 8]
def tmc_roles(px, pal, roles, brown=False):
    """{(x, y): index} -> {(x, y): (role, colour)}. roles: {role: set of indices}. brown: the hair shares the skin's
    brown ramp, so a patch of its light shades (12, 13) is hair when most of what's round it is hair (10, 11) and none
    of it the outline or an eye."""
    out = {}
    for (x, y), v in px.items():
        out[(x, y)] = (next((r for r, s in roles.items() if v in s), None), pal[v])
    if brown:
        seen = set()
        for start, v in px.items():
            if v not in (12, 13) or start in seen: continue
            patch, todo, round_ = {start}, [start], []
            while todo:
                x, y = todo.pop()
                for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if px.get(n) in (12, 13):
                        if n not in patch: patch.add(n); todo.append(n)
                    else: round_.append(px.get(n))
            seen |= patch
            # (A face touches the outline or the eyes; a highlight in the hair doesn't.)
            if not any(n in (14, 15) for n in round_) and sum(n in (10, 11) for n in round_) >= 0.6 * len(round_):
                for q in patch: out[q] = ('hair', pal[px[q]])
    return out
def head_roles(hair):
    brown = hair == 'brown'
    hair_set = {'brown': {10, 11}, 'blond': {1, 2, 3, 4}, 'blue': {6, 7, 8, 9}, 'white': {6, 7, 8, 14}, 'none': set()}[hair]
    skin = {12, 13} | (set() if brown else {10, 11})
    return {'hair': hair_set, 'skin': skin - hair_set}, brown

PARTS = {}
def tmc_part(pid, name, kind, si, frames, pal, roles, brown, offsets, shift, extra=None):
    f9 = []
    for i, fi in enumerate(frames):
        px = frame(si, fi)
        if offsets: px = {(x + offsets[i][0], y + offsets[i][1]): v for (x, y), v in px.items()}
        if extra: px = extra(i, px)
        f9.append(tmc_roles(px, pal, roles, brown))
    if kind == 'whole':
        # (Link's two steps each way, as taken, are the one step twice, the same foot forward, so he limped: facing
        # you and away, the other is the first turned round (his head's from his standing frames, so it isn't). To
        # the side, his strides are 2-3 pixels off the ground: down on it, so he doesn't hop.)
        turn = lambda f: {(-1 - x, y): v for (x, y), v in f.items()}
        f9[4], f9[6] = turn(f9[3]), turn(f9[5])
        foot = max(y for x, y in f9[2])
        for i in (7, 8):
            dy = foot - max(y for x, y in f9[i]); f9[i] = {(x, y + dy): v for (x, y), v in f9[i].items()}
    # (The Minish Cap walks in two steps: its betweens are its standing frames.)
    f15 = f9 + [f9[0], f9[0], f9[1], f9[1], f9[2], f9[2]]
    if kind == 'whole': return character(pid, name, 'hyrule', f15, shift)
    if kind == 'body':
        roles, own = sheet(pid, f15, shift)
        PARTS[pid] = {'name': name, 'kind': 'body', 'family': 'hyrule', 'roles': roles, 'own': own}
        return
    # (A head: its face and its hair, standing each way, and where its neck is: the middle of its bottom row. The Minish
    # Cap's own bodies take its heads where the game draws them: the bodies' necks are the heads', frame by frame, the
    # middle of them, set once all are made, at the end of hyrule().)
    heads, ref = [], [None] * N
    for d in range(3):
        h, f = split_head(f9[d])
        heads.append((h, f))
        at = anchor_of(f9[d], shift)
        HEADS[pid] = HEADS.get(pid, []) + [(h, f, (at[0] - shift[0], at[1] - shift[1]))]
        for i in range(N):
            if FRAME_DIR[i] == d: ref[i] = at
    TMC_HEADS[pid] = [anchor_of(f, shift) for f in f15]
    roles, own = sheet(pid + '_face', [heads[FRAME_DIR[i]][1] for i in range(N)], shift)
    PARTS[pid + '_face'] = {'name': name, 'kind': 'face', 'family': 'hyrule', 'roles': roles, 'own': own, 'ref': ref}
    if any(h for h, f in heads):
        roles, own = sheet(pid + '_hair', [heads[FRAME_DIR[i]][0] for i in range(N)], shift)
        PARTS[pid + '_hair'] = {'name': name, 'kind': 'hair', 'family': 'hyrule', 'roles': roles, 'own': own, 'ref': ref}
TMC_HEADS = {}   # (each Minish Cap head's neck, frame by frame, where the game draws it)

def hyrule():
    adults, kids = palette(62), palette(58)
    # (Where a head sits: on the plain tunic's frames, the first body; the children's on the first child's.)
    adult_at = [attach(57, 9 + s) for s in BODY_SLOTS]
    kid_at = [attach(59, s) for s in BODY_SLOTS]
    # (Feet at the cell's bottom, the origin in its middle.)
    SHIFT = (16, 28)
    # The grown-ups' heads (sprite 58: back +0, front +4, side +6) and bodies (sprite 57).
    for base, name, hair in [(0, 'Bald', 'none'), (24, 'Cropped', 'brown'), (32, 'Tousled', 'blond'), (40, 'Headband', 'brown'),
                             (48, 'Spectacles', 'brown'), (56, 'Cap', 'brown'), (64, 'Spiky', 'blond'), (72, 'Parted', 'brown'),
                             (80, 'Side Part', 'brown'), (88, 'Bobble Hat', 'blond'), (96, 'Shaggy', 'brown'), (104, 'Long', 'blond'),
                             (112, 'Bob', 'brown'), (120, 'Fringe', 'blond'), (144, 'Bun', 'blond'), (152, 'Top Knot', 'brown')]:
        roles, brown = head_roles(hair)
        tmc_part('head_%d' % base, name, 'head', 58, [base + k for k in (4, 0, 6, 4, 4, 0, 0, 6, 6)], adults, roles, brown, adult_at, SHIFT)
    # The Zora: the bald head, its tail-fin drawn on (none of The Minish Cap's people are Zora): hanging down the
    # back from behind, out behind the head from the side; from the front, a crest at the crown.
    def fin(length):
        def add(i, px):
            px = dict(px)
            xs = [x for x, y in px]; ys = [y for x, y in px]
            x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys); cx = (x0 + x1) // 2
            side = i in (2, 7, 8); back = i in (1, 5, 6); shape = {}
            for k in range(length):
                if back:   # (down the back, narrowing)
                    w = max(1, 3 - k * 3 // length); y = y1 - 2 + k
                    for x in range(cx - w + 1, cx + w + 1): shape[(x, y)] = 12 if abs(x - cx - 0.5) < w - 1 else 11
                elif side:   # (out behind, to the right, and down)
                    w = max(1, 3 - k * 3 // length); x = x1 - 1 + k; yc = y0 + 4 + k * 2 // 3
                    for y in range(yc - w + 1, yc + w): shape[(x, y)] = 12 if abs(y - yc) < w - 1 else 11
            if not (back or side):   # (the crest at the crown)
                for x in range(cx - 1, cx + 2): shape[(x, y0 - 1)] = 12
                shape[(cx, y0 - 2)] = 11; shape[(cx + 1, y0 - 2)] = 11
            for q, v in shape.items():
                if q not in px or not back and not side: px[q] = v
            for (x, y) in list(shape):
                for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if n not in px: px[n] = 15
            return px
        return add
    for pid, name, length in [('zora_fin', 'Tail-Fin', 7), ('zora_long', 'Long Tail-Fin', 9)]:
        tmc_part(pid, name, 'head', 58, [k for k in (4, 0, 6, 4, 4, 0, 0, 6, 6)], adults, {'skin': {10, 11, 12, 13}}, False, adult_at, SHIFT, fin(length))
    for base, name in [(9, 'Tunic'), (0, 'Smock'), (18, 'Overalls'), (27, 'Waistcoat'), (36, 'Slim Tunic'), (45, 'Apron'),
                       (54, 'Skirt'), (63, 'Pinafore')]:
        tmc_part('body_%d' % base, name, 'body', 57, [base + s for s in BODY_SLOTS], adults,
                 {'outfit': {1, 2, 3, 4}, 'trim': {6, 7, 8}, 'skin': {12, 13}}, False, None, SHIFT)
    # The children's (sprite 59, heads: back +0, side +2, front +4).
    for base, name, hair in [(25, 'Mop Top', 'brown'), (55, 'Bowl Cut', 'blue'), (64, 'Ponytail', 'brown'), (72, 'Pigtails', 'blond'),
                             (120, 'Cowlick', 'brown'), (131, 'Swept', 'blond'), (139, 'Curls', 'blond'), (37, 'Cap', 'blue')]:
        roles, brown = head_roles(hair)
        if base == 37: roles = {'trim': {6, 7, 8, 9}, 'skin': {12, 13, 10, 11}}
        tmc_part('kidhead_%d' % base, name, 'head', 59, [base + k for k in (4, 0, 2, 4, 4, 0, 0, 2, 2)], kids, roles, brown, kid_at, SHIFT)
    for base, name, outfit in [(0, 'Smock', {6, 7, 8, 9}), (15, 'Dress', {1, 2, 3}), (83, 'Tunic', {1, 2, 3}), (102, 'Shorts', {1, 2, 3}),
                               (111, 'Jerkin', {1, 2, 3})]:
        tmc_part('kidbody_%d' % base, name, 'body', 59, [base + s for s in BODY_SLOTS], kids,
                 {'outfit': outfit, 'trim': {4, 5} | ({6, 7, 8, 9} - outfit), 'skin': {12, 13}}, False, None, SHIFT)
    # Link, whole (and so cut, a head and a body): standing (down 0, side 1, up 2) and a stride each way from his
    # walks (7-16, 17-26, 27-36).
    tmc_part('link', 'Link', 'whole', 1, [0, 2, 1, 9, 14, 29, 34, 19, 24], palette(22),
             {'hair': {8, 9}, 'outfit': {3, 4, 5, 7}, 'skin': {10, 11, 12, 13}}, False, None, SHIFT)
    # (The Minish Cap's bodies' necks: where its heads' are, frame by frame, the middle one of them.)
    for prefix, heads in (('body_', 'head_'), ('kidbody_', 'kidhead_')):
        hs = [a for k, a in TMC_HEADS.items() if k.startswith(heads) or (heads == 'head_' and k.startswith('zora_'))]
        mid = [[sorted(h[f][i] for h in hs)[len(hs) // 2] for i in (0, 1)] for f in range(N)]
        for k, p in PARTS.items():
            if k.startswith(prefix) and p['kind'] == 'body': p['headAt'] = mid

# ---------- The Dragon World: the Dragon Ball realm's people ----------
# Each sheet: a row an animation, in fours (down, up, left, right); the first four stand, the next four walk.
# The colours that are each one's hair, clothes, trim and skin (the rest stay as they are).
SKIN = ['ffbdad', 'e79c84', 'ce8463', 'b56339']
TAN = ['f7c673', 'dead63', 'c69452', 'ad7b39']
BUU = ['ffa5ce', 'ff8cbd', 'ff73b5', 'de5294', 'bd397b', '9c185a']
WHITE = ['ffffff', 'dedede', 'c6c6c6', 'adadad', 'a5a5a5', '949494', '7b7b7b', '737373']
GREY_CAPE = ['ffffff', 'dedede', 'c6c6c6', 'adadad', '949494', '737373']
NAMEK = ['52d600', '31ad00', '107b00']
NAMEK1 = ['29ad39', '188421', '086310']
KAI = ['de84ff', 'ce63ce', 'ad63ad', '9c00d6', '7b00ad']
DB_PARTS = [
    ('goku', 'Goku', 'LG2_057', 1, {'hair': ['000000', '210084', '21217b'], 'outfit': ['ff7300', 'd66300', 'ad4a00', '7b3100'],
                                      'trim': ['4221d6', '3110ad', '21217b', '210084'], 'skin': SKIN}),
    ('gohan', 'Gohan', 'LG2_053', 1, {'hair': ['000000', '210084'], 'outfit': ['4221d6', '3110ad', '210084'], 'trim': WHITE, 'skin': SKIN}),
    ('kid_gohan', 'Kid Gohan', 'LG2_050', 1, {'hair': ['000000', '212142', '210084'], 'outfit': ['d61029', 'ad0810', '7b0000'],
                                              'trim': ['4221d6', '3110ad', '210084'], 'skin': SKIN}),
    ('vegeta', 'Vegeta', 'LG2_134', 1, {'hair': ['000000', '424242'], 'outfit': ['4221d6', '3110ad', '210084'], 'trim': WHITE, 'skin': TAN}),
    ('trunks', 'Trunks', 'LG2_125', 1, {'hair': ['efadff', 'd652ff', '7b217b'], 'outfit': ['2184ff', '4221d6', '3110ad', '210084'],
                                        'trim': ['ffd642', 'f7c673', 'c69452'], 'skin': SKIN}),
    ('krillin', 'Krillin', 'LG2_073', 1, {'outfit': ['ff9418', 'd66300', 'ad4a00', '7b3100'], 'trim': ['2163de', '4221d6', '21217b'], 'skin': SKIN}),
    ('tien', 'Tien', 'LG2_118', 1, {'outfit': ['52d600', '31ad00', '107b00'], 'trim': ['ff1839', 'd61029', 'ad0810', '7b0000'], 'skin': SKIN}),
    ('yamcha', 'Yamcha', 'LG2_152', 1, {'hair': ['000000', '424242'], 'outfit': ['d66300', 'ad4a00', '7b3100'], 'skin': TAN}),
    ('bulma', 'Bulma', 'LG2_020', 1, {'hair': ['7bbdce', '00a5a5', '21637b'], 'outfit': ['e7a542', 'd66300', 'ad4a00'],
                                      'trim': ['ad0810', '7b0000'], 'skin': SKIN}),
    ('chichi', 'Chi-Chi', 'LG2_030', 1, {'hair': ['000000', '424242'], 'outfit': ['ffd642', 'ff9418', 'd66300'],
                                         'trim': ['7ba5ce', '2184ff', '2163ad', '00218c'], 'skin': SKIN}),
    ('townsman', 'Townsman', 'LG2_077', 1, {'hair': ['7b6342', '6b3110', 'ada57b'], 'outfit': ['2184ff', '2163ff', '0039b5'],
                                            'trim': ['52d600', '31ad00', '107b00'], 'skin': SKIN}),
    ('townswoman', 'Townswoman', 'LG2_151', 1, {'hair': ['a56b31', '845218', '844218', '9c4a21', '6b3110'], 'outfit': ['00d6d6', '00a5a5', '007373'],
                                                'skin': SKIN}),
    ('kid_buu', 'Kid Buu', 'BF_038', 1, {'outfit': ['ffffff', 'dedede', 'a5a5a5'], 'trim': ['ffad00', 'ff7300', 'd66300', 'ad4a00'], 'skin': BUU}),
    ('fat_buu', 'Fat Buu', 'BF_034', 2, {'outfit': ['944ace', '7329bd', '6308ad', '420073'], 'trim': ['ffad00', 'd66300', 'ad4a00'], 'skin': BUU}),
    ('super_buu', 'Super Buu', 'BF_040', 2, {'outfit': ['ffffff', 'dedede', 'c6c6c6', 'a5a5a5'], 'trim': ['ffad00', 'ff7300', 'd66300', 'ad4a00'],
                                              'skin': BUU}),
    # (The Namekians: Piccolo, caped and not, Dende, Nail, Elder Moori and a villager; their antennae are skin.)
    ('piccolo', 'Piccolo', 'LG2_100', 1, {'outfit': ['6308ad', '520084'], 'trim': GREY_CAPE, 'skin': NAMEK}),
    ('piccolo_gi', 'Piccolo (Gi)', 'LG2_101', 1, {'outfit': ['6308ad', '520084'], 'trim': ['2184ff', '2163ce', '0039b5'], 'skin': NAMEK}),
    ('dende', 'Dende', 'LG2_092', 1, {'outfit': ['2184ff', '2163ce', '0039b5'], 'trim': ['ffffff', 'c6c6c6', '949494'], 'skin': NAMEK}),
    ('nail', 'Nail', 'LG1_55', 1, {'outfit': ['ffffff', 'ced6de', 'a5adb5', '737b7b'], 'trim': ['b54a00', '7b4200'], 'skin': NAMEK1}),
    ('moori', 'Elder Moori', 'LG2_070', 1, {'outfit': ['4221d6', '3110ad', '210084'], 'trim': ['ffffff', 'c6c6c6', '737373'], 'skin': NAMEK}),
    ('namekian', 'Namekian', 'LG1_52', 1, {'outfit': ['ffffff', 'c6cece', '848c94'], 'trim': ['0010ad', '000873'], 'skin': NAMEK1}),
    # (The Androids: 16, 17, 18, 19 and 20 (Dr. Gero), and Cell.)
    ('android_16', 'Android 16', 'LG2_005', 1, {'hair': ['ff7300', 'd66300', 'ad4a00'], 'outfit': ['ffff39', '9c9c00', '6b6b00'], 'skin': SKIN}),
    ('android_17', 'Android 17', 'LG2_007', 1, {'hair': ['000000', '424242'], 'outfit': ['7b63e7', '5a31ff', '4221d6', '3110ad', '21217b'],
                                                'trim': ['d66300', 'ad4a00'], 'skin': ['f7dead'] + TAN}),
    ('android_18', 'Android 18', 'LG2_008', 1, {'hair': ['ffff7b', 'ffd642', 'e7a542'], 'outfit': ['4221d6', '3110ad', '210084', '21217b'],
                                                'trim': ['ad7b39', '845218'], 'skin': SKIN}),
    ('android_19', 'Android 19', 'LG2_009', 1, {'outfit': ['e7ef7b', 'e7bd42', 'c69452', '946329', '845218'], 'trim': ['ad0810', '7b0000'],
                                                'skin': ['ffffff', 'c6c6c6', '949494']}),
    # (Android 20 is Dr. Gero, from Legacy of Goku's sheets: white hair and moustache, his lab coat.)
    ('android_20', 'Android 20', 'LG1_21', 1, {'hair': ['ffffff', 'cecece', '949494'], 'outfit': ['cecece', '949494', '636363'],
                                               'trim': ['8c1000', '00085a'], 'skin': ['ffce94', 'e7a542', 'b57b31', '8c5218']}),
    ('cell', 'Cell', 'LG2_027', 2, {'outfit': ['e7d6ff', 'ad63ad', '7b217b', '5a007b'], 'skin': ['ced67b', '7bbd42', '7ba542', '6b6b00']}),
    # (The Frieza Clan: Frieza, his first form and as Mecha Frieza, and King Cold; their plates are the trim.)
    ('frieza', 'Frieza', 'LG2_045', 1, {'trim': ['de84ff', 'ad21ff', '7b21ad', '5a007b'], 'skin': ['ffffff', 'adbde7', '7ba5ce']}),
    ('frieza_first', 'Frieza (First Form)', 'LG1_23', 1, {'outfit': ['de7b94', 'bd5a73', '8c394a', '732939'], 'trim': ['de8cf7', '732994', '421063'],
                                                           'skin': ['ffffff', 'dec6de', 'c6c6c6']}),
    ('mecha_frieza', 'Mecha Frieza', 'LG2_046', 1, {'trim': ['7b63e7', '7b63ad', '7b21ad', '5a007b', '210084'], 'skin': ['ffffff', 'adbde7', '7ba5ce']}),
    ('king_cold', 'King Cold', 'LG2_071', 2, {'outfit': ['d61029', 'ad0810', '7b0000'], 'trim': ['7bffce', '00a5a5', '21637b'],
                                              'skin': ['efadff', 'de84ff', 'ce29ff', '9c00d6', '5a007b']}, {'frames': 'king_cold'}),
    # (Videl, from Buu's Fury: a woman's face and hair for the Majin's and the Kais' presets.)
    ('videl', 'Videl', 'BF_277', 1, {'hair': ['000000', '393939'], 'outfit': ['ffffff', 'f7f7f7', 'dedede', 'c6c6c6'],
                                     'trim': ['a5a5a5', '7b7b7b', '636363', '525252'], 'skin': ['f7c673', 'dead63', 'ad7b39', '845218']}),
    # (The Kais: the Supreme Kai, Kibito, the two fused, and King Kai.)
    ('supreme_kai', 'Supreme Kai', 'BF_073', 1, {'hair': ['ffffff', 'dedede', 'd6adef'], 'outfit': ['00ced6', '009cb5', '006b84', '004263'],
                                                 'trim': ['ff8400', 'd66300', 'ad4a00', '733900'], 'skin': KAI}),
    ('kibito', 'Kibito', 'BF_150', 1, {'hair': ['ffffff', 'dedede', 'c6c6c6', 'a5a5a5', '7b7b7b'], 'outfit': ['ffad00', 'ff8400', 'd66300', 'ad4a00', '733900'],
                                       'trim': ['21a5ce', '2163ad', '210084'], 'skin': KAI}),
    ('kibito_kai', 'Kibito Kai', 'BF_249', 1, {'hair': ['f7f7f7', 'ceefff', 'add6e7', '7ba5ce'], 'outfit': ['00ced6', '009cb5', '006b84', '004263'],
                                               'trim': ['ffb529', 'd66300', '733900'], 'skin': KAI}),
    ('king_kai', 'King Kai', 'BF_214', 1, {'outfit': ['c60000', '940000', '5a0000'], 'trim': ['8cce39', '529c00', '315a00'],
                                           'skin': ['add6ff', '18bdef', '188cef', '2184ff']}),
]
def db_roles(px, roles):
    """{(x, y): colour} -> {(x, y): (role, colour)}. Hair only on the head (the top two-fifths of the figure); black
    hair only inside its outline (the black that touches nothing undrawn), as its darkest shade."""
    if not px: return {}
    ys = [y for x, y in px]; head = min(ys) + (max(ys) - min(ys)) * 2 // 5
    out = {}
    for (x, y), col in px.items():
        h, role = hexc(col)[1:], None
        for r in ('skin', 'hair', 'outfit', 'trim'):
            if h in roles.get(r, ()):
                if r == 'hair' and y > head: continue
                if r == 'hair' and h == '000000' and any((x + dx, y + dy) not in px for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): continue
                role = r; break
        out[(x, y)] = (role, col)
    return out
def hexc(c): return '#%02x%02x%02x' % c[:3]
# King Cold's sheet has him only from the front and the side standing: its "up" rows are his front again, and all
# its walks (rows 4-7) are the one walk towards you, so he walked up facing you and sideways facing you. Here, his
# own: towards you, standing (row 0) and his walk (row 4: steps 1 and 3, betweens 0 and 2); from behind, those drawn
# again from behind (his cape over his back and arms, his head with no face: back_of); and to the side, standing
# (row 2) and a walk made from it (side_walk), as the sheet has none.
def back_of(f):
    """A figure from the front -> from behind: below its shoulders, its cape across it (its outline kept, folds every
    third column); above, its head's skin over its face (its outline, horns and dome kept)."""
    ys = [y for x, y in f]; top = min(ys)
    width = lambda y: max(x for x, yy in f if yy == y) - min(x for x, yy in f if yy == y) + 1
    head = next(y for y in range(top, max(ys)) if width(y) >= 16)   # (his shoulders: the first row so wide, wider than his horns)
    hem = max(y for (x, y), v in f.items() if v[0] == 'outfit')
    xs = [x for x, y in f if y == head]; cx = (min(xs) + max(xs)) // 2
    has = lambda x, y: (x, y) in f
    out = dict(f)
    CAPE = {0: (0x7b, 0x00, 0x00), 1: (0xad, 0x08, 0x10), 2: (0xd6, 0x10, 0x29)}
    for y in range(head + 2, hem + 1):
        # (the run of the figure through its middle: the tail, beside it, stays)
        x0 = x1 = cx
        if not has(cx, y): continue
        while has(x0 - 1, y): x0 -= 1
        while has(x1 + 1, y): x1 += 1
        for x in range(x0 + 1, x1):
            k = x - x0
            out[(x, y)] = ('outfit', CAPE[0 if (x - cx) % 3 == 0 else 2 if k <= 2 else 1])
        out[(x0, y)] = out[(x1, y)] = (None, (0, 0, 0))
    for (x, y), v in f.items():
        if y >= head or v[0] == 'trim': continue
        if all(has(x + a, y + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))): out[(x, y)] = ('skin', (0xde, 0x84, 0xff) if y < (top + head) // 2 else (0xce, 0x29, 0xff))
    return out
def side_walk(f):
    """A side standing -> its two steps: the front leg forward and the back one back, then the other way (the feet
    two pixels, the shins one; the rest of him as he stands)."""
    ys = [y for x, y in f]; bot = max(ys); legs = bot - 6
    xs = [x for (x, y) in f if y >= bot - 2]; mid = (min(xs) + max(xs)) // 2
    steps = []
    for d in (1, -1):
        g = {k: v for k, v in f.items() if k[1] < legs}
        for (x, y), v in sorted(f.items(), key=lambda kv: (kv[0][0] <= mid) == (d > 0)):
            if y < legs: continue
            m = 1 if y < bot - 2 else 2
            g[(x + (-d * m if x <= mid else d * m), y)] = v
        # (what the legs leave behind at the hem: the stand's, so there's no hole)
        for (x, y), v in f.items():
            if legs <= y < bot - 2 and (x, y) not in g and (x - 1, y) in g and (x + 1, y) in g: g[(x, y)] = v
        steps.append(g)
    return steps
def king_cold_frames(cell):
    down, walk, side = cell(0, 0), [cell(4, c) for c in range(4)], cell(2, 0)
    up, back = back_of(down), [back_of(w) for w in walk]
    sa, sb = side_walk(side)
    stands = [down, up, side]
    steps = [(walk[1], walk[3]), (back[1], back[3]), (sa, sb)]
    betweens = [(walk[0], walk[2]), (back[0], back[2]), (side, side)]
    out = list(stands) + [None] * 12
    for d in range(3):
        out[3 + 2 * d], out[4 + 2 * d] = steps[d]
        out[9 + 2 * d], out[10 + 2 * d] = betweens[d]
    return out
OWN_FRAMES = {'king_cold': king_cold_frames}
def dragon_world():
    index = json.load(open(os.path.join(DB, 'index.json')))
    for pid, name, src, scale, roles, *more in DB_PARTS:
        opts = more[0] if more else {}
        e = index[src]; (w, h), (ax, ay) = e['cell'], e['anchor']
        img = Image.open(os.path.join(DB, src + '.png')).convert('RGBA')
        def cell(r, c):
            f = img.crop((c * w, r * h, (c + 1) * w, (r + 1) * h)); p = f.load(); px = {}
            for y in range(h):
                for x in range(w):
                    if p[x, y][3] > 128: px[(x - ax, y - ay)] = p[x, y][:3]
            if scale == 2:
                # (Halved: each 2x2 block the colour most of it has, when at least two of it are drawn.)
                half = {}
                for (x, y), col in px.items():
                    half.setdefault((x // 2, y // 2), []).append(col)
                px = {k: max(set(v), key=v.count) for k, v in half.items() if len(v) >= 2}
            return db_roles(px, roles)
        # (Standing: rows 0-2's first frames; walking: rows 4-6, all four of each, when it has them. A sheet that's
        # short of some, its own: OWN_FRAMES.)
        if opts.get('frames'): f15 = OWN_FRAMES[opts['frames']](cell)
        else:
            stands = [cell(r, 0) for r in range(3)]
            walk = len(e['frames']) >= 8 and e['frames'][4] >= 3
            walks = [[cell(4 + d, c) for c in range(min(4, e['frames'][4 + d]))] if walk else [stands[d], stands[d]] for d in range(3)]
            f15 = frames15(stands, walks)
        # (Feet at the cell's bottom and the figure in its middle, by where it stands facing down.)
        xs = [x for x, y in f15[0]]; ys = [y for x, y in f15[0]]
        shift = (16 - (min(xs) + max(xs) + 1) // 2, 31 - max(ys))
        character(pid, name, 'lg' if src.startswith('LG') else 'bf', f15, shift, neck=opts.get('neck', 0), hair=opts.get('hair', True))

# ---------- Kanto: FireRed's Red, Leaf and Gary ----------
# Their overworld sheets as the game has them (assets/world/sprites/red_normal.png, green_normal.png, blue.png: FireRed's
# nine frames, 16x32), each colour one of the four or its own; each cut at its neck, the row below its chin, by eye
# (they're chibi: their caps are the widest of them). Red's cap is his clothes' colour and Leaf's hat her trim's, so
# a cap goes with the hairstyle. Their walks are two steps, so
# the frames between are them standing.
FRLG_PARTS = [
    ('red', 'Red', 'red_normal', 23, {'hair': ['39397b', '7b4141'], 'outfit': ['ff6a4a', 'c53939', '6a2929'], 'trim': ['73a4c5', '39397b'],
                                      'skin': ['ffc594', 'de9473'], 'above': ['outfit']}),
    ('leaf', 'Leaf', 'green_normal', 24, {'hair': ['ac7b41', '7b4141'], 'outfit': ['73a4c5', '4141d5', '39397b'], 'trim': ['ff6a4a', 'c53939', '6a2929'],
                                          'skin': ['ffc594', 'de9473'], 'above': ['trim'], 'below': ['hair']}),
    ('gary', 'Gary', 'blue', 23, {'hair': ['debd41', 'a48320', '525220'], 'outfit': ['a44a83', '522041'], 'trim': ['204110'],
                                  'skin': ['ffd5b4', 'f6bd94', 'de9473']}),
]
def kanto_roles(px, roles, neck):
    """As db_roles, but cut at the neck (`neck`: the first row of the body, standing): hair only above it (Leaf's,
    hanging down her back, too: it's the colour of nothing else there), clothes and trim only below (their colours are
    the outline of a cap, a face's shadow, above). Unless `above` or `below` says: Red's cap is his clothes' colour,
    Leaf's hat band her trim's, and her hair hangs down her back."""
    out = {}
    for (x, y), col in px.items():
        h, role = hexc(col)[1:], None
        for r in ('skin', 'hair', 'outfit', 'trim'):
            if h not in roles.get(r, ()): continue
            if r == 'hair' and y >= neck and r not in roles.get('below', ()): continue
            if r in ('outfit', 'trim') and y < neck and r not in roles.get('above', ()): continue
            role = r; break
        out[(x, y)] = (role, col)
    return out
def kanto():
    for pid, name, src, neck, roles in FRLG_PARTS:
        img = Image.open(os.path.join(ROOT, 'assets/world/sprites', src + '.png')).convert('RGBA'); p = img.load()
        def cell(i):
            return kanto_roles({(x, y): p[i * 16 + x, y][:3] for y in range(32) for x in range(16) if p[i * 16 + x, y][3] > 128}, roles, neck)
        f15 = frames15([cell(0), cell(1), cell(2)], [[cell(3), cell(4)], [cell(5), cell(6)], [cell(7), cell(8)]])
        character(pid, name, 'frlg', f15, (8, 0), neck=neck - neck_row(f15[0]))

# ---------- Toadsworth: Mario & Luigi: Partners in Time's ----------
# Superstar Saga has no Toadsworth; Partners in Time has, walking its fields (tools/lib/pit.py decodes them from the
# cartridge, ARME). Committed, already drawn (so no cartridge is needed):
#   tools/data/pit-people.png   his fifteen frames, 32x32 each: facing you, away and to the left, each standing and
#                               four of his walk (the game's a, b, c, b, a, d, e, d: its steps c and e)
# `--pit <Partners in Time (USA).nds>` takes them from the cartridge again (and builds as well). His colours: his cap's
# spots its "hair" (as a Toad's), his vest the clothes, his bow tie the trim; cut at the row under his moustache.
PIT_DATA = os.path.join(ROOT, 'tools/data/pit-people.png')
PIT_PARTS = [('toadsworth', 'Toadsworth', 21, {'hair': ['733900'], 'outfit': ['6210ac', 'ac29cd'], 'trim': ['39418b', '5a62cd'],
                                              'skin': ['e6b452', 'cd8339', 'dea418']})]
def pit_people():
    if '--pit' in sys.argv:
        sys.path.insert(0, os.path.join(ROOT, 'tools/lib')); import pit
        frames = pit.toadsworth(open(sys.argv[sys.argv.index('--pit') + 1], 'rb').read())
        sheet_ = Image.new('RGBA', (32 * len(frames), 32), (0, 0, 0, 0))
        for i, f in enumerate(frames): sheet_.alpha_composite(f, (i * 32, 0))
        sheet_.save(PIT_DATA, optimize=True)
    img = Image.open(PIT_DATA).convert('RGBA'); p = img.load()
    for pid, name, neck, roles in PIT_PARTS:
        def cell(i):
            return kanto_roles({(x, y): p[i * 32 + x, y][:3] for y in range(32) for x in range(32) if p[i * 32 + x, y][3] > 128}, roles, neck)
        f15 = frames15([cell(0), cell(5), cell(10)], [[cell(d * 5 + k) for k in (1, 2, 3, 4)] for d in range(3)])
        character(pid, name, 'pit', f15, (0, 0), neck=neck - neck_row(f15[0]))

# ---------- The Mushroom Kingdom: Mario & Luigi: Superstar Saga's people ----------
# How Superstar Saga keeps its sprites (the USA cartridge, A88E; after Yoshi Magic's sprite viewer and the game's own
# OAM builders, 0x0801EEBC.., in the jellees/mlss decompilation's disassembly):
#   0x39EE60  for each of 11 groups, a table of sprites: a u32 each, palette (bits 0-8), sheet (9-17), animation
#             (18-26), and whether the sheet is stored as it is (bit 31) or packed
#   0x39EEE4, 0x39EEB8, 0x39EE8C  each group's palettes (32 colours), sheets (offsets from the table) and animations
#   a packed sheet: 1 + (b0 >> 6) header bytes, then the game's own LZ (0x08000534): a byte with its top bit clear
#             copies 2 + (b >> 2) bytes from 1024 - (b2 | (b & 3) << 8) back (7F FF ends it); with it set, (b & 0x1F)
#             + 1 literal bytes, or zero-and-byte pairs, a byte repeated, or zeros
#   an animation: u16 back to its frames' table, u16 back to each frame's tiles, u8 pieces at most (+6), u8 how many
#             sequences (+7), then each sequence's offset: a frame count and (frame, duration) pairs
#   a frame: (affine entries, when bit 7 of its first byte), a piece count, its type (0-5: pieces of 6, 5, 4, 4, 3, 3
#             bytes, x and y and shape, size, flips, tile, palette as each OAM builder reads them), the pieces, then
#             the runs of the sheet it loads into VRAM (offset, count)
SS_DATA = os.path.join(ROOT, 'tools/data/superstar-saga-people')
class SuperstarSaga:
    MAIN, ANIM, SPR, PAL, DIMS = 0x39EE60, 0x39EE8C, 0x39EEB8, 0x39EEE4, 0x39EE04
    STRIDE = {0: 6, 1: 5, 2: 4, 3: 4, 4: 3, 5: 3}
    def __init__(self, path):
        self.rom = open(path, 'rb').read()
        if self.rom[0xAC:0xB0] != b'A88E': sys.exit('That isn\'t Mario & Luigi: Superstar Saga (USA).')
        self.frames, self.palettes = {}, {}
    def u8(self, a): return self.rom[a]
    def s8(self, a): return struct.unpack_from('b', self.rom, a)[0]
    def u16(self, a): return struct.unpack_from('<H', self.rom, a)[0]
    def u32(self, a): return struct.unpack_from('<I', self.rom, a)[0]
    def unpack(self, o):
        R = self.rom; o += 1 + (R[o] >> 6); out = bytearray()
        while True:
            c = R[o]; o += 1
            if c & 0x80:
                n, k = (c & 0x1f) + 1, c & 0x60
                if k == 0x00: out += R[o:o + n]; o += n
                elif k == 0x20:
                    for _ in range(n): out += bytes([0, R[o]]); o += 1
                elif k == 0x40: out += bytes([R[o]]) * (n + 1); o += 1
                else:
                    if c == 0xff: n = R[o] + 32; o += 1
                    out += bytes(n)
            else:
                b = R[o]; o += 1
                if c == 0x7f and b == 0xff: return bytes(out)
                off = (b | (c & 3) << 8) - 1024
                for _ in range(2 + (c >> 2)): out.append(out[len(out) + off])
    def sprite(self, g, i):
        P = lambda v: v - 0x08000000
        m = self.u32(P(self.u32(self.MAIN + g * 4 - 4)) + i * 4)
        A = P(self.u32(P(self.u32(self.ANIM + g * 4 - 4)) + (m >> 18 & 0x1ff) * 4))
        pp = P(self.u32(P(self.u32(self.PAL + g * 4 - 4)) + (m & 0x1ff) * 4))
        pal = [((c & 31) * 255 // 31, (c >> 5 & 31) * 255 // 31, (c >> 10 & 31) * 255 // 31) for c in (self.u16(pp + 2 * k) for k in range(32))]
        base = self.u32(self.SPR + g * 4 - 4); d = P(base + self.u32(P(base) + (m >> 9 & 0x1ff) * 4))
        tiles = self.rom[d:d + (self.u16(A + 4) & 0x1ff) * 32] if m >> 31 else self.unpack(d)
        return A, pal, tiles
    def palette(self, g, i):
        self.palettes['%d:%d' % (g, i)] = pal = self.sprite(g, i)[1]
        return pal
    def frame(self, g, i, ci):
        """Frame ci of sprite (g, i) as {(x, y): colour index 1-31}, from its origin (where it stands)."""
        A, pal, tiles = self.sprite(g, i)
        u8, s8, u16, R = self.u8, self.s8, self.u16, self.rom
        clp = A - u16(A); tofs = A - u16(A + 2); maxl = u8(A + 6) & 0x7f
        cp = clp + u16(clp + 2 * ci + 1); E = cp + ((u8(cp) & 0x7f) * 6 + 1 if u8(cp) & 0x80 else 0)
        n, t = u8(E) & 0x7f, u8(E + 1); st = self.STRIDE[t]; e0 = E + 2
        pieces = []
        for k in range(n):
            b = R[e0 + k * st:e0 + (k + 1) * st]
            if t == 0:
                y = b[0] - 256 if b[0] >= 128 else b[0]; x = b[2] | (b[3] & 1) << 8; x = x - 512 if x >= 256 else x
                si, tile, hf, vf, ps = (b[1] >> 6) * 4 + (b[3] >> 6), b[4] | (b[5] & 3) << 8, b[3] >> 4 & 1, b[3] >> 5 & 1, b[5] >> 4
            elif t == 1:
                x, y = s8(e0 + k * st), s8(e0 + k * st + 1)
                si, tile, hf, vf, ps = b[4] >> 4, b[3] | (b[4] & 1) << 8, b[2] >> 2 & 1, b[2] >> 3 & 1, b[2] >> 4
            elif t in (2, 3):
                x, y = s8(e0 + k * st), s8(e0 + k * st + 1)
                si, tile, hf, vf, ps = b[3] >> 4, b[2] | ((b[3] & 1) << 8 if t == 3 else 0), b[3] >> 2 & 1, b[3] >> 3 & 1, (b[3] & 3) if t == 2 else 0
            else:
                x, y = b[0] & 0x3f, b[1] & 0x3f
                x, y = (x - 64 if x & 0x20 else x), (y - 64 if y & 0x20 else y)
                si, tile, hf, vf, ps = (b[0] >> 6) * 4 + (b[1] >> 6), (b[2] & 0x7f if t == 4 else b[2]), (b[2] >> 7 if t == 4 else 0), 0, 0
            pieces.append([x, y, u8(self.DIMS + 2 * si), u8(self.DIMS + 2 * si + 1), tile, hf, vf, ps])
        at = e0 + n * st
        secs = [(u16(at + 1 + 3 * j), u8(at + 3 + 3 * j)) for j in range(u8(at))] if u16(A + 2) else []
        if u16(A + 2):
            for k, pc in enumerate(pieces): pc[4] = u8(tofs + 1 + ci * (maxl + 1) + k)
        def sheet_tile(v):
            for off, cnt in secs:
                if v < cnt: return off + v
                v -= cnt
            return None if secs else v
        out = {}
        for x, y, w, h, tile, hf, vf, ps in reversed(pieces):   # (the first piece is on top)
            t0 = sheet_tile(tile)
            if t0 is None: continue
            pb = t0 << 5
            for ty in range(h // 8):
                for tx in range(w // 8):
                    for yy in range(8):
                        for xx in range(8):
                            q = pb + yy * 4 + xx // 2
                            v = tiles[q] >> (4 * (xx & 1)) & 15 if q < len(tiles) else 0
                            if v: out[(x + (w - 8 - tx * 8 if hf else tx * 8) + (7 - xx if hf else xx), y + (h - 8 - ty * 8 if vf else ty * 8) + (7 - yy if vf else yy))] = v + 16 * (ps & 1)
                    pb += 32
        self.frames['%d:%d:%d' % (g, i, ci)] = out
        return out
    def save(self):
        keys = sorted(self.frames); cols = 16
        img = Image.new('P', (64 * cols, 64 * ((len(keys) + cols - 1) // cols)), 0)
        img.putpalette([v for i in range(256) for v in ((i * 8) % 256,) * 3])
        px = img.load()
        for n, k in enumerate(keys):
            for (x, y), v in self.frames[k].items():
                if -32 <= x < 32 and -56 <= y < 8: px[(n % cols) * 64 + x + 32, (n // cols) * 64 + y + 56] = v
        img.save(SS_DATA + '.png', optimize=True)
        json.dump({'frames': {k: n for n, k in enumerate(keys)}, 'palettes': {k: ['%02x%02x%02x' % c for c in v] for k, v in self.palettes.items()}},
                  open(SS_DATA + '.json', 'w'), separators=(',', ':'))
class SuperstarSagaCommitted:
    def __init__(self):
        self.j = json.load(open(SS_DATA + '.json')); self.px = Image.open(SS_DATA + '.png').load()
    def palette(self, g, i): return [tuple(int(h[k:k + 2], 16) for k in (0, 2, 4)) for h in self.j['palettes']['%d:%d' % (g, i)]]
    def frame(self, g, i, ci):
        n = self.j['frames']['%d:%d:%d' % (g, i, ci)]; X, Y = (n % 16) * 64, (n // 16) * 64
        return {(x - 32, y - 56): self.px[X + x, Y + y] for y in range(64) for x in range(64) if self.px[X + x, Y + y]}
SS = SuperstarSaga(sys.argv[sys.argv.index('--superstar-saga') + 1]) if '--superstar-saga' in sys.argv else SuperstarSagaCommitted()

# Each: its sprite (group, number), its walks' first frames (each a stand, a step, a stand, the other step: the
# stand and its two steps are frames +0, +2, +4) facing down, up and to the side (the side faces right: `right`), its
# colour indices for hair, clothes, trim and skin, and how much it's shrunk (Superstar Saga's people are a third again
# FireRed's height; Bowser more).
SS_PARTS = [
    ('mario', 'Mario', (1, 1), (20, 0, 10), True, {'outfit': {8, 9}, 'trim': {6, 7}, 'skin': {3, 4, 5}}, 0.75),
    ('luigi', 'Luigi', (1, 2), (20, 0, 10), True, {'outfit': {8, 9}, 'trim': {6, 7}, 'skin': {3, 4, 5}}, 0.75),
    ('peach', 'Peach', (3, 88), (0, 5, 10), None, {'hair': {12, 13, 14}, 'outfit': {5, 6, 7}, 'trim': {8, 9, 10}, 'skin': {2}}, 0.75),
    ('toad', 'Toad', (3, 102), (20, 0, 10), True, {'hair': {8, 9, 10}, 'outfit': {6, 7}, 'skin': {2, 3}}, 0.75),
    ('star_toad', 'Toad Brigade', (3, 121), (0, 5, 10), None, {'hair': {3, 4}, 'outfit': {6, 7}, 'skin': {8, 9}}, 0.75),
    ('bowser', 'Bowser', (3, 23), (10, 0, 5), None, {'hair': {10}, 'outfit': {8, 9}, 'trim': {2, 3}, 'skin': {4, 5, 6}}, 0.6),
]
def mushroom_kingdom():
    for pid, name, (g, i), walks, right, roles, scale in SS_PARTS:
        pal = SS.palette(g, i)
        d, u, sd = walks
        frames = [(d, 0), (u, 0), (sd, 1), (d + 2, 0), (d + 4, 0), (u + 2, 0), (u + 4, 0), (sd + 2, 1), (sd + 4, 1)]
        f9 = []
        for ci, side in frames:
            px = SS.frame(g, i, ci)
            # (FireRed's side frames face left: a side facing right is turned round.)
            if side and right: px = {(-1 - x, y): v for (x, y), v in px.items()}
            if scale != 1:
                # (Shrunk: each pixel the colour nearest its middle, from where it falls in the frame.)
                out = {}
                ys = [y for x, y in px]; xs = [x for x, y in px]
                for Y in range(int(min(ys) * scale) - 1, 1):
                    for X in range(int(min(xs) * scale) - 1, int(max(xs) * scale) + 2):
                        v = px.get((int((X + 0.5) / scale) if X >= 0 else -int((-X - 0.5) / scale) - 1, int((Y - 0.5) / scale)))
                        if v: out[(X, Y - 1)] = v
                px = out
            f9.append({k: (next((r for r, s_ in roles.items() if v % 16 in s_), None), pal[v]) for k, v in px.items()})
        # (Superstar Saga's walks are a step, standing, the other step: its betweens are its standing frames. Its heads
        # are all face: a cap or a crown, not hair.)
        character(pid, name, 'ss', frames15(f9[:3], [f9[3:5], f9[5:7], f9[7:9]]), (16, 32), hair=False)

# ---------- More of the Mushroom Kingdom: Paper Mario: The Thousand-Year Door's people ----------
# The Piantas, the Goombas and Koops, from the disc's character models (tools/lib/ttyd.py), drawn flat at FireRed's
# size: standing (their S_1 animation's first frame) and two steps (their walk, W_1, a quarter and three quarters
# through), facing you (the model's front: Paper Mario's people face a little to the left, so it's their side too)
# and away (turned round: the model's back). Committed, already drawn (so no disc's needed):
#   tools/data/ttyd-people.png    each frame a 32x32 cell of colour indices (0 is clear), its feet on the bottom row
#   tools/data/ttyd-people.json   each part's nine cells, and its colours: each [colour, role or null]
# `--ttyd <the disc's files/a folder>` (nodtool extract) draws them from the models again (and builds as well).
TTYD_DATA = os.path.join(ROOT, 'tools/data/ttyd-people')
import colorsys
def hsv(c):
    h, s, v = colorsys.rgb_to_hsv(*(x / 255 for x in c)); return h * 360, s, v
def yellow(c): h, s, v = hsv(c); return 30 <= h <= 66 and s > .45 and v > .3
def brown(c): h, s, v = hsv(c); return 15 <= h <= 50 and s > .3 and v > .25
def skin_peach(c): h, s, v = hsv(c); return h < 28 and .2 < s < .8 and v > .3
def blonde(c): h, s, v = hsv(c); return 28 <= h <= 60 and s > .6
def khaki(c): h, s, v = hsv(c); return 50 <= h <= 170 and s < .45 and v > .3
def green(c): h, s, v = hsv(c); return 80 <= h <= 170 and s > .45
def blue(c): h, s, v = hsv(c); return 185 <= h <= 245 and s > .15 and v > .25
def any_(c): return True
PIANTA = [(('kao', 'hana', 'm_te', 'h_te', 'm_ashi', 'h_ashi'), 'skin', yellow), (('suit', 'm_ude', 'h_ude'), 'outfit', any_),
          (('skirt',), 'trim', any_), (('happa', 'kuki'), 'hair', any_)]
# Each: the model, its animations' prefix, pixels a unit, and its roles: (textures (their names' beginnings), role,
# which of their colours).
TTYD_PARTS = [
    ('pianta', 'Pianta', 'c_m_buka', '', 0.9, PIANTA),
    ('don_pianta', 'Don Pianta', 'c_m_boss', '', 0.85, [(('kao', 'hana'), 'skin', any_)] + PIANTA),
    ('frankie', 'Frankie', 'c_m_waka', '', 0.9, [(('kao', 'hana', 'm_te', 'h_te', 'm_ashi', 'h_ashi'), 'skin', blue)] + PIANTA[1:]),
    ('francesca', 'Francesca', 'c_m_ojo', '', 0.85, [(('kao', 'hana', 'm_te', 'h_te', 'm_ashi', 'h_ashi', 'm_ude', 'h_ude'), 'skin', yellow),
                                                    (('karada',), 'outfit', any_), (('skirt',), 'trim', any_), (('happa', 'kuki'), 'hair', any_)]),
    ('goomba', 'Goomba', 'c_kuribo', 'KUR_', 1.3, [(('hon',), 'skin', brown), (('hidariashi', 'migiashi'), 'outfit', any_)]),
    ('goombella', 'Goombella', 'c_pkr', 'PKR_', 1.3, [(('parts',), 'hair', blonde), (('parts',), 'skin', skin_peach), (('parts',), 'trim', khaki),
                                                      (('1kutu', '2kutu'), 'outfit', any_)]),
    ('koops', 'Koops', 'c_pnk', 'PNK_', 1.2, [(('koura', 'parts'), 'outfit', green), (('hana', 'mte', 'hte', 'parts'), 'skin', yellow),
                                               (('parts', 'mte', 'hte'), 'trim', blue)]),
]
UP = 6   # (drawn six times over, then each pixel made of its 6x6)
def ttyd_frame(m, rules, scale, anim, frame, yaw):
    T, V = m.pose(m.anim(anim), frame)
    img, texof = m.draw(m.triangles(T, V, yaw), scale * UP, (32 * UP, 32 * UP), (16 * UP, 32 * UP))
    names = [t['name'] for t in m.textures]
    out = {}
    for Y in range(32):
        for X in range(32):
            block, tb = img[Y * UP:(Y + 1) * UP, X * UP:(X + 1) * UP].reshape(-1, 4), texof[Y * UP:(Y + 1) * UP, X * UP:(X + 1) * UP].reshape(-1)
            solid = block[:, 3] > 0.5
            if solid.sum() < 0.4 * UP * UP: continue
            cols, texs = [tuple(int(v * 255 + .5) for v in c[:3]) for c in block[solid]], tb[solid]
            dark = [c for c in cols if lum(c) < 40]
            # (An outline's kept where it's a third of what's drawn there, as Paper Mario's are thin at this size.)
            if len(dark) >= 0.3 * len(cols): pick = [(None, c) for c in dark]
            else:
                pick = []
                for c, t in zip(cols, texs):
                    if lum(c) < 40: continue
                    name = names[t] if t >= 0 else ''
                    pick.append((next((r for pre, r, ok in rules if name.startswith(pre) and ok(c)), None), c))
            roles = [r for r, c in pick]; role = max([None] + ROLES, key=roles.count)   # (a tie: the first)
            sel = [c for r, c in pick if r == role]
            out[(X - 16, Y - 32)] = (role, tuple(sum(c[k] for c in sel) // len(sel) for k in range(3)))
    return out
def ttyd_draw(folder):
    """Draws the parts from the models -> {pid: nine frames}, and commits them."""
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib')); import ttyd
    parts = {}
    for pid, name, model, pre, scale, rules in TTYD_PARTS:
        m = ttyd.Model(folder, model)
        stand, walk = pre + 'S_1', pre + 'W_1'; end = m.anim(walk)['end']
        f = lambda anim, t, yaw: ttyd_frame(m, rules, scale, anim, t, yaw)
        down, up = f(stand, 0, 0), f(stand, 0, 180)
        steps = [f(walk, end * q, yaw) for yaw in (0, 180) for q in (0.25, 0.75)]
        parts[pid] = [down, up, down, steps[0], steps[1], steps[2], steps[3], steps[0], steps[1]]
        print(pid, 'drawn')
    # (Each part's colours made fewer: up to 6 a role, 12 not to be recoloured, so its shades are few and clear.)
    for pid, frames in parts.items():
        remap = {}
        for role in [None] + ROLES:
            cs = [c for f in frames for r, c in f.values() if r == role]
            if not cs: continue
            q = Image.new('RGB', (len(cs), 1)); q.putdata(cs)
            q = q.quantize(colors=12 if role is None else 6, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
            pal = q.getpalette()
            for c, i in zip(cs, q.tobytes()): remap[(role, c)] = tuple(pal[3 * i:3 * i + 3])
        parts[pid] = [{k: (r, remap[(r, c)]) for k, (r, c) in f.items()} for f in frames]
    cells, palettes, img = {}, {}, Image.new('P', (32 * 9, 32 * len(parts)), 0)
    img.putpalette([v for i in range(256) for v in ((i * 8) % 256,) * 3]); px = img.load()
    for row, (pid, frames) in enumerate(parts.items()):
        pal = sorted({v for f in frames for v in f.values()}, key=lambda v: (ROLES.index(v[0]) if v[0] else -1, lum(v[1]), v[1]))
        index = {v: i + 1 for i, v in enumerate(pal)}
        for n, f in enumerate(frames):
            for (x, y), v in f.items(): px[n * 32 + x + 16, row * 32 + y + 32] = index[v]
        cells[pid] = row; palettes[pid] = [[hexc(c)[1:], r] for r, c in pal]
    img.save(TTYD_DATA + '.png', optimize=True)
    json.dump({'rows': cells, 'palettes': palettes}, open(TTYD_DATA + '.json', 'w'), separators=(',', ':'))
    return parts
def ttyd_committed():
    j = json.load(open(TTYD_DATA + '.json')); px = Image.open(TTYD_DATA + '.png').load(); parts = {}
    for pid, row in j['rows'].items():
        pal = [(r, tuple(int(h[k:k + 2], 16) for k in (0, 2, 4))) for h, r in j['palettes'][pid]]
        parts[pid] = [{(x - 16, y - 32): pal[px[n * 32 + x, row * 32 + y] - 1] for y in range(32) for x in range(32) if px[n * 32 + x, row * 32 + y]}
                      for n in range(9)]
    return parts
def paper_kingdom():
    frames = ttyd_draw(sys.argv[sys.argv.index('--ttyd') + 1]) if '--ttyd' in sys.argv else ttyd_committed()
    # (The Piantas and the Goombas have no necks: whole. Koops is cut.)
    for pid, name, *_ in TTYD_PARTS:
        f9 = frames[pid]
        character(pid, name, 'ttyd', frames15(f9[:3], [f9[3:5], f9[5:7], f9[7:9]]), (16, 32), split=pid in ('koops',), hair=False)

# ---------- Heads made here: the women of races with none ----------
# The Frieza Clan, the Kais, the Saiyans, the Namekians and the Majin have no woman among their sprites, and another race's head never sat right on their
# bodies; so each has one made from its own: a head of the race's (`base`, standing each way, its hair and face as
# cut) with a woman's touches drawn on, a pixel each (`touches`: for each way it faces, down, up and the side,
# {(x, y): colour (role, 'rrggbb'), or None to take it away}, in the base's frame). It goes on the race's bodies as
# the base's head does (its neck, `ref`, the base's), and it's the race's own: offered in the Face row.
#   The Frieza Clan woman: Frieza's head, a winged lash at each eye's outer corner, lips, a softer chin, and a pink
#   gem at her brow. The Kai woman: Kibito's face (the Kais' purple, the pointed ears), with lashes and lips, under
#   his long white hair (Kibito's hairstyle, hers too), on his robe.
LIP, GEM, LASH = (None, (0xd0, 0x40, 0x80)), (None, (0xff, 0x60, 0xb0)), (None, (0x10, 0x00, 0x18))
MADE_HEADS = [
    ('arcosian_woman', 'Frieza Clan Woman', 'frieza', {
        0: {(5, -11): LASH, (9, -11): LASH, (6, -12): LASH, (8, -12): LASH, (7, -10): LIP, (11, -10): None, (7, -15): GEM},
        1: {},
        2: {(3, -13): LASH, (3, -10): LIP, (2, -10): None, (4, -15): GEM}}),
    ('kai_woman', 'Kai Woman', 'kibito', {
        0: {(5, -13): LASH, (10, -13): LASH, (7, -11): LIP},
        1: {},
        2: {(3, -14): LASH, (3, -11): LIP}}),
    # (The Saiyans, the Namekians and the Majin have no woman either; each had another race's head, Chi-Chi's or
    # Videl's. Now their own: Gohan's face, lashes and lips, under a hairstyle a Saiyan shares (Chi-Chi's bun); Dende's,
    # lashes at his eyes and lips; Kid Buu's, lashes and his grin painted.)
    ('saiyan_woman', 'Saiyan Woman', 'gohan', {
        0: {(5, -10): LASH, (11, -10): LASH, (8, -8): LIP},
        1: {},
        2: {(8, -10): LASH, (5, -8): LIP}}),
    ('namekian_woman', 'Namekian Woman', 'dende', {
        0: {(4, -13): LASH, (10, -13): LASH, (4, -14): LASH, (10, -14): LASH, (7, -11): LIP},
        1: {},
        2: {(5, -15): LASH, (6, -15): LASH, (3, -11): LIP}}),
    ('majin_girl', 'Majin Girl', 'kid_buu', {
        0: {(3, -12): LASH, (11, -12): LASH, (3, -13): LASH, (11, -13): LASH, (7, -10): LIP},
        1: {},
        2: {(8, -13): LASH, (8, -12): LASH, (4, -10): LIP}}),
]
# (Her hair is Kibito's, as it is: no hairstyle of her own to choose twice; and the Saiyan woman's Gohan's spikes are
# Gohan's, so she has none of her own: hers is one that fits her face, the bun.)
OWN_HAIR_OF = {'kai_woman': 'kibito', 'saiyan_woman': 'gohan'}
def made_heads():
    for pid, name, base, touches in MADE_HEADS:
        shift, fam = SHIFTS[base], PARTS[base + '_face']['family']
        heads = []
        for d, (h, f, np_) in enumerate(HEADS[base]):
            f = dict(f); h = dict(h)
            for k, v in touches[d].items():
                if v is None: f.pop(k, None); h.pop(k, None)
                else: f[k] = v; h.pop(k, None)
            heads.append((h, f, np_))
        HEADS[pid] = heads
        ref = PARTS[base + '_face']['ref']
        roles, own = sheet(pid + '_face', [heads[FRAME_DIR[i]][1] for i in range(N)], shift)
        PARTS[pid + '_face'] = {'name': name, 'kind': 'face', 'family': fam, 'roles': roles, 'own': own, 'ref': ref}
        if any(h for h, f, n in heads) and pid not in OWN_HAIR_OF:
            roles, own = sheet(pid + '_hair', [heads[FRAME_DIR[i]][0] for i in range(N)], shift)
            PARTS[pid + '_hair'] = {'name': name, 'kind': 'hair', 'family': fam, 'roles': roles, 'own': own, 'ref': ref}

# ---------- Side views drawn here ----------
# Paper Mario's people are paper: the models have a front and a back and no side (it's their front, a little to the
# left), and Superstar Saga's Toad, shrunk, is his back half turned (and facing you his eyes were lost: FRONT_EYES
# puts them back). So their sides are drawn here, a pixel at
# a time, each facing left: `SIDE_ART[pid]` = (the picture, a row a string, its feet on the bottom row; how many rows
# at the bottom are its legs; its own colours). In the picture: 1-4 its skin, darkest first, A-D its clothes, P-S its
# trim, E-H its hair (each the part's own four shades, as the sheet has them), k its outline, w white, e an eye's
# black, g grey; any other letter its own colour (the third: {letter: (role or None, 'rrggbb')}). The picture's
# middle goes where its middle is facing you, its feet where its feet are. Walking: its legs (the bottom rows) apart,
# the front one forward and the back one back, then the other way; between the steps it stands, as Paper Mario's
# people walk in two steps.
def own_shades(frames, role):
    """A role's four shades in a character's frames (the colours most drawn at each of its four levels)."""
    cols = [c for f in frames for r, c in f.values() if r == role]
    if not cols: return None
    lv = levels(cols); count = {}
    for c in cols: count[c] = count.get(c, 0) + 1
    by = [max([c for c in count if lv[c] == l] or [None], key=lambda c: count.get(c, 0)) for l in range(4)]
    for l in range(4):
        if by[l] is None: by[l] = next(by[k] for k in list(range(l, 4)) + list(range(l, -1, -1)) if by[k] is not None)
    return by
def drawn_side(pid, frames):
    art, legs, extra = SIDE_ART[pid]
    rows = [r for r in art.strip('\n').split('\n')]
    pal = {}
    for role, codes in (('skin', '1234'), ('outfit', 'ABCD'), ('trim', 'PQRS'), ('hair', 'EFGH')):
        sh = own_shades(frames, role)
        if sh: pal.update({c: (role, sh[i]) for i, c in enumerate(codes)})
    plain = sorted({c for f in frames for r, c in f.values() if r is None}, key=lum)
    pal.update({'k': (None, plain[0]), 'e': (None, plain[0]), 'w': (None, plain[-1]),
                'g': (None, min(plain, key=lambda c: abs(lum(c) - 150)))})
    pal.update({c: (r, tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))) for c, (r, h) in extra.items()})
    down = frames[0]; xs = [x for x, y in down]; mid = (min(xs) + max(xs) + 1) // 2; bot = max(y for x, y in down)
    w = max(len(r.rstrip('.')) for r in rows); left = mid - w // 2
    stand = {}
    for i, r in enumerate(rows):
        for j, c in enumerate(r):
            if c != '.': stand[(left + j, bot - len(rows) + 1 + i)] = pal[c]
    # (its steps: the legs' pixels left of its middle one way, the rest the other)
    lx = [x for (x, y) in stand if y > bot - legs]; lmid = (min(lx) + max(lx) + 1) / 2
    steps = []
    for d in (1, -1):
        g = {k: v for k, v in stand.items() if k[1] <= bot - legs}
        for (x, y), v in sorted(stand.items(), key=lambda kv: (kv[0][0] < lmid) == (d > 0)):
            if y > bot - legs: g[(x + (-d if x < lmid else d), y)] = v
        steps.append(g)
    out = list(frames)
    out[2], out[7], out[8], out[13], out[14] = stand, steps[0], steps[1], stand, stand
    # (and eyes where shrinking took them: Toad's, facing you)
    if pid in FRONT_EYES:
        out[0] = dict(out[0]); out[0].update({k: (None, plain[0]) for k in FRONT_EYES[pid]})
    return out
FRONT_EYES = {'toad': [(-2, -10), (-2, -9), (1, -10), (1, -9)]}
SIDE_ART = {
    'goomba': ("""
....kk.........
...kkkkkk......
..kkk3333333k..
.k3ww33333333k.
.kwwwe3333332k.
k3wwee33333332k
k33ww333333322k
k3333333333222k
k3333333332222k
k3333333322222k
.k33333332221k.
.k44w44442211k.
..kk44444kkkk..
..kCCk...kCCk..
.kCDDCk.kCDDk..
kBCCCBk.kBCCCk.
.kkkkk...kkkk..
""", 4, {}),
    'goombella': ("""
......kkkkk........
....kkSSSSRkk.kkk..
...kSSSSRRRRQkGHHk.
..kSSRRRRRQQQkGHGk.
kkRRRRRQQQQQPkFGGk.
kQQkkkkkkkkkkkFFk..
.kk444444444333kFk.
.k4kkk44444333332k.
k44kwek4444333322k.
k44keek4443333322k.
k444kk444443333221k
k4k444444433332221k
.kk44444443332221k.
..k3k4444333322kk..
...kk3333332kkk....
...kABk....kBAk....
..kBCCBk..kBCCk....
.kACCCBk.kACCCBk...
..kkkkk...kkkkk....
""", 4, {}),
    'pianta': ("""
............kk.kk....
...........kFGkGHk...
..........kEFGGHk....
............kFk......
..........kkkEkkk....
.........k4444444k...
........k4ww444443k..
.......k44wek44443k..
.....kk4444444443k...
....k44444k444433k...
....k3333kk44433kk...
.....kkkkCDDDCCBBAk..
....kkBCDDDDDDCCBBAk.
...kBCDDDDDDDDDCCBAAk
..kBCDDDDDDDDDDCCBBAk
..kBCDDDDDDDDDDCCBBAk
..kBCDk444kDDDDCCBBAk
..kBCk44443kDDDCCBBAk
...kBCk333kDDDCCBBAk.
....kPQRRSSRRRQQPPk..
....kPQkRSkRRkQPkPk..
.....kk.kk.kk.kk.k...
......k34k...k34k....
.....k3344k.k3344k...
....kkkkkkk.kkkkkkk..
""", 3, {'w': (None, 'f4f4f0')}),
    'koops': ("""
.......kkkk.........
......kwwwwk........
......kwwek.........
.....kkwwekk........
...kk44kk444k.......
.kk444444444k.......
k4444444444443k.....
k34444k44444443k....
.k333kk.k444433k....
..kkk...kSRR33k.....
.......kSRRRQPkk....
......kRRSRRQPkwk...
.....kRSSRRQPkwwwk..
....k4kSRRQPkwCDDDk.
....k44kRRQPkwCDDDk.
.....kkRRRQPkwBCDDk.
......kRQQPPkwBCCDk.
......kPPPPPkkwBCk..
.......k33kk3kwwk...
.......k3k..k3k.....
......kggk.kggk.....
.....kwwgk.kwwgk....
......kkk...kkk.....
""", 5, {}),
    'toad': ("""
...kkkkk....
..kwwwwwkk..
.kwwGGwwwwk.
kwwGHHGwwwwk
kwwGHGwwwgwk
kgwwwwwwGGgk
kggwwwwgHGgk
.kkk44kkkkk.
..k4e44k....
.k44444k....
..k3444k....
...kBCk.....
..kBCC4k....
..kBCCk.....
...kwwgk....
...k4kk4k...
..kkk.kkk...
""", 2, {'g': (None, 'd5d5d5')}),
}
SIDE_ART['don_pianta'] = SIDE_ART['frankie'] = SIDE_ART['francesca'] = SIDE_ART['pianta']

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    hyrule()
    if isinstance(SRC, Cartridge): SRC.save()
    dragon_world()
    kanto()
    mushroom_kingdom()
    pit_people()
    if isinstance(SS, SuperstarSaga): SS.save()
    paper_kingdom()
    made_heads()
    hair_fitting()
    # (Each face's and hair's top row, frame by frame: a head too tall for where a body's neck is, a Frieza's on King
    # Cold's shoulders, goes down into them until it's in the frame: ui/overworld.js composeLook.)
    for pid, part in PARTS.items():
        if part['kind'] not in ('face', 'hair'): continue
        im = Image.open(os.path.join(OUT, pid + '.png')); a = im.getchannel('A').load()
        part['top'] = [min((y % 32 for y in range(im.height) for x in range(f * 32, f * 32 + 32) if a[x, y]), default=32) for f in range(N)]
    # (Parts no longer made, from before: gone.)
    for fn in os.listdir(OUT):
        if fn.endswith('.png') and fn[:-4] not in PARTS: os.remove(os.path.join(OUT, fn))
    f = os.path.join(ROOT, 'data/type-chart.js')
    src = open(f).read()
    START, END = "// The character creator's parts (tools/build-player-looks.py):", "// (End of the character creator's parts.)"
    block = START + '\nwindow.PLAYER_LOOK_PARTS = ' + json.dumps(PARTS, separators=(',', ':')) + ';\n' + END
    if START in src: src = src[:src.index(START)] + block + src[src.index(END) + len(END):]
    else: src = src.rstrip('\n') + '\n\n' + block + '\n'
    open(f, 'w').write(src)
    print('%d parts' % len(PARTS))
