#!/usr/bin/env python3
# The rest of Kamurocho (the Like a Dragon realm's side-on streets, ui/street.js), put together out of Streets of
# Kamurocho's own pictures: it has only its one long street, the alley and Bacchus, so Yakuza 0's other streets are
# built from their pieces, cut and set side by side, recoloured and relit, in the street's 480-high frame (black
# above, the buildings' fronts, the pavement at the bottom).
#
#   python3 tools/build-kamurocho-streets.py "<the game's folder: AR_win32.mdf and .mtc>"
#
# Its pieces:
#   assets/kamurocho/street.png (tools/build-kamurocho-sok.py's): the shopfronts along it, each a bay 133-135 high
#     standing on the pavement (BAYS: the Stardust, the steak house's passage, Fujibashi, Serena, Poppo, the yakiniku
#     place up its steps, the batting centre, the gyudon place, the passage with the taxi, the theatre-like
#     building's arcade), and its pavement, the strip along the batting centre (PAVEMENT)
#   assets/kamurocho/alley.png: the Empty Lot's back doors, for the Champion District's bars (ALLEY)
#   the game's entry 23 (its title screens): Tenkaichi Street's gate at night, its sign lit (神室町天下一通り), the
#     street beyond it, and its neon (GATE, NEON)
#   the game's entry 15 (the atlas): the things it stands on its streets: lamp posts, bicycles at their rails, the
#     shop's sandwich boards and menu stands, the red Kamurocho sign, a no-entry sign, cones, a bin; the overhead
#     wires; the beams under its lamps; and its own letters, for signs (PROPS, FONT)
#
#   Taihei Boulevard    the wide road across the middle: the gate of Tenkaichi Street, the ways into Theater
#                       Square, Nakamichi Street, the Kamuro Shopping Area and Pink Street, a pachinko hall
#   Tenkaichi Street    south from the gate to Showa Street, its eating places, the way into Nakamichi Alley
#   Nakamichi Street    beside it: a hostess club, bars, the way into Nakamichi Alley
#   Pink Street         north from Showa Street across Taihei to Shichifuku: its clubs in pink neon, Pink Alley
#   Champion District   lanes of bars no bigger than a closet, wires overhead, their lanterns and signboards
#   Theater Square      the open square in the north: the Kamuro Theater's arcade and marquee, its lamps
#   Showa Street        along the south: sushi, a discount store, mahjong, real estate; the feet of Nakamichi
#                       and Pink Street
#   Senryo Avenue       along the east: a bank, Pink Alley, a game centre, Taihei's end, a pharmacy, the Champion
#                       District, a clinic
#   Hotel District      love hotels in bulbs, violet light, a car park
#   Shichifuku Street   across the north: its sign, oden, the Hotel District, an izakaya, the lane to Theater
#                       Square, a pawn shop, ramen, Pink Street's top, the construction site
#   Nakamichi, Pink and Theater Alleys   back alleys of the Empty Lot's doors, wires over them (back_alley)
# (Taihei Boulevard is 640 high, its road below the pavement: road(), drawn here in the street's dither.)
#
# Writes assets/kamurocho/<scene>.png, as data/kamurocho-street.js's scenes name them.
import io, os, sys, importlib.util, random
from PIL import Image, ImageDraw, ImageChops, ImageEnhance

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
K = os.path.join(ROOT, 'assets/kamurocho')
H, BASE = 480, 391           # (the frame's height; where the fronts stand on the pavement)

# The bays off the street (street.png): (x0, y0, x1, y1), each cut down to the pavement.
BAYS = {
    'block': (0, 0, 92, 133), 'stardust': (92, 0, 242, 133), 'steak': (242, 0, 330, 133), 'fujibashi': (330, 0, 494, 133),
    'serena': (494, 0, 626, 133), 'poppo': (626, 0, 792, 133),
    'arcade': (1600, 256, 1745, 391), 'yakiniku': (1745, 256, 1966, 391), 'shadow': (1966, 256, 2050, 391),
    'batting': (2050, 256, 2440, 391), 'gyudon': (2440, 256, 2680, 391), 'taxi': (2680, 256, 2905, 391),
}
PAVEMENT = (2050, BASE, 2440, 480)
# The Empty Lot's doors (alley.png), cut down to its floor: the pipes and the dark door, the red door and its neon,
# the lit doorway under the corrugated awning.
ALLEY = {'pipes': (150, 255, 232, 398), 'reddoor': (232, 255, 345, 398), 'lit': (345, 255, 420, 398), 'bright': (420, 255, 495, 398)}
# Entry 23: the title screen's Tenkaichi gate, and the street beyond (x0, y0, x1, y1); its neon signs.
GATE = (318, 1088, 592, 1268)
NEON = {'pinkv': (528, 1099, 564, 1196), 'orange': (476, 1176, 508, 1216), 'yellowv': (455, 1166, 470, 1210), 'greenv': (444, 1196, 456, 1238)}
# Entry 15's things (x, y, w, h).
PROPS = {
    'lamp2': (172, 3624, 60, 216), 'lampbikes': (346, 3624, 136, 216), 'redsign': (101, 3663, 44, 171), 'lamp': (562, 3667, 73, 226),
    'bike': (229, 3775, 107, 64), 'bench': (579, 3855, 86, 87), 'busstop': (674, 3870, 22, 75), 'noentry': (1044, 3956, 44, 139),
    'bike2': (1072, 4031, 106, 64), 'rail': (1372, 4056, 106, 39), 'board': (490, 3805, 23, 44), 'menu1': (2003, 3805, 23, 36),
    'menu2': (2035, 3805, 22, 37), 'cone': (109, 3805, 19, 33), 'barrel': (54, 3803, 22, 36), 'bin': (1, 3809, 20, 28),
    'kamuro': (2690, 2012, 52, 146), 'stand1': (2904, 2108, 24, 46), 'stand2': (2930, 2098, 24, 56), 'stand3': (3106, 2096, 22, 56),
    'stand4': (3188, 2096, 44, 58), 'wires': (1736, 2008, 380, 40), 'beam': (40, 1310, 110, 190),
}
# (its own letters, the yellow row: A to Z from x 2046, every 8, each 7 wide and 10 high)
FONT_Y, FONT_H = 2573, 10
def glyph_x(ch): return 2046 + 8 * (ord(ch) - 65)

def load(game):
    spec = importlib.util.spec_from_file_location('sok', os.path.join(ROOT, 'tools/build-kamurocho-sok.py'))
    sok = importlib.util.module_from_spec(spec); spec.loader.exec_module(sok)
    E = sok.entries(game)
    return Image.open(io.BytesIO(E[15])).convert('RGBA'), Image.open(io.BytesIO(E[23])).convert('RGBA')

# ---------- Recolouring and relighting ----------
def hue(im, shift, sat=1.0, val=1.0):
    # (turned round the colour wheel by `shift` (0-255), more or less saturated, lighter or darker)
    a = im.getchannel('A') if im.mode == 'RGBA' else None
    h, s, v = im.convert('RGB').convert('HSV').split()
    h = h.point(lambda p: (p + shift) % 256); s = s.point(lambda p: min(255, int(p * sat))); v = v.point(lambda p: min(255, int(p * val)))
    out = Image.merge('HSV', (h, s, v)).convert('RGB').convert('RGBA')
    if a: out.putalpha(a)
    return out

def tint(im, colour, k):
    # (lit by a coloured light: multiplied by it, `k` of the way)
    lit = ImageChops.multiply(im.convert('RGB'), Image.new('RGB', im.size, colour))
    out = Image.blend(im.convert('RGB'), lit, k).convert('RGBA')
    if im.mode == 'RGBA': out.putalpha(im.getchannel('A'))
    return out

def light(canvas, cx, cy, rx, ry, colour, strength=0.35):
    # (a pool of light added over the picture, strongest in its middle, its dither the street's: a checkerboard
    # at its edge)
    layer = Image.new('RGB', canvas.size, (0, 0, 0)); px = layer.load()
    for y in range(max(0, int(cy - ry)), min(canvas.height, int(cy + ry))):
        for x in range(max(0, int(cx - rx)), min(canvas.width, int(cx + rx))):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d >= 1: continue
            k = (1 - d) * strength
            if d > 0.6 and (x + y) % 2: continue
            px[x, y] = tuple(int(c * k) for c in colour)
    canvas.paste(ImageChops.add(canvas.convert('RGB'), layer).convert('RGBA'), (0, 0))

def mirror(im): return im.transpose(Image.FLIP_LEFT_RIGHT)

class Scene:
    def __init__(self, w, seed, h=H):
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 255)); self.x = 0; self.rnd = random.Random(seed)
    def pave(self, pv, tone=None):
        # (the pavement along the whole street, the strip from the street repeated)
        p = pv if not tone else tone(pv)
        for x in range(0, self.im.width, p.width): self.im.paste(p, (x, BASE))
    def bay(self, im, gap=0):
        # (the next front along, standing on the pavement)
        self.im.alpha_composite(im, (self.x, BASE - im.height)); self.x += im.width + gap
        return self.x - im.width - gap
    def fill(self, *ims):
        # (fronts, in turn, to the street's end)
        k = 0
        while self.x < self.im.width: self.bay(ims[k % len(ims)]); k += 1
    def put(self, im, x, base):
        # (a thing standing with its foot on `base`)
        self.im.alpha_composite(im, (int(x - im.width // 2), int(base - im.height)))
    def at(self, im, x, y): self.im.alpha_composite(im, (int(x), int(y)))

def letters(atlas, s, colour=None, scale=1, gap=0):
    # (words in the game's own letters, coloured as a sign's neon if `colour`)
    out = Image.new('RGBA', (len(s) * (8 + gap) * scale, FONT_H * scale), (0, 0, 0, 0))
    for k, ch in enumerate(s):
        if ch == ' ': continue
        g = atlas.crop((glyph_x(ch), FONT_Y, glyph_x(ch) + 7, FONT_Y + FONT_H))
        if ch == 'O':
            # (its O is square on the left, a D at a glance: its round right side turned round onto its left)
            r = g.crop((4, 0, 7, FONT_H)).transpose(Image.FLIP_LEFT_RIGHT); g.paste(r, (0, 0))
        if colour:
            # (the letters' own shading kept, made the neon's colour: their light rows its colour, their dark its shade)
            px = g.load()
            for y in range(g.height):
                for x in range(g.width):
                    r, gg, b, a = px[x, y]
                    if a: v = (r + gg + b) / 765; px[x, y] = tuple(int(c * (0.45 + 0.55 * v)) for c in colour) + (a,)
        out.alpha_composite(g.resize((7 * scale, FONT_H * scale), Image.NEAREST), (k * (8 + gap) * scale, 0))
    return out

def neon(im, colour, glow=True):
    # (a neon sign: its letters in `colour`, and their glow about them on the wall)
    if not glow: return im
    a = im.getchannel('A')
    halo = Image.new('RGBA', (im.width + 8, im.height + 8), (0, 0, 0, 0))
    for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2), (-1, -1), (1, 1), (-1, 1), (1, -1)):
        g = Image.new('RGBA', im.size, colour + (70,)); g.putalpha(a.point(lambda p: 70 if p else 0))
        halo.alpha_composite(g, (4 + dx, 4 + dy))
    halo.alpha_composite(im, (4, 4))
    return halo

def board(atlas, word, bg, fg, scale=2, pad=4, bulbs=False):
    # (a shop's board: dark-edged, its words in the game's letters; a ring of bulbs round it if `bulbs`)
    t = letters(atlas, word, fg, scale)
    w, h = t.width + pad * 2 + (8 if bulbs else 0), t.height + pad * 2 + (8 if bulbs else 0)
    b = Image.new('RGBA', (w, h), (0, 0, 0, 255)); d = ImageDraw.Draw(b)
    d.rectangle((1, 1, w - 2, h - 2), fill=tuple(max(0, c - 40) for c in bg)); d.rectangle((2, 2, w - 3, h - 3), fill=bg)
    for y in range(2, h - 2, 2): d.line((2, y, w - 3, y), fill=tuple(max(0, c - 14) for c in bg))
    if bulbs:
        for x in range(4, w - 4, 4):
            d.point((x, 3), fill=(255, 240, 170)); d.point((x, h - 4), fill=(255, 240, 170))
        for y in range(4, h - 4, 4):
            d.point((3, y), fill=(255, 240, 170)); d.point((w - 4, y), fill=(255, 240, 170))
    b.alpha_composite(t, ((w - t.width) // 2, (h - t.height) // 2))
    return b

def pieces(game):
    atlas, title = load(game)
    street = Image.open(os.path.join(K, 'street.png')).convert('RGBA')
    alley = Image.open(os.path.join(K, 'alley.png')).convert('RGBA')
    P = {k: street.crop(v) for k, v in BAYS.items()}
    P.update({k: alley.crop(v) for k, v in ALLEY.items()})
    P['pavement'] = street.crop(PAVEMENT)
    # (the batting centre's front without its neon or its ball: its wall's rows from below carried up over them, for
    # other names)
    b = P['batting'].copy()
    for y in range(0, 38): b.paste(P['batting'].crop((48, y + 26, b.width, y + 27)), (48, y))
    for y in range(0, 38): b.paste(P['batting'].crop((48, y + 26, 96, y + 27)), (0, y))
    P['batting'] = b
    g = title.crop(GATE)
    # (the gate's picture's black about it made see-through, so it stands against the night)
    a = g.convert('L').point(lambda p: 0 if p < 6 else 255); g.putalpha(a)
    P['gate'] = g
    for k, v in NEON.items(): P[k] = title.crop(v)
    for k, (x, y, w, h) in PROPS.items(): P[k] = atlas.crop((x, y, x + w, y + h))
    return P, atlas

def road(S, y0, y1, cross=None):
    # (Taihei Boulevard's road, below its pavement: the kerb, the asphalt in the street's dither (its grain a pixel at a
    # time, darker and lighter), its edge lines and the dashes between its lanes, worn; a zebra crossing at `cross`
    # (x0, x1); and the far side's kerb and guard rail, the pavement beyond it)
    im = S.im; d = ImageDraw.Draw(im); w = im.width; px = im.load()
    far = y1 - 34
    for y in range(y0 + 6, far):
        for x in range(w):
            k = S.rnd.random()
            v = 34 + (6 if (x + y) % 2 and k < 0.35 else 0) - (5 if k > 0.93 else 0) + (y - y0) // 24
            px[x, y] = (v, v, v + 5, 255)
    # (the kerb: its top lit, its face, its shadow on the road)
    d.rectangle((0, y0, w, y0 + 2), fill=(150, 148, 140)); d.rectangle((0, y0 + 3, w, y0 + 5), fill=(92, 90, 86))
    for x in range(0, w, 2): px[x, y0 + 6] = (20, 20, 24, 255)
    for x in range(0, w, 48): d.line((x, y0, x, y0 + 5), fill=(70, 68, 64))
    def worn(x0, y, x1, h, col):
        for yy in range(y, y + h):
            for xx in range(x0, x1):
                if S.rnd.random() < 0.86: px[xx, yy] = col
    edge, mid = y0 + 14, (y0 + far) // 2
    for x in range(0, w, 4): worn(x, edge, x + 4, 2, (196, 192, 170, 255)); worn(x, far - 12, x + 4, 2, (196, 192, 170, 255))
    for x in range(0, w, 64):
        if not (cross and cross[0] - 36 < x < cross[1]): worn(x, mid - 1, x + 36, 3, (214, 200, 120, 255))
    for x in range(20, w, 64): worn(x, (edge + mid) // 2, x + 30, 2, (180, 178, 160, 255)); worn(x, (mid + far) // 2, x + 30, 2, (180, 178, 160, 255))
    if cross:
        for y in range(edge + 6, far - 16, 9): worn(cross[0], y, cross[1], 5, (210, 210, 200, 255))
    # (the far kerb, its rail's posts and two rails, and the pavement beyond)
    d.rectangle((0, far, w, far + 2), fill=(120, 118, 112)); d.rectangle((0, far + 3, w, y1), fill=(48, 48, 52))
    for y in range(far + 3, y1):
        for x in range((y % 2), w, 2): px[x, y] = (58, 58, 62, 255)
    for x in range(6, w, 40): d.rectangle((x, far - 18, x + 2, far), fill=(170, 172, 176)); d.line((x + 3, far - 18, x + 3, far), fill=(60, 60, 66))
    d.rectangle((0, far - 17, w, far - 15), fill=(214, 216, 220)); d.line((0, far - 14, w, far - 14), fill=(90, 92, 98))
    d.rectangle((0, far - 9, w, far - 8), fill=(190, 192, 196))

def lamps(S, P, xs, base=BASE + 2):
    for x in xs:
        S.put(P['lamp2'], x, base)
        light(S.im, x, base + 26, 70, 22, (230, 220, 170), 0.22)

TURNS = {}   # (each street's turnings, as built: its name -> [(where to, x0, x1)], printed for data/kamurocho-street.js)
def turn(S, name, im, word, bg, fg, at=300, gap=0):
    # (a turning off the street: a passage's bay, its board over it naming where it goes; noted in TURNS)
    x = S.bay(im, gap)
    b = neon(board(atlas_of[0], word, bg, fg, 1), fg)
    S.at(b, x + max(0, (im.width - b.width) // 2), at)
    TURNS.setdefault(name, []).append((word, x, x + im.width))
    return x
atlas_of = [None]
BLUE = ((20, 30, 60), (160, 230, 255)); PINKB = ((40, 10, 30), (255, 140, 220)); GOLD = ((40, 20, 10), (255, 220, 140))

# ---------- The streets ----------
TAIHEI_H = 640   # (its road below the pavement: taller than the others)
def taihei(P, atlas):
    S = Scene(2100, 31, TAIHEI_H); S.pave(P['pavement'])
    # West to east across the middle of the town: a block; the gate of Tenkaichi Street; the passage up into Theater
    # Square; the yakiniku place up its steps; the turning into Nakamichi Street (the taxi's passage); the batting
    # centre's block made the pachinko hall (its walls darker, its neon gone pink, its board in bulbs); the way up
    # into the Kamuro Shopping Area (the steak house's passage); the gyudon place; Pink Street (the taxi's passage,
    # lit pink); Fujibashi; a block. Theater Alley off its west end, Senryo Avenue its east.
    S.bay(P['block'])
    # (the gate, Tenkaichi Street beyond it)
    S.x += 8; gx = S.x
    S.im.alpha_composite(P['gate'], (gx, 430 - P['gate'].height)); S.x += P['gate'].width + 8
    TURNS.setdefault('taihei', []).append(('TENKAICHI', gx, gx + P['gate'].width))
    turn(S, 'taihei', P['shadow'], 'THEATER SQ', *BLUE, at=262)
    S.bay(P['yakiniku'])
    turn(S, 'taihei', P['taxi'], 'NAKAMICHI', *BLUE)
    x = S.bay(hue(P['batting'], 200, 1.3, 0.85))
    S.at(neon(board(atlas, 'PACHINKO', (150, 20, 60), (255, 230, 120), 2, bulbs=True), (255, 80, 160)), x + 120, 262)
    light(S.im, x + 195, 330, 160, 50, (255, 90, 170), 0.25)
    turn(S, 'taihei', P['steak'], 'KAMURO', *GOLD, at=262)
    S.bay(P['gyudon'])
    x = turn(S, 'taihei', tint(P['taxi'], (255, 120, 210), 0.45), 'PINK ST', *PINKB)
    light(S.im, x + 112, 330, 100, 60, (255, 60, 170), 0.3)
    S.bay(hue(P['fujibashi'], 30))
    S.fill(P['block'], P['shadow'])
    lamps(S, P, (60, 640, 1150, 1600, 2000))
    S.put(P['bike'], 760, BASE + 6); S.put(P['bike2'], 1480, BASE + 6); S.put(P['board'], 1340, BASE + 4)
    S.put(P['kamuro'], gx - 4, BASE + 4)
    # (Theater Alley off its west end, Senryo Avenue its east: signs on the corner blocks)
    S.at(neon(board(atlas, 'THEATER ALLEY', *BLUE, 1), BLUE[1]), 8, 300)
    S.at(neon(board(atlas, 'SENRYO AVE', *BLUE, 1), BLUE[1]), 2000, 300)
    road(S, H, TAIHEI_H, (gx + 70, gx + 200))
    for x in (60, 640, 1150, 1600, 2000): light(S.im, x, H + 40, 90, 30, (230, 220, 170), 0.12)
    return S.im, gx

def tenkaichi(P, atlas):
    S = Scene(1400, 41); S.pave(P['pavement'])
    # The gate at the south end, off Taihei Boulevard; then the eating places: the ramen counter (Fujibashi's front,
    # its board red), the yakiniku place, the gyudon place, the steak house's passage; the corner of Nakamichi
    # Street (the passage with the taxi); Smile Burger (the gyudon front again, relit, its board new), the
    # izakaya (the steak house's), and a block at the north end.
    S.im.alpha_composite(P['gate'], (-24, 430 - P['gate'].height)); S.x = P['gate'].width - 16
    x = S.bay(hue(P['fujibashi'], 240, 1.2))
    S.at(board(atlas, 'RAMEN', (180, 30, 24), (255, 236, 200), 2), x + 52, 266)
    S.bay(P['yakiniku'])
    S.bay(P['steak'])
    turn(S, 'tenkaichi', P['taxi'], 'NAKAMICHI ALLEY', *BLUE)     # (the way into Nakamichi Alley)
    x = S.bay(hue(P['gyudon'], 245, 1.4, 1.05))
    S.at(neon(board(atlas, 'SMILE BURGER', (190, 30, 24), (255, 236, 150), 2), (255, 200, 80)), x + 20, 258)
    S.bay(hue(P['serena'], 12, 1.0, 1.1))
    S.bay(P['block'])
    S.at(neon(board(atlas, 'SHOWA ST', *BLUE, 1), BLUE[1]), 1300, 300)   # (Showa Street at its south end)
    lamps(S, P, (330, 690, 940, 1290))
    S.put(P['menu1'], 600, BASE + 4); S.put(P['stand4'], 1100, BASE + 4); S.put(P['bike'], 1240, BASE + 6)
    return S.im

def nakamichi(P, atlas):
    S = Scene(1400, 51); S.pave(P['pavement'])
    # A coffee shop (Fujibashi's, its board green); the hostess club (the Stardust, its neon gone gold); Serena's
    # neighbour, a bar; the way into Pink Street (the taxi's passage, lit pink from inside); the pawn shop (Poppo's
    # front, dimmed, its board new); the yakiniku place; a ramen counter; a block.
    x = S.bay(hue(P['fujibashi'], 90, 0.9))     # (Cafe Blend: the story's)
    S.at(board(atlas, 'CAFE BLEND', (40, 90, 50), (240, 230, 200), 1), x + 40, 266)
    x = S.bay(hue(P['stardust'], 40, 1.1))
    S.bay(hue(P['serena'], 230, 1.2))
    x = turn(S, 'nakamichi', hue(P['taxi'], 150, 0.6, 0.85), 'NAKAMICHI ALLEY', *BLUE)     # (the way into the alley)
    light(S.im, x + 112, 330, 100, 60, (120, 160, 255), 0.25)
    x = S.bay(hue(P['poppo'], 120, 0.5, 0.8))     # (Toko Credit, the loan office upstairs: the story's)
    S.at(board(atlas, 'TOKO CREDIT', (30, 30, 30), (240, 240, 240), 1), x + 36, 276)
    S.bay(P['yakiniku'])
    S.bay(hue(P['steak'], 140))
    x = S.bay(hue(P['fujibashi'], 0, 1.0, 0.9))
    S.bay(P['block'])
    S.at(neon(board(atlas, 'SHOWA ST', *BLUE, 1), BLUE[1]), 1300, 300)
    lamps(S, P, (170, 520, 950, 1300))
    S.put(P['stand1'], 420, BASE + 4); S.put(P['board'], 1060, BASE + 4); S.put(P['bike2'], 1200, BASE + 6)
    return S.im

def pink(P, atlas):
    S = Scene(1440, 61); S.pave(P['pavement'], lambda p: tint(p, (255, 150, 210), 0.25))
    # North from Showa Street, across Taihei Boulevard, to Shichifuku Street East: the clubs, the Stardust's front and
    # its neon made pink (once turned round); Serena's lit pink; the way into Pink Alley (the steak house's passage);
    # the lounge; the crossing of Taihei Boulevard (the taxi's passage); the lane to the Champion District (the Empty
    # Lot's red door and neon); the gate street's neon hung on the walls; pink light over all.
    pinkify = lambda im: tint(hue(im, 225, 1.5, 1.05), (255, 170, 220), 0.25)
    S.bay(pinkify(P['block']))
    x = S.bay(pinkify(P['stardust']))
    S.at(neon(board(atlas, 'CABARET', (40, 0, 30), (255, 120, 210), 2), (255, 60, 190)), x + 18, 300)
    S.bay(pinkify(P['serena']))
    turn(S, 'pink', hue(P['steak'], 150, 1.3), 'PINK ALLEY', *PINKB, at=262)
    x = S.bay(mirror(pinkify(P['stardust'])))
    S.at(neon(board(atlas, 'CLUB MOON', (30, 0, 50), (220, 150, 255), 1), (200, 120, 255)), x + 30, 300)
    x = S.bay(pinkify(P['fujibashi']))
    S.at(neon(board(atlas, 'LOUNGE', (40, 20, 0), (255, 220, 120), 2), (255, 200, 80)), x + 40, 266)
    turn(S, 'pink', tint(P['taxi'], (255, 120, 210), 0.3), 'TAIHEI BLVD', *BLUE)
    S.bay(pinkify(P['serena']))
    S.x += 6
    x = S.bay(P['reddoor'], 6)     # (a snack bar's back door: the Champion District's off Senryo Avenue)
    S.at(neon(board(atlas, 'SNACK', (30, 10, 10), (255, 200, 120), 1), (255, 140, 80)), x + 36, 262)
    S.fill(pinkify(P['block']), mirror(pinkify(P['steak'])))
    S.at(neon(board(atlas, 'SHICHIFUKU', *GOLD, 1), GOLD[1]), 1340, 300)
    for nx in (240, 560, 760, 1100, 1300):
        S.at(neon(P['pinkv'] if nx % 3 else P['orange'], (255, 90, 200)), nx, 262)
    for nx in (100, 300, 640, 1000, 1260): light(S.im, nx, 330, 110, 70, (255, 60, 170), 0.22)
    lamps(S, P, (360, 1000, 1380))
    S.put(P['stand2'], 200, BASE + 4); S.put(P['stand3'], 1090, BASE + 4); S.put(P['menu2'], 1300, BASE + 4)
    return S.im

def champion(P, atlas):
    S = Scene(900, 71); S.pave(P['pavement'], lambda p: ImageEnhance.Brightness(p).enhance(0.6))
    # Lanes of tiny bars: the Empty Lot's back doors, one after the next, some turned round, recoloured, relit; the
    # wires strung over them; their names on boards in the game's letters; signboards out on the lane.
    doors = ['reddoor', 'lit', 'pipes', 'bright']
    names = ['BAR RAN', 'SNACK KOI', 'KAME', 'BAR BLUE', 'HANA', 'BAR YORU', 'MINATO', 'BAR KEN', 'SAKE']
    k = 0
    while S.x < 900:
        im = P[doors[k % 4]]
        im = hue(im, S.rnd.choice([0, 0, 20, 230, 200]), 1.1, 0.95)
        if k % 3 == 1: im = mirror(im)
        x = S.bay(im)
        b = neon(board(atlas, names[k % len(names)], S.rnd.choice([(40, 20, 10), (10, 20, 40), (30, 10, 30)]),
                       S.rnd.choice([(255, 220, 140), (255, 150, 200), (160, 230, 255)]), 1), (255, 160, 100))
        S.at(b, x + (im.width - b.width) // 2, 262)
        light(S.im, x + im.width // 2, 360, 40, 40, (255, 180, 110), 0.18)
        k += 1
    for wx in range(-60, 900, 360): S.at(P['wires'], wx, 248); S.at(P['wires'], wx + 160, 256)
    for x in (130, 380, 610, 820): S.put(S.rnd.choice([P['board'], P['menu1'], P['stand1'], P['menu2']]), x, BASE + 6)
    S.put(P['barrel'], 470, BASE + 6); S.put(P['bin'], 720, BASE + 6)
    return S.im

def theater(P, atlas):
    S = Scene(1300, 81); S.pave(P['pavement'], lambda p: ImageEnhance.Brightness(p).enhance(1.15))
    # The cinema (the batting centre's front, its board the cinema's); the Kamuro Theater, the arcade's front four
    # times along (its arched windows, its balustrade, its lamps), its marquee in bulbs across; Poppo and Heroine,
    # the karaoke bar, on the square's other side. The square open before them: lamps, rails, the red Kamurocho sign.
    x = S.bay(hue(P['batting'], 150, 0.8))
    S.at(neon(board(atlas, 'KAMURO CINEMA', (20, 20, 50), (250, 240, 200), 2, bulbs=True), (200, 200, 255)), x + 90, 262)
    tx = S.x
    for k in range(4): S.bay(P['arcade'] if k % 2 == 0 else mirror(P['arcade']))
    mq = neon(board(atlas, 'KAMURO THEATER', (150, 20, 30), (255, 240, 200), 3, bulbs=True), (255, 180, 120))
    S.at(mq, tx + (S.x - tx - mq.width) // 2, 258)
    light(S.im, (tx + S.x) // 2, 300, 300, 70, (255, 200, 140), 0.18)
    x = S.bay(P['poppo'])
    x = S.bay(hue(P['fujibashi'], 200, 1.2))
    S.at(neon(board(atlas, 'HEROINE', (50, 0, 40), (255, 140, 220), 2), (255, 80, 200)), x + 30, 266)   # (the karaoke bar)
    lamps(S, P, (40, 300, 990, 1270))
    for rx in (420, 700): S.put(P['rail'], rx, BASE + 8)
    S.put(P['kamuro'], 380, BASE + 6); S.put(P['busstop'], 920, BASE + 6)
    S.put(P['bike2'], 1000, BASE + 6)
    return S.im

# ---------- More of Yakuza 0's Kamurocho ----------
def paint_out(S, x):
    # (the steak house's own sign, at the top of its bay at `x`, painted out, its wall dark, for another's board)
    ImageDraw.Draw(S.im).rectangle((x + 2, BASE - 133 + 2, x + 70, BASE - 133 + 40), fill=(16, 14, 24))

def showa(P, atlas):
    S = Scene(1560, 91); S.pave(P['pavement'], lambda p: ImageEnhance.Brightness(p).enhance(0.95))
    # Showa Street, along the south, west to east from the foot of Tenkaichi Street: a sushi counter (the gyudon
    # front, relit), the foot of Nakamichi Street (the shadowed passage), the discount store (the batting centre's
    # block, gone yellow, its board in bulbs), a mahjong parlour up its stairs (the yakiniku place's), the foot of
    # Pink Street (the taxi's passage, lit pink), a bar (Serena's, turned round), Tachibana Real Estate (Poppo's
    # front, dimmed), a block; Senryo Avenue at its east end.
    S.bay(P['block'])
    S.at(neon(board(atlas, 'TENKAICHI', *BLUE, 1), BLUE[1]), 8, 300)
    x = S.bay(hue(P['gyudon'], 120, 1.1, 1.05))
    S.at(neon(board(atlas, 'SUSHI', (20, 40, 90), (255, 255, 255), 2), (160, 200, 255)), x + 74, 258)
    turn(S, 'showa', P['shadow'], 'NAKAMICHI', *BLUE, at=262)
    x = S.bay(hue(P['batting'], 30, 1.4, 1.05))
    S.at(neon(board(atlas, 'DISCOUNT', (200, 160, 0), (60, 20, 0), 2, bulbs=True), (255, 220, 80)), x + 110, 262)
    light(S.im, x + 195, 330, 160, 50, (255, 220, 90), 0.2)
    x = S.bay(hue(P['yakiniku'], 20, 0.9))
    S.at(board(atlas, 'MAHJONG', (20, 80, 40), (250, 240, 200), 2), x + 54, 262)
    x = turn(S, 'showa', tint(P['taxi'], (255, 120, 210), 0.45), 'PINK ST', *PINKB)
    light(S.im, x + 112, 330, 100, 60, (255, 60, 170), 0.3)
    S.bay(mirror(hue(P['serena'], 200, 1.1)))
    x = S.bay(hue(P['poppo'], 60, 0.4, 0.75))
    S.at(board(atlas, 'TACHIBANA', (40, 40, 50), (230, 230, 240), 1), x + 46, 270)   # (Tachibana Real Estate: the story's)
    S.at(board(atlas, 'REAL ESTATE', (40, 40, 50), (230, 230, 240), 1), x + 40, 286)
    S.fill(P['block'], P['shadow'])
    S.at(neon(board(atlas, 'SENRYO AVE', *BLUE, 1), BLUE[1]), 1468, 340)
    lamps(S, P, (60, 470, 900, 1300))
    S.put(P['bike'], 600, BASE + 6); S.put(P['cone'], 1300, BASE + 4); S.put(P['cone'], 1322, BASE + 4)
    S.put(P['menu1'], 260, BASE + 4)
    return S.im

def senryo(P, atlas):
    S = Scene(1400, 101); S.pave(P['pavement'])
    # Senryo Avenue, along the east, south to north from Showa Street to Shichifuku Street East: offices and their
    # banks (the arcade's front, darker, its windows lit cold), the way into Pink Alley (the Empty Lot's red door,
    # its sign), the game centre (the batting centre's block, blue), Taihei Boulevard's east end (the taxi's
    # passage), a pharmacy, the clinic, a block; the bus stop.
    S.bay(P['block'])
    x = S.bay(hue(P['arcade'], 140, 0.6, 0.8))
    S.at(board(atlas, 'BANK', (20, 40, 80), (230, 240, 255), 2), x + 38, 262)
    S.x += 6
    turn(S, 'senryo', P['reddoor'], 'PINK ALLEY', *PINKB, at=262, gap=6)
    x = S.bay(hue(P['batting'], 120, 1.3))
    S.at(neon(board(atlas, 'GAME CENTER', (10, 20, 60), (120, 220, 255), 2, bulbs=True), (80, 160, 255)), x + 74, 262)
    light(S.im, x + 195, 330, 160, 50, (100, 170, 255), 0.22)
    turn(S, 'senryo', P['taxi'], 'TAIHEI BLVD', *BLUE)
    x = S.bay(hue(P['fujibashi'], 80, 1.0))
    S.at(board(atlas, 'PHARMACY', (20, 90, 60), (255, 255, 255), 2), x + 18, 266)
    S.x += 6
    turn(S, 'senryo', P['reddoor'], 'CHAMPION', (30, 10, 10), (255, 200, 120), at=262, gap=6)   # (the lanes of the Champion District)
    x = S.bay(hue(P['serena'], 140, 0.7, 1.1))
    S.at(board(atlas, 'CLINIC', (240, 240, 240), (200, 30, 30), 1), x + 40, 278)
    S.fill(mirror(hue(P['arcade'], 140, 0.6, 0.8)), P['block'], hue(P['shadow'], 140, 0.6))
    S.at(neon(board(atlas, 'SHICHIFUKU', *GOLD, 1), GOLD[1]), 1300, 300)
    lamps(S, P, (40, 460, 760, 1120, 1360))
    S.put(P['busstop'], 200, BASE + 6); S.put(P['bench'], 140, BASE + 8); S.put(P['bike2'], 1040, BASE + 6)
    return S.im

def hotels(P, atlas):
    S = Scene(1300, 111); S.pave(P['pavement'], lambda p: tint(p, (200, 150, 255), 0.25))
    # The Hotel District: love hotels side by side, their names in bulbs and their prices on boards (the Stardust,
    # the arcade's front and Fujibashi's, gone violet, pink and gold), a parking entrance (the steak house's
    # passage), violet light over all.
    violet = lambda im: tint(hue(im, 190, 1.3, 1.0), (210, 170, 255), 0.25)
    S.bay(violet(P['block']))
    x = S.bay(violet(P['stardust']))
    S.at(neon(board(atlas, 'HOTEL VENUS', (60, 0, 60), (255, 180, 255), 1, bulbs=True), (255, 100, 255)), x + 20, 262)
    x = S.bay(hue(P['arcade'], 210, 1.3))
    S.at(neon(board(atlas, 'MOONLIGHT', (20, 0, 50), (200, 200, 255), 1, bulbs=True), (160, 140, 255)), x + 18, 262)
    S.at(board(atlas, 'REST 3000', (30, 30, 30), (255, 230, 120), 1), x + 30, 330)
    x = S.bay(P['shadow'])
    x = S.bay(hue(P['steak'], 200, 1.1, 0.8))
    paint_out(S, x)   # (the steak house's sign: the car park's board over it)
    S.at(board(atlas, 'PARKING', (30, 60, 120), (255, 255, 255), 1), x + 6, 266)
    x = S.bay(hue(P['fujibashi'], 210, 1.4))
    S.at(neon(board(atlas, 'HOTEL PRINCESS', (70, 0, 40), (255, 200, 230), 1, bulbs=True), (255, 120, 200)), x + 22, 262)
    x = S.bay(mirror(violet(P['stardust'])))
    S.at(neon(board(atlas, 'AMOUR', (50, 0, 20), (255, 140, 170), 2), (255, 80, 140)), x + 40, 300)
    S.bay(violet(P['serena']))
    S.fill(violet(P['block']), hue(P['steak'], 200, 1.1, 0.8), violet(P['shadow']))
    for nx in (150, 420, 700, 980, 1200): light(S.im, nx, 330, 110, 70, (200, 100, 255), 0.2)
    lamps(S, P, (330, 860))
    S.put(P['stand2'], 260, BASE + 4); S.put(P['stand4'], 820, BASE + 4)
    return S.im

def shichifuku(P, atlas):
    S = Scene(1400, 121); S.pave(P['pavement'], lambda p: ImageEnhance.Brightness(p).enhance(0.9))
    # Shichifuku Street, across the north, west to east (Shichifuku Street West, Shichifuku Street, Shichifuku
    # Street East): its sign over the corner, an oden stall (the steak house's, warm), the way up into the Hotel
    # District, an izakaya (Fujibashi's), the lane down to Theater Square (the arcade's front, its sign), the pawn
    # shop, a ramen counter, the top of Pink Street (the taxi's passage, lit pink), the construction site's
    # hoardings (the shadow's wall, a no-entry sign and cones), a block.
    S.bay(P['block'])
    S.at(neon(board(atlas, 'SHICHIFUKU', (60, 10, 10), (255, 220, 140), 2, bulbs=True), (255, 160, 80)), 40, 222)
    x = S.bay(hue(P['steak'], 10, 1.2, 1.05)); paint_out(S, x)
    S.at(board(atlas, 'ODEN', (200, 40, 30), (255, 240, 220), 2), x + 10, 268)
    turn(S, 'shichifuku', tint(hue(P['shadow'], 190, 1.3), (210, 170, 255), 0.25), 'HOTELS', (40, 0, 50), (255, 180, 255), at=262)
    x = S.bay(hue(P['fujibashi'], 245, 1.1, 1.05))
    S.at(board(atlas, 'IZAKAYA', (120, 30, 20), (255, 230, 180), 2), x + 30, 266)
    turn(S, 'shichifuku', P['arcade'], 'THEATER SQ', (20, 20, 50), (250, 240, 200), at=330)
    x = S.bay(hue(P['poppo'], 30, 0.4, 0.7))     # (the Kazama family's office: the story's)
    S.at(board(atlas, 'KAZAMA', (20, 10, 10), (230, 200, 120), 1), x + 54, 276)
    x = S.bay(hue(P['gyudon'], 230, 1.2))
    S.at(neon(board(atlas, 'RAMEN', (180, 30, 24), (255, 236, 200), 2), (255, 120, 80)), x + 82, 258)
    x = turn(S, 'shichifuku', tint(P['taxi'], (255, 120, 210), 0.45), 'PINK ST', *PINKB)
    light(S.im, x + 112, 330, 100, 60, (255, 60, 170), 0.3)
    S.fill(ImageEnhance.Brightness(P['shadow']).enhance(0.8), P['block'])
    S.at(board(atlas, 'HAKUA BLDG', (40, 40, 44), (220, 220, 210), 1), 1236, 286)   # (the last building standing in the site: the story's)
    S.at(neon(board(atlas, 'SENRYO AVE', *BLUE, 1), BLUE[1]), 1300, 330)
    lamps(S, P, (300, 640, 1000, 1360))
    S.put(P['noentry'], 1230, BASE + 6); S.put(P['cone'], 1270, BASE + 4); S.put(P['barrel'], 1200, BASE + 6)
    S.put(P['bike'], 680, BASE + 6)
    return S.im

def back_alley(P, atlas, w, seed, names, tone, doors=('pipes', 'reddoor', 'lit', 'bright'), glow=(255, 180, 110)):
    # (a back alley: the Empty Lot's back doors, one after the next, some turned round, its bins and barrels, the
    # wires over it, a sign or two)
    S = Scene(w, seed); S.pave(P['pavement'], lambda p: ImageEnhance.Brightness(p).enhance(0.55))
    k = 0
    while S.x < w:
        im = tone(P[doors[k % len(doors)]])
        if k % 2: im = mirror(im)
        x = S.bay(im)
        if names[k % len(names)]:
            b = neon(board(atlas, names[k % len(names)], (30, 10, 20), (255, 210, 150), 1), glow)
            S.at(b, x + (im.width - b.width) // 2, 262)
        light(S.im, x + im.width // 2, 370, 36, 36, glow, 0.14)
        k += 1
    for wx in range(-40, w, 300): S.at(P['wires'], wx, 250)
    for x in range(90, w, 170): S.put(S.rnd.choice([P['bin'], P['barrel'], P['cone']]), x, BASE + 6)
    return S.im

def nakamichi_alley(P, atlas):
    # Nakamichi Alley: behind Nakamichi Street's bars, dim and blue-grey; the mahjong den's door.
    return back_alley(P, atlas, 800, 131, ['', 'MAHJONG', '', 'BAR', '', ''], lambda im: hue(im, 150, 0.6, 0.85), glow=(150, 180, 255))

def pink_alley(P, atlas):
    # Pink Alley: between Pink Street and Senryo Avenue, its doors lit pink.
    return back_alley(P, atlas, 800, 141, ['SNACK', '', 'MASSAGE', '', 'BAR MIMI', ''], lambda im: tint(hue(im, 225, 1.3), (255, 160, 220), 0.3),
                      glow=(255, 90, 190))

def theater_alley(P, atlas):
    # Theater Alley: behind the Kamuro Theater, its stage door, warm light.
    return back_alley(P, atlas, 700, 151, ['', 'STAGE DOOR', '', '', 'BAR'], lambda im: hue(im, 8, 1.0, 0.95), doors=('lit', 'bright', 'pipes', 'reddoor'))

def save(im, name):
    im.convert('RGB').save(os.path.join(K, name + '.png'), optimize=True)
    print('%s: %dx%d' % (name, im.width, im.height))

def main():
    if len(sys.argv) < 2: sys.exit('usage: python3 tools/build-kamurocho-streets.py "<Streets of Kamurocho folder>"')
    P, atlas = pieces(sys.argv[1]); atlas_of[0] = atlas
    im, gx = taihei(P, atlas); save(im, 'taihei')
    save(tenkaichi(P, atlas), 'tenkaichi'); save(nakamichi(P, atlas), 'nakamichi'); save(pink(P, atlas), 'pink')
    save(champion(P, atlas), 'champion'); save(theater(P, atlas), 'theater')
    save(showa(P, atlas), 'showa'); save(senryo(P, atlas), 'senryo'); save(hotels(P, atlas), 'hotels')
    save(shichifuku(P, atlas), 'shichifuku'); save(nakamichi_alley(P, atlas), 'nakamichi-alley')
    save(pink_alley(P, atlas), 'pink-alley'); save(theater_alley(P, atlas), 'theater-alley')
    for k, v in TURNS.items(): print(k, v)

if __name__ == '__main__':
    main()
