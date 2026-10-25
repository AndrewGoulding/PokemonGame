# Domino City's map screen, The Sacred Cards' own (GBA, Konami, 2003; the USA cartridge, game code AY7E: your own
# dump of it), for the Yu-Gi-Oh! realm; and the Kame Game shop's booster packs' icons (this game's own).
#
#   python3 tools/build-domino-map.py "<path to Yu-Gi-Oh! - The Sacred Cards (USA).gba>"
#
# From the cartridge (the map screen's loader, its literal pool at 0x0c10, points at them all):
#   - assets/town-map/domino.png: the city, rendered from above (240 by 160): its 8bpp tiles (LZ77, 0x56d28), its
#     tile map (0x5ffbc, 30 by 20, one screen) and its 192 colours (0x5fe3c). Its darker band at the bottom left is
#     the game's own, under the place's picture and name.
#   - assets/town-map/domino-marker.png and domino-cursor.png: a place's red marker and the gold cursor over the one
#     you're on (16 by 16): the screen's sprite tiles (LZ77, 0x6aabc, 4bpp, laid out 32 tiles across) in their
#     palettes (0x6a9fc, 0x6a93c). Where the game puts its ten places' markers is a table at 0xd305e0 (the cursor's,
#     ten pixels higher, at 0xd30564): ui/game.js's DOMINO_PLACES takes two of those spots.
# This game's own:
#   - assets/town-map/domino-frame.png: the frame round the place's picture at the bottom left (80 by 48), as the
#     game's; and domino-<map>.png, the pictures in it, each place's screen made small.
#   - assets/sprites/items/booster/*.png (32 by 32, one for each pack).
import os, sys, struct
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TOWN = os.path.join(ROOT, 'assets/town-map')
if len(sys.argv) < 2: sys.exit(__doc__ or 'usage: python3 tools/build-domino-map.py <The Sacred Cards (USA).gba>')
rom = open(sys.argv[1], 'rb').read()
if rom[0xac:0xb0] != b'AY7E': sys.exit('Not Yu-Gi-Oh! The Sacred Cards (USA): its game code is ' + repr(rom[0xac:0xb0]))

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
def colour(c): return ((c & 31) << 3 | (c & 31) >> 2, (c >> 5 & 31) << 3 | (c >> 5 & 31) >> 2, (c >> 10 & 31) << 3 | (c >> 10 & 31) >> 2)
def palette(o, n): return [colour(struct.unpack_from('<H', rom, o + 2 * i)[0]) for i in range(n)]

# ---------- The city ----------
tiles, pal = lz77(0x56d28), palette(0x5fe3c, 192)
city = Image.new('RGBA', (240, 160))
for ty in range(20):
    for tx in range(30):
        e = struct.unpack_from('<H', rom, 0x5ffbc + 2 * (ty * 30 + tx))[0]
        t = e & 0x3ff
        for j in range(8):
            for i in range(8):
                v = tiles[t * 64 + (7 - j if e & 0x800 else j) * 8 + (7 - i if e & 0x400 else i)]
                city.putpixel((tx * 8 + i, ty * 8 + j), pal[v] + (255,))
city.save(os.path.join(TOWN, 'domino.png'))

# ---------- The marker and the cursor ----------
objs = lz77(0x6aabc)
def sprite(tx, pal):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y in range(16):
        for x in range(16):
            t = (y // 8) * 32 + tx + x // 8
            v = objs[t * 32 + (y % 8) * 4 + (x % 8) // 2] >> (4 * (x & 1)) & 15
            if v: im.putpixel((x, y), pal[v] + (255,))
    return im
sprite(16, palette(0x6a9fc, 16)).save(os.path.join(TOWN, 'domino-marker.png'))
sprite(0, palette(0x6a93c, 16)).save(os.path.join(TOWN, 'domino-cursor.png'))

# ---------- The place's picture, and its frame ----------
# The frame: dark round the outside (its corners cut), inside it a line of light along the top and left, gold
# along the bottom and right.
FW, FH = 80, 48
frame = Image.new('RGBA', (FW, FH), (0, 0, 0, 0)); g = ImageDraw.Draw(frame)
DARK, WHITE, PALE, GOLD = (32, 32, 32, 255), (248, 248, 248, 255), (240, 216, 128, 255), (208, 176, 48, 255)
g.polygon([(3, 0), (FW - 4, 0), (FW - 1, 3), (FW - 1, FH - 4), (FW - 4, FH - 1), (3, FH - 1), (0, FH - 4), (0, 3)], outline=DARK)
g.line((4, 1, FW - 5, 1), PALE); g.line((2, 3, 3, 2), WHITE); g.point((4, 1), WHITE); g.point((5, 1), WHITE)
g.line((1, 4, 1, FH - 5), WHITE)
g.line((FW - 2, 4, FW - 2, FH - 5), GOLD); g.line((4, FH - 2, FW - 5, FH - 2), GOLD); g.line((FW - 4, FH - 2, FW - 2, FH - 4), GOLD)
g.line((FW - 4, 1, FW - 2, 3), GOLD); g.line((1, FH - 4, 3, FH - 2), GOLD)
frame.save(os.path.join(TOWN, 'domino-frame.png'))
# The pictures: each place's screen (its ground and what's over it), made small, filling the frame's inside.
MAPS = os.path.join(ROOT, 'assets/world/maps')
IW, IH = FW - 4, FH - 4
for name in ('DH_00', 'RD_06'):
    shot = Image.open(os.path.join(MAPS, name + '.png')).convert('RGBA')
    top = os.path.join(MAPS, name + '-top.png')
    if os.path.exists(top): shot.alpha_composite(Image.open(top).convert('RGBA'))
    k = max(IW / shot.width, IH / shot.height)
    small = shot.resize((round(shot.width * k), round(shot.height * k)), Image.LANCZOS)
    x0, y0 = (small.width - IW) // 2, (small.height - IH) // 2
    small.crop((x0, y0, x0 + IW, y0 + IH)).save(os.path.join(TOWN, 'domino-' + name + '.png'))

def shade(c, k): return tuple(max(0, min(255, int(v * k))) for v in c[:3]) + (255,)

# ---------- The booster packs ----------
# Each a foil pack, seen a little turned: its set's colours, a card's shape on it, crimped top and bottom.
PACKS = {
    'legend-of-blue-eyes-pack': ((56, 104, 200), (210, 230, 250), (250, 250, 255)),
    'metal-raiders-pack': ((150, 40, 40), (70, 60, 64), (236, 196, 88)),
    'spell-ruler-pack': ((40, 130, 90), (180, 230, 190), (240, 236, 150)),
    'pharaohs-servant-pack': ((120, 64, 168), (236, 196, 88), (250, 236, 200)),
    'labyrinth-of-nightmare-pack': ((44, 40, 72), (196, 80, 56), (232, 220, 250)),
    # (the seven packs of the cards beyond GX's: tools/build-extra-cards.py)
    'ultimate-great-moth-pack': ((70, 120, 48), (214, 206, 120), (250, 246, 200)),
    'gate-guardian-pack': ((84, 88, 112), (120, 176, 230), (240, 244, 255)),
    'dark-necrofear-pack': ((58, 36, 80), (196, 196, 220), (250, 240, 255)),
    'des-gardius-pack': ((118, 30, 40), (52, 48, 56), (236, 196, 88)),
    'dark-ruler-ha-des-pack': ((96, 20, 24), (224, 160, 64), (255, 236, 180)),
    'gilford-pack': ((40, 60, 112), (240, 220, 80), (255, 255, 220)),
    'berserk-dragon-pack': ((44, 34, 34), (200, 64, 40), (250, 210, 170)),
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
print('Domino City map screen; %d booster packs' % len(PACKS))
