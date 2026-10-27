#!/usr/bin/env python3
# The Like a Dragon realm's items (data/type-chart.js REALM_ITEMS, Poppo's shelves), each its own picture at
# FireRed's item size (24x24, a dark outline, three shades, a highlight): Yakuza 0's drinks and Poppo's food as they
# look, in place of the Pokémon items that stood in for them. (Streets of Kamurocho has no items of its own to take.)
#
#   python3 tools/build-kamurocho-items.py   -> assets/kamurocho/items/<item>.png
#
#   Staminan           the brown tonic bottle, its yellow label and red stripe, a gold cap
#   Staminan Spark     the same, its label blue, a spark beside it
#   Staminan Royale    the dark bottle, its gold label and crown
#   Toughness Zero     the white health-drink bottle, its blue band
#   Toughness Infinity the same, its band gold, ∞ on it
#   Tauriner, +, Maxx  the small Heat-drink bottle: a red label; blue; black and gold
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

def bottle(body, label, cap, stripe=None, small=False, mark=None):
    im = Image.new('RGBA', (24, 24), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    x0, x1 = (8, 15) if small else (7, 16)
    top = 9 if small else 7
    # its neck and cap
    column(d, 10, top - 3, 13, top, body)
    column(d, 10, top - 5, 13, top - 4, cap)
    # its body, its shoulders rounded
    column(d, x0, top + 1, x1, 21, body)
    d.point((x0, top + 1), fill=(0, 0, 0, 0)); d.point((x1, top + 1), fill=(0, 0, 0, 0))
    # the label
    ly0, ly1 = (13, 18) if small else (11, 18)
    column(d, x0, ly0, x1, ly1, label)
    if stripe: d.line((x0, ly0 + 2, x1, ly0 + 2), fill=shade(stripe, 1))
    if mark == 'crown':
        for x, y in ((10, 13), (12, 12), (14, 13), (10, 14), (11, 14), (12, 14), (13, 14), (14, 14)): d.point((x, y), fill=(200, 40, 40, 255))
    if mark == 'inf':
        for x, y in ((9, 15), (10, 14), (11, 15), (12, 16), (13, 15), (14, 14), (15, 15), (10, 16), (14, 16)): d.point((x, y), fill=(40, 40, 120, 255))
    # the glint down its left
    d.line((x0 + 1, top + 3, x0 + 1, ly0 - 1), fill=(255, 255, 255, 200))
    return im

def spark(im):
    d = ImageDraw.Draw(im)
    for x, y in ((19, 4), (19, 5), (19, 6), (18, 5), (20, 5), (20, 9), (21, 10), (20, 10)): d.point((x, y), fill=(255, 248, 140, 255))
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
    'staminan': lambda: bottle((150, 84, 32), (240, 208, 56), (216, 176, 64), stripe=(200, 40, 40)),
    'staminan_spark': lambda: spark(bottle((150, 84, 32), (64, 136, 224), (216, 176, 64), stripe=(255, 255, 255))),
    'staminan_royale': lambda: bottle((88, 44, 20), (232, 188, 56), (232, 200, 80), mark='crown'),
    'toughness_zero': lambda: bottle((236, 236, 240), (56, 112, 208), (200, 200, 208), small=True),
    'toughness_infinity': lambda: bottle((236, 236, 240), (232, 188, 56), (200, 200, 208), small=True, mark='inf'),
    'tauriner': lambda: bottle((150, 84, 32), (208, 48, 40), (232, 232, 232), small=True),
    'tauriner_plus': lambda: bottle((150, 84, 32), (48, 96, 200), (232, 232, 232), small=True, stripe=(240, 208, 56)),
    'tauriner_maxx': lambda: bottle((48, 44, 48), (232, 188, 56), (232, 200, 80), small=True, stripe=(200, 40, 40)),
    'rice_ball': rice_ball, 'sandwich': sandwich, 'hot_dog': hot_dog, 'fried_chicken': fried_chicken,
    'bento': bento, 'pudding': pudding,
}

def main():
    os.makedirs(OUT, exist_ok=True)
    for name, draw in ITEMS.items(): outline(draw()).save(os.path.join(OUT, name + '.png'), optimize=True)
    print('%d items' % len(ITEMS))

main()
