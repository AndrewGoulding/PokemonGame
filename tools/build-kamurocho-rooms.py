#!/usr/bin/env python3
# Kamurocho's insides, top down (the town's rooms on the overworld, with tools/build-kamurocho-town.py's streets):
# this game's own, drawn here in the flat GBA style of the tiles given for the town (assets/kamurocho/topdown): its
# floors (wood, a shop's tiles, a bar's carpet, tatami, concrete, marble), its walls (two tiles high along the top, a
# baseboard under them), and their furniture, each a few tiles: shelves and a drinks fridge, counters, a bar and its
# stools, booths, the karaoke stage and its screen, desks and sofas, a family's crest, filing cabinets and a safe, a
# low table and a futon, crates and a manhole, the Time Machine (assets/kamurocho/time-machine.png).
#
# Each room: its size in tiles, its floor and walls, its furniture, the mat you leave by (its bottom row's middle;
# none under the street, where it's the ladder) and its spots (what's there to use: the shop's counter, the karaoke stage, the Time Machine, the ladder up, the
# manhole down).
#
#   python3 tools/build-kamurocho-rooms.py
#
# Writes assets/world/maps/Kmr_<Room>.png and -border.png, and data/kamurocho-rooms.js (window.WORLD_MAPS for each,
# and window.KAMUROCHO_ROOMS: each one's mat and spots, for ui/game.js).
import json, os, random
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets/world/maps')
INK = (34, 30, 44)

def shade(c, k): return tuple(max(0, min(255, int(v * k))) for v in c)

# ---------- Floors and walls: a 16x16 tile each ----------
def floor_tile(kind, x, y):
    t = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(t)
    if kind == 'wood':
        base = (150, 104, 66) if (y % 2) else (140, 96, 60)
        d.rectangle((0, 0, 15, 15), fill=base)
        for yy in (0, 8): d.line((0, yy, 15, yy), fill=shade(base, 0.72))
        off = 4 if (x + y) % 2 else 11; d.line((off, 1, off, 7), fill=shade(base, 0.8)); d.line((15 - off, 9, 15 - off, 15), fill=shade(base, 0.8))
    elif kind == 'shop':
        a, b = (236, 236, 240), (200, 214, 226)
        d.rectangle((0, 0, 15, 15), fill=a if (x + y) % 2 else b); d.line((0, 15, 15, 15), fill=(180, 186, 196)); d.line((15, 0, 15, 15), fill=(180, 186, 196))
    elif kind == 'carpet':
        base = (120, 30, 54); d.rectangle((0, 0, 15, 15), fill=base)
        for k in range(0, 16, 4): d.point((k + (y % 2) * 2, k), fill=(150, 50, 80)); d.point((15 - k, k), fill=(96, 22, 44))
    elif kind == 'tatami':
        base = (180, 176, 110); d.rectangle((0, 0, 15, 15), fill=base)
        for yy in range(1, 16, 2): d.line((0, yy, 15, yy), fill=(166, 162, 98))
        if x % 2 == 0: d.line((0, 0, 0, 15), fill=(70, 90, 60))
        if y % 3 == 0: d.line((0, 0, 15, 0), fill=(70, 90, 60))
    elif kind == 'concrete':
        base = (104, 104, 110); d.rectangle((0, 0, 15, 15), fill=base); rnd = random.Random(x * 31 + y)
        for _ in range(6): d.point((rnd.randrange(16), rnd.randrange(16)), fill=(90, 90, 96))
        d.line((0, 15, 15, 15), fill=(92, 92, 98))
    elif kind == 'marble':
        base = (226, 222, 214); d.rectangle((0, 0, 15, 15), fill=base); rnd = random.Random(x * 7 + y * 13)
        for _ in range(2):
            x0, y0 = rnd.randrange(16), rnd.randrange(16); d.line((x0, y0, x0 + 5, y0 + 3), fill=(204, 200, 194))
        d.line((0, 15, 15, 15), fill=(200, 196, 188)); d.line((15, 0, 15, 15), fill=(200, 196, 188))
    elif kind == 'water':
        d.rectangle((0, 0, 15, 15), fill=(40, 70, 86))
        for yy in (3, 9): d.line(((x % 2) * 4, yy, (x % 2) * 4 + 6, yy), fill=(70, 110, 126))
    return t

def wall_tile(colour, row, x):
    """row 0: the wall's top (dark trim); row 1: its face, a baseboard at its foot."""
    t = Image.new('RGBA', (16, 16)); d = ImageDraw.Draw(t)
    d.rectangle((0, 0, 15, 15), fill=colour)
    if row == 0:
        d.rectangle((0, 0, 15, 3), fill=shade(colour, 0.45)); d.line((0, 4, 15, 4), fill=shade(colour, 0.7))
    else:
        d.rectangle((0, 12, 15, 15), fill=shade(colour, 0.6)); d.line((0, 12, 15, 12), fill=shade(colour, 0.4))
    if x % 4 == 3: d.line((15, 5 if row == 0 else 0, 15, 11), fill=shade(colour, 0.85))
    return t

# ---------- Furniture: drawn straight onto the room, in pixels; each says what tiles it fills ----------
def box(d, x0, y0, x1, y1, fill, top=None):
    """A flat block: its fill, its top lighter, outlined."""
    d.rectangle((x0, y0, x1, y1), fill=INK)
    d.rectangle((x0 + 1, y0 + 1, x1 - 1, y1 - 1), fill=fill)
    d.rectangle((x0 + 1, y0 + 1, x1 - 1, min(y1 - 1, y0 + 4)), fill=top or shade(fill, 1.25))

def furniture(d, kind, tx, ty, w, h, rnd):
    X, Y, X1, Y1 = tx * 16, ty * 16, (tx + w) * 16 - 1, (ty + h) * 16 - 1
    if kind == 'shelf':
        box(d, X, Y + 2, X1, Y1 - 1, (110, 116, 130))
        for row in range(Y + 7, Y1 - 3, 6):
            for k in range(X + 3, X1 - 3, 4):
                d.rectangle((k, row, k + 2, row + 3), fill=rnd.choice([(230, 70, 70), (70, 160, 230), (240, 210, 70), (90, 200, 110), (240, 140, 200), (250, 250, 250)]))
    elif kind == 'fridge':
        box(d, X, Y, X1, Y1, (170, 200, 220), (210, 230, 240))
        for k in range(X + 3, X1 - 2, 6):
            d.rectangle((k, Y + 6, k + 4, Y1 - 3), fill=(120, 160, 190))
            for yy in range(Y + 8, Y1 - 4, 5): d.rectangle((k + 1, yy, k + 3, yy + 2), fill=rnd.choice([(240, 90, 60), (250, 220, 70), (90, 200, 120), (250, 250, 250)]))
    elif kind == 'counter':
        box(d, X, Y + 3, X1, Y1, (200, 200, 206), (236, 236, 240)); d.rectangle((X, Y1 - 4, X1, Y1), fill=(60, 120, 190))
    elif kind == 'register':
        d.rectangle((X + 3, Y + 4, X + 12, Y + 11), fill=INK); d.rectangle((X + 4, Y + 5, X + 11, Y + 8), fill=(110, 220, 140))
    elif kind == 'bar':
        box(d, X, Y + 2, X1, Y1, (110, 66, 40), (160, 104, 64))
    elif kind == 'stool':
        d.ellipse((X + 3, Y + 4, X + 12, Y + 12), fill=INK); d.ellipse((X + 4, Y + 5, X + 11, Y + 11), fill=(170, 40, 60))
    elif kind == 'bottles':
        d.rectangle((X, Y + 9, X1, Y + 11), fill=(90, 56, 34))
        for k in range(X + 2, X1 - 1, 3):
            c = rnd.choice([(150, 84, 32), (60, 120, 60), (200, 200, 210), (140, 30, 40), (210, 170, 60)])
            d.rectangle((k, Y + 3, k + 1, Y + 8), fill=c)
    elif kind == 'booth':
        box(d, X, Y, X1, Y1, (160, 26, 44), (196, 50, 70)); box(d, X + 8, Y + 8, X1 - 8, Y1 - 8, (90, 56, 36))
    elif kind == 'stage':
        d.rectangle((X, Y, X1, Y1), fill=(70, 34, 60)); d.rectangle((X, Y, X1, Y + 2), fill=(150, 100, 140))
        d.rectangle((X + 2, Y + 3, X1 - 2, Y1 - 2), fill=(90, 44, 76))
    elif kind == 'screen':
        box(d, X, Y + 1, X1, Y1 - 2, (40, 40, 48)); d.rectangle((X + 3, Y + 4, X1 - 3, Y1 - 6), fill=(50, 100, 170))
        d.rectangle((X + 6, Y1 - 10, X1 - 6, Y1 - 8), fill=(250, 250, 250)); d.rectangle((X + 6, Y1 - 10, (X + X1) // 2, Y1 - 8), fill=(255, 208, 64))
    elif kind == 'mic':
        d.line((X + 8, Y + 4, X + 8, Y + 14), fill=(170, 170, 180)); d.ellipse((X + 6, Y + 1, X + 10, Y + 6), fill=(60, 60, 70))
    elif kind == 'sofa':
        box(d, X, Y + 2, X1, Y1, (30, 30, 34), (56, 56, 62))
    elif kind == 'whitesofa':
        box(d, X, Y + 2, X1, Y1, (210, 206, 198), (236, 234, 228))
    elif kind == 'table':
        box(d, X + 2, Y + 3, X1 - 2, Y1 - 3, (96, 60, 40))
    elif kind == 'glasstable':
        d.rectangle((X + 2, Y + 4, X1 - 2, Y1 - 4), fill=INK); d.rectangle((X + 3, Y + 5, X1 - 3, Y1 - 5), fill=(170, 210, 220))
    elif kind == 'desk':
        box(d, X, Y + 2, X1, Y1, (84, 50, 32), (120, 78, 50))
        d.rectangle((X + 6, Y + 5, X + 14, Y + 9), fill=(230, 230, 220)); d.rectangle((X1 - 12, Y + 4, X1 - 6, Y + 9), fill=(40, 40, 44))
    elif kind == 'chair':
        box(d, X + 3, Y + 2, X1 - 3, Y1 - 2, (24, 24, 28))
    elif kind == 'plant':
        d.rectangle((X + 5, Y + 10, X + 10, Y + 15), fill=(150, 90, 50)); d.ellipse((X + 1, Y + 1, X + 14, Y + 12), fill=(50, 130, 70)); d.ellipse((X + 4, Y + 3, X + 10, Y + 8), fill=(80, 170, 90))
    elif kind == 'crest':
        cx, cy = (X + X1) // 2, Y + 8
        d.ellipse((cx - 8, cy - 7, cx + 8, cy + 9), fill=INK); d.ellipse((cx - 6, cy - 5, cx + 6, cy + 7), fill=(210, 176, 64))
        d.polygon([(cx, cy - 3), (cx + 4, cy + 1), (cx, cy + 5), (cx - 4, cy + 1)], fill=INK)
    elif kind == 'scroll':
        d.rectangle((X + 4, Y + 1, X + 11, Y + 15), fill=(236, 228, 204)); d.line((X + 3, Y + 1, X + 12, Y + 1), fill=(70, 46, 30))
        for yy in range(Y + 3, Y + 14, 3): d.rectangle((X + 7, yy, X + 8, yy + 1), fill=INK)
    elif kind == 'window':
        box(d, X + 1, Y + 1, X1 - 1, Y1 - 3, (20, 22, 34))
        for _ in range(8 * w): d.point((rnd.randrange(X + 3, X1 - 3), rnd.randrange(Y + 4, Y1 - 5)), fill=rnd.choice([(255, 220, 140), (255, 140, 220), (160, 220, 255)]))
    elif kind == 'cabinet':
        box(d, X + 1, Y, X1 - 1, Y1, (120, 126, 132))
        for yy in range(Y + 5, Y1 - 2, 5): d.rectangle((X + 4, yy, X1 - 4, yy + 3), fill=(144, 150, 156)); d.point(((X + X1) // 2, yy + 1), fill=INK)
    elif kind == 'safe':
        box(d, X + 1, Y + 1, X1 - 1, Y1, (60, 64, 72)); d.ellipse((X + 5, Y + 6, X + 10, Y + 11), fill=(170, 170, 180))
    elif kind == 'calendar':
        d.rectangle((X + 4, Y + 2, X + 12, Y + 12), fill=(240, 240, 232)); d.rectangle((X + 4, Y + 2, X + 12, Y + 4), fill=(200, 40, 40))
    elif kind == 'tv':
        box(d, X + 1, Y + 2, X1 - 1, Y1, (40, 40, 44)); d.rectangle((X + 4, Y + 5, X1 - 4, Y1 - 4), fill=(80, 110, 140))
    elif kind == 'futon':
        box(d, X, Y, X1, Y1, (210, 200, 170), (230, 222, 196)); d.rectangle((X + 2, Y + 2, X + 12, Y + 8), fill=(250, 250, 244)); d.rectangle((X + 1, Y + 10, X1 - 1, Y1 - 1), fill=(170, 60, 60))
    elif kind == 'lowtable':
        box(d, X + 2, Y + 4, X1 - 2, Y1 - 3, (120, 82, 54)); d.ellipse((X + 6, Y + 6, X + 11, Y + 10), fill=(240, 220, 160))
    elif kind == 'lamp':
        d.line((X + 8, Y + 6, X + 8, Y + 15), fill=(170, 170, 160)); d.polygon([(X + 3, Y + 6), (X + 13, Y + 6), (X + 11, Y + 1), (X + 5, Y + 1)], fill=(240, 220, 160))
    elif kind == 'crate':
        box(d, X + 1, Y + 1, X1 - 1, Y1 - 1, (150, 110, 60)); d.line((X + 2, Y + 2, X1 - 2, Y1 - 2), fill=(110, 76, 40)); d.line((X1 - 2, Y + 2, X + 2, Y1 - 2), fill=(110, 76, 40))
    elif kind == 'bags':
        for cx, cy in ((X + 5, Y + 10), (X + 11, Y + 9), (X + 8, Y + 5)): d.ellipse((cx - 5, cy - 4, cx + 5, cy + 5), fill=INK); d.ellipse((cx - 4, cy - 3, cx + 4, cy + 4), fill=(40, 44, 50))
    elif kind == 'ac':
        box(d, X + 1, Y + 2, X1 - 1, Y1 - 2, (200, 200, 196))
        for xx in range(X + 3, X1 - 2, 2): d.line((xx, Y + 6, xx, Y1 - 5), fill=(150, 150, 150))
    elif kind == 'manhole':
        d.ellipse((X + 1, Y + 2, X1 - 1, Y1 - 2), fill=INK); d.ellipse((X + 2, Y + 3, X1 - 2, Y1 - 3), fill=(80, 80, 88))
        for k in range(X + 4, X1 - 3, 3): d.line((k, Y + 5, k, Y1 - 5), fill=(60, 60, 66))
    elif kind == 'ladder':
        for xx in (X + 3, X1 - 3): d.line((xx, Y, xx, Y1), fill=(150, 150, 160))
        for yy in range(Y + 2, Y1, 4): d.line((X + 3, yy, X1 - 3, yy), fill=(150, 150, 160))
    elif kind == 'cot':
        box(d, X, Y + 2, X1, Y1, (150, 130, 110), (180, 160, 140)); d.rectangle((X + 2, Y + 4, X + 10, Y + 9), fill=(240, 240, 232))
    elif kind == 'pipes':
        for yy in (Y + 3, Y + 9): d.rectangle((X, yy, X1, yy + 3), fill=(110, 116, 110)); d.line((X, yy, X1, yy), fill=(150, 156, 150))

# ---------- The rooms ----------
# (furniture: (kind, x, y, w, h, solid); y 0-1 are the wall, so things on it hang there; `spots`: name -> tiles)
ROOMS = {
    'Poppo': dict(title='Poppo', size=(12, 9), floor='shop', wall=(216, 222, 230),
                  things=[('fridge', 1, 1, 4, 2, True), ('shelf', 2, 4, 3, 1, True), ('shelf', 2, 6, 3, 1, True), ('shelf', 6, 4, 2, 1, True), ('shelf', 6, 6, 2, 1, True),
                          ('counter', 8, 3, 3, 1, True), ('register', 9, 3, 1, 1, False), ('plant', 11, 7, 1, 1, True)],
                  spots={'clerk': [(8, 3), (9, 3), (10, 3)]}, clerk=(9, 2)),
    'Heroine': dict(title='Heroine', size=(14, 10), floor='carpet', wall=(70, 34, 96),
                    things=[('bottles', 1, 0, 4, 1, False), ('bar', 1, 2, 5, 1, True), ('stool', 1, 3, 1, 1, False), ('stool', 3, 3, 1, 1, False), ('stool', 5, 3, 1, 1, False),
                            ('screen', 9, 0, 4, 2, False), ('stage', 8, 2, 6, 2, False), ('mic', 10, 2, 1, 1, False),
                            ('booth', 1, 6, 3, 2, True), ('booth', 5, 6, 3, 2, True), ('plant', 12, 7, 1, 1, True)],
                    spots={'karaoke': [(9, 3), (10, 3), (11, 3), (9, 2), (11, 2)]}),
    'Bacchus': dict(title='Bacchus', size=(12, 9), floor='wood', wall=(90, 60, 40),
                    things=[('bottles', 1, 0, 6, 1, False), ('bar', 1, 2, 7, 1, True), ('stool', 2, 3, 1, 1, False), ('stool', 4, 3, 1, 1, False), ('stool', 6, 3, 1, 1, False),
                            ('table', 9, 4, 2, 2, True), ('plant', 10, 7, 1, 1, True)]),
    'Backlot': dict(title="Serena's Backlot", size=(12, 9), floor='concrete', wall=(64, 110, 90),
                    things=[('pipes', 0, 0, 12, 1, False), ('ac', 2, 1, 1, 1, False), ('crate', 1, 3, 1, 1, True), ('crate', 1, 4, 1, 1, True), ('bags', 3, 3, 1, 1, True),
                            ('crate', 10, 3, 1, 1, True), ('bags', 10, 6, 1, 1, True), ('manhole', 7, 5, 1, 1, False)],
                    spots={'manhole': [(7, 5)]}),
    'Sewer': dict(title='Under the Street', size=(12, 9), floor='concrete', wall=(60, 66, 74),
                  things=[('pipes', 0, 0, 12, 1, False), ('ladder', 2, 0, 1, 3, False), ('water', 0, 7, 12, 2, True)],
                  spots={'ladder': [(2, 2), (2, 3)], 'machine': [(5, 3), (6, 3), (7, 3), (5, 2), (6, 2), (7, 2)]}, machine=(5, 1), mat=False),
    'Toko': dict(title='Toko Credit', size=(12, 9), floor='concrete', wall=(110, 116, 112),
                 things=[('window', 1, 0, 3, 2, False), ('calendar', 5, 0, 1, 1, False), ('cabinet', 6, 1, 1, 2, True), ('cabinet', 7, 1, 1, 2, True), ('cabinet', 8, 1, 1, 2, True),
                         ('safe', 10, 1, 1, 2, True), ('desk', 4, 4, 3, 1, True), ('chair', 5, 3, 1, 1, False), ('plant', 1, 7, 1, 1, True)]),
    'Kazama': dict(title='Kazama Family Office', size=(12, 9), floor='wood', wall=(110, 86, 56),
                   things=[('crest', 5, 0, 2, 1, False), ('scroll', 8, 0, 1, 2, False), ('desk', 4, 3, 4, 1, True), ('chair', 5, 2, 1, 1, False),
                           ('sofa', 1, 5, 1, 2, True), ('sofa', 10, 5, 1, 2, True), ('table', 4, 5, 4, 1, True), ('plant', 1, 2, 1, 1, True)]),
    'Dojima': dict(title='Dojima Family HQ', size=(14, 10), floor='wood', wall=(96, 30, 30),
                   things=[('crest', 6, 0, 2, 1, False), ('scroll', 3, 0, 1, 2, False), ('scroll', 10, 0, 1, 2, False), ('desk', 5, 3, 4, 1, True), ('chair', 6, 2, 1, 1, False),
                           ('sofa', 2, 5, 1, 3, True), ('sofa', 11, 5, 1, 3, True), ('table', 5, 6, 4, 1, True), ('plant', 1, 2, 1, 1, True), ('plant', 12, 2, 1, 1, True)]),
    'Penthouse': dict(title="Tachibana's Penthouse", size=(14, 10), floor='marble', wall=(170, 160, 140),
                      things=[('window', 3, 0, 8, 2, False), ('whitesofa', 4, 5, 6, 1, True), ('glasstable', 5, 3, 4, 1, True), ('lamp', 12, 3, 1, 1, True), ('plant', 1, 2, 1, 1, True)]),
    'Apartment': dict(title="Kiryu's Apartment", size=(10, 8), floor='tatami', wall=(150, 136, 110),
                      things=[('window', 1, 0, 2, 2, False), ('tv', 6, 1, 2, 1, True), ('lowtable', 3, 3, 2, 2, True), ('futon', 7, 3, 2, 3, True)]),
    'Namase': dict(title='Namase Bar', size=(12, 9), floor='wood', wall=(80, 56, 44),
                   things=[('bottles', 2, 0, 5, 1, False), ('bar', 2, 2, 6, 1, True), ('stool', 3, 3, 1, 1, False), ('stool', 5, 3, 1, 1, False), ('stool', 7, 3, 1, 1, False),
                           ('cot', 9, 5, 2, 2, True), ('crate', 1, 6, 1, 1, True)]),
}

def build(rid, R):
    W, H = R['size']; rnd = random.Random(hash(rid) % 1000)
    pic = Image.new('RGBA', (W * 16, H * 16), (0, 0, 0, 255))
    coll = [[0] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            if y < 2: pic.alpha_composite(wall_tile(R['wall'], y, x), (x * 16, y * 16)); coll[y][x] = 1
            else: pic.alpha_composite(floor_tile(R['floor'], x, y), (x * 16, y * 16))
    d = ImageDraw.Draw(pic)
    for kind, x, y, w, h, solid in R['things']:
        if kind == 'water':
            for yy in range(y, y + h):
                for xx in range(x, x + w): pic.alpha_composite(floor_tile('water', xx, yy), (xx * 16, yy * 16))
        else: furniture(d, kind, x, y, w, h, rnd)
        if solid:
            for yy in range(y, y + h):
                for xx in range(x, x + w): coll[yy][xx] = 1
    if 'machine' in R:
        tm = Image.open(os.path.join(ROOT, 'assets/kamurocho/time-machine.png')).convert('RGBA')
        mx, my = R['machine']; pic.alpha_composite(tm, (mx * 16, my * 16 + 4))
        for yy in range(my, my + 3):
            for xx in range(mx, mx + 3): coll[yy][xx] = 1
    # (the mat to leave by, its bottom row's middle; the walls down the sides are the room's edge)
    mx = W // 2
    if R.get('mat', True): d.rectangle((mx * 16 + 1, (H - 1) * 16 + 4, mx * 16 + 14, H * 16 - 2), fill=(150, 60, 50)); d.rectangle((mx * 16 + 3, (H - 1) * 16 + 6, mx * 16 + 12, H * 16 - 4), fill=(190, 90, 70))
    pic.convert('RGB').save(os.path.join(OUT, 'Kmr_' + rid + '.png'), optimize=True)
    Image.new('RGB', (32, 32), (0, 0, 0)).save(os.path.join(OUT, 'Kmr_' + rid + '-border.png'))
    flat = [c for row in coll for c in row]
    m = {'name': 'Kmr_' + rid, 'title': R['title'], 'width': W, 'height': H, 'type': 'indoor', 'realm': 'yakuza', 'music': 'dp_veilstone_city',
         'cycling': False, 'showName': False, 'top': False, 'borderWidth': 2, 'borderHeight': 2, 'collision': flat, 'elevation': [0] * (W * H),
         'behavior': [0] * (W * H), 'encounter': [0] * (W * H), 'connections': [], 'warps': [], 'signs': [], 'triggers': [], 'hidden': [], 'people': [], 'wild': None}
    info = {'mat': [mx, H - 1] if R.get('mat', True) else None, 'spots': R.get('spots', {})}
    if 'clerk' in R: info['clerk'] = list(R['clerk'])
    return m, info

def main():
    maps, rooms = {}, {}
    for rid, R in ROOMS.items():
        m, info = build(rid, R); maps[m['name']] = m; rooms[rid] = info
    js = ('// Kamurocho\'s insides, top down: made by tools/build-kamurocho-rooms.py. (Their doors, people and spots: ui/game.js,\n'
          '// from KAMUROCHO_ROOMS.)\n' + ''.join('window.WORLD_MAPS[%s] = %s;\n' % (json.dumps(k), json.dumps(v, separators=(',', ':'))) for k, v in maps.items())
          + 'window.KAMUROCHO_ROOMS = ' + json.dumps(rooms, separators=(',', ':')) + ';\n')
    open(os.path.join(ROOT, 'data/kamurocho-rooms.js'), 'w').write(js)
    print(len(maps), 'rooms')

if __name__ == '__main__':
    main()
