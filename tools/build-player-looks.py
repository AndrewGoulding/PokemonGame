#!/usr/bin/env python3
# The character creator's looks: the parts you're put together from (a head and a body, or a whole character), each
# with its hair, clothes, trim and skin apart so they can be coloured as you choose.
#
#   python3 tools/build-player-looks.py
#
# (No cartridge or disc: it builds from what's committed. See DATA, SS_DATA and TTYD_DATA below for taking them again.)
# Hyrule's people are The Minish Cap's (only their sprites): its townsfolk and children are drawn as a head on a body,
# so any head goes on any body; and Link, whole. The Dragon World's are the Dragon Ball realm's people sheets already
# in the repo (assets/dragonball/people/, from Legacy of Goku II and Buu's Fury), whole characters.
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

# ---------- A part: nine frames of {(x, y): (role or None, colour)} into a sheet ----------
def levels(cols):
    """A role's colours, darkest first, onto its four shades (fewer colours: the lighter shades)."""
    cols = sorted(set(cols), key=lum)
    n = len(cols)
    if n <= 4: return {c: 4 - n + i for i, c in enumerate(cols)}
    return {c: min(3, i * 4 // n) for i, c in enumerate(cols)}
def sheet(name, frames, shift):
    """frames: nine dicts {(x, y): (role, (r, g, b))}; shift: where (0, 0) goes in a 32x32 cell."""
    img = Image.new('RGBA', (32 * 9, 32 * 17), (0, 0, 0, 0)); px = img.load()
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

# ---------- Heads and bodies: any head on any body of its race ----------
# A whole character (Goku, Mario, Link, ...) is cut in two at its neck, frame by frame, into a head (hair and face)
# and a body (its clothes), so you can be one character's head on another's body: the characters are the creator's
# presets, and you're your own. The neck: the narrowest row from 30% to 60% of the way down the figure.
# Each head keeps where its frames are, and says where its neck is (`anchor`: the middle of its bottom row, and the
# row under it), each body where a head goes (`neck`); on a body, a head is drawn moved by the difference, frame by
# frame (ui/overworld.js composeLook), so a character's own head on its own body is drawn as it was.
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
def whole(pid, name, f9, shift, split=True):
    # (A character with no neck, the Goombas and Piantas, stays whole.)
    if not split:
        roles, own = sheet(pid, f9, shift)
        PARTS[pid] = {'name': name, 'kind': 'whole', 'roles': roles, 'own': own}
        return
    heads, bodies = [], []
    for f in f9:
        n = neck_row(f) if f else 0
        heads.append({k: v for k, v in f.items() if k[1] < n}); bodies.append({k: v for k, v in f.items() if k[1] >= n})
    at = [anchor_of(h, shift) for h in heads]
    roles, own = sheet(pid + '_head', heads, shift)
    PARTS[pid + '_head'] = {'name': name, 'kind': 'head', 'roles': roles, 'own': own, 'anchor': at}
    roles, own = sheet(pid, bodies, shift)
    PARTS[pid] = {'name': name, 'kind': 'body', 'roles': roles, 'own': own, 'neck': at}

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
    if kind == 'whole': return whole(pid, name, f9, shift)
    roles, own = sheet(pid, f9, shift)
    PARTS[pid] = {'name': name, 'kind': kind, 'roles': roles, 'own': own}
    # (A head's neck, for other bodies; The Minish Cap's own bodies all take its heads where they're drawn: the
    # bodies' necks are the heads', the middle of them, set once all are made: minish_necks.)
    if kind == 'head': PARTS[pid]['anchor'] = [anchor_of(f, shift) for f in f9]

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
        hs = [p for k, p in PARTS.items() if k.startswith(heads) or (heads == 'head_' and k.startswith('zora_'))]
        mid = [[sorted(h['anchor'][f][i] for h in hs)[len(hs) // 2] for i in (0, 1)] for f in range(9)]
        for k, p in PARTS.items():
            if k.startswith(prefix): p['neck'] = mid

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
    ('android_20', 'Android 20', 'LG2_090', 1, {'hair': ['ffffff', 'dedede', 'adadad'], 'outfit': ['d61029', 'ad0810', '7b0000'],
                                                'trim': ['ffd642', 'ff9418', 'd66300']}),
    ('cell', 'Cell', 'LG2_027', 2, {'outfit': ['e7d6ff', 'ad63ad', '7b217b', '5a007b'], 'skin': ['ced67b', '7bbd42', '7ba542', '6b6b00']}),
    # (Frieza's race: Frieza, his first form and as Mecha Frieza, and King Cold; their plates are the trim.)
    ('frieza', 'Frieza', 'LG2_045', 1, {'trim': ['de84ff', 'ad21ff', '7b21ad', '5a007b'], 'skin': ['ffffff', 'adbde7', '7ba5ce']}),
    ('frieza_first', 'Frieza (First Form)', 'LG1_23', 1, {'outfit': ['de7b94', 'bd5a73', '8c394a', '732939'], 'trim': ['de8cf7', '732994', '421063'],
                                                           'skin': ['ffffff', 'dec6de', 'c6c6c6']}),
    ('mecha_frieza', 'Mecha Frieza', 'LG2_046', 1, {'trim': ['7b63e7', '7b63ad', '7b21ad', '5a007b', '210084'], 'skin': ['ffffff', 'adbde7', '7ba5ce']}),
    ('king_cold', 'King Cold', 'LG2_071', 2, {'outfit': ['d61029', 'ad0810', '7b0000'], 'trim': ['7bffce', '00a5a5', '21637b'],
                                              'skin': ['efadff', 'de84ff', 'ce29ff', '9c00d6', '5a007b']}),
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
def dragon_world():
    index = json.load(open(os.path.join(DB, 'index.json')))
    for pid, name, src, scale, roles in DB_PARTS:
        e = index[src]; (w, h), (ax, ay) = e['cell'], e['anchor']
        img = Image.open(os.path.join(DB, src + '.png')).convert('RGBA')
        walk = 4 if len(e['frames']) >= 8 and e['frames'][4] >= 3 else 0
        cells = [(0, 0), (1, 0), (2, 0), (walk, 1), (walk, 3), (walk + 1, 1), (walk + 1, 3), (walk + 2, 1), (walk + 2, 3)]
        cells = [(r, c if r >= 4 else 0) for r, c in cells]
        f9 = []
        for r, c in cells:
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
            f9.append(db_roles(px, roles))
        # (Feet at the cell's bottom and the figure in its middle, by where it stands facing down.)
        xs = [x for x, y in f9[0]]; ys = [y for x, y in f9[0]]
        shift = (16 - (min(xs) + max(xs) + 1) // 2, 31 - max(ys))
        whole(pid, name, f9, shift)

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
        whole(pid, name, f9, (16, 32))

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
        whole(pid, name, frames[pid], (16, 32), split=pid in ('koops',))

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    hyrule()
    if isinstance(SRC, Cartridge): SRC.save()
    dragon_world()
    mushroom_kingdom()
    if isinstance(SS, SuperstarSaga): SS.save()
    paper_kingdom()
    f = os.path.join(ROOT, 'data/type-chart.js')
    src = open(f).read()
    START, END = "// The character creator's parts (tools/build-player-looks.py):", "// (End of the character creator's parts.)"
    block = START + '\nwindow.PLAYER_LOOK_PARTS = ' + json.dumps(PARTS, separators=(',', ':')) + ';\n' + END
    if START in src: src = src[:src.index(START)] + block + src[src.index(END) + len(END):]
    else: src = src.rstrip('\n') + '\n\n' + block + '\n'
    open(f, 'w').write(src)
    print('%d parts' % len(PARTS))
