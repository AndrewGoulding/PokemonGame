# The Like a Dragon realm's Kamurocho (Yakuza 0's, 1988), this game's own: its streets laid out after the game's own
# map, its pictures from Yu-Gi-Oh! The Sacred Cards (GBA, Konami, 2003; the USA cartridge, game code AY7E), the same
# screens as Domino City's (tools/build-sacred-cards.py): its pavements, its asphalt, its rooftops and its shopfronts,
# cut from the screens and put together block by block. Only its pictures, and those from the screens already in
# assets/world/maps (SC_<nn>.png and -top.png), so it needs no cartridge.
#
#   python3 tools/build-kamurocho.py
#
# The layout: tools/data/kamurocho.txt, a tile to a character, 2 pixels of Yakuza 0's map to a tile:
#   .  street        #  building (a block's buildings are its runs of #, + the lines between them)
#   P  West Park     E  the Empty Lot (the Time Machine's)        (space)  the city beyond, out of bounds
# Each building gets a rooftop, and a shopfront along each stretch of its south side that faces open ground; the
# city beyond is drawn as more buildings, cut into blocks. Streets are asphalt, with a strip of pavement under each
# shopfront.
#
# Kiryu and Majima's sheet (tools/data/kamurocho-people.png, as it was supplied): two 3/4-view people
# side by side, each 3 columns of 64x64 frames (standing, two steps) by 5 rows (down-right twice, up twice, a fighting
# stance), on magenta. Each frame is halved to 32x32, as The Sacred Cards' people are: down is the first row, up the
# third, left the second mirrored (the game mirrors left for right).
#
# Writes:
#   assets/world/maps/Kamurocho.png, -border.png
#   assets/world/sprites/lad_kiryu.png, lad_majima.png     (and lad_*_battle.png, their fighting stance)
#   data/emerald-maps.js (between its markers)             the map, and window.KAMUROCHO (where you arrive, the Empty Lot)
import base64, json, os, subprocess, random
from collections import deque
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MAPS = os.path.join(ROOT, 'assets/world/maps')
SPRITES = os.path.join(ROOT, 'assets/world/sprites')
NAME, T = 'Kamurocho', 16

# ---------- The Sacred Cards' screens ----------
# Each screen as tools/build-sacred-cards.py wrote it from the cartridge: SC_<nn>.png its ground (opaque),
# SC_<nn>-top.png its overlay (see-through where nothing's drawn), 240x160 each.
_screens = {}
def screen(s):
    if s not in _screens:
        _screens[s] = tuple(Image.open(os.path.join(MAPS, 'SC_%02d%s.png' % (s, k))).convert('RGBA') for k in ('', '-top'))
    return _screens[s]
def ground(s, box): return screen(s)[0].crop(box)
def over(s, box): return screen(s)[1].crop(box)
def mirror_tile(s, box):
    # (A patch of screen s made seamless: its grain over its average colour (its shading taken out, so no seams
    # show; the shading measured over a margin round it), it and its mirror images, 2x2.)
    x0, y0, x1, y1 = box; m = 8
    big = screen(s)[0].crop((x0 - m, y0 - m, x1 + m, y1 + m))
    im = big.crop((m, m, m + x1 - x0, m + y1 - y0)); w, h = im.size
    blur = big.filter(ImageFilter.BoxBlur(6)).crop((m, m, m + w, m + h)); a, b = im.load(), blur.load()
    mean = [sum(a[x, y][i] for y in range(h) for x in range(w)) // (w * h) for i in range(3)]
    flat = Image.new('RGBA', (w, h)); f = flat.load()
    for y in range(h):
        for x in range(w): f[x, y] = tuple(max(0, min(255, mean[i] + a[x, y][i] - b[x, y][i])) for i in range(3)) + (255,)
    im = flat; out = Image.new('RGBA', (w * 2, h * 2))
    out.paste(im, (0, 0)); out.paste(im.transpose(Image.FLIP_LEFT_RIGHT), (w, 0))
    out.paste(im.transpose(Image.FLIP_TOP_BOTTOM), (0, h)); out.paste(im.transpose(Image.ROTATE_180), (w, h))
    return out

# The pieces (screen numbers and boxes in its 240x160).
ASPHALT = mirror_tile(27, (100, 8, 136, 72))          # (Domino's road, by the Office Tower)
ALLEY = mirror_tile(29, (84, 70, 116, 134))           # (the back alley's)
PAVING = ground(36, (0, 84, 240, 100))                         # (the pavement in front of the Game Center)
ROOF = mirror_tile(30, (96, 10, 144, 26))               # (the Office Tower's roof)
DIRT = mirror_tile(23, (32, 80, 80, 104))              # (Kaiba Corporation's yard)
GRASS = mirror_tile(46, (112, 100, 144, 124))           # (the graveyard's lawn)
# Shopfronts, each to its foot (where it meets the pavement): (screen, box).
FRONTS = [(36, (0, 4, 52, 84)), (36, (52, 4, 186, 84)), (36, (186, 4, 240, 84)), (24, (82, 4, 168, 84)),
          (24, (168, 0, 240, 80)), (25, (84, 2, 220, 82))]
FRONTS = [ground(s, b) for s, b in FRONTS]
FH = 76                                                        # (a shopfront's height, its foot up)
FRONTS = [f.crop((0, f.size[1] - FH, f.size[0], f.size[1])) for f in FRONTS]
TANKS = ground(30, (126, 92, 180, 134))                        # (the Office Tower's water tanks)
SKYLIGHT = ground(30, (64, 30, 174, 98))
SIGN = over(5, (0, 40, 26, 150))                               # (the bank's red sign, down a wall)
TREES = [over(5, (118, 40, 186, 116)), over(25, (8, 0, 46, 78)), over(0, (0, 0, 66, 72))]
TREES = [t.crop(t.getbbox()) for t in TREES]
VENT = ground(30, (54, 104, 82, 118))
AIRCON = ground(29, (0, 98, 28, 118))                          # (an air conditioner, on the alley's rooftops)
# Plain wall with windows (the Game Center's grey neighbour), its mirror image beside it so it runs on: under a
# shopfront's height for the gaps between shopfronts, and its upper floors for a building rising over the next.
def run_on(im): out = Image.new('RGBA', (im.size[0] * 2, im.size[1])); out.paste(im, (0, 0)); out.paste(im.transpose(Image.FLIP_LEFT_RIGHT), (im.size[0], 0)); return out
WALL = run_on(ground(36, (0, 84 - 76, 36, 84)))
WINDOWS = run_on(ground(36, (0, 4, 36, 60)))

# ---------- The layout ----------
rows = open(os.path.join(ROOT, 'tools/data/kamurocho.txt')).read().rstrip('\n').split('\n')
H, W = len(rows), max(len(r) for r in rows)
L = [list(r.ljust(W)) for r in rows]
WALK = set('.PE')
def at(x, y): return L[y][x] if 0 <= x < W and 0 <= y < H else ' '
def nb4(x, y):
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        if 0 <= x + dx < W and 0 <= y + dy < H: yield x + dx, y + dy

# The buildings: each run of '#', then the '+' lines between them shared out to their neighbours; the city beyond
# cut into blocks of 12.
label = [[-1] * W for _ in range(H)]
n = 0
for y in range(H):
    for x in range(W):
        if L[y][x] != '#' or label[y][x] >= 0: continue
        q = deque([(x, y)]); label[y][x] = n
        while q:
            a = q.popleft()
            for b in nb4(*a):
                if L[b[1]][b[0]] == '#' and label[b[1]][b[0]] < 0: label[b[1]][b[0]] = n; q.append(b)
        n += 1
q = deque((x, y) for y in range(H) for x in range(W) if label[y][x] >= 0)
while q:
    a = q.popleft()
    for b in nb4(*a):
        if L[b[1]][b[0]] == '+' and label[b[1]][b[0]] < 0: label[b[1]][b[0]] = label[a[1]][a[0]]; q.append(b)
OUT0 = n
for y in range(H):
    for x in range(W):
        if L[y][x] in '+ ' and label[y][x] < 0: label[y][x] = OUT0 + (y // 12) * 100 + x // 12
def solid(x, y): return not (0 <= x < W and 0 <= y < H) or L[y][x] not in WALK
def lab(x, y): return label[y][x] if 0 <= x < W and 0 <= y < H else -2

# A big building is cut into lots, 9 to 14 tiles each way (a block in Kamurocho is many buildings); a scrap of a lot
# goes to the lot beside it. Each lot (and each block of the city beyond) is 1 to 3 storeys of the others.
# (label0 keeps the buildings as the layout has them: a shopfront goes as high as its building does.)
label0 = [r[:] for r in label]
rnd0 = random.Random(88)
size = {}
for y in range(H):
    for x in range(W):
        if label[y][x] >= 0: size[label[y][x]] = size.get(label[y][x], 0) + 1
cuts = {}
for b in size:
    if b >= OUT0 or size[b] <= 120: continue
    cuts[b] = ([rnd0.randrange(9, 15) for _ in range(40)], [rnd0.randrange(9, 15) for _ in range(40)], rnd0.randrange(9), rnd0.randrange(9))
def lot(b, x, y):
    sx, sy, ox, oy = cuts[b]
    i = j = 0; a = -ox
    while a + sx[i] <= x: a += sx[i]; i += 1
    a = -oy
    while a + sy[j] <= y: a += sy[j]; j += 1
    return OUT0 + 100000 + b * 1000 + i * 40 + j
for y in range(H):
    for x in range(W):
        if label[y][x] in cuts: label[y][x] = lot(label[y][x], x, y)
size = {}
for y in range(H):
    for x in range(W):
        if label[y][x] >= 0: size[label[y][x]] = size.get(label[y][x], 0) + 1
for y in range(H):
    for x in range(W):
        a = label[y][x]
        if a >= 0 and size[a] < 20:
            for nx, ny in nb4(x, y):
                b = label[ny][nx]
                if b >= 0 and b != a and size[b] >= 20 and label0[ny][nx] == label0[y][x]:
                    size[b] += 1; size[a] -= 1; label[y][x] = b; break
storeys = {b: rnd0.randrange(1, 4) for b in size}

img = Image.new('RGBA', (W * T, H * T))
px = img.load()
def tex(t, X, Y, ox=0, oy=0):
    return t.getpixel(((X + ox) % t.size[0], (Y + oy) % t.size[1]))
def tint(c, k): return tuple(max(0, min(255, int(v * f))) for v, f in zip(c[:3], k)) + (255,)

# ---------- The ground ----------
# (an alley: a street a tile or two across, either way)
def narrow(x, y):
    across = lambda dx, dy: sum(1 for k in range(1, 3) if not solid(x + dx * k, y + dy * k))
    return across(1, 0) + across(-1, 0) < 2 or across(0, 1) + across(0, -1) < 2
for y in range(H):
    for x in range(W):
        c = L[y][x]
        if c not in WALK: continue
        t = {'.': ALLEY if narrow(x, y) else ASPHALT, 'P': GRASS, 'E': DIRT}[c]
        for v in range(T):
            for u in range(T): px[x * T + u, y * T + v] = tex(t, x * T + u, y * T + v)

# ---------- The buildings ----------
rnd = random.Random(1988)
labels = sorted(set(label[y][x] for y in range(H) for x in range(W) if label[y][x] >= 0))
TINTS = [(1, 1, 1), (0.92, 0.92, 0.96), (1.02, 0.98, 0.9), (0.86, 0.86, 0.9), (0.95, 0.9, 0.86), (0.8, 0.82, 0.88)]
tint_of = {b: TINTS[rnd.randrange(len(TINTS))] if b < OUT0 or b >= OUT0 + 100000 else (0.62, 0.62, 0.7) for b in labels}
off_of = {b: (rnd.randrange(96), rnd.randrange(96)) for b in labels}
for y in range(H):
    for x in range(W):
        b = label[y][x]
        if b < 0: continue
        k, (ox, oy) = tint_of[b], off_of[b]
        for v in range(T):
            for u in range(T): px[x * T + u, y * T + v] = tint(tex(ROOF, x * T + u, y * T + v, ox, oy), k)
# Roof edges: a lit lip along the top, shade down the sides and along a line between two buildings.
for y in range(H):
    for x in range(W):
        b = label[y][x]
        if b < 0: continue
        X, Y = x * T, y * T
        if lab(x, y - 1) != b:
            for u in range(T): px[X + u, Y] = tint(px[X + u, Y], (1.25, 1.25, 1.25)); px[X + u, Y + 1] = tint(px[X + u, Y + 1], (1.12, 1.12, 1.12))
        for dx, xs in ((-1, (0, 1)), (1, (T - 1, T - 2))):
            if lab(x + dx, y) != b:
                for v in range(T):
                    for i, u in enumerate(xs): px[X + u, Y + v] = tint(px[X + u, Y + v], (0.55, 0.55, 0.6) if i == 0 else (0.8, 0.8, 0.85))
        if lab(x, y + 1) != b and lab(x, y + 1) >= 0:
            for u in range(T): px[X + u, Y + T - 1] = tint(px[X + u, Y + T - 1], (0.5, 0.5, 0.55))

# Upper floors: where a building stands taller than the one in front of it (to its south), its wall shows above
# that one's roof, 20 pixels a storey.
for y in range(H - 1):
    for x in range(W):
        a, c = label[y][x], label[y + 1][x]
        if a < 0 or c < 0 or a == c or storeys[a] <= storeys[c]: continue
        k = 0
        while lab(x, y - k - 1) == a and k < 3: k += 1
        h = min((storeys[a] - storeys[c]) * 20, k * T + T - 6)
        foot = (y + 1) * T
        for u in range(T):
            X = x * T + u
            for v in range(h): px[X, foot - 1 - v] = WINDOWS.getpixel((X % WINDOWS.size[0], WINDOWS.size[1] - 1 - v))
            px[X, foot - 1 - h] = (120, 120, 132, 255); px[X, foot - 2 - h] = (232, 232, 236, 255)

# Rooftop things: tanks, or a skylight on a big roof, on roofs with room (clear of the shopfronts).
cells_of = {}
for y in range(H):
    for x in range(W):
        if label[y][x] >= 0: cells_of.setdefault(label[y][x], []).append((x, y))
def fits(b, x0, y0, w, h):
    # (on the roof, clear of a wall below it: a shopfront's six rows, or an upper floor's three)
    return all(lab(x, y) == b and all(lab(x, y + k) == b for k in range(1, 7 if label0[y][x] < OUT0 and not solid(x, y + 7) else 4)) for y in range(y0, y0 + h) for x in range(x0, x0 + w))
taken = set()
for b in labels:
    cells = cells_of[b]
    things = ([SKYLIGHT] if len(cells) > 100 and rnd.random() < 0.3 else []) + [TANKS] * (len(cells) // 60) + [AIRCON] * (1 + len(cells) // 30) + [VENT] * (len(cells) // 50)
    for thing in things:
        w, h = (thing.size[0] + T - 1) // T, (thing.size[1] + T - 1) // T
        spots = [(x, y) for x, y in cells if fits(b, x, y, w, h) and not any((x + dx, y + dy) in taken for dx in range(-1, w + 1) for dy in range(-1, h + 1))]
        if not spots or rnd.random() < 0.25: continue
        x, y = spots[rnd.randrange(len(spots))]
        img.paste(thing, (x * T, y * T))
        taken.update((x + dx, y + dy) for dx in range(w) for dy in range(h))

# Shopfronts: along each building's south side, where it meets open ground, its foot on the ground's edge, each
# stretch a run of shopfronts chosen for the building; a strip of pavement under them.
# (A stretch runs on from one building to the next along the street, so the shopfronts run on too.)
fronts = []   # (x0, x1, y): the cells x0..x1-1 at row y have a shopfront
cols = sorted(((y, x) for y in range(H) for x in range(W) if label[y][x] >= 0 and lab(x, y + 1) != label[y][x] and not solid(x, y + 1)))
run = []
for y, x in cols + [(None, None)]:
    if run and (x != run[-1][1] + 1 or y != run[-1][0]):
        fronts.append((run[0][1], run[-1][1] + 1, run[0][0])); run = []
    if x is not None: run.append((y, x))
for x0, x1, y in fronts:
    # (how far up the shopfront can go here: its building's own rows above, leaving a lip of roof)
    def room(x):
        b, k = label0[y][x], 0
        while 0 <= y - k - 1 and label0[y - k - 1][x] == b and k < 6: k += 1
        return k * T + T - 6
    # Whole shopfronts only, as many as fit, never the same twice running; what's left over is plain wall, shared
    # out between them and at the ends.
    order = list(range(len(FRONTS))); rnd.shuffle(order)
    width, chosen, last = (x1 - x0) * T, [], None
    while True:
        fit = [k for k in order if FRONTS[k].size[0] <= width - sum(FRONTS[j].size[0] for j in chosen) and k != last]
        if not fit: break
        last = fit[0]; chosen.append(last); order = order[1:] + order[:1]
    spare = width - sum(FRONTS[k].size[0] for k in chosen)
    gaps = [spare // (len(chosen) + 1) + (1 if g < spare % (len(chosen) + 1) else 0) for g in range(len(chosen) + 1)]
    strip = []
    for g, k in zip(gaps, chosen + [None]):
        strip += [(WALL, (x0 * T + len(strip) + u) % WALL.size[0]) for u in range(g)]
        if k is not None: strip += [(FRONTS[k], u) for u in range(FRONTS[k].size[0])]
    foot = (y + 1) * T
    for u, (f, fu) in enumerate(strip):
        X = x0 * T + u
        h = min(FH, room(X // T))
        for v in range(h):
            px[X, foot - 1 - v] = f.getpixel((fu, FH - 1 - v))
        for v in (h, h + 1):   # (the parapet over it)
            px[X, foot - 1 - v] = (232, 232, 236, 255) if v == h + 1 else (120, 120, 132, 255)
    # (a red sign down the wall, now and then)
    if x1 - x0 >= 4 and rnd.random() < 0.35 and room(x0) >= 70:
        sx = x0 * T + rnd.randrange(0, (x1 - x0) * T - 26)
        img.alpha_composite(SIGN, (sx, foot - SIGN.size[1] - 6))
    for x in range(x0, x1):
        if L[y + 1][x] == '.':
            for v in range(T):
                for u in range(T): px[x * T + u, (y + 1) * T + v] = PAVING.getpixel(((x * T + u) % 240, v))

# ---------- West Park ----------
# Trees scattered through it, none too near another, the bottom of each solid.
blocked = set()
park = [(x, y) for y in range(H) for x in range(W) if L[y][x] == 'P']
rnd.shuffle(park)
planted = []
for x, y in park:
    t = TREES[rnd.randrange(len(TREES))]
    w, h = (t.size[0] + T - 1) // T, (t.size[1] + T - 1) // T
    if not all(at(x + dx, y + dy) == 'P' for dx in range(-1, w + 1) for dy in range(-1, h + 1)): continue
    if any(abs(x - px_) < 5 and abs(y - py_) < 4 for px_, py_ in planted) or rnd.random() < 0.5: continue
    planted.append((x, y))
for x, y in sorted(planted, key=lambda p: p[1]):
    t = TREES[(x * 7 + y * 3) % len(TREES)]
    w, h = (t.size[0] + T - 1) // T, (t.size[1] + T - 1) // T
    img.alpha_composite(t, (x * T, y * T + h * T - t.size[1]))
    for dx in range(w): blocked.add((x + dx, y + h - 1))

# ---------- The Empty Lot ----------
# A wire fence round the lot, open to the street; the Time Machine in its middle (tools/lib/realm-art.js's, as the
# Realm Hub's and Domino City's are).
lot = [(x, y) for y in range(H) for x in range(W) if L[y][x] == 'E']
lx0, lx1 = min(x for x, y in lot), max(x for x, y in lot)
ly0, ly1 = min(y for x, y in lot), max(y for x, y in lot)
for x, y in lot:
    for dx, dy in ((0, -1), (1, 0), (0, 1), (-1, 0)):
        nb = at(x + dx, y + dy)
        if nb == 'E' or nb == '.': continue
        X, Y = x * T, y * T
        for k in range(T):
            u, v = (k, 2) if dy == -1 else (k, T - 3) if dy == 1 else (2 if dx == -1 else T - 3, k)
            for w in range(2):
                p = (X + u + (w if dy == 0 else 0), Y + v + (w if dy != 0 else 0))
                px[p] = (90, 96, 108, 255) if (k % 8) < 2 else (150, 158, 170, 255)
TM = json.loads(subprocess.check_output(['node', '-e', 'const c=require("./tools/lib/realm-art").timeMachine();'
    'process.stdout.write(JSON.stringify({w:c.w,h:c.h,d:Buffer.from(c.rgba).toString("base64")}))'], cwd=ROOT))
tm = Image.frombytes('RGBA', (TM['w'], TM['h']), base64.b64decode(TM['d']))
MACHINE = ((lx0 + lx1) // 2 - 1, (ly0 + ly1) // 2 - 2)
img.alpha_composite(tm, (MACHINE[0] * T, MACHINE[1] * T))
for dy in range(3):
    for dx in range(3): blocked.add((MACHINE[0] + dx, MACHINE[1] + dy))

img.convert('RGB').save(os.path.join(MAPS, NAME + '.png'), optimize=True)
border = Image.new('RGB', (32, 32))
for y in range(32):
    for x in range(32): border.putpixel((x, y), tint(tex(ROOF, x, y), (0.62, 0.62, 0.7))[:3])
border.save(os.path.join(MAPS, NAME + '-border.png'))

# ---------- Kiryu and Majima ----------
def people(sheet):
    src = Image.open(sheet).convert('RGB')
    def half(f):
        p = f.load(); out = Image.new('RGBA', (32, 32), (0, 0, 0, 0)); o = out.load()
        for y in range(32):
            for x in range(32):
                cs = [p[x * 2 + dx, y * 2 + dy] for dy in (0, 1) for dx in (0, 1)]
                cs = [c for c in cs if c != (255, 0, 255)]
                if len(cs) >= 2: o[x, y] = tuple(sum(c[i] for c in cs) // len(cs) for i in range(3)) + (255,)
        return out
    # (FireRed's order: standing down, up, left; then two steps down, up, left.)
    ORDER = [(0, 0, 0), (0, 2, 0), (0, 1, 1), (1, 0, 0), (2, 0, 0), (1, 2, 0), (2, 2, 0), (1, 1, 1), (2, 1, 1)]
    for who, ox in (('kiryu', 0), ('majima', 256)):
        out = Image.new('RGBA', (32 * 9, 32), (0, 0, 0, 0))
        for i, (c, r, flip) in enumerate(ORDER):
            f = src.crop((ox + c * 64, r * 64, ox + c * 64 + 64, r * 64 + 64))
            if flip: f = f.transpose(Image.FLIP_LEFT_RIGHT)
            out.alpha_composite(half(f), (i * 32, 0))
        out.save(os.path.join(SPRITES, 'lad_' + who + '.png'))
        # (and in battle: the fighting stance, the fifth row's first frame, as it is)
        stance = src.crop((ox, 4 * 64, ox + 64, 5 * 64)).convert('RGBA'); sp = stance.load()
        for y in range(64):
            for x in range(64):
                if sp[x, y][:3] == (255, 0, 255): sp[x, y] = (0, 0, 0, 0)
        stance.save(os.path.join(SPRITES, 'lad_' + who + '_battle.png'))
people(os.path.join(ROOT, 'tools/data/kamurocho-people.png'))

# ---------- The map's data ----------
collision = [0 if not solid(x, y) and (x, y) not in blocked else 1 for y in range(H) for x in range(W)]
SPOTS = json.load(open(os.path.join(ROOT, 'tools/data/kamurocho.json')))
for p in SPOTS['people']:
    assert not collision[p['y'] * W + p['x']], 'someone stands in a wall: ' + p['name']
ARRIVE = {'x': MACHINE[0] + 1, 'y': MACHINE[1] + 3, 'facing': 'down'}
the_map = {
    'name': NAME, 'title': 'Kamurocho', 'width': W, 'height': H, 'type': 'city', 'realm': 'yakuza', 'music': 'dp_veilstone_city',
    'cycling': False, 'showName': True, 'top': False, 'borderWidth': 2, 'borderHeight': 2,
    'collision': collision, 'elevation': [3] * (W * H), 'behavior': [0] * (W * H), 'encounter': [0] * (W * H),
    'connections': [], 'warps': [],
    'signs': [{'x': MACHINE[0] + k, 'y': MACHINE[1] + 2, 'script': 'Kamurocho_TimeMachine', 'text': None} for k in range(3)] +
             [{'x': s['x'], 'y': s['y'], 'script': 'Kamurocho_Sign', 'text': s['text']} for s in SPOTS['signs']],
    'triggers': [], 'hidden': [],
    'people': [{'id': i, 'x': p['x'], 'y': p['y'], 'movement': p.get('movement', 'face_down'), 'rangeX': 2, 'rangeY': 2,
                'script': 'Kamurocho_' + p['name'], 'flag': None, 'text': p['text'], 'sprite': p['sprite'],
                'width': 32, 'height': 32, 'frames': 9, 'localId': 'LOCALID_KAMUROCHO_' + p['name'].upper()}
               for i, p in enumerate(SPOTS['people'])],
    'wild': None}
INFO = {'arrive': dict(ARRIVE, map=NAME), 'lot': {'x0': lx0, 'y0': ly0, 'x1': lx1, 'y1': ly1}}
START = '// The Like a Dragon realm (tools/build-kamurocho.py): Kamurocho.\n'
END = '// (End of the Like a Dragon realm.)\n'
js = START + 'window.WORLD_MAPS[' + json.dumps(NAME) + '] = ' + json.dumps(the_map, separators=(',', ':')) + ';\n' + \
     'window.KAMUROCHO = ' + json.dumps(INFO, separators=(',', ':')) + ';\n' + END
f = os.path.join(ROOT, 'data/emerald-maps.js')
text = open(f, encoding='utf-8').read()
a = text.find(START)
if a >= 0: text = text[:a] + text[text.index(END, a) + len(END):]
# (before the Time Machine's, which it reads)
b = text.find('// The Time Machine and the Realm Hub (tools/build-time-machine.js')
text = text[:b] + js + text[b:] if b >= 0 else text + js
open(f, 'w', encoding='utf-8').write(text)
print(NAME, W, 'x', H, '-', len(labels), 'buildings,', len(fronts), 'shopfronts')
