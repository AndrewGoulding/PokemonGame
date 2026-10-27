#!/usr/bin/env python3
# The character creator's looks: the parts you're put together from (a head and a body, or a whole character), each
# with its hair, clothes, trim and skin apart so they can be coloured as you choose.
#
#   python3 tools/build-player-looks.py "<path to Legend of Zelda, The - The Minish Cap (USA).gba>"
#
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

if len(sys.argv) < 2: sys.exit('usage: python3 tools/build-player-looks.py <The Minish Cap (USA).gba>')
ROM = open(sys.argv[1], 'rb').read()
if ROM[0xAC:0xB0] != b'BZME': sys.exit('That isn\'t The Minish Cap (USA).')
u8 = lambda a: ROM[a]
s8 = lambda a: struct.unpack_from('b', ROM, a)[0]
u16 = lambda a: struct.unpack_from('<H', ROM, a)[0]
u32 = lambda a: struct.unpack_from('<I', ROM, a)[0]
SPRITES, OBJ, EFO, PALS, GFX = 0x29B4, 0x2F3D74, 0x9FB770, 0x133368, 0x5A2E80
SHAPES = {(0, 0): (8, 8), (0, 1): (16, 16), (0, 2): (32, 32), (0, 3): (64, 64), (1, 0): (16, 8), (1, 1): (32, 8), (1, 2): (32, 16),
          (1, 3): (64, 32), (2, 0): (8, 16), (2, 1): (8, 32), (2, 2): (16, 32), (2, 3): (32, 64)}

def palette(pid):
    w = u32(PALS + (pid - 0x16) * 4); off = w & 0xffffff
    return [((v & 31) * 255 // 31, ((v >> 5) & 31) * 255 // 31, ((v >> 10) & 31) * 255 // 31) for v in (u16(GFX + off + c * 2) for c in range(16))]

def frame(si, fi):
    """A sprite's frame as {(x, y): colour index}, x and y from its origin."""
    frames, tiles = u32(SPRITES + si * 16 + 4) - 0x08000000, u32(SPRITES + si * 16 + 8) - 0x08000000
    first = u16(frames + fi * 4 + 2)
    p = OBJ + u32(OBJ + u32(OBJ + si * 4) + fi * 4)
    out, pieces = {}, []
    for k in range(u8(p)):
        q = p + 1 + k * 5
        pieces.append((s8(q), s8(q + 1), u8(q + 2), u8(q + 3) + ((u8(q + 4) & 3) << 8)))
    for x0, y0, fl, t0 in reversed(pieces):   # (the first piece is drawn on top)
        w, h = SHAPES[(fl >> 6, (fl >> 4) & 3)]
        for ty in range(h // 8):
            for tx in range(w // 8):
                a = tiles + (first + t0 + ty * (w // 8) + tx) * 32
                for r in range(8):
                    for c in range(8):
                        b = ROM[a + r * 4 + c // 2]; v = (b >> 4) if c & 1 else (b & 15)
                        if not v: continue
                        X, Y = tx * 8 + c, ty * 8 + r
                        if fl & 4: X = w - 1 - X
                        if fl & 8: Y = h - 1 - Y
                        out[(x0 + X, y0 + Y)] = v
    return out

def attach(si, fi):
    p = EFO + u32(EFO) + u8(EFO + u16(EFO + 0x10 + si * 2) + fi) * 4
    return s8(p), s8(p + 1)

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
    roles, own = sheet(pid, f9, shift)
    PARTS[pid] = {'name': name, 'kind': kind, 'roles': roles, 'own': own}

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
    # Link, whole: standing (down 0, side 1, up 2) and a stride each way from his walks (7-16, 17-26, 27-36).
    tmc_part('link', 'Link', 'whole', 1, [0, 2, 1, 9, 14, 29, 34, 19, 24], palette(22),
             {'hair': {8, 9}, 'outfit': {3, 4, 5, 7}, 'skin': {10, 11, 12, 13}}, False, None, SHIFT)

# ---------- The Dragon World: the Dragon Ball realm's people ----------
# Each sheet: a row an animation, in fours (down, up, left, right); the first four stand, the next four walk.
# The colours that are each one's hair, clothes, trim and skin (the rest stay as they are).
SKIN = ['ffbdad', 'e79c84', 'ce8463', 'b56339']
TAN = ['f7c673', 'dead63', 'c69452', 'ad7b39']
BUU = ['ffa5ce', 'ff8cbd', 'ff73b5', 'de5294', 'bd397b', '9c185a']
WHITE = ['ffffff', 'dedede', 'c6c6c6', 'adadad', 'a5a5a5', '949494', '7b7b7b', '737373']
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
        roles, own = sheet(pid, f9, shift)
        PARTS[pid] = {'name': name, 'kind': 'whole', 'roles': roles, 'own': own}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    hyrule()
    dragon_world()
    f = os.path.join(ROOT, 'data/type-chart.js')
    src = open(f).read()
    START, END = "// The character creator's parts (tools/build-player-looks.py):", "// (End of the character creator's parts.)"
    block = START + '\nwindow.PLAYER_LOOK_PARTS = ' + json.dumps(PARTS, separators=(',', ':')) + ';\n' + END
    if START in src: src = src[:src.index(START)] + block + src[src.index(END) + len(END):]
    else: src = src.rstrip('\n') + '\n\n' + block + '\n'
    open(f, 'w').write(src)
    print('%d parts' % len(PARTS))
