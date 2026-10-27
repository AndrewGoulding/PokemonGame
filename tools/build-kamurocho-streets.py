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
#   Taihei Boulevard    the wide road along the south: big fronts (the batting centre's block made a pachinko
#                       hall), Poppo, the gyudon place, and the gate of Tenkaichi Street opening off it
#   Tenkaichi Street    north from the gate, its eating places and the corner of Nakamichi Street
#   Nakamichi Street    across the middle: a hostess club, bars, the way into Pink Street
#   Pink Street         its clubs in pink neon, the lane to the Champion District
#   Champion District   lanes of bars no bigger than a closet, wires overhead, their lanterns and signboards
#   Theater Square      the open square in the north: the Kamuro Theater's arcade and marquee, its lamps
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
    def __init__(self, w, seed):
        self.im = Image.new('RGBA', (w, H), (0, 0, 0, 255)); self.x = 0; self.rnd = random.Random(seed)
    def pave(self, pv, tone=None):
        # (the pavement along the whole street, the strip from the street repeated)
        p = pv if not tone else tone(pv)
        for x in range(0, self.im.width, p.width): self.im.paste(p, (x, BASE))
    def bay(self, im, gap=0):
        # (the next front along, standing on the pavement)
        self.im.alpha_composite(im, (self.x, BASE - im.height)); self.x += im.width + gap
        return self.x - im.width - gap
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

def lamps(S, P, xs, base=BASE + 2):
    for x in xs:
        S.put(P['lamp2'], x, base)
        light(S.im, x, base + 26, 70, 22, (230, 220, 170), 0.22)

# ---------- The streets ----------
def taihei(P, atlas):
    S = Scene(1600, 31); S.pave(P['pavement'])
    # Poppo; the batting centre's block made the pachinko hall (its walls darker, its neon gone pink, its board
    # in bulbs), the yakiniku place up its steps, the gate, the gyudon place, Fujibashi and the steak house's
    # passage, a block at the end.
    S.bay(P['block'])
    S.bay(P['poppo'])
    x = S.bay(hue(P['batting'], 200, 1.3, 0.85))
    S.at(neon(board(atlas, 'PACHINKO', (150, 20, 60), (255, 230, 120), 2, bulbs=True), (255, 80, 160)), x + 120, 262)
    light(S.im, x + 195, 330, 160, 50, (255, 90, 170), 0.25)
    S.bay(P['shadow'])
    S.bay(P['yakiniku'])
    # (the gate, Tenkaichi Street beyond it: x 820-1094)
    S.x += 8; gx = S.x
    S.im.alpha_composite(P['gate'], (gx, 430 - P['gate'].height)); S.x += P['gate'].width + 8
    S.bay(P['gyudon']); S.bay(P['steak'])
    S.bay(hue(P['fujibashi'], 30))
    lamps(S, P, (60, 560, 1150, 1500))
    S.put(P['bike'], 360, BASE + 6); S.put(P['bike2'], 1350, BASE + 6); S.put(P['board'], 1200, BASE + 4)
    S.put(P['kamuro'], gx - 4, BASE + 4)
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
    x = S.bay(P['taxi'])     # (the corner of Nakamichi Street: x 726-951)
    S.at(neon(board(atlas, 'NAKAMICHI', (20, 30, 60), (160, 230, 255), 1), (120, 200, 255)), x + 74, 300)
    x = S.bay(hue(P['gyudon'], 245, 1.4, 1.05))
    S.at(neon(board(atlas, 'SMILE BURGER', (190, 30, 24), (255, 236, 150), 2), (255, 200, 80)), x + 20, 258)
    S.bay(hue(P['serena'], 12, 1.0, 1.1))
    S.bay(P['block'])
    lamps(S, P, (330, 690, 940, 1290))
    S.put(P['menu1'], 600, BASE + 4); S.put(P['stand4'], 1100, BASE + 4); S.put(P['bike'], 1240, BASE + 6)
    return S.im

def nakamichi(P, atlas):
    S = Scene(1400, 51); S.pave(P['pavement'])
    # A coffee shop (Fujibashi's, its board green); the hostess club (the Stardust, its neon gone gold); Serena's
    # neighbour, a bar; the way into Pink Street (the taxi's passage, lit pink from inside); the pawn shop (Poppo's
    # front, dimmed, its board new); the yakiniku place; a ramen counter; a block.
    x = S.bay(hue(P['fujibashi'], 90, 0.9))
    S.at(board(atlas, 'COFFEE', (40, 90, 50), (240, 230, 200), 2), x + 46, 266)
    x = S.bay(hue(P['stardust'], 40, 1.1))
    S.bay(hue(P['serena'], 230, 1.2))
    x = S.bay(tint(P['taxi'], (255, 120, 210), 0.45))     # (the way into Pink Street: x 538-763)
    light(S.im, x + 112, 330, 100, 60, (255, 60, 170), 0.3)
    S.at(neon(board(atlas, 'PINK ST', (40, 10, 30), (255, 140, 220), 1), (255, 80, 200)), x + 84, 300)
    x = S.bay(hue(P['poppo'], 120, 0.5, 0.8))
    S.at(board(atlas, 'PAWN', (30, 30, 30), (240, 240, 240), 2), x + 52, 276)
    S.bay(P['yakiniku'])
    S.bay(hue(P['steak'], 140))
    x = S.bay(hue(P['fujibashi'], 0, 1.0, 0.9))
    S.bay(P['block'])
    lamps(S, P, (170, 520, 950, 1300))
    S.put(P['stand1'], 420, BASE + 4); S.put(P['board'], 1060, BASE + 4); S.put(P['bike2'], 1200, BASE + 6)
    return S.im

def pink(P, atlas):
    S = Scene(1200, 61); S.pave(P['pavement'], lambda p: tint(p, (255, 150, 210), 0.25))
    # The clubs: the Stardust's front and its neon made pink, twice (once turned round); Serena's lit pink; the
    # host club (the steak house's passage, its sign blue); the lane to the Champion District (the Empty Lot's red
    # door and neon); the gate street's neon hung on the walls; pink light over all.
    pinkify = lambda im: tint(hue(im, 225, 1.5, 1.05), (255, 170, 220), 0.25)
    S.bay(pinkify(P['block']))
    x = S.bay(pinkify(P['stardust']))
    S.at(neon(board(atlas, 'CABARET', (40, 0, 30), (255, 120, 210), 2), (255, 60, 190)), x + 18, 300)
    x = S.bay(hue(P['steak'], 150, 1.3))
    S.at(neon(board(atlas, 'HOST', (0, 20, 50), (120, 210, 255), 2), (80, 180, 255)), x + 14, 340)
    S.bay(pinkify(P['serena']))
    S.x += 6
    x = S.bay(P['reddoor'], 6)     # (the lane to the Champion District: x 470-583)
    S.at(neon(board(atlas, 'CHAMPION', (30, 10, 10), (255, 200, 120), 1), (255, 140, 80)), x + 14, 262)
    x = S.bay(mirror(pinkify(P['stardust'])))
    S.at(neon(board(atlas, 'CLUB MOON', (30, 0, 50), (220, 150, 255), 1), (200, 120, 255)), x + 30, 300)
    x = S.bay(pinkify(P['fujibashi']))
    S.at(neon(board(atlas, 'LOUNGE', (40, 20, 0), (255, 220, 120), 2), (255, 200, 80)), x + 40, 266)
    S.bay(pinkify(P['serena']))
    S.bay(pinkify(P['block']))
    S.bay(mirror(pinkify(P['steak'])))
    for nx in (240, 420, 700, 900, 1080):
        S.at(neon(P['pinkv'] if nx % 2 else P['orange'], (255, 90, 200)), nx, 262)
    for nx in (100, 300, 640, 860, 1060): light(S.im, nx, 330, 110, 70, (255, 60, 170), 0.22)
    lamps(S, P, (360, 800))
    S.put(P['stand2'], 200, BASE + 4); S.put(P['stand3'], 760, BASE + 4); S.put(P['menu2'], 1000, BASE + 4)
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
    S = Scene(1200, 81); S.pave(P['pavement'], lambda p: ImageEnhance.Brightness(p).enhance(1.15))
    # The cinema (the batting centre's front, its board the cinema's); the Kamuro Theater, the arcade's front four
    # times along (its arched windows, its balustrade, its lamps), its marquee in bulbs across; Poppo and the
    # karaoke on the square's other side. The square open before them: lamps, rails, the red Kamurocho sign.
    x = S.bay(hue(P['batting'], 150, 0.8))
    S.at(neon(board(atlas, 'KAMURO CINEMA', (20, 20, 50), (250, 240, 200), 2, bulbs=True), (200, 200, 255)), x + 90, 262)
    tx = S.x
    for k in range(4): S.bay(P['arcade'] if k % 2 == 0 else mirror(P['arcade']))
    mq = neon(board(atlas, 'KAMURO THEATER', (150, 20, 30), (255, 240, 200), 3, bulbs=True), (255, 180, 120))
    S.at(mq, tx + (S.x - tx - mq.width) // 2, 258)
    light(S.im, (tx + S.x) // 2, 300, 300, 70, (255, 200, 140), 0.18)
    x = S.bay(P['poppo'])
    x = S.bay(hue(P['fujibashi'], 200, 1.2))
    S.at(board(atlas, 'KARAOKE', (240, 200, 40), (40, 20, 10), 2), x + 30, 266)
    lamps(S, P, (40, 300, 990, 1170))
    for rx in (420, 700): S.put(P['rail'], rx, BASE + 8)
    S.put(P['kamuro'], 380, BASE + 6); S.put(P['busstop'], 920, BASE + 6)
    S.put(P['bike2'], 1000, BASE + 6)
    return S.im

def save(im, name):
    im.convert('RGB').save(os.path.join(K, name + '.png'), optimize=True)
    print('%s: %dx%d' % (name, im.width, im.height))

def main():
    if len(sys.argv) < 2: sys.exit('usage: python3 tools/build-kamurocho-streets.py "<Streets of Kamurocho folder>"')
    P, atlas = pieces(sys.argv[1])
    im, gx = taihei(P, atlas); save(im, 'taihei')
    save(tenkaichi(P, atlas), 'tenkaichi'); save(nakamichi(P, atlas), 'nakamichi'); save(pink(P, atlas), 'pink')
    save(champion(P, atlas), 'champion'); save(theater(P, atlas), 'theater')

if __name__ == '__main__':
    main()
