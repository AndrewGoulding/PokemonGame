#!/usr/bin/env python3
# The Like a Dragon realm's items (data/type-chart.js REALM_ITEMS, Poppo's shelves), each its own picture at
# FireRed's item size (24x24, a dark outline, three shades, a highlight): Yakuza 0's drinks and Poppo's food as they
# look, in place of the Pokémon items that stood in for them. (Streets of Kamurocho has no items of its own to take.)
#
#   python3 tools/build-kamurocho-items.py   -> assets/kamurocho/items/<item>.png
#
#   Staminan           Yakuza 0's Staminan X: the amber bottle, its silver cap banded red, its silver label, a red
#                      band, the big gold X edged in red, its name in red, a red line
#   Staminan Spark     the same, its bands blue, a lightning bolt for the X
#   Staminan Royale    the darker bottle, its gold cap and label, red bands and a red crown
#   Toughness Zero     a stubby health-drink bottle, gold cap, white label between blue bands, a red 0
#   Toughness Infinity the same, its bands gold, ∞ on it
#   Tauriner, +, Maxx  the tall brown bottle with the gold cap (Lipovitan D's look, as Tauriner's is): a white label
#                      and its red band with the name in white; blue, a red plus; black and gold
#   Rice Ball          an onigiri, its nori wrapped round its foot
#   Sandwich           a triangle of it, cut: bread, egg and lettuce
#   Hot Dog            its bun, the sausage, a line of mustard
#   Fried Chicken      a drumstick, its crust, the bone's end
#   Bento Box          the black box, its red lid's edge, rice, a pickled plum, egg, sausage
#   Pudding            the custard, its caramel top, on its plate
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets/kamurocho/items')
INK = (40, 32, 32, 255)

def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c[:3]) + (255,)

def outline(im):
    # (FireRed's: a dark line round whatever's drawn)
    px = im.load(); w, h = im.size
    edge = [(x, y) for y in range(h) for x in range(w) if not px[x, y][3] and any(
        0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] and px[x + dx, y + dy] != INK for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for p in edge: px[p] = INK
    return im

def column(d, x0, y0, x1, y1, c):
    # (a rounded body lit from the left: light, base, shadow)
    w = x1 - x0 + 1
    for x in range(x0, x1 + 1):
        k = (x - x0) / max(1, w - 1)
        d.line((x, y0, x, y1), fill=shade(c, 1.25 if k < 0.25 else 0.7 if k > 0.75 else 1.0))

# The bottles, a pixel at a time: the glass (g light, G, h dark, w its glint), the cap (C light, c, d dark), its
# outline (k), and L where the label goes, each item's own (LABELS, a row a string, the bottle's width).
def template(x0, x1, cap_rows, neck_rows, shoulder, body_rows, label_rows, base_rows):
    # (its rows, each 24 wide: the cap over x 10-15, the neck x 11-14, the body x0-x1, all outlined)
    def row(a, b, fill):
        r = ['.'] * 24; r[a - 1] = r[b + 1] = 'k'
        for x in range(a, b + 1): r[x] = fill(x - a, b - a + 1)
        return ''.join(r)
    glass = lambda i, w: 'g' if i == 0 else 'w' if i == 1 else 'h' if i >= w - 2 else 'G'
    out = ['.' * 10 + 'k' * 6 + '.' * 8]
    out += [row(10, 15, lambda i, w: 'C' if i == 0 else 'd' if i == w - 1 else 'c')] * cap_rows
    out += ['.' * 9 + 'k' * 8 + '.' * 7]
    out += [row(11, 14, glass)] * neck_rows
    for k in range(shoulder): out.append(row(x0 + shoulder - k, x1 - shoulder + k, glass))
    out += [row(x0, x1, glass)] * body_rows + [row(x0, x1, lambda i, w: 'L')] * label_rows + [row(x0, x1, glass)] * base_rows
    out.append('.' * x0 + 'k' * (x1 - x0 + 1) + '.' * (23 - x1))
    return '\n'.join(r[:24] for r in out)
TALL = template(8, 17, 2, 2, 2, 2, 8, 3)
STUBBY = template(7, 17, 1, 1, 2, 2, 7, 2)
COL = {'S': (232, 232, 238), 's': (190, 192, 204), 'r': (212, 36, 44), 'R': (150, 20, 28), 'y': (248, 208, 64), 'Y': (196, 148, 28),
       'b': (48, 100, 208), 'B': (24, 56, 144), 'W': (250, 250, 250), 'K': (40, 36, 44)}
LABELS = {
    # Staminan X, as Yakuza 0 has it: silver, a red band, the big gold X edged in red, its name in red, a red line
    'staminan': ["rrrrrrrrrr", "SSSSSSSSSS", "SryyssyyrS", "SSryyyyrSS", "SSryyyyrSS", "SryyssyyrS", "SrSrrSrSrS", "RRRRRRRRRR"],
    # Spark: its bands blue, a lightning bolt
    'staminan_spark': ["bbbbbbbbbb", "SSSSSySSSS", "SSSSyySSSS", "SSSyyyyySS", "SSSSSyySSS", "SSSSyySSSS", "SbSbbSbSbS", "BBBBBBBBBB"],
    # Royale: gold, red bands, a red crown
    'staminan_royale': ["RRRRRRRRRR", "yyyyyyyyyy", "yyrYyrYryy", "yyrrrrrryy", "yyrrrrrryy", "yyyyyyyyyy", "yRyRRyRyRy", "RRRRRRRRRR"],
    # Tauriner (Lipovitan D's look): white, its red band with its name in white; Tauriner+ blue, a red plus; Maxx black and gold
    'tauriner': ["WWWWWWWWWW", "WbbWbbWbbW", "rrrrrrrrrr", "rWWrWWrWWr", "rrrrrrrrrr", "WWWWWWWWWW", "WWbbbbbbWW", "WWWWWWWWWW"],
    'tauriner_plus': ["WWWWWWWWWW", "WrrWrrWrrW", "bbbbbbbbbb", "bWWbWWbWWb", "bbbbbbbbbb", "WWWWWWrWWW", "WWWWWrrrWW", "WWWWWWrWWW"],
    'tauriner_maxx': ["KKKKKKKKKK", "KyyKyyKyyK", "yyyyyyyyyy", "yKKyKKyKKy", "yyyyyyyyyy", "KKKKKKKKKK", "KrrKrrKrrK", "KKKKKKKKKK"],
    # Toughness (a stubby health-drink bottle): Zero white and blue, a red 0; Infinity gold, ∞
    'toughness_zero': ["bbbbbbbbbbb", "WWWWWWWWWWW", "WWWWrrrWWWW", "WWWWrWrWWWW", "WWWWrrrWWWW", "WWWWWWWWWWW", "bbbbbbbbbbb"],
    'toughness_infinity': ["yyyyyyyyyyy", "WWWWWWWWWWW", "WWKKWWKKWWW", "WKWWKKWWKWW", "WWKKWWKKWWW", "WWWWWWWWWWW", "yyyyyyyyyyy"],
}
def bottle(name, glass, cap, stubby=False, band=None):
    rows = (STUBBY if stubby else TALL).split("\n")
    top = 24 - len(rows) - 1
    im = Image.new('RGBA', (24, 24), (0, 0, 0, 0)); px = im.load()
    lab = LABELS[name]; ly = None
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            Y = y + top
            if ch == '.': continue
            if ch == 'k': px[x, Y] = INK
            elif ch in 'Ccd':
                # (its cap; a band round its foot, Staminan's red)
                c = band if band and rows[y + 1].startswith('.' * 9 + 'kk') else cap
                px[x, Y] = shade(c, {'C': 1.25, 'c': 1.0, 'd': 0.7}[ch])
            elif ch in 'gGh': px[x, Y] = shade(glass, {'g': 1.3, 'G': 1.0, 'h': 0.65}[ch])
            elif ch == 'w': px[x, Y] = (255, 236, 200, 255)
            elif ch == 'L':
                if ly is None: ly = y
                x0 = row.index('L'); w = row.count('L'); c = lab[y - ly][x - x0]
                # (round: lit at its left, shadowed at its right)
                k = 1.12 if x - x0 == 0 else 0.72 if x - x0 >= w - 2 else 1.0
                px[x, Y] = shade(COL[c], k)
    return im

def rice_ball():
    im = Image.new('RGBA', (24, 24), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.polygon([(12, 3), (21, 19), (3, 19)], fill=(248, 248, 240, 255))
    d.polygon([(12, 3), (5, 16), (3, 19), (7, 19)], fill=(255, 255, 255, 255))
    d.polygon([(16, 11), (21, 19), (14, 19)], fill=(216, 216, 208, 255))
    d.rectangle((8, 14, 16, 20), fill=(32, 48, 36, 255)); d.line((9, 15, 9, 19), fill=(60, 84, 64, 255))
    for x, y in ((11, 7), (14, 10), (8, 12)): d.point((x, y), fill=(224, 224, 216, 255))
    return im

def sandwich():
    im = Image.new('RGBA', (24, 24), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.polygon([(3, 19), (20, 19), (20, 4)], fill=(236, 220, 176, 255))          # the cut face: bread
    d.polygon([(6, 17), (19, 17), (19, 7)], fill=(248, 232, 120, 255))         # egg
    d.line((9, 15, 19, 9), fill=(120, 176, 64, 255)); d.line((10, 16, 19, 11), fill=(144, 200, 72, 255))   # lettuce
    d.line((3, 19, 20, 4), fill=(196, 148, 88, 255)); d.line((3, 20, 20, 20), fill=(196, 148, 88, 255)); d.line((21, 4, 21, 20), fill=(176, 128, 72, 255))
    return im

def hot_dog():
    im = Image.new('RGBA', (24, 24), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse((2, 9, 21, 18), fill=(208, 104, 56, 255))                         # the sausage
    d.ellipse((3, 9, 20, 13), fill=(232, 136, 80, 255))
    d.rounded_rectangle((3, 12, 20, 19), 3, fill=(224, 176, 104, 255))          # the bun
    d.line((5, 13, 18, 13), fill=(248, 208, 136, 255))
    for x in range(5, 19): d.point((x, 10 + (x // 2) % 2), fill=(248, 216, 48, 255))   # mustard
    return im

def fried_chicken():
    im = Image.new('RGBA', (24, 24), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse((3, 3, 15, 15), fill=(184, 112, 40, 255))
    d.ellipse((4, 4, 12, 11), fill=(216, 148, 64, 255))
    for x, y in ((6, 7), (9, 5), (11, 9), (7, 11), (13, 12)): d.point((x, y), fill=(240, 184, 96, 255))
    d.line((13, 13, 18, 18), fill=(240, 232, 216, 255), width=2)                 # the bone
    d.ellipse((17, 16, 21, 20), fill=(248, 240, 224, 255))
    return im

def bento():
    im = Image.new('RGBA', (24, 24), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle((2, 6, 21, 19), fill=(40, 36, 40, 255))
    d.line((2, 6, 21, 6), fill=(200, 48, 40, 255)); d.line((2, 19, 21, 19), fill=(152, 32, 32, 255))
    d.rectangle((4, 8, 12, 17), fill=(244, 244, 236, 255))                       # rice
    d.ellipse((7, 11, 9, 13), fill=(208, 40, 64, 255))                           # a pickled plum
    d.line((13, 8, 13, 17), fill=(60, 56, 60, 255))
    d.rectangle((14, 8, 19, 11), fill=(248, 216, 72, 255))                       # egg
    d.ellipse((14, 13, 19, 17), fill=(216, 80, 56, 255))                         # sausage
    d.point((15, 14), fill=(240, 136, 112, 255))
    return im

def pudding():
    im = Image.new('RGBA', (24, 24), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse((2, 17, 21, 21), fill=(224, 232, 240, 255))                        # the plate
    d.polygon([(7, 7), (16, 7), (19, 18), (4, 18)], fill=(248, 208, 96, 255))   # the custard
    d.polygon([(7, 7), (9, 7), (7, 18), (4, 18)], fill=(255, 232, 144, 255))
    d.polygon([(15, 7), (16, 7), (19, 18), (16, 18)], fill=(216, 168, 64, 255))
    d.rectangle((7, 5, 16, 8), fill=(136, 72, 24, 255))                          # caramel
    d.line((8, 5, 14, 5), fill=(176, 104, 40, 255))
    return im

ITEMS = {
    'staminan': lambda: bottle('staminan', (176, 96, 32), (210, 212, 220), band=(208, 40, 44)),
    'staminan_spark': lambda: bottle('staminan_spark', (176, 96, 32), (210, 212, 220), band=(48, 100, 208)),
    'staminan_royale': lambda: bottle('staminan_royale', (112, 56, 20), (232, 196, 72)),
    'toughness_zero': lambda: bottle('toughness_zero', (164, 92, 34), (232, 196, 72), stubby=True),
    'toughness_infinity': lambda: bottle('toughness_infinity', (164, 92, 34), (232, 196, 72), stubby=True),
    'tauriner': lambda: bottle('tauriner', (150, 80, 30), (240, 200, 56)),
    'tauriner_plus': lambda: bottle('tauriner_plus', (150, 80, 30), (240, 200, 56)),
    'tauriner_maxx': lambda: bottle('tauriner_maxx', (90, 48, 22), (232, 196, 72)),
    'rice_ball': rice_ball, 'sandwich': sandwich, 'hot_dog': hot_dog, 'fried_chicken': fried_chicken,
    'bento': bento, 'pudding': pudding,
}

def centred(im):
    # (in the middle of its 24x24, as the shop's and the Bag's icon box shows it)
    box = im.getbbox(); part = im.crop(box); out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    out.alpha_composite(part, ((im.width - part.width) // 2, (im.height - part.height) // 2))
    return out

def main():
    os.makedirs(OUT, exist_ok=True)
    for name, draw in ITEMS.items(): centred(outline(draw())).save(os.path.join(OUT, name + '.png'), optimize=True)
    print('%d items' % len(ITEMS))

main()
