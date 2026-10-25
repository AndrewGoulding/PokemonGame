# More of the Yu-Gi-Oh! realm, from Yu-Gi-Oh! Reshef of Destruction (GBA,
# Konami, 2004; the USA cartridge, game code AY8E): The Sacred Cards' sequel,
# on the same engine. Only its pictures: its 61 screens, its people's sprites,
# its portraits. None of its card game.
#
#   python3 tools/build-reshef.py <path to the .gba>
#   (after tools/build-sacred-cards.py: its places join the Sacred Cards' fountain's)
#
# What's in the ROM, as The Sacred Cards has it (tools/build-sacred-cards.py) but moved about:
#   0x0e11790   the table of pointers: 0-151 people's sheets (4bpp, 32x32 frames); 152 the palettes (a person's
#               is 913 + the byte for its sheet at 0x02ad20c); then each of the 61 screens' tiles (153-213),
#               ground layouts (214-274), overlay layouts (275-335), palettes (336-396) and walking maps (397-457)
#   the walking maps: 120x80 cells, two bytes each: the first 0 (open), 1 (solid), or a height; the second
#               0x10 if you're in front of the overlay there, 0x20 + n on exit n
#   0x0e19274   each screen's first entry in 0x0e17e28, a record per screen and story state: its people, then
#               at 0x13c ten 8-byte slots (exit n's in slot 6 + n: the screen it leads to in its low byte, and
#               which of that screen's entrances in the next), then at 0x190 the entrances (where, and facing
#               which way, you come in)
#   0x0fa2bac   the portraits: 190-388 the pictures (64x64 8bpp, LZ77), each character's run of them (its
#               expressions) from 389 on, its palette (colours 192-255) from 441 on
#
# Writes:
#   assets/world/maps/RD_<nn>.png, -top.png, -border.png    each screen
#   assets/world/sprites/rd_<name>.png                      each person: 9 frames of 32x32
#   assets/yugioh/portraits-reshef/<name>[_<n>].png          each character's portraits (its expressions)
#   assets/yugioh/sheets/rd_sheet_<nn>.png                  the sheets that aren't people (items, rocks, fish...)
#   data/emerald-maps.js (between its markers)              the screens' maps, and window.RESHEF
import collections, json, os, struct, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MAPS = os.path.join(ROOT, 'assets/world/maps')
SPRITES = os.path.join(ROOT, 'assets/world/sprites')
YGO = os.path.join(ROOT, 'assets/yugioh')
TABLE, N = 0xe11790, 61
T0, A0, B0, P0, C0 = 153, 214, 275, 336, 397
REC, REC_INDEX = 0xe17e28, 0xe19274
PERSON_PALETTES, PERSON_PALETTE_BASE = 0x2ad20c, 913
PORTRAITS, PIC0, CHAR0, PAL0, N_CHARS = 0xfa2bac, 190, 389, 441, 52

rom = open(sys.argv[1], 'rb').read()
if rom[0xac:0xb0] != b'AY8E': sys.exit('Not Yu-Gi-Oh! Reshef of Destruction (USA): its game code is ' + repr(rom[0xac:0xb0]))
def P(k): return struct.unpack_from('<I', rom, TABLE + 4 * k)[0] - 0x08000000
def ptr(a): return struct.unpack_from('<I', rom, a)[0] - 0x08000000
def rgb(c): return ((c & 31) << 3 | (c & 31) >> 2, (c >> 5 & 31) << 3 | (c >> 5 & 31) >> 2, (c >> 10 & 31) << 3 | (c >> 10 & 31) >> 2)
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

# ---------- The screens' pictures (as The Sacred Cards') ----------
def screen_pictures(s):
    tiles = lz77(P(T0 + s))
    ground = struct.unpack_from('<1024H', rom, P(A0 + s)); over = struct.unpack_from('<1024H', rom, P(B0 + s))
    pal = [(0, 0, 0)] * 16 + [rgb(c) for c in struct.unpack_from('<240H', rom, P(P0 + s))]
    out = []
    for m, opaque in ((ground, True), (over, False)):
        im = Image.new('RGBA', (240, 160), (0, 0, 0, 0)); px = im.load()
        for ty in range(20):
            for tx in range(30):
                e = m[ty * 32 + tx + 1]; t = e & 0x3ff
                if not opaque and t == 0: continue
                for y in range(8):
                    for x in range(8):
                        sx, sy = (7 - x if e >> 10 & 1 else x), (7 - y if e >> 11 & 1 else y)
                        k = t * 64 + sy * 8 + sx; ci = tiles[k] if k < len(tiles) else 0
                        if ci or opaque: px[tx * 8 + x, ty * 8 + y] = pal[ci] + (255,)
        out.append(im)
    return out

# ---------- The walking maps, the exits, the entrances ----------
W, H = 15, 10
def records(s):
    first = (ptr(REC_INDEX + 4 * s) - REC) // 4
    last = (ptr(REC_INDEX + 4 * (s + 1)) - REC) // 4 if s + 1 < N else first + 6
    return [ptr(REC + 4 * k) for k in range(first, last)]
screens = {}
for s in range(N):
    walk = rom[P(C0 + s):P(C0 + s) + 19200]
    a, b = walk[0::2], walk[1::2]
    codes = sorted(set(v & 15 for v in b if v & 0x20))
    # (Each exit's way, and each entrance, as most of the screen's story states have them; not back to itself.)
    recs = records(s)
    exits = {}
    for n in codes:
        votes = collections.Counter(struct.unpack_from('<I', rom, r + 0x13c + 8 * (6 + n))[0] for r in recs)
        # (A state where the exit's shut leaves its slot 0, which is also screen 0's first entrance: a way that's
        # set in some states wins over 0.)
        good = sorted(((v, c) for v, c in votes.items() if (v & 0xff) < N and (v & 0xff) != s), key=lambda vc: (vc[0] != 0, vc[1]), reverse=True)
        if good: exits[n] = (good[0][0] & 0xff, good[0][0] >> 8 & 0xff)
    entrances = []
    for e in range(5):
        votes = collections.Counter(struct.unpack_from('<4H', rom, r + 0x190 + 20 * e)[1:] for r in recs)
        d, x, y = votes.most_common(1)[0][0]
        entrances.append((min(W - 1, x // 8), min(H - 1, y // 8), d) if x < 240 and y < 160 else None)
    collision, over, exit_at = [], [], {}
    for ty in range(H):
        for tx in range(W):
            cells = [(tx * 8 + x, ty * 8 + y) for y in range(8) for x in range(8)]
            blocked = sum(1 for x, y in cells if a[y * 120 + x] == 1)
            counts = collections.Counter(b[y * 120 + x] & 15 for x, y in cells if b[y * 120 + x] & 0x20 and (b[y * 120 + x] & 15) in exits)
            n, k = counts.most_common(1)[0] if counts else (None, 0)
            if n is not None and k >= 6: exit_at[(tx, ty)] = n
            collision.append(1 if blocked > 32 and (tx, ty) not in exit_at else 0)
            feet = [b[(ty * 8 + y) * 120 + tx * 8 + x] for y in range(4, 8) for x in range(8)]
            over.append(1 if sum(1 for v in feet if v & 0x10) * 2 >= len(feet) else 0)
    screens[s] = {'collision': collision, 'over': over, 'exit_at': exit_at, 'exits': exits, 'entrances': entrances}

# ---------- The places (the game's own names, for the screens joined both ways) ----------
links = {s: set(d for d, e in sc['exits'].values()) for s, sc in screens.items()}
joined = {s: set(d for d in links[s] if s in links[d]) for s in screens}
groups, seen = [], set()
for s in sorted(screens):
    if s in seen: continue
    st, g = [s], []
    while st:
        x = st.pop()
        if x in seen: continue
        seen.add(x); g.append(x); st += list(joined[x])
    groups.append(sorted(g))
PLACES = [  # (a screen of the place, its name, outdoors, where to arrive)
    (0, 'Clock Tower Square', True), (8, 'Your House', False), (14, 'Domino Station', False), (20, 'Egypt Exhibition', False),
    (24, 'Domino Pier', False), (19, 'Italy', False), (31, 'China', True), (34, 'Canada', True), (37, 'Galapagos', True),
    (40, 'Pegasus Island', True), (43, 'Dungeon', False), (50, 'Pegasus Castle', True), (56, 'Hall of Eternity', False),
    (57, 'KaibaLand', True), (59, 'Desert Village', True)]
place_of = {}
for key, title, outdoors in PLACES:
    g = next(g for g in groups if key in g)
    for s in g:
        if s not in place_of: place_of[s] = (title, outdoors, key)
for s in screens:
    if s not in place_of:
        # (A screen on its own: the place of the screen it leads to.)
        d = next(iter(links[s]), None)
        place_of[s] = place_of.get(d, ('Clock Tower Square', True, 0))

# ---------- The warps ----------
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
    for (tx, ty), n in sorted(screens[s]['exit_at'].items(), key=lambda kv: (kv[0][1], kv[0][0])):
        d, e = screens[s]['exits'][n]
        warps[s].append({'x': tx, 'y': ty, 'to': d, 'entrance': e, 'dir': edge_dir(tx, ty)})
def open_tile(s, x, y): return 0 <= x < W and 0 <= y < H and not screens[s]['collision'][y * W + x]
def nearest_open(s, x, y, avoid=True):
    best = None
    for ty in range(H):
        for tx in range(W):
            if open_tile(s, tx, ty) and not (avoid and (tx, ty) in screens[s]['exit_at']):
                dd = abs(tx - x) + abs(ty - y)
                if best is None or dd < best[0]: best = (dd, tx, ty)
    return (best[1], best[2]) if best else (x, y)
for s in sorted(screens):
    for w in list(warps[s]):
        if w.get('landing'): continue
        d = w['to']; ent = screens[d]['entrances'][w['entrance']] if w['entrance'] < 5 else None
        ex, ey = (ent[0], ent[1]) if ent else (7, 5)
        # (Where the game puts you: on its way back if that's there, else a spot of its own.)
        back = [k for k, v in enumerate(warps[d]) if v['to'] == s and not v.get('landing')]
        if back:
            w['warp'] = min(back, key=lambda k: abs(warps[d][k]['x'] - ex) + abs(warps[d][k]['y'] - ey))
            continue
        lx, ly = (ex, ey) if open_tile(d, ex, ey) and (ex, ey) not in screens[d]['exit_at'] else nearest_open(d, ex, ey)
        warps[d].append({'x': lx, 'y': ly, 'to': None, 'dir': None, 'warp': warps[s].index(w), 'landing': True})
        w['warp'] = len(warps[d]) - 1

# ---------- The people ----------
NAMES = {0: 'yugi', 1: 'yami_yugi', 2: 'yami_yugi_2', 3: 'kaiba', 4: 'joey', 6: 'ishizu', 7: 'mai', 10: 'tea', 11: 'grandpa',
         12: 'rare_hunter', 13: 'rare_hunter_2', 18: 'weevil', 19: 'rex', 25: 'hero'}
FRAME_ORDER = [0, 6, 3, 1, 2, 7, 8, 4, 5]
for dd in (SPRITES, os.path.join(YGO, 'sheets'), os.path.join(YGO, 'portraits-reshef')): os.makedirs(dd, exist_ok=True)
ptab = rom[PERSON_PALETTES:PERSON_PALETTES + 152]
people = {}
for k in range(152):
    o = P(k); n = P(k + 1) - o
    d = rom[o:o + n]
    pal = [rgb(c) for c in struct.unpack_from('<16H', rom, P(152) + 32 * (PERSON_PALETTE_BASE + ptab[k]))]
    nt = n // 32
    sheet = Image.new('RGBA', (128, ((nt + 15) // 16) * 8), (0, 0, 0, 0)); px = sheet.load()
    for t in range(nt):
        for y in range(8):
            for x in range(8):
                v = d[t * 32 + y * 4 + x // 2]; ci = v >> 4 if x & 1 else v & 15
                if ci: px[(t % 16) * 8 + x, (t // 16) * 8 + y] = pal[ci] + (255,)
    frame = lambda f: sheet.crop(((f % 4) * 32, (f // 4) * 32, (f % 4) * 32 + 32, (f // 4) * 32 + 32))
    if n < 12288 or not frame(0).getbbox() or not frame(6).getbbox():
        sheet.save(os.path.join(YGO, 'sheets', 'rd_sheet_%03d.png' % k)); continue
    name = 'rd_' + NAMES.get(k, 'person_%03d' % k)
    strip = Image.new('RGBA', (32 * 9, 32), (0, 0, 0, 0))
    for i, f in enumerate(FRAME_ORDER): strip.alpha_composite(frame(f), (i * 32, 0))
    strip.save(os.path.join(SPRITES, name + '.png'))
    people[k] = name

# ---------- The portraits ----------
CHARACTERS = {1: 'yugi', 2: 'yami_yugi', 3: 'kaiba', 4: 'joey', 5: 'pegasus', 6: 'mai', 7: 'tea', 8: 'grandpa', 9: 'tristan',
              10: 'mokuba', 11: 'rex', 12: 'mako', 13: 'weevil', 14: 'duelist_14', 15: 'bonz', 16: 'ishizu', 17: 'shadi',
              20: 'bandit_keith', 26: 'rare_hunter', 28: 'arkana', 30: 'roland', 31: 'duke', 32: 'serenity', 33: 'marik',
              34: 'yami_bakura', 36: 'noah', 39: 'rebecca', 40: 'teddy', 51: 'odion'}
def table(k): return ptr(PORTRAITS + 4 * k)
first = [(table(CHAR0 + c) - PORTRAITS) // 4 for c in range(N_CHARS)] + [CHAR0]
portraits = 0
for c in range(1, N_CHARS):
    pal = [(0, 0, 0)] * 192 + [rgb(x) for x in struct.unpack_from('<64H', rom, table(PAL0 + c))]
    pics = []
    for k in range(first[c], first[c + 1]):
        if table(k) not in pics: pics.append(table(k))
    for e, o in enumerate(pics):
        data = lz77(o)
        im = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); px = im.load()
        for t in range(64):
            for y in range(8):
                for x in range(8):
                    ci = data[t * 64 + y * 8 + x]
                    if ci: px[(t % 8) * 8 + x, (t // 8) * 8 + y] = pal[ci] + (255,)
        im.save(os.path.join(YGO, 'portraits-reshef', CHARACTERS.get(c, 'character_%02d' % c) + ('' if e == 0 else '_%d' % e) + '.png'))
        portraits += 1

# ---------- The maps ----------
def name(s): return 'RD_%02d' % s
black = Image.new('RGBA', (32, 32), (0, 0, 0, 255))
maps = {}
for s in sorted(screens):
    g, o = screen_pictures(s)
    g.save(os.path.join(MAPS, name(s) + '.png')); o.save(os.path.join(MAPS, name(s) + '-top.png')); black.save(os.path.join(MAPS, name(s) + '-border.png'))
    sc = screens[s]; title, outdoors, _ = place_of[s]
    behavior = [0] * (W * H)
    for w in warps[s]:
        sc['collision'][w['y'] * W + w['x']] = 0
        if w['to'] is not None: behavior[w['y'] * W + w['x']] = ARROW[w['dir']] if w['dir'] else STEP
    maps[name(s)] = {
        'name': name(s), 'title': title, 'width': W, 'height': H, 'type': 'indoor', 'realm': 'yugioh',
        'music': 'mus_celadon' if outdoors else 'mus_silph', 'cycling': False, 'showName': False, 'top': True,
        'borderWidth': 2, 'borderHeight': 2, 'fixedCamera': True, 'overTop': sc['over'],
        'collision': sc['collision'], 'elevation': [3] * (W * H), 'behavior': behavior, 'encounter': [0] * (W * H),
        'connections': [], 'warps': [{'x': w['x'], 'y': w['y'], 'map': name(w['to']) if w['to'] is not None else None, 'warp': w['warp']} for w in warps[s]],
        'signs': [], 'triggers': [], 'hidden': [], 'people': [], 'wild': None}

# Clock Tower Square's fountain (screen 1) does as Domino Square's: back to the Realm Hub, or round the realm.
SQUARE = 1
def shape_at(s0, x, y):
    m = maps[name(s0)]['collision']; seen, st = set(), [(x, y)]
    while st:
        p = st.pop()
        if p in seen or not (0 <= p[0] < W and 0 <= p[1] < H) or not m[p[1] * W + p[0]]: continue
        seen.add(p); st += [(p[0] + 1, p[1]), (p[0] - 1, p[1]), (p[0], p[1] + 1), (p[0], p[1] - 1)]
    return seen
def free(s0, x, y): return open_tile(s0, x, y) and not any(w['x'] == x and w['y'] == y and w['to'] is not None for w in warps[s0])
fountain = max((shape_at(SQUARE, x, y) for x in range(4, 11) for y in range(3, 8)), key=len)
fountain_signs = sorted(p for p in fountain if any(free(SQUARE, p[0] + dx, p[1] + dy) for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0))))
maps[name(SQUARE)]['signs'] = [{'x': x, 'y': y, 'script': 'SacredCards_Fountain', 'text': None} for x, y in fountain_signs]
mid = sorted(y for x, y in fountain)[len(fountain) // 2]
square_arrive = (min(x for x, y in fountain if y == mid) - 1, mid)
# Each place: where you arrive (its first entrance, or somewhere open), and a way back if it has none of its own.
def reaches_square(s0, seen=None):
    seen = seen if seen is not None else set()
    if s0 in seen: return False
    seen.add(s0)
    return any(w['to'] is not None and (place_of[w['to']][2] == 0 or reaches_square(w['to'], seen)) for w in warps[s0])
areas = []
for key, title, outdoors in PLACES:
    entry = key
    ent = next((e for e in screens[entry]['entrances'] if e and open_tile(entry, e[0], e[1])), None)
    ax, ay = nearest_open(entry, ent[0], ent[1]) if ent else nearest_open(entry, 7, 6)
    area = {'title': title, 'map': name(entry), 'x': ax, 'y': ay}
    if key == 0:
        area.update({'map': name(SQUARE), 'x': square_arrive[0], 'y': square_arrive[1], 'facing': 'right'})
    elif not reaches_square(entry):
        # (No way back of its own: something solid nearest where you arrive takes you back to the square, and you
        # arrive in front of it.)
        m = maps[name(entry)]
        best = None
        for y in range(H):
            for x in range(W):
                if not free(entry, x, y): continue
                for dx, dy, f in ((0, -1, 'up'), (1, 0, 'right'), (-1, 0, 'left'), (0, 1, 'down')):
                    bx, by = x + dx, y + dy
                    if 0 <= bx < W and 0 <= by < H and m['collision'][by * W + bx] and not any(sg['x'] == bx and sg['y'] == by for sg in m['signs']):
                        dd = abs(x - ax) + abs(y - ay) + (0 if f == 'up' else 0.5)
                        if best is None or dd < best[0]: best = (dd, x, y, bx, by, f)
        _, area['x'], area['y'], bx, by, area['facing'] = best
        m['signs'].append({'x': bx, 'y': by, 'script': 'SacredCards_BackToTown', 'text': None})
        area['noWayBack'] = True
    areas.append(area)
    maps[area['map']]['showName'] = True

INFO = {'square': name(SQUARE), 'areas': areas}
START = '// More of the Yu-Gi-Oh! realm (tools/build-reshef.py, from Yu-Gi-Oh! Reshef of Destruction): its screens.\n'
END = '// (End of Reshef of Destruction\'s screens.)\n'
js = START + ''.join('window.WORLD_MAPS[%s] = %s;\n' % (json.dumps(k), json.dumps(v, separators=(',', ':'))) for k, v in maps.items()) + \
     'window.RESHEF = ' + json.dumps(INFO, separators=(',', ':')) + ';\n' + END
path = os.path.join(ROOT, 'data/emerald-maps.js')
text = open(path, encoding='utf8').read()
a = text.find(START)
if a >= 0: text = text[:a] + text[text.index(END, a) + len(END):]
open(path, 'w', encoding='utf8').write(text + js)
print(len(maps), 'screens,', len(people), 'people,', portraits, 'portraits;', len(areas), 'places; groups', groups)
