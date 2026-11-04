#!/usr/bin/env python3
# Kamurocho, top down (the Like a Dragon realm's town on the overworld, in the GBA style of the tiles given for the
# game: assets/kamurocho/topdown, 16x16, its ground, buildings and props sheets and tiles.json naming each tile).
#
# Laid out from the picture of Yakuza 0's map (assets/kamurocho/map-source.webp, as tools/build-kamurocho-map.py
# reads it), a tile for every five of its pixels: its roads are the streets, its blocks the buildings, West Park the
# park. Then: every street's road drawn back along its line (data/kamurocho-street.js's map lines, so none is broken
# where a name was written on it), Theater Square opened into a plaza and the Empty Lot fenced off; and each tile
# dressed: asphalt (its centre lines, zebra crossings where the streets meet), pavements along the buildings (kerbs
# on the road's side), lanes too narrow for a road paved as alleys; each block's rows facing south a building's front
# (a storey of windows, its awnings or signs, its shopfronts and a door), the rest its roof; the park's trees inside
# its fence; lamps, vending machines, bins and bicycles along the pavements.
#
#   python3 tools/build-kamurocho-town.py
#
# Writes assets/world/maps/Kamurocho.png and -border.png, and data/kamurocho-town.js: the map (window.WORLD_MAPS
# .Kamurocho: its size, what's walkable, ...) and window.KAMUROCHO_TOWN (each tile's kind and the doors, for
# ui/game.js: which door goes where).
import importlib.util, json, os, random
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TD = os.path.join(ROOT, 'assets/kamurocho/topdown')
OUT = os.path.join(ROOT, 'assets/world/maps')
SCALE, CROP = 0.2, (355, 34)       # (a tile for every five of the map picture's pixels; where the town's cut from it)

spec = importlib.util.spec_from_file_location('kmap', os.path.join(ROOT, 'tools/build-kamurocho-map.py'))
kmap = importlib.util.module_from_spec(spec); spec.loader.exec_module(kmap)

# ---------- The tiles ----------
TILES = json.load(open(os.path.join(TD, 'tiles.json')))['tiles']
SHEETS = {}
def tile(name):
    t = TILES[name]
    if t['image'] not in SHEETS: SHEETS[t['image']] = Image.open(os.path.join(TD, t['image'])).convert('RGBA')
    return SHEETS[t['image']].crop((t['x'], t['y'], t['x'] + 16, t['y'] + 16))

# The kinds of tile: what each grid cell is.
OUTSIDE, ROAD, BLOCK, PARK, PLAZA, LOT = 0, 1, 2, 3, 7, 8

def to_tile(x, y): return (x - CROP[0]) * SCALE, (y - CROP[1]) * SCALE

# (Each street's road width, in tiles, drawn along its line.)
WIDTH = {'taihei': 5, 'showa': 4, 'senryo': 4, 'shichifuku': 4, 'tenkaichi': 4, 'nakamichi': 4, 'pink': 4, 'theater-alley': 3,
         'hotels': 3, 'street': 3, 'theater': 3, 'alley': 3, 'champion': 2, 'nakamichi-alley': 2, 'pink-alley': 2}

def lines():
    import subprocess
    js = subprocess.run(['node', '-e', 'global.window={WORLD_MAPS:{}};require("./data/kamurocho-street.js");const S=window.KAMUROCHO_STREET.map.scenes;'
                         'const o={};for(const[k,v] of Object.entries(S)) if(v.line) o[k]=v.line; console.log(JSON.stringify(o))'],
                        cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return json.loads(js)

def layout():
    g = kmap.grid(SCALE, ring_r=10).copy()
    g[(g >= 4) & (g <= 6)] = BLOCK                      # (the coloured buildings are buildings: they keep their own signs, below)
    g[g < 0] = BLOCK
    H, W = g.shape
    # (every street's road along its line, as wide as it is)
    for sid, line in lines().items():
        w = WIDTH.get(sid, 3)
        for (x0, y0), (x1, y1) in zip(line, line[1:]):
            (a, b), (c, d) = to_tile(x0, y0), to_tile(x1, y1)
            n = int(max(abs(c - a), abs(d - b))) + 1
            for k in range(n + 1):
                x, y = a + (c - a) * k / n, b + (d - b) * k / n
                for j in range(-(w // 2), w - w // 2):
                    for i in range(-(w // 2), w - w // 2):
                        X, Y = int(round(x)) + i, int(round(y)) + j
                        if 0 <= X < W and 0 <= Y < H and g[Y, X] in (BLOCK, OUTSIDE): g[Y, X] = ROAD
    # (Theater Square: the open plaza; the Empty Lot, fenced off in the Kamuro Shopping Area)
    x0, y0 = map(int, to_tile(482, 430)); x1, y1 = map(int, to_tile(592, 575))
    g[y0:y1, x0:x1] = PLAZA
    x0, y0 = map(int, to_tile(612, 505)); x1, y1 = map(int, to_tile(662, 545))
    g[y0:y1, x0:x1] = LOT
    # (little islands of building in a road, and holes of road inside a building: what's round them)
    for kind, small in ((BLOCK, 6), (ROAD, 6)):
        seen = np.zeros_like(g, bool)
        for Y in range(H):
            for X in range(W):
                if g[Y, X] != kind or seen[Y, X]: continue
                comp, todo = [], [(X, Y)]; seen[Y, X] = True
                while todo:
                    x, y = todo.pop(); comp.append((x, y))
                    for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        u, v = x + a, y + b
                        if 0 <= u < W and 0 <= v < H and not seen[v, u] and g[v, u] == kind: seen[v, u] = True; todo.append((u, v))
                if len(comp) <= small:
                    for x, y in comp: g[y, x] = BLOCK if kind == ROAD else ROAD
    # (a building one tile thin is no building: road)
    for Y in range(1, H - 1):
        for X in range(1, W - 1):
            if g[Y, X] == BLOCK and ((g[Y - 1, X] == ROAD and g[Y + 1, X] == ROAD) or (g[Y, X - 1] == ROAD and g[Y, X + 1] == ROAD)): g[Y, X] = ROAD
    return g

# ---------- Dressing it ----------
def build():
    g = layout(); H, W = g.shape
    rnd = random.Random(7)
    pic = Image.new('RGBA', (W * 16, H * 16), (20, 20, 30, 255))
    names = [[None] * W for _ in range(H)]
    coll = np.ones((H, W), int)
    walk = lambda x, y: 0 <= x < W and 0 <= y < H and g[y, x] in (ROAD, PLAZA, LOT)
    built = lambda x, y: 0 <= x < W and 0 <= y < H and g[y, x] == BLOCK
    # (how far the road runs each way from a tile: its width across, to tell a street from an alley)
    def run(x, y, dx, dy):
        n = 0
        while walk(x + dx * (n + 1), y + dy * (n + 1)) and g[y + dy * (n + 1), x + dx * (n + 1)] == ROAD: n += 1
        return n
    side = np.zeros((H, W), bool)
    for y in range(H):
        for x in range(W):
            if g[y, x] == ROAD and any(0 <= x + a < W and 0 <= y + b < H and g[y + b, x + a] in (BLOCK, PARK, OUTSIDE, LOT)
                                       for a in (-1, 0, 1) for b in (-1, 0, 1)): side[y, x] = True
    doors = []
    for y in range(H):
        for x in range(W):
            k = g[y, x]; h = (x * 7 + y * 13) % 5
            if k == ROAD:
                across_h, across_v = run(x, y, -1, 0) + run(x, y, 1, 0) + 1, run(x, y, 0, -1) + run(x, y, 0, 1) + 1
                narrow = min(across_h, across_v) <= 3
                if narrow: n = 'alley_alt' if h == 0 else 'alley_plain'
                elif side[y, x]:
                    n = 'side_alt' if (x + y) % 2 else 'side_plain'
                    for (a, b), c in (((0, 1), 'side_curb_s'), ((0, -1), 'side_curb_n'), ((1, 0), 'side_curb_e'), ((-1, 0), 'side_curb_w')):
                        if walk(x + a, y + b) and not side[y + b, x + a] and g[y + b, x + a] == ROAD: n = c
                else:
                    n = ['road_plain', 'road_plain', 'road_alt', 'road_plain', 'road_crack'][h] if (x * 3 + y) % 11 else 'road_alt'
                    if (x * 31 + y * 17) % 97 == 0: n = 'manhole'
                    # (a centre line down the middle of a street wide enough, the way it runs)
                    l, r_, u, d = run(x, y, -1, 0), run(x, y, 1, 0), run(x, y, 0, -1), run(x, y, 0, 1)
                    if across_h <= across_v and across_h >= 4 and l == across_h // 2 and across_v > 8: n = 'lane_v'
                    elif across_v < across_h and across_v >= 4 and u == across_v // 2 and across_h > 8: n = 'lane_h'
                coll[y, x] = 0
            elif k == PLAZA:
                n = 'side_alt' if (x + y) % 2 else 'side_plain2'; coll[y, x] = 0
            elif k == LOT:
                n = 'parking_a' if (x + y) % 2 else 'parking_b'; coll[y, x] = 0
            elif k == PARK:
                n = 'side_alt' if (x + y) % 2 else 'side_plain'
            elif k == BLOCK:
                n = 'roof_plain'
            else: n = None
            names[y][x] = n
    # (zebra crossings: where two streets meet, one tile of asphalt just outside the meeting, across each street
    # leading out of it; the stripes run the way the street does)
    asph = lambda x, y: 0 <= x < W and 0 <= y < H and names[y][x] in ('road_plain', 'road_alt', 'road_crack', 'manhole', 'lane_v', 'lane_h')
    def span(x, y, dx, dy):
        n = 0
        while asph(x + dx * (n + 1), y + dy * (n + 1)): n += 1
        return n
    # (a meeting: asphalt that runs on more than six tiles both across and along, as only where two streets cross)
    inter = {(x, y) for y in range(H) for x in range(W)
             if asph(x, y) and span(x, y, -1, 0) + span(x, y, 1, 0) + 1 > 6 and span(x, y, 0, -1) + span(x, y, 0, 1) + 1 > 6}
    for (x, y) in inter: names[y][x] = 'road_plain'
    marks = {}
    for (x, y) in inter:
        for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            k = (x + a, y + b)
            if k in inter or not asph(*k): continue
            marks[k] = 'cross_h' if b == 0 else 'cross_v'
    for (x, y), n in marks.items(): names[y][x] = n
    # (each building: its rows facing south a front three high, a storey of windows, then its awnings or signs, then
    # its shopfronts with a door; the rest its roof, an edge along its top, a vent here and there)
    WALLS = ['wall_stone', 'wall_cream', 'wall_dark', 'wall_brick', 'wall_stone2', 'wall_brick2', 'wall_cream2']
    WINDOWS = {'wall_stone': ['window_lit', 'window_dark'], 'wall_stone2': ['window_lit2', 'window_dark2'], 'wall_dark': ['window_lit3', 'window_dark3'],
               'wall_cream': ['window_lit2', 'window_dark2'], 'wall_cream2': ['window_lit', 'window_dark'], 'wall_brick': ['window_lit', 'window_dark3'],
               'wall_brick2': ['window_lit3', 'window_dark']}
    SIGNS = ['awning_red', 'awning_pink', 'sign_pink', 'sign_blue', 'sign_gold', 'sign_pink2']
    SHOPS = ['shop_red', 'shop_blue', 'shop_pink', 'shop_red2', 'shop_blue2']
    DOORS = ['door_glass', 'door_wood', 'door_glass2', 'door_metal', 'door_wood2']
    for y in range(H):
        x = 0
        while x < W:
            # (a front: block tiles whose tile below is walkable)
            if not (built(x, y) and walk(x, y + 1)): x += 1; continue
            x1 = x
            while x1 + 1 < W and built(x1 + 1, y) and walk(x1 + 1, y + 1): x1 += 1
            # (cut into buildings 3 to 6 wide)
            bx = x
            while bx <= x1:
                bw = min(x1 - bx + 1, rnd.randint(3, 6))
                if x1 - (bx + bw) + 1 < 3: bw = x1 - bx + 1
                wall = rnd.choice(WALLS); sign = rnd.choice(SIGNS); shop = rnd.choice(SHOPS); win = WINDOWS[wall]
                door = bx + bw // 2
                for cx in range(bx, bx + bw):
                    rows = [y]
                    if built(cx, y - 1): rows.append(y - 1)
                    if len(rows) == 2 and built(cx, y - 2): rows.append(y - 2)
                    for k, ry in enumerate(rows):
                        if k == 0: names[ry][cx] = rnd.choice(DOORS) if cx == door else shop
                        elif k == 1: names[ry][cx] = sign
                        else: names[ry][cx] = win[(cx + ry) % 2] if cx not in (bx, bx + bw - 1) or bw < 4 else wall
                if bw >= 2: doors.append({'x': door, 'y': y})
                bx += bw
            x = x1 + 1
    for y in range(H):
        for x in range(W):
            if names[y][x] == 'roof_plain':
                if not built(x, y - 1): names[y][x] = 'roof_edge'
                elif (x * 13 + y * 7) % 23 == 0: names[y][x] = 'roof_vent'
                elif (x * 5 + y * 11) % 31 == 0: names[y][x] = 'ac_unit'
                elif (x + y) % 9 == 0: names[y][x] = 'roof_plain2'
    # (the park's fence round it, its trees inside)
    props = {}
    for y in range(H):
        for x in range(W):
            if g[y, x] != PARK: continue
            edge = any(not (0 <= x + a < W and 0 <= y + b < H) or g[y + b, x + a] != PARK for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if edge: names[y][x] = 'fence_a'
            elif x % 3 == 0 and y % 3 == 0: props[(x, y)] = ['tree_a', 'tree_b', 'tree_c'][(x * y) % 3]
            else: coll[y, x] = 0
    # (the Empty Lot's fence, a gap on its south side to go in by)
    ly = [y for y in range(H) for x in range(W) if g[y, x] == LOT]
    lx = [x for y in range(H) for x in range(W) if g[y, x] == LOT]
    if ly:
        for y in range(min(ly), max(ly) + 1):
            for x in range(min(lx), max(lx) + 1):
                if (x in (min(lx), max(lx)) or y == min(ly)) and g[y, x] == LOT: props[(x, y)] = 'barrier_a'
    # (along the pavements in front of the buildings: lamps, vending machines, bins, bicycles, cones; never before a door)
    door_at = {(d['x'], d['y'] + 1) for d in doors}
    STREET = ['lamp_a', 'vending_red', 'bin_a', 'bike_a', 'lamp_b', 'vending_blue', 'bollard_a', 'signpost_a', 'potted_a', 'lamp_c', 'cone_a', 'trash_a', 'bench_a']
    for y in range(H):
        for x in range(W):
            if not side[y, x] or (x, y) in door_at or (x, y) in props: continue
            if built(x, y - 1) and (x * 17 + y * 5) % 7 == 0 and not any((x + a, y) in props for a in (-1, 1)):
                props[(x, y)] = STREET[(x * 3 + y) % len(STREET)]
    # (in the plaza: planters round its middle, benches and lamps)
    py = [y for y in range(H) for x in range(W) if g[y, x] == PLAZA]
    px_ = [x for y in range(H) for x in range(W) if g[y, x] == PLAZA]
    if py:
        cx, cy = (min(px_) + max(px_)) // 2, (min(py) + max(py)) // 2
        for a, b in ((-3, -3), (3, -3), (-3, 3), (3, 3)): props[(cx + a, cy + b)] = 'potted_b'
        for a in (-6, 6): props[(cx + a, cy)] = 'lamp_c'
        for a in (-1, 1): props[(cx + a, cy + 5)] = 'bench_b'
    # (draw it all; props on what's under them, and in the way)
    for y in range(H):
        for x in range(W):
            if names[y][x]: pic.alpha_composite(tile(names[y][x]), (x * 16, y * 16))
    for (x, y), n in props.items():
        pic.alpha_composite(tile(n), (x * 16, y * 16)); coll[y, x] = 1
    # (where you can't walk: buildings, the park, the fence)
    for y in range(H):
        for x in range(W):
            if names[y][x] == 'fence_a': coll[y, x] = 1
    return g, names, props, coll, doors, pic

def main():
    g, names, props, coll, doors, pic = build()
    H, W = g.shape
    pic.convert('RGB').save(os.path.join(OUT, 'Kamurocho.png'), optimize=True)
    Image.new('RGB', (32, 32), (20, 20, 30)).save(os.path.join(OUT, 'Kamurocho-border.png'))
    kinds = ''.join('.RBPpL'[[OUTSIDE, ROAD, BLOCK, PARK, PLAZA, LOT].index(int(k))] if int(k) in (OUTSIDE, ROAD, BLOCK, PARK, PLAZA, LOT) else 'B' for k in g.ravel())
    m = {'name': 'Kamurocho', 'title': 'Kamurocho', 'width': W, 'height': H, 'type': 'city', 'realm': 'yakuza', 'music': 'dp_veilstone_city',
         'cycling': False, 'showName': True, 'top': False, 'borderWidth': 2, 'borderHeight': 2,
         'collision': [int(v) for v in coll.ravel()], 'elevation': [0] * (W * H), 'behavior': [0] * (W * H), 'encounter': [0] * (W * H),
         'connections': [], 'warps': [], 'signs': [], 'triggers': [], 'hidden': [], 'people': [], 'wild': None}
    js = ('// Kamurocho, top down: made by tools/build-kamurocho-town.py from the tiles given for the game and the picture of\n'
          '// Yakuza 0\'s map. (Its people, doors and signs: ui/game.js, from KAMUROCHO_TOWN.)\n'
          'window.WORLD_MAPS.Kamurocho = ' + json.dumps(m, separators=(',', ':')) + ';\n'
          'window.KAMUROCHO_TOWN = ' + json.dumps({'width': W, 'height': H, 'scale': SCALE, 'crop': CROP, 'kinds': kinds, 'doors': doors}, separators=(',', ':')) + ';\n')
    open(os.path.join(ROOT, 'data/kamurocho-town.js'), 'w').write(js)
    print('Kamurocho: %dx%d tiles, %d doors' % (W, H, len(doors)))

if __name__ == '__main__':
    main()
