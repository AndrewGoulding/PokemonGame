# The Yu-Gi-Oh! realm's maps, people and portraits, from Yu-Gi-Oh! The Sacred
# Cards (GBA, Konami, 2003; the USA cartridge, game code AY7E). Only its
# pictures: its screens, its people's sprites and its portraits. None of its
# card game.
#
#   python3 tools/build-sacred-cards.py <path to the .gba>
#
# What's in the ROM (the table of pointers at 0x0d511a0):
#   0-101     each person's sprite sheet: 4bpp tiles, 16 a row, 32x32 frames, 4 a row (down x3, left x3, up x3, right x3);
#   102-203   its palette (16 colours)
#   204-261   each of the 58 screens' tiles (LZ77, 8bpp; tile k at the k-th place of a 32-wide grid)
#   262-319   its ground layout (32x32 entries; the screen shows columns 1-30 of rows 0-19)
#   320-377   its overlay layout (the parts drawn over people)
#   378-435   its palette (colours 16-255)
#   436-493   its walking map: 120x80 cells of 2x2 pixels, two bytes each: the first 0 (open), 1 (solid), or a code:
#             an exit to screen code >> 2, or, in runs of 2, 4, 6..., a height (stairs and seats); the second
#             whether whoever stands there is in front of the overlay (0) or behind it
#   (the portraits, elsewhere: 0x0d4edbc, Huffman then the BIOS's 8-bit difference filter, 8bpp tiles, 16 a row;
#   0x0d4ee40 their palettes; 0x0d4eec4 their parts, one behind: OAM entries placing pieces of the sheet, the
#   eyes' and mouth's frames first)
#
# Writes:
#   assets/world/maps/SC_<nn>.png, -top.png, -border.png   each screen (240x160: 15x10 of this game's tiles)
#   assets/world/sprites/sc_<name>.png                     each person: 9 frames of 32x32, as FireRed's people
#   assets/yugioh/portraits/<name>.png                     each portrait, put together (eyes open, mouth shut)
#   assets/yugioh/sheets/sc_sheet_<nn>.png                 the sheets that aren't people (the gods, the Battle Ship...)
#   data/emerald-maps.js (between its markers)             the screens' maps, and window.SACRED_CARDS
import collections, json, os, struct, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MAPS = os.path.join(ROOT, 'assets/world/maps')
SPRITES = os.path.join(ROOT, 'assets/world/sprites')
YGO = os.path.join(ROOT, 'assets/yugioh')
TABLE = 0xd511a0
N_SCREENS = 58

rom = open(sys.argv[1], 'rb').read()
if rom[0xac:0xb0] != b'AY7E': sys.exit('Not Yu-Gi-Oh! The Sacred Cards (USA): its game code is ' + repr(rom[0xac:0xb0]))
def P(k): return struct.unpack_from('<I', rom, TABLE + 4 * k)[0] - 0x08000000
def ptr(a): return struct.unpack_from('<I', rom, a)[0] - 0x08000000
def rgb(c): return ((c & 31) << 3 | (c & 31) >> 2, (c >> 5 & 31) << 3 | (c >> 5 & 31) >> 2, (c >> 10 & 31) << 3 | (c >> 10 & 31) >> 2)

# ---------- The BIOS's decompressors ----------
def lz77(o):
    size = rom[o + 1] | rom[o + 2] << 8 | rom[o + 3] << 16
    out = bytearray(); i = o + 4
    while len(out) < size:
        flags = rom[i]; i += 1
        for b in range(8):
            if len(out) >= size: break
            if flags & (0x80 >> b):
                x = rom[i] << 8 | rom[i + 1]; i += 2
                n, disp = (x >> 12) + 3, (x & 0xfff) + 1
                for _ in range(n): out.append(out[-disp])
            else:
                out.append(rom[i]); i += 1
    return bytes(out[:size])
def huffman(o):
    size = rom[o + 1] | rom[o + 2] << 8 | rom[o + 3] << 16
    tree = o + 4; pos = tree + (rom[tree] + 1) * 2
    out = bytearray(); node = tree + 1
    while len(out) < size:
        word = struct.unpack_from('<I', rom, pos)[0]; pos += 4
        for b in range(31, -1, -1):
            bit = word >> b & 1; v = rom[node]
            nxt = (node & ~1) + (v & 0x3f) * 2 + 2 + bit
            if v & (0x80 >> bit):
                out.append(rom[nxt]); node = tree + 1
                if len(out) >= size: break
            else: node = nxt
    return bytes(out[:size])
def unfilter8(d):
    out = bytearray(len(d)); acc = 0
    for k, v in enumerate(d): acc = (acc + v) & 255; out[k] = acc
    return bytes(out)
def tiles8(data, count, wt, pal, transparent):
    im = Image.new('RGBA', (wt * 8, ((count + wt - 1) // wt) * 8), (0, 0, 0, 0)); px = im.load()
    for t in range(count):
        for y in range(8):
            for x in range(8):
                ci = data[t * 64 + y * 8 + x]
                if ci or not transparent: px[(t % wt) * 8 + x, (t // wt) * 8 + y] = pal[ci] + (255,)
    return im

# ---------- The screens ----------
def screen_pictures(s):
    tiles = lz77(P(204 + s))
    ground = struct.unpack_from('<1024H', rom, P(262 + s)); over = struct.unpack_from('<1024H', rom, P(320 + s))
    pal = [(0, 0, 0)] * 16 + [rgb(c) for c in struct.unpack_from('<240H', rom, P(378 + s))]
    sheet = tiles8(tiles, len(tiles) // 64, 32, pal, False)
    def layer(m, opaque):
        im = Image.new('RGBA', (240, 160), (0, 0, 0, 0))
        for ty in range(20):
            for tx in range(30):
                # (The screen shows the layout from its second column on: the game scrolls it 8 pixels.)
                e = m[ty * 32 + tx + 1]; t = e & 0x3ff
                if not opaque and t == 0: continue
                tile = sheet.crop(((t % 32) * 8, (t // 32) * 8, (t % 32) * 8 + 8, (t // 32) * 8 + 8))
                if e >> 10 & 1: tile = tile.transpose(Image.FLIP_LEFT_RIGHT)
                if e >> 11 & 1: tile = tile.transpose(Image.FLIP_TOP_BOTTOM)
                if not opaque:
                    # (Colour 0 is see-through on the overlay.)
                    a = Image.new('L', (8, 8)); ap = a.load()
                    for y in range(8):
                        for x in range(8):
                            sx, sy = (7 - x if e >> 10 & 1 else x), (7 - y if e >> 11 & 1 else y)
                            ap[x, y] = 255 if (t * 64 + sy * 8 + sx < len(tiles) and tiles[t * 64 + sy * 8 + sx]) else 0
                    tile.putalpha(a)
                im.paste(tile, (tx * 8, ty * 8))
        return im
    return layer(ground, True), layer(over, False)
def walk_map(s):
    d = rom[P(436 + s):P(436 + s) + 19200]
    return d[0::2], d[1::2]

# Heights: runs of three or more of 2, 4, 6... (stairs, seats). Exits: the other codes, to screen code >> 2.
def exit_codes(s, a):
    codes = sorted(set(v for v in a if v > 1))
    height = set()
    evens = [c for c in codes if c % 2 == 0]
    run = []
    for c in evens + [None]:
        if run and c == run[-1] + 2: run.append(c); continue
        if len(run) >= 3: height.update(run)
        run = [c] if c is not None else []
    return [c for c in codes if c not in height and (c >> 2) < N_SCREENS and (c >> 2) != s], height

W, H = 15, 10
screens = {}
for s in range(N_SCREENS):
    a, depth = walk_map(s)
    exits, heights = exit_codes(s, a)
    collision, over, exit_at = [], [], {}
    for ty in range(H):
        for tx in range(W):
            cells = [(tx * 8 + x, ty * 8 + y) for y in range(8) for x in range(8)]
            vals = [a[y * 120 + x] for x, y in cells]
            blocked = sum(1 for v in vals if v == 1)
            counts = collections.Counter(v for v in vals if v in exits)
            code, n = (counts.most_common(1)[0] if counts else (None, 0))
            # (An exit's strip at the screen's edge is a cell to half a tile deep.)
            if code is not None and n >= 6: exit_at[(tx, ty)] = code
            collision.append(1 if blocked > 32 and (tx, ty) not in exit_at else 0)
            feet = [depth[(ty * 8 + y) * 120 + tx * 8 + x] for y in range(4, 8) for x in range(8)]
            over.append(1 if sum(1 for v in feet if v == 0) * 2 >= len(feet) else 0)
    screens[s] = {'collision': collision, 'over': over, 'exit_at': exit_at, 'exits': exits}

# The screens' groups (joined both ways), each a place.
def links(s): return set(c >> 2 for c in screens[s]['exit_at'].values())
both = {s: set(d for d in links(s) if s in links(d)) for s in screens}
groups, seen = [], set()
for s in sorted(screens):
    if s in seen: continue
    st, g = [s], []
    while st:
        x = st.pop()
        if x in seen: continue
        seen.add(x); g.append(x); st += list(both[x])
    groups.append(sorted(g))
PLACES = [  # (the screen a group is known by, its name, outdoors)
    (0, 'Domino City', True), (6, 'Domino Park', True), (10, 'Domino Pier', True), (14, 'Domino Riverside', True),
    (18, 'Domino Museum', False), (19, 'Game Center', False), (20, 'Domino Aquarium', True), (22, 'Kaiba Corporation', False),
    (24, 'Card Shop', False), (30, 'Office Tower', False), (42, 'Battle Ship', False), (49, 'Battle Ship', False),
    (43, 'Alcatraz', False), (54, 'Hotel', False), (57, 'Battle City Finals Arena', False)]
place_of = {}
for g in groups:
    for key, title, outdoors in PLACES:
        if key in g:
            for s in g: place_of[s] = (title, outdoors, g)
for s in screens:
    if s not in place_of: place_of[s] = ('Domino City', True, [s])

# ---------- The warps ----------
# An exit at the screen's edge: a mat you walk off that way (as a door mat); one inside: a spot you step onto.
def edge_dir(tx, ty):
    if ty == H - 1: return 'down'
    if ty == 0: return 'up'
    if tx == 0: return 'left'
    if tx == W - 1: return 'right'
    return None
ARROW = {'right': 0x62, 'left': 0x63, 'up': 0x64, 'down': 0x65}
STEP = 0x61
warps = {s: [] for s in screens}
for s in sorted(screens):
    for (tx, ty), code in sorted(screens[s]['exit_at'].items(), key=lambda kv: (kv[0][1], kv[0][0])):
        warps[s].append({'x': tx, 'y': ty, 'to': code >> 2, 'dir': edge_dir(tx, ty)})
def open_tile(s, x, y): return 0 <= x < W and 0 <= y < H and not screens[s]['collision'][y * W + x]
def taken(s, x, y): return (x, y) in screens[s]['exit_at'] or any(w['x'] == x and w['y'] == y for w in warps[s])
def nearest_open(s, x, y):
    best = None
    for ty in range(H):
        for tx in range(W):
            if open_tile(s, tx, ty) and not taken(s, tx, ty):
                d = abs(tx - x) + abs(ty - y)
                if best is None or d < best[0]: best = (d, tx, ty)
    return (best[1], best[2]) if best else (x, y)
OPP = {'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left'}
for s in sorted(screens):
    for w in list(warps[s]):
        if w.get('landing'): continue
        d = w['to']
        back = [k for k, v in enumerate(warps[d]) if v['to'] == s]
        if back:
            # (Matched along the edge or the doorway: the nearest of the way back.)
            k = min(back, key=lambda k: abs(warps[d][k]['x'] - w['x']) * (0 if w['dir'] in ('up', 'down') and warps[d][k]['dir'] in ('up', 'down') else 1)
                    + abs(warps[d][k]['y'] - w['y']) * (0 if w['dir'] in ('left', 'right') and warps[d][k]['dir'] in ('left', 'right') else 1)
                    + abs(warps[d][k]['x'] - w['x']) * 0.01 + abs(warps[d][k]['y'] - w['y']) * 0.01)
            w['warp'] = k
            continue
        # (One way only, in the game: come out on the far side, on a free spot. Within a place, a way back from
        # there; from another place (back into town), just a spot to stand on.)
        if w['dir']:
            od = OPP[w['dir']]
            tx = w['x'] if od in ('up', 'down') else (0 if od == 'left' else W - 1)
            ty = w['y'] if od in ('left', 'right') else (0 if od == 'up' else H - 1)
            lx, ly = (tx, ty) if open_tile(d, tx, ty) and not taken(d, tx, ty) else nearest_open(d, tx, ty)
        else:
            lx, ly = nearest_open(d, 7, 5)
        same = place_of[d][2] is place_of[s][2]
        ldir = edge_dir(lx, ly) if same else None
        warps[d].append({'x': lx, 'y': ly, 'to': s if same else None, 'dir': ldir, 'warp': warps[s].index(w), 'landing': True})
        w['warp'] = len(warps[d]) - 1

# ---------- The people ----------
NAMES = {0: 'yugi', 1: 'yami_yugi', 2: 'yami_yugi_2', 3: 'kaiba', 4: 'joey', 5: 'marik', 6: 'ishizu', 7: 'mai', 8: 'bakura',
         10: 'tea', 11: 'grandpa', 12: 'rare_hunter', 13: 'rare_hunter_2', 18: 'weevil', 19: 'rex', 23: 'yami_bakura', 24: 'yami_marik',
         25: 'hero'}
FRAME_ORDER = [0, 6, 3, 1, 2, 7, 8, 4, 5]   # (FireRed's: down, up, left standing; then each's two steps)
os.makedirs(SPRITES, exist_ok=True); os.makedirs(os.path.join(YGO, 'sheets'), exist_ok=True); os.makedirs(os.path.join(YGO, 'portraits'), exist_ok=True)
people = {}
for k in range(102):
    o = P(k); n = P(k + 1) - o
    if n <= 0: continue
    d = rom[o:o + n]
    pal = [rgb(c) for c in struct.unpack_from('<16H', rom, P(102 + k))]
    nt = n // 32
    sheet = Image.new('RGBA', (128, ((nt + 15) // 16) * 8), (0, 0, 0, 0)); px = sheet.load()
    for t in range(nt):
        for y in range(8):
            for x in range(8):
                v = d[t * 32 + y * 4 + x // 2]; ci = v >> 4 if x & 1 else v & 15
                if ci: px[(t % 16) * 8 + x, (t // 16) * 8 + y] = pal[ci] + (255,)
    frame = lambda f: sheet.crop(((f % 4) * 32, (f // 4) * 32, (f % 4) * 32 + 32, (f // 4) * 32 + 32))
    if not frame(0).getbbox() or not frame(6).getbbox():
        sheet.save(os.path.join(YGO, 'sheets', 'sc_sheet_%02d.png' % k)); continue
    name = 'sc_' + NAMES.get(k, 'person_%02d' % k)
    strip = Image.new('RGBA', (32 * 9, 32), (0, 0, 0, 0))
    for i, f in enumerate(FRAME_ORDER): strip.alpha_composite(frame(f), (i * 32, 0))
    strip.save(os.path.join(SPRITES, name + '.png'))
    people[k] = name

# ---------- The portraits ----------
T_PIC, T_PAL, T_PARTS, N_PORTRAITS = 0xd4edbc, 0xd4ee40, 0xd4eec4, 33
SHAPES = {(0,0):(8,8),(0,1):(16,16),(0,2):(32,32),(0,3):(64,64),(1,0):(16,8),(1,1):(32,8),(1,2):(32,16),(1,3):(64,32),(2,0):(8,16),(2,1):(8,32),(2,2):(16,32),(2,3):(32,64)}
PORTRAITS = {1: 'yugi', 2: 'yami_yugi', 3: 'kaiba', 4: 'joey', 5: 'marik', 6: 'ishizu', 7: 'mai', 8: 'bakura', 9: 'odion', 10: 'tea',
             11: 'grandpa', 12: 'rare_hunter_1', 13: 'rare_hunter_2', 14: 'rare_hunter_3', 15: 'rare_hunter_4', 16: 'rare_hunter_5',
             17: 'duelist_17', 18: 'weevil', 19: 'rex', 20: 'espa_roba', 21: 'duelist_21', 22: 'yami_bakura', 23: 'joey_controlled',
             24: 'yami_marik', 25: 'marik_2', 26: 'roland', 27: 'tristan', 28: 'tea_controlled', 29: 'mokuba', 30: 'bandit_keith',
             31: 'duelist_31', 32: 'odion_2'}
for i in range(1, N_PORTRAITS):
    data = unfilter8(huffman(ptr(T_PIC + 4 * i)))
    pal = [rgb(c) for c in struct.unpack_from('<256H', rom, ptr(T_PAL + 4 * i))]
    sheet = tiles8(data, len(data) // 64, 16, pal, True)
    p = ptr(T_PARTS + 4 * (i - 1)); q = ptr(T_PARTS + 4 * i) if i < N_PORTRAITS - 1 else p + 0x400
    h = p
    while struct.unpack_from('<I', rom, h)[0]: h += 4
    parts = []
    for k in range(h + 4, q, 8):
        a0, a1, a2 = struct.unpack_from('<3H', rom, k)
        if (a0, a1, a2) == (0, 0, 0) or a0 >> 14 == 3: break
        w, hh = SHAPES[(a0 >> 14, a1 >> 14)]
        y = a0 & 0xff; y = y - 256 if y > 160 else y
        parts.append((a1 & 0x1ff, y, w, hh, a2 & 0x3ff, a1 >> 12 & 1, a1 >> 13 & 1))
    key = lambda e: e[:4]
    seen, start = set(), len(parts)
    for k in range(len(parts) - 1, -1, -1):
        if key(parts[k]) in seen: break
        seen.add(key(parts[k])); start = k
    pieces, placed = parts[start:], set()
    for e in parts[:start]:
        if key(e) not in placed: placed.add(key(e)); pieces.append(e)
    x0 = min(e[0] for e in pieces); y0 = min(e[1] for e in pieces)
    x1 = max(e[0] + e[2] for e in pieces); y1 = max(e[1] + e[3] for e in pieces)
    face = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
    for (x, y, w, hh, t, hf, vf) in pieces:
        col, row = (t % 32) // 2, t // 32
        piece = sheet.crop((col * 8, row * 8, col * 8 + w, row * 8 + hh))
        if hf: piece = piece.transpose(Image.FLIP_LEFT_RIGHT)
        if vf: piece = piece.transpose(Image.FLIP_TOP_BOTTOM)
        face.alpha_composite(piece, (x - x0, y - y0))
    face.crop(face.getbbox()).save(os.path.join(YGO, 'portraits', PORTRAITS.get(i, 'portrait_%02d' % i) + '.png'))

# ---------- The maps ----------
def name(s): return 'SC_%02d' % s
black = Image.new('RGBA', (32, 32), (0, 0, 0, 255))
maps = {}
for s in sorted(screens):
    g, o = screen_pictures(s)
    g.save(os.path.join(MAPS, name(s) + '.png')); o.save(os.path.join(MAPS, name(s) + '-top.png')); black.save(os.path.join(MAPS, name(s) + '-border.png'))
    sc = screens[s]; title, outdoors, _ = place_of[s]
    behavior = [0] * (W * H)
    for w in warps[s]:
        if w['to'] is None: sc['collision'][w['y'] * W + w['x']] = 0; continue
        behavior[w['y'] * W + w['x']] = ARROW[w['dir']] if w['dir'] else STEP
        sc['collision'][w['y'] * W + w['x']] = 0
    maps[name(s)] = {
        'name': name(s), 'title': title, 'width': W, 'height': H, 'type': 'indoor', 'realm': 'yugioh',
        'music': 'mus_celadon' if outdoors else 'mus_silph', 'cycling': False, 'showName': False, 'top': True,
        'borderWidth': 2, 'borderHeight': 2, 'fixedCamera': True, 'overTop': sc['over'],
        'collision': sc['collision'], 'elevation': [3] * (W * H), 'behavior': behavior, 'encounter': [0] * (W * H),
        'connections': [], 'warps': [{'x': w['x'], 'y': w['y'], 'map': name(w['to']) if w['to'] is not None else None, 'warp': w['warp']} for w in warps[s]],
        'signs': [], 'triggers': [], 'hidden': [], 'people': [], 'wild': None}

# Domino Square (screen 0): the hub's portal comes out by its fountain (the solid shape in its middle); the
# fountain takes you back, or round town.
SQUARE = 0
def shape_at(s0, x, y):
    m = maps[name(s0)]['collision']; seen, st = set(), [(x, y)]
    while st:
        p = st.pop()
        if p in seen or not (0 <= p[0] < W and 0 <= p[1] < H) or not m[p[1] * W + p[0]]: continue
        seen.add(p); st += [(p[0] + 1, p[1]), (p[0] - 1, p[1]), (p[0], p[1] + 1), (p[0], p[1] - 1)]
    return seen
fountain = shape_at(SQUARE, 7, 6)
# (You come out on its left, facing it: in front of its rim, not behind its clock.)
mid = sorted(y for x, y in fountain)[len(fountain) // 2]
left = min(x for x, y in fountain if y == mid)
arrive = (left - 1, mid)
def free(s0, x, y): return open_tile(s0, x, y) and not any(w['x'] == x and w['y'] == y and w['to'] is not None for w in warps[s0])
fountain_signs = sorted(p for p in fountain if any(free(SQUARE, p[0] + dx, p[1] + dy) for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0))))
maps[name(SQUARE)]['signs'] = [{'x': x, 'y': y, 'script': 'SacredCards_Fountain', 'text': None} for x, y in fountain_signs]
maps[name(SQUARE)]['showName'] = True
# Each other place: the screen with a way back into town (or its first), where you stand on arriving.
def reaches_town(s0, seen=None):
    seen = seen if seen is not None else set()
    if s0 in seen: return False
    seen.add(s0)
    return any(w['to'] is not None and (place_of[w['to']][2] is place_of[SQUARE][2] or reaches_town(w['to'], seen)) for w in warps[s0])
areas = []
for key, title, outdoors in PLACES:
    if key == SQUARE or any(a['title'] == title for a in areas): continue
    g = place_of[key][2]
    entry = next((s0 for s0 in g for w in warps[s0] if w['to'] is not None and place_of[w['to']][2] is not g), key)
    m = maps[name(entry)]
    area = {'title': title, 'map': name(entry)}
    if reaches_town(entry):
        area['x'], area['y'] = nearest_open(entry, 7, 6)
    else:
        # (No way back into town: something solid by where you arrive takes you back to Domino Square.)
        best = None
        for y in range(H):
            for x in range(W):
                if not free(entry, x, y): continue
                for dx, dy, face in ((0, -1, 'up'), (1, 0, 'right'), (-1, 0, 'left'), (0, 1, 'down')):
                    bx, by = x + dx, y + dy
                    if 0 <= bx < W and 0 <= by < H and m['collision'][by * W + bx]:
                        d = abs(x - 7) + abs(y - 6) + (0 if face == 'up' else 0.5)
                        if best is None or d < best[0]: best = (d, x, y, bx, by, face)
        _, area['x'], area['y'], bx, by, area['facing'] = best
        m['signs'].append({'x': bx, 'y': by, 'script': 'SacredCards_BackToTown', 'text': None})
        area['noWayBack'] = True
    areas.append(area)
    m['showName'] = True

# A few of Domino City's people, the game's own townsfolk (the story's cast is left for the story).
TOWNSFOLK = [
    (0, 44, 3, 2, 'face_down', ['Everyone in Domino City plays Duel\nMonsters!', 'I keep my deck with me wherever\nI go.']),
    (0, 75, 11, 7, 'wander_around', ['This fountain is where everyone\nmeets up.', 'They say the clock on it has never\nonce been wrong.']),
    (1, 49, 9, 6, 'face_left', ['Kaiba Corporation is putting on a\nbig tournament soon.', 'Duelists from all over are coming\nto Domino City!']),
    (2, 79, 5, 4, 'wander_around', ['The Kame Game shop sells every game\nyou can think of.', 'The old man who runs it knows them\nall!']),
    (3, 70, 10, 6, 'face_down', ['The cafe here makes the best\nlemonade in town.']),
    (6, 85, 7, 8, 'wander_around', ['Domino Park is the perfect place\nfor a duel on a sunny day.']),
    (11, 58, 7, 5, 'face_up', ['Ships come and go from Domino Pier\nall day long.', 'Some say there\'s an island out there\nwhere duelists gather...'])]
for i, (s0, k, x, y, move, text) in enumerate(TOWNSFOLK):
    if k not in people: continue
    m = maps[name(s0)]
    x, y = (x, y) if free(s0, x, y) and not any(sg['x'] == x and sg['y'] == y for sg in m['signs']) else nearest_open(s0, x, y)
    m['people'].append({'id': len(m['people']), 'x': x, 'y': y, 'movement': move, 'rangeX': 1, 'rangeY': 1,
        'script': 'SacredCards_Townsfolk%d' % i, 'flag': None, 'text': text, 'sprite': people[k], 'width': 32, 'height': 32, 'frames': 9,
        'localId': 'LOCALID_SC_TOWNSFOLK_%d' % i})

INFO = {'square': name(SQUARE), 'arrive': {'map': name(SQUARE), 'x': arrive[0], 'y': arrive[1], 'facing': 'right'}, 'areas': areas,
        'people': {name: k for k, name in people.items()}}
START = '// The Yu-Gi-Oh! realm (tools/build-sacred-cards.py, from Yu-Gi-Oh! The Sacred Cards): its screens.\n'
END = '// (End of the Yu-Gi-Oh! realm.)\n'
js = START + ''.join('window.WORLD_MAPS[%s] = %s;\n' % (json.dumps(k), json.dumps(v, separators=(',', ':'))) for k, v in maps.items()) + \
     'window.SACRED_CARDS = ' + json.dumps(INFO, separators=(',', ':')) + ';\n' + END
path = os.path.join(ROOT, 'data/emerald-maps.js')
text = open(path, encoding='utf8').read()
a = text.find(START)
if a >= 0: text = text[:a] + text[text.index(END, a) + len(END):]
open(path, 'w', encoding='utf8').write(text + js)
print(len(maps), 'screens,', len(people), 'people,', N_PORTRAITS - 1, 'portraits;', len(areas), 'places besides Domino City; arrive at', arrive, 'fountain', fountain)
