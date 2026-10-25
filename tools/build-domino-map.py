# Domino City's map (this game's own, for the Yu-Gi-Oh! realm: The Sacred Cards has you go from place to place in
# the city on a map of it, which this stands in for), and the Kame Game shop's booster packs' icons.
#
#   python3 tools/build-domino-map.py
#
# Writes assets/town-map/domino.png (240 by 160, as Orre's: the city from above, the bay to the south-east, Domino
# High up in the north-west, the Kame Game shop down by the park, and the golden portal back to the Realm Hub), and
# assets/sprites/items/booster/*.png (32 by 32, one for each pack). Where each place is on the map is ui/game.js's
# (DOMINO_PLACES).
import os, random
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
rng = random.Random(11)
W, H = 240, 160
img = Image.new('RGBA', (W, H), (0, 0, 0, 255))
d = ImageDraw.Draw(img)

def shade(c, k): return tuple(max(0, min(255, int(v * k))) for v in c[:3]) + (255,)

# ---------- The land, the bay and the roads ----------
LAND, ROAD, KERB = (206, 200, 184), (238, 236, 228), (168, 160, 146)
SEA = (72, 132, 196)
d.rectangle((0, 0, W, H), LAND)
# The roads: a grid, wider for the avenues.
ROADS_H = [(30, 4), (74, 6), (120, 4)]
ROADS_V = [(40, 4), (100, 6), (150, 4)]
for (y, w) in ROADS_H: d.rectangle((0, y, W, y + w - 1), ROAD); d.line((0, y - 1, W, y - 1), KERB); d.line((0, y + w, W, y + w), KERB)
for (x, w) in ROADS_V: d.rectangle((x, 0, x + w - 1, H), ROAD); d.line((x - 1, 0, x - 1, H), KERB); d.line((x + w, 0, x + w, H), KERB)

# ---------- The blocks: buildings, roofs from above ----------
ROOFS = [(148, 148, 156), (176, 120, 96), (120, 136, 160), (196, 184, 160), (160, 104, 88), (132, 148, 120), (200, 196, 204)]
def block(x0, y0, x1, y1):
    for y in range(y0, y1, 12):
        for x in range(x0, x1, 14):
            if rng.random() < 0.12: continue
            bw, bh = rng.randrange(8, 13), rng.randrange(7, 11)
            bx, by = x + rng.randrange(0, 2), y + rng.randrange(0, 2)
            if bx + bw > min(x1, W - 3) or by + bh > min(y1, H - 3): continue
            c = rng.choice(ROOFS)
            d.rectangle((bx + 1, by + 1, bx + bw, by + bh), shade(LAND, 0.72))   # (its shadow)
            d.rectangle((bx, by, bx + bw - 1, by + bh - 1), c)
            d.line((bx, by, bx + bw - 1, by), shade(c, 1.2)); d.line((bx, by, bx, by + bh - 1), shade(c, 1.12))
            d.line((bx, by + bh - 1, bx + bw - 1, by + bh - 1), shade(c, 0.7))
xs = [0] + [x + w + 2 for (x, w) in ROADS_V]; xe = [x - 2 for (x, w) in ROADS_V] + [W]
ys = [0] + [y + w + 2 for (y, w) in ROADS_H]; ye = [y - 2 for (y, w) in ROADS_H] + [H]
PARK = (108, 82, 148, 118)
for i in range(len(xs)):
    for j in range(len(ys)):
        x0, x1, y0, y1 = xs[i] + 1, xe[i], ys[j] + 1, ye[j]
        if (x0, y0) == (PARK[0], PARK[1]): continue
        block(x0, y0, x1, y1)
# The bay (the south-east, its shore a gentle curve), over the blocks and roads that run into it; its waves, the pier.
shore = lambda y: 150 + 46 * (1 - (y / H)) ** 1.6 + 6 * ((y * 7) % 13 > 6)
for y in range(71, H):
    for x in range(int(shore(y)), W):
        img.putpixel((x, y), shade(SEA, 0.9 + 0.1 * ((x + y * 3) % 11 > 7)))
    d.point((int(shore(y)) - 1, y), (236, 228, 196))
for k in range(40):
    x, y = rng.randrange(186, 236), rng.randrange(84, 152)
    if img.getpixel((x, y))[2] > 150 and img.getpixel((x + 3, y))[2] > 150: d.line((x, y, x + 3, y), (160, 200, 236))
d.rectangle((196, 112, 236, 116), (150, 120, 84)); d.line((196, 117, 236, 117), (100, 80, 56))
# The park, and Domino's clock tower in its square.
d.rectangle(PARK, (112, 168, 88))
for k in range(26):
    tx, ty = rng.randrange(PARK[0] + 2, PARK[2] - 3), rng.randrange(PARK[1] + 2, PARK[3] - 3)
    if abs(tx - 128) < 8 and abs(ty - 100) < 8: continue
    d.ellipse((tx, ty, tx + 4, ty + 4), (64, 124, 64)); d.point((tx + 1, ty + 1), (120, 184, 104))
d.ellipse((121, 93, 135, 107), (226, 220, 206)); d.ellipse((124, 96, 132, 104), (108, 150, 210))   # (the square, its fountain)
d.rectangle((126, 82, 130, 95), (196, 176, 140)); d.rectangle((125, 80, 131, 83), (150, 96, 72)); d.point((128, 86), (250, 250, 240))

# ---------- The places ----------
# Domino High (north-west): a long cream school, a clock over its door, its playing field beside it.
def school(cx, cy):
    d.rectangle((cx - 24, cy - 14, cx + 24, cy + 14), LAND)
    d.rectangle((cx - 22, cy + 2, cx + 6, cy + 12), (138, 180, 98)); d.rectangle((cx - 20, cy + 4, cx + 4, cy + 10), (120, 166, 84))
    d.line((cx - 20, cy + 7, cx + 4, cy + 7), (220, 236, 200))
    d.rectangle((cx - 21, cy - 12, cx + 21, cy - 1), (100, 84, 72))
    d.rectangle((cx - 20, cy - 13, cx + 20, cy - 3), (236, 222, 186))
    for k in range(-18, 19, 5): d.rectangle((cx + k, cy - 10, cx + k + 2, cy - 8), (110, 150, 200))
    d.rectangle((cx - 20, cy - 15, cx + 20, cy - 14), (176, 72, 56))
    d.rectangle((cx - 4, cy - 19, cx + 4, cy - 12), (236, 222, 186)); d.rectangle((cx - 4, cy - 20, cx + 4, cy - 19), (176, 72, 56))
    d.ellipse((cx - 2, cy - 18, cx + 2, cy - 14), (250, 248, 240)); d.point((cx, cy - 16), (40, 30, 30))
    d.rectangle((cx + 8, cy - 2, cx + 18, cy + 12), (224, 216, 200))   # (its forecourt)
# The Kame Game shop (by the park): its orange roof and its sign.
def shop(cx, cy):
    d.rectangle((cx - 14, cy - 12, cx + 14, cy + 10), LAND)
    d.polygon([(cx - 12, cy - 2), (cx, cy - 11), (cx + 12, cy - 2)], (232, 112, 56))
    d.line((cx - 12, cy - 2, cx, cy - 11), (250, 160, 96)); d.line((cx, cy - 11, cx + 12, cy - 2), (176, 72, 40))
    d.rectangle((cx - 10, cy - 2, cx + 10, cy + 8), (176, 168, 156)); d.rectangle((cx - 10, cy - 2, cx + 10, cy - 1), (120, 112, 104))
    d.rectangle((cx - 3, cy + 2, cx + 3, cy + 8), (96, 72, 56)); d.point((cx + 1, cy + 5), (240, 200, 80))
    d.rectangle((cx - 9, cy + 1, cx - 5, cy + 4), (150, 196, 230)); d.rectangle((cx + 5, cy + 1, cx + 9, cy + 4), (150, 196, 230))
    d.rectangle((cx - 7, cy - 6, cx + 7, cy - 3), (250, 210, 72)); d.line((cx - 5, cy - 5, cx + 5, cy - 5), (176, 72, 40))
# The portal back to the Realm Hub: a ring of golden light, by the shore.
def portal(cx, cy):
    for r, c in ((11, (120, 80, 24)), (10, (250, 214, 96)), (8, (255, 240, 170)), (6, (180, 120, 230)), (4, (90, 50, 160))):
        d.ellipse((cx - r, cy - r, cx + r, cy + r), c)
    d.polygon([(cx, cy - 4), (cx - 3, cy + 2), (cx + 3, cy + 2)], (250, 214, 96))   # (the pyramid in it)
    for k in range(8):
        x, y = cx + rng.randrange(-15, 16), cy + rng.randrange(-15, 16)
        if (x - cx) ** 2 + (y - cy) ** 2 > 150: d.point((x, y), (255, 244, 180))
PLACES = {'school': (68, 50), 'shop': (82, 104), 'portal': (190, 46)}
school(*PLACES['school']); shop(*PLACES['shop']); portal(*PLACES['portal'])

# ---------- Its frame and its name ----------
d.rectangle((0, 0, W - 1, H - 1), outline=(64, 48, 40)); d.rectangle((1, 1, W - 2, H - 2), outline=(150, 122, 96))
font = ImageFont.load_default()
NAME = 'DOMINO CITY'
tw = sum(font.getlength(ch) + 1 for ch in NAME)
d.rectangle((3, 145, 10 + tw, 156), (64, 48, 40)); d.rectangle((4, 146, 9 + tw, 155), (236, 226, 204))
x = 7
for ch in NAME:   # (spaced out, a letter at a time)
    d.text((x, 145), ch, (64, 48, 40), font=font); x += font.getlength(ch) + 1
img.save(os.path.join(ROOT, 'assets/town-map/domino.png'))

# ---------- The booster packs ----------
# Each a foil pack, seen a little turned: its set's colours, a card's shape on it, crimped top and bottom.
PACKS = {
    'legend-of-blue-eyes-pack': ((56, 104, 200), (210, 230, 250), (250, 250, 255)),
    'metal-raiders-pack': ((150, 40, 40), (70, 60, 64), (236, 196, 88)),
    'spell-ruler-pack': ((40, 130, 90), (180, 230, 190), (240, 236, 150)),
    'pharaohs-servant-pack': ((120, 64, 168), (236, 196, 88), (250, 236, 200)),
    'labyrinth-of-nightmare-pack': ((44, 40, 72), (196, 80, 56), (232, 220, 250)),
}
out = os.path.join(ROOT, 'assets/sprites/items/booster')
os.makedirs(out, exist_ok=True)
for name, (body, art, shine) in PACKS.items():
    p = Image.new('RGBA', (32, 32), (0, 0, 0, 0)); g = ImageDraw.Draw(p)
    g.rectangle((8, 4, 24, 28), (24, 20, 28))
    g.rectangle((9, 5, 23, 27), body)
    for y in (5, 6, 26, 27):   # (the crimped ends)
        for x in range(9, 24, 2): g.point((x, y), shade(body, 1.4))
    g.rectangle((11, 9, 21, 23), (196, 156, 72)); g.rectangle((12, 10, 20, 22), art)   # (a card on it)
    g.rectangle((13, 11, 19, 17), shade(art, 0.7)); g.ellipse((14, 12, 18, 16), shine)
    g.line((10, 8, 10, 24), shade(body, 1.35)); g.line((23, 6, 23, 26), shade(body, 0.6))
    p.save(os.path.join(out, name + '.png'))
print('Domino City map; %d booster packs' % len(PACKS))
