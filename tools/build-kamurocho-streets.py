#!/usr/bin/env python3
# The rest of Kamurocho (the Like a Dragon realm's side-on streets, ui/street.js), this game's own, drawn as Serena's
# backlot is (tools/build-kamurocho-insides.py): Streets of Kamurocho has only its one long street, the alley and
# Bacchus, so Yakuza 0's other streets are put up here in the street's colours and its 480-high frame (the night sky
# above, the buildings' fronts, the pavement at the bottom, the floor you walk on from FLOOR down).
#
#   Taihei Boulevard    the wide road along the south: a pachinko parlour, the bank, karaoke, a drugstore, and the
#                       red gate of Tenkaichi Street opening off it (its sign, 天下一通, lit across the arch)
#   Tenkaichi Street    north from the gate: ramen, a sushi bar, an izakaya under its lanterns, a game centre, Smile
#                       Burger, and the corner of Nakamichi Street
#   Nakamichi Street    across the middle: a love-hotel sign, a hostess club, a coffee shop, a pawn shop, the way
#                       into Pink Street
#   Pink Street         pink neon: cabarets, clubs, a host club, a touts' corner, the alley to the Champion District
#   Champion District   narrow lanes of bars no bigger than a closet, lanterns and signboards
#   Theater Square      the open square in the north: the Kamuro Theater's marquee, a fountain, the cinema
#
#   python3 tools/build-kamurocho-streets.py
#
# (It needs the IPA Gothic font for its signs' Japanese, as Debian's fonts-ipafont-gothic puts it; and only what's
# committed besides.) Writes assets/kamurocho/<scene>.png, 480 high, as data/kamurocho-street.js's scenes name them.
import os, random
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
K = os.path.join(ROOT, 'assets/kamurocho')
H, TOP, FLOOR = 480, 150, 404          # (the frame's height, the rooftops, where the pavement meets the buildings)
FONTS = ['/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf', '/usr/share/fonts/truetype/fonts-japanese-gothic.ttf']

def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c[:3])

def font(size):
    for f in FONTS:
        if os.path.exists(f): return ImageFont.truetype(f, size)
    return ImageFont.load_default()

def text(im, xy, s, size, colour, vertical=False, glow=None, centre=True):
    # (a sign's words, hard-edged as the street's pixels are: drawn, then every pixel either in or out; down the
    # sign, one character under the next, if `vertical`)
    f = font(size)
    chars = list(s) if vertical else [s]
    boxes = [f.getbbox(c) for c in chars]
    w = max(b[2] - b[0] for b in boxes) if vertical else boxes[0][2] - boxes[0][0]
    h = sum(size + 1 for _ in chars) if vertical else boxes[0][3] - boxes[0][1]
    layer = Image.new('L', (w + 4, h + 4), 0); d = ImageDraw.Draw(layer)
    y = 0
    for c, b in zip(chars, boxes):
        d.text((2 + (w - (b[2] - b[0])) // 2 - b[0], 2 + y - (b[1] if not vertical else 0)), c, font=f, fill=255)
        y += size + 1
    layer = layer.point(lambda v: 255 if v > 110 else 0)
    x, y = xy
    if centre: x -= layer.width // 2; y -= layer.height // 2
    if glow:
        g = Image.new('RGBA', im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
        gd.rectangle((x - 6, y - 4, x + layer.width + 6, y + layer.height + 4), fill=glow + (40,))
        im.alpha_composite(g)
    im.paste(Image.new('RGBA', layer.size, colour + (255,)), (x, y), layer)

def glow(im, cx, cy, rx, ry, colour, a=10, steps=8):
    g = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(g)
    for k in range(steps, 0, -1):
        d.ellipse((cx - rx * k / steps, cy - ry * k / steps, cx + rx * k / steps, cy + ry * k / steps), fill=colour + (a,))
    im.alpha_composite(g)

def tiles(d, box, base, grout, rnd, tw=8, th=6):
    x0, y0, x1, y1 = box
    d.rectangle(box, fill=grout)
    for y in range(y0, y1, th):
        for x in range(x0, x1, tw):
            d.rectangle((x, y, min(x1, x + tw - 2), min(y1, y + th - 2)), fill=shade(base, rnd.uniform(0.85, 1.12)))

def sky(im, rnd):
    # (the night over the rooftops, and the far buildings' lit windows against it)
    d = ImageDraw.Draw(im)
    for y in range(0, TOP + 60):
        d.line((0, y, im.width, y), fill=(4, 6 + y // 30, 14 + y // 12))
    x = 0
    while x < im.width:
        w = rnd.randrange(40, 110); h = rnd.randrange(30, 110)
        d.rectangle((x, TOP - h, x + w, TOP + 40), fill=(10, 12, 20))
        for wy in range(TOP - h + 6, TOP + 30, 9):
            for wx in range(x + 4, x + w - 4, 8):
                if rnd.random() < 0.18: d.rectangle((wx, wy, wx + 3, wy + 4), fill=rnd.choice([(150, 140, 90), (110, 120, 130), (170, 150, 100)]))
        x += w + rnd.randrange(0, 12)

def building(im, x0, x1, top, rnd, wall=(94, 84, 64), grout=(26, 22, 12), floors=True):
    # (a building's front: its tiles, its upper floors' windows (some lit), the ledge along its top)
    d = ImageDraw.Draw(im)
    tiles(d, (x0, top, x1, FLOOR), wall, grout, rnd)
    d.rectangle((x0, top, x1, top + 6), fill=shade(wall, 0.6)); d.line((x0, top + 6, x1, top + 6), fill=shade(wall, 1.3))
    d.line((x0, top, x0, FLOOR), fill=shade(grout, 0.6), width=2)
    if floors:
        for wy in range(top + 18, FLOOR - 120, 34):
            for wx in range(x0 + 12, x1 - 30, 40):
                lit = rnd.random() < 0.45
                d.rectangle((wx - 2, wy - 2, wx + 26, wy + 20), fill=shade(wall, 0.45))
                d.rectangle((wx, wy, wx + 24, wy + 18), fill=(200, 180, 120) if lit else (26, 34, 42))
                if lit: d.line((wx, wy + 9, wx + 24, wy + 9), fill=(150, 130, 80))
    return d

def shop(im, x0, x1, rnd, light=(250, 220, 150), frame=(40, 40, 36), door=True, goods=None, h=86):
    # (a shopfront along the pavement: its window lit from inside, what's on show in it, its door)
    d = ImageDraw.Draw(im)
    y0 = FLOOR - h
    d.rectangle((x0, y0, x1, FLOOR), fill=frame)
    d.rectangle((x0 + 4, y0 + 4, x1 - 4, FLOOR), fill=light)
    for y in range(y0 + 4, FLOOR):
        d.line((x0 + 4, y, x1 - 4, y), fill=shade(light, 1.0 - 0.35 * (y - y0) / h))
    if goods == 'shelves':
        for y in range(y0 + 20, FLOOR - 10, 18):
            d.line((x0 + 6, y, x1 - 6, y), fill=shade(light, 0.6))
            for x in range(x0 + 8, x1 - 10, 7): d.rectangle((x, y - rnd.randrange(6, 12), x + 4, y - 1), fill=rnd.choice([(200, 60, 50), (60, 120, 200), (240, 200, 60), (80, 170, 90), (240, 240, 230)]))
    elif goods == 'tables':
        for x in range(x0 + 16, x1 - 16, 34):
            d.rectangle((x, FLOOR - 30, x + 20, FLOOR - 27), fill=shade(light, 0.5)); d.line((x + 10, FLOOR - 27, x + 10, FLOOR - 8), fill=shade(light, 0.5))
            d.ellipse((x - 6, FLOOR - 48, x + 4, FLOOR - 38), fill=shade(light, 0.4)); d.rectangle((x - 7, FLOOR - 38, x + 5, FLOOR - 20), fill=shade(light, 0.4))
    elif goods == 'machines':
        for x in range(x0 + 8, x1 - 16, 16):
            d.rectangle((x, y0 + 14, x + 12, FLOOR - 4), fill=(40, 40, 60)); d.rectangle((x + 2, y0 + 18, x + 10, y0 + 30), fill=rnd.choice([(250, 80, 160), (80, 220, 250), (250, 230, 80)]))
            d.ellipse((x + 3, y0 + 34, x + 9, y0 + 40), fill=(220, 220, 220))
    if door:
        dx = (x0 + x1) // 2 - 14 if goods != 'tables' else x1 - 40
        d.rectangle((dx, FLOOR - 64, dx + 28, FLOOR), fill=frame); d.rectangle((dx + 3, FLOOR - 61, dx + 25, FLOOR), fill=shade(light, 0.75))
        d.line((dx + 14, FLOOR - 61, dx + 14, FLOOR), fill=frame)
    for x in range(x0 + 4, x1 - 4, 60): d.line((x, y0 + 4, x, FLOOR), fill=frame, width=2)
    glow(im, (x0 + x1) // 2, FLOOR + 14, (x1 - x0) * 0.6, 26, light, 8)

def board(im, x0, x1, y, s, bg, fg, size=18, glowc=None):
    # (a shop's name board, across over its front)
    d = ImageDraw.Draw(im)
    d.rectangle((x0, y, x1, y + size + 12), fill=shade(bg, 0.55)); d.rectangle((x0 + 2, y + 2, x1 - 2, y + size + 10), fill=bg)
    text(im, ((x0 + x1) // 2, y + (size + 12) // 2), s, size, fg, glow=glowc)

def tate(im, x, y, s, bg, fg, size=14):
    # (a sign hung down a building's corner, its words down it, as Kamurocho's are)
    n = len(s)
    d = ImageDraw.Draw(im)
    d.rectangle((x, y, x + size + 10, y + n * (size + 1) + 12), fill=shade(bg, 0.5)); d.rectangle((x + 2, y + 2, x + size + 8, y + n * (size + 1) + 10), fill=bg)
    text(im, (x + (size + 10) // 2, y + (n * (size + 1) + 12) // 2), s, size, fg, vertical=True, glow=bg)
    d.line((x + 6, y - 10, x + 6, y), fill=(60, 60, 60)); d.line((x + size + 4, y - 10, x + size + 4, y), fill=(60, 60, 60))

def awning(im, x0, x1, y, colour, stripes=None):
    d = ImageDraw.Draw(im)
    d.polygon([(x0 - 4, y), (x1 + 4, y), (x1 + 10, y + 14), (x0 - 10, y + 14)], fill=colour)
    if stripes:
        for x in range(x0, x1, 16): d.polygon([(x, y), (x + 8, y), (x + 11, y + 14), (x + 3, y + 14)], fill=stripes)
    d.line((x0 - 10, y + 14, x1 + 10, y + 14), fill=shade(colour, 0.6), width=2)

def lanterns(im, x0, x1, y, colour=(230, 60, 40)):
    d = ImageDraw.Draw(im)
    d.line((x0, y - 6, x1, y - 6), fill=(30, 30, 30))
    for x in range(x0 + 8, x1 - 8, 22):
        d.line((x, y - 6, x, y), fill=(30, 30, 30))
        d.ellipse((x - 7, y, x + 7, y + 18), fill=colour); d.line((x - 7, y + 9, x + 7, y + 9), fill=shade(colour, 0.7))
        d.rectangle((x - 4, y - 1, x + 4, y + 1), fill=(30, 30, 30)); d.rectangle((x - 4, y + 17, x + 4, y + 19), fill=(30, 30, 30))
        glow(im, x, y + 9, 22, 18, (255, 150, 90), 10, 4)
        d = ImageDraw.Draw(im)

def neon(im, x0, y0, x1, y1, colour):
    d = ImageDraw.Draw(im)
    d.rectangle((x0, y0, x1, y1), outline=colour, width=2)
    glow(im, (x0 + x1) // 2, (y0 + y1) // 2, (x1 - x0) * 0.8, (y1 - y0) * 0.9, colour, 6)

def pavement(im, rnd, road=True, colour=(116, 120, 110), lines=True):
    # (the pavement you walk on: its paving, its lamps' pools of light, the kerb, and the road beyond it)
    d = ImageDraw.Draw(im)
    W = im.width
    for y in range(FLOOR, H):
        d.line((0, y, W, y), fill=shade(colour, 0.62 - 0.22 * (y - FLOOR) / (H - FLOOR)))
    d.rectangle((0, FLOOR, W, FLOOR + 3), fill=shade(colour, 0.3))
    if lines:
        for y in (FLOOR + 16, FLOOR + 36):
            d.line((0, y, W, y), fill=shade(colour, 0.45))
        for x in range(-300, W + 300, 40):
            d.line((x, FLOOR + 3, x + (x - W // 2) * 0.08, H - 10), fill=shade(colour, 0.45))
    if road:
        d.rectangle((0, H - 10, W, H - 8), fill=shade(colour, 0.9))
        d.rectangle((0, H - 8, W, H), fill=(14, 14, 16))
    for x in range(120, W, 300):
        glow(im, x, FLOOR + 30, 90, 26, (230, 220, 170), 7)

def lamp(im, x):
    # (a street lamp along the buildings' fronts, its light falling on the pavement)
    d = ImageDraw.Draw(im)
    d.rectangle((x - 2, 260, x + 2, FLOOR + 6), fill=(46, 50, 50)); d.line((x - 2, 260, x - 2, FLOOR + 6), fill=(90, 96, 96))
    d.rectangle((x - 5, FLOOR, x + 5, FLOOR + 6), fill=(36, 38, 38))
    d.rectangle((x - 12, 254, x + 12, 260), fill=(50, 54, 54)); d.rectangle((x - 10, 260, x + 10, 263), fill=(255, 244, 200))
    glow(im, x, 262, 40, 20, (255, 240, 190), 12)

def save(im, name):
    im.convert('RGB').save(os.path.join(K, name + '.png'), optimize=True)
    print('%s: %dx%d' % (name, im.width, im.height))

def taihei():
    rnd = random.Random(31); W = 1600
    im = Image.new('RGBA', (W, H), (0, 0, 0, 255)); sky(im, rnd)
    # The pachinko parlour: its whole front lit, rows of machines, its name in bulbs.
    building(im, 0, 300, 196, rnd, (60, 50, 70), (20, 14, 24))
    shop(im, 10, 290, rnd, (250, 230, 200), (30, 20, 40), goods='machines', h=96)
    board(im, 14, 286, 268, 'パチンコ  777', (210, 30, 60), (255, 240, 120), 22, (255, 80, 120))
    d = ImageDraw.Draw(im)
    for x in range(14, 290, 8): d.ellipse((x, 302, x + 4, 306), fill=rnd.choice([(255, 240, 120), (255, 120, 160), (255, 255, 255)]))
    # The bank: grey stone, its name in steel, shutters down for the night.
    building(im, 300, 560, 170, rnd, (120, 122, 118), (60, 62, 60))
    board(im, 330, 530, 316, '神室銀行', (40, 60, 110), (230, 236, 250), 20)
    d = ImageDraw.Draw(im)
    d.rectangle((320, FLOOR - 56, 540, FLOOR), fill=(70, 74, 76))
    for y in range(FLOOR - 54, FLOOR, 4): d.line((322, y, 538, y), fill=(96, 100, 102))
    d.rectangle((460, FLOOR - 52, 520, FLOOR - 6), fill=(30, 50, 70)); text(im, (490, FLOOR - 30), 'ATM', 14, (200, 230, 250))
    # Karaoke: its sign down the corner, a lit lobby.
    building(im, 560, 780, 200, rnd, (34, 50, 60), (10, 18, 22))
    shop(im, 572, 770, rnd, (210, 240, 250), (20, 30, 40), goods='tables')
    board(im, 576, 766, 286, 'カラオケ', (240, 200, 40), (40, 20, 10), 20)
    tate(im, 746, 300, 'カラオケ', (30, 120, 220), (255, 255, 255))
    # The way into Tenkaichi Street: the red gate, its sign lit, the street's lights going away under it.
    gx0, gx1 = 800, 1040
    d = ImageDraw.Draw(im)
    for y in range(TOP + 40, FLOOR):
        k = (y - TOP - 40) / (FLOOR - TOP - 40)
        d.line((gx0, y, gx1, y), fill=(int(30 + 30 * k), int(20 + 18 * k), int(24 + 10 * k)))
    for k in range(6):
        x = gx0 + 30 + k * 34
        building(im, x, x + 20, 300 - k * 6, rnd, (70, 56, 40), (20, 16, 10), floors=False)
        d = ImageDraw.Draw(im)
        d.rectangle((x + 3, 340, x + 17, FLOOR - 20), fill=rnd.choice([(250, 200, 120), (250, 120, 120), (200, 230, 250)]))
    d.polygon([(gx0 + 40, FLOOR), (gx1 - 40, FLOOR), (gx0 + 150, FLOOR - 40), (gx0 + 90, FLOOR - 40)], fill=(60, 60, 58))
    gate(im, gx0 + 10, gx1 - 10)
    # A drugstore, its stock out on the pavement.
    building(im, 1040, 1300, 186, rnd, (96, 90, 74), (30, 26, 18))
    shop(im, 1050, 1290, rnd, (250, 250, 230), (60, 60, 54), goods='shelves')
    board(im, 1054, 1286, 282, 'ドラッグ  薬', (40, 160, 90), (255, 255, 255), 20)
    d = ImageDraw.Draw(im)
    for x in range(1060, 1180, 26):
        d.rectangle((x, FLOOR - 26, x + 22, FLOOR), fill=(230, 230, 220))
        for y in range(FLOOR - 24, FLOOR - 2, 7): d.rectangle((x + 2, y, x + 20, y + 4), fill=rnd.choice([(220, 60, 60), (60, 120, 220), (250, 200, 50)]))
    # An izakaya at the end, its lanterns out.
    building(im, 1300, W, 210, rnd, (50, 40, 32), (16, 12, 8))
    shop(im, 1312, 1590, rnd, (250, 190, 110), (40, 26, 14), goods='tables')
    board(im, 1316, 1586, 290, '居酒屋  大吉', (40, 30, 24), (250, 230, 200), 20)
    lanterns(im, 1320, 1580, 326)
    pavement(im, rnd)
    for x in (300, 560, 1300): lamp(im, x)
    save(im, 'taihei')

def gate(im, x0, x1):
    # Tenkaichi Street's gate: red pillars, the arch across, its sign lit: 天下一通. (Low enough to be seen: the
    # screen shows the picture from 256 down, the floor at its foot.)
    d = ImageDraw.Draw(im)
    for x in (x0, x1 - 16):
        d.rectangle((x, 250, x + 16, FLOOR + 8), fill=(170, 30, 30)); d.line((x + 3, 250, x + 3, FLOOR + 8), fill=(220, 70, 60), width=2)
        d.rectangle((x - 4, FLOOR, x + 20, FLOOR + 10), fill=(60, 56, 54))
    d.rectangle((x0 - 10, 256, x1 + 10, 268), fill=(190, 36, 34)); d.line((x0 - 10, 256, x1 + 10, 256), fill=(240, 90, 80), width=2)
    d.rectangle((x0 + 20, 270, x1 - 20, 306), fill=(240, 236, 220)); d.rectangle((x0 + 20, 270, x1 - 20, 306), outline=(170, 30, 30), width=3)
    text(im, ((x0 + x1) // 2, 288), '天 下 一 通', 26, (190, 20, 24), glow=(255, 240, 200))
    d = ImageDraw.Draw(im)
    for x in range(x0 + 10, x1 - 10, 14): d.ellipse((x, 309, x + 6, 315), fill=(255, 236, 160))
    glow(im, (x0 + x1) // 2, 288, (x1 - x0) * 0.6, 40, (255, 220, 180), 8)

def tenkaichi():
    rnd = random.Random(41); W = 1400
    im = Image.new('RGBA', (W, H), (0, 0, 0, 255)); sky(im, rnd)
    # The gate, at the street's south end (off Taihei Boulevard, at the left), seen from under it.
    d = ImageDraw.Draw(im)
    for y in range(TOP + 40, FLOOR): d.line((0, y, 230, y), fill=(18, 18, 26))
    for k in range(5):
        d.rectangle((14 + k * 42, 330, 46 + k * 42, FLOOR - 12), fill=rnd.choice([(250, 230, 200), (240, 200, 60), (200, 230, 250), (250, 120, 160)]))
    d.rectangle((0, FLOOR - 10, 230, FLOOR), fill=(30, 30, 34))
    text(im, (115, 345), '泰平通り', 16, (240, 240, 230), glow=(120, 120, 160))
    gate(im, 20, 210)
    # A sushi bar, its noren, wood and paper.
    building(im, 230, 450, 190, rnd, (120, 100, 70), (40, 30, 18))
    shop(im, 240, 440, rnd, (250, 236, 200), (70, 50, 30), goods='tables')
    board(im, 244, 436, 290, '寿司  神室', (30, 30, 30), (250, 250, 240), 20)
    d = ImageDraw.Draw(im)
    for x in range(300, 380, 16): d.rectangle((x, FLOOR - 64, x + 14, FLOOR - 40), fill=(30, 40, 90))
    # The game centre, its claw machines in the window.
    building(im, 450, 720, 180, rnd, (40, 40, 60), (14, 14, 24))
    shop(im, 460, 710, rnd, (200, 220, 255), (20, 20, 50), goods='machines')
    board(im, 464, 706, 286, 'GAME  ゲーム', (40, 40, 160), (120, 250, 255), 20, (80, 200, 255))
    tate(im, 690, 300, 'ゲーセン', (220, 40, 160), (255, 255, 255))
    # The corner of Nakamichi Street: the street turning off, its lights.
    d = ImageDraw.Draw(im)
    for y in range(TOP + 60, FLOOR):
        d.line((720, y, 860, y), fill=(26, 24, 30))
    for k in range(4):
        x = 730 + k * 32
        d.rectangle((x, 320 + k * 4, x + 22, FLOOR - 16), fill=rnd.choice([(240, 200, 120), (230, 120, 160), (150, 200, 240)]))
    text(im, (790, 290), '中道通り', 16, (250, 240, 210), glow=(200, 160, 100))
    # Smile Burger.
    building(im, 860, 1110, 196, rnd, (150, 60, 40), (50, 20, 14))
    shop(im, 870, 1100, rnd, (255, 240, 200), (120, 40, 30), goods='tables')
    board(im, 874, 1096, 290, 'SMILE BURGER', (250, 200, 40), (180, 30, 20), 20)
    awning(im, 880, 1090, 316, (200, 40, 30), (250, 240, 230))
    # The izakaya at the north end, under its lanterns.
    building(im, 1110, W, 206, rnd, (60, 44, 34), (18, 12, 8))
    shop(im, 1120, 1390, rnd, (250, 180, 100), (40, 24, 12), goods='tables')
    board(im, 1124, 1386, 290, '炉端焼き  天下', (30, 24, 20), (250, 220, 170), 20)
    lanterns(im, 1130, 1380, 326)
    pavement(im, rnd, road=False, colour=(110, 108, 100))
    for x in (232, 452, 860, 1110): lamp(im, x)
    save(im, 'tenkaichi')

def nakamichi():
    rnd = random.Random(51); W = 1400
    im = Image.new('RGBA', (W, H), (0, 0, 0, 255)); sky(im, rnd)
    # A coffee shop, warm and quiet.
    building(im, 0, 260, 200, rnd, (110, 90, 70), (36, 28, 18))
    shop(im, 10, 250, rnd, (250, 214, 160), (60, 40, 24), goods='tables')
    board(im, 14, 246, 290, '喫茶  アルプス', (60, 40, 24), (250, 230, 190), 20)
    awning(im, 20, 240, 318, (40, 90, 50), (230, 220, 200))
    # A hostess club, its lights on the door.
    building(im, 260, 520, 186, rnd, (34, 30, 44), (10, 8, 16))
    shop(im, 300, 480, rnd, (240, 150, 200), (40, 10, 30), h=76)
    board(im, 276, 504, 288, 'CLUB  シャルル', (30, 10, 30), (255, 180, 230), 20, (255, 100, 200))
    neon(im, 296, 324, 484, FLOOR - 2, (255, 100, 200))
    tate(im, 494, 300, 'スナック', (240, 230, 220), (180, 20, 60))
    # The way into Pink Street: its pink glow down the turning.
    d = ImageDraw.Draw(im)
    for y in range(TOP + 60, FLOOR): d.line((520, y, 660, y), fill=(36, 14, 30))
    glow(im, 590, 330, 80, 80, (255, 80, 180), 12)
    for k in range(4):
        x = 530 + k * 32
        d = ImageDraw.Draw(im); d.rectangle((x, 314 + k * 5, x + 22, FLOOR - 16), fill=rnd.choice([(255, 120, 200), (200, 80, 220), (255, 200, 230)]))
    text(im, (590, 290), 'ピンク通り', 16, (255, 200, 240), glow=(255, 80, 180))
    # The love hotel's sign, high on its front; the pawn shop below.
    building(im, 660, 940, 160, rnd, (200, 196, 186), (120, 116, 108))
    tate(im, 668, 262, 'ホテル', (200, 40, 120), (255, 240, 250), 16)
    shop(im, 700, 930, rnd, (230, 220, 180), (50, 46, 40), goods='shelves')
    board(im, 704, 926, 290, '質  かめや', (20, 20, 20), (250, 250, 250), 20)
    # A ramen stand and a bar's door at the end.
    building(im, 940, 1180, 200, rnd, (22, 44, 26), (6, 16, 8))
    shop(im, 950, 1170, rnd, (250, 220, 150), (30, 20, 10), goods='tables')
    board(im, 954, 1166, 290, 'ラーメン  龍', (240, 220, 60), (180, 30, 20), 20)
    lanterns(im, 960, 1160, 326, (240, 200, 60))
    building(im, 1180, W, 190, rnd, (94, 84, 64), (26, 22, 12))
    shop(im, 1200, 1380, rnd, (200, 160, 110), (30, 20, 14), goods='shelves', h=80)
    board(im, 1204, 1376, 290, 'BAR  まつ', (20, 30, 50), (250, 220, 120), 20)
    pavement(im, rnd)
    for x in (260, 940, 1180): lamp(im, x)
    save(im, 'nakamichi')

def pink():
    rnd = random.Random(61); W = 1200
    im = Image.new('RGBA', (W, H), (0, 0, 0, 255)); sky(im, rnd)
    signs = [('キャバレー', '美人', (255, 90, 190)), ('ホストクラブ', 'ホスト', (120, 200, 255)), ('ラウンジ', '蝶', (255, 220, 120)),
             ('クラブ  ムーン', '月', (210, 120, 255))]
    for k, (jp, en, c) in enumerate(signs):
        x0 = k * 300 if k < 2 else k * 300 + 0
        if k == 2: x0 = 600
        if k == 3: x0 = 900
        building(im, x0, x0 + 300 if k != 1 else 440, 170 + (k * 23) % 40, rnd, (40 + k * 6, 26, 44), (14, 8, 18))
        sx0, sx1 = x0 + 20, (x0 + 280 if k != 1 else 420)
        shop(im, sx0 + 30, sx1 - 30, rnd, shade(c, 0.9), (30, 10, 30), h=74)
        board(im, sx0, sx1, 272, jp, (30, 10, 30), c, 22, c)
        neon(im, sx0 + 26, FLOOR - 78, sx1 - 26, FLOOR - 2, c)
        tate(im, sx1 - 18, 262, en, c, (40, 10, 40), 12)
    # The alley to the Champion District, dark between the clubs, its signboards lit far in.
    d = ImageDraw.Draw(im)
    for y in range(TOP + 50, FLOOR): d.line((440, y, 600, y), fill=(14, 10, 14))
    for k in range(5):
        d.rectangle((460 + k * 26, 320 + k * 6, 474 + k * 26, 340 + k * 6), fill=rnd.choice([(250, 220, 160), (250, 120, 100), (200, 240, 250)]))
    lanterns(im, 450, 590, 300)
    text(im, (520, 270), 'チャンピオン街', 14, (250, 230, 180), glow=(200, 120, 80))
    pavement(im, rnd, colour=(120, 110, 120))
    for x in (300, 900): lamp(im, x)
    save(im, 'pink')

def champion():
    rnd = random.Random(71); W = 900
    im = Image.new('RGBA', (W, H), (0, 0, 0, 255)); sky(im, rnd)
    d = ImageDraw.Draw(im)
    # Bars no bigger than a closet, one against the next, two floors of them, their signboards out.
    names = ['バー  蘭', 'スナック  恋', '酒場  亀', 'BAR  BLUE', '小料理  花', 'バー  夜', 'スナック  港']
    x = 0
    k = 0
    while x < W:
        w = rnd.choice([110, 120, 130])
        wall = rnd.choice([(70, 56, 40), (50, 54, 46), (80, 50, 40), (44, 40, 50)])
        building(im, x, x + w, 220 + rnd.randrange(0, 30), rnd, wall, shade(wall, 0.3), floors=False)
        d = ImageDraw.Draw(im)
        # (its door, a small window lit beside it, its upstairs' balcony and window)
        light = rnd.choice([(250, 200, 120), (250, 150, 120), (230, 220, 160)])
        d.rectangle((x + 14, FLOOR - 70, x + 46, FLOOR), fill=(30, 20, 14)); d.rectangle((x + 17, FLOOR - 67, x + 43, FLOOR), fill=(110, 70, 40))
        d.ellipse((x + 37, FLOOR - 36, x + 41, FLOOR - 32), fill=(220, 200, 120))
        d.rectangle((x + 56, FLOOR - 60, x + w - 14, FLOOR - 24), fill=(30, 20, 14)); d.rectangle((x + 59, FLOOR - 57, x + w - 17, FLOOR - 27), fill=light)
        glow(im, x + (w + 40) // 2, FLOOR - 40, 50, 40, light, 6)
        d = ImageDraw.Draw(im)
        d.rectangle((x + 10, 278, x + w - 10, 290), fill=(40, 40, 40))
        for bx in range(x + 12, x + w - 10, 6): d.line((bx, 278, bx, 290), fill=(70, 70, 70))
        d.rectangle((x + 30, 240, x + w - 30, 276), fill=(20, 20, 24)); d.rectangle((x + 33, 243, x + w - 33, 273), fill=shade(light, 0.7))
        # (its signboard, standing out on the lane, lit)
        sb = rnd.choice([(240, 240, 230), (240, 220, 60), (230, 60, 60)])
        d.rectangle((x + 60, FLOOR - 22, x + 96, FLOOR + 6), fill=(30, 30, 30)); d.rectangle((x + 62, FLOOR - 20, x + 94, FLOOR + 4), fill=sb)
        text(im, (x + w // 2, 310), names[k % len(names)], 14, rnd.choice([(250, 230, 200), (255, 150, 200), (160, 230, 255)]), glow=(160, 100, 60))
        if k % 2: lanterns(im, x + 10, x + w - 10, 324)
        x += w + 2; k += 1
    # (the overhead wires, strung across)
    d = ImageDraw.Draw(im)
    for y in (236, 252):
        for x in range(0, W, 140): d.line((x, y, x + 140, y + 10), fill=(10, 10, 10))
    pavement(im, rnd, road=False, colour=(90, 86, 80), lines=False)
    d = ImageDraw.Draw(im)
    for _ in range(300): d.point((rnd.randrange(W), rnd.randrange(FLOOR + 4, H)), fill=rnd.choice([(60, 58, 54), (40, 38, 36)]))
    save(im, 'champion')

def theater():
    rnd = random.Random(81); W = 1200
    im = Image.new('RGBA', (W, H), (0, 0, 0, 255)); sky(im, rnd)
    # The cinema on the left, its posters lit.
    building(im, 0, 300, 180, rnd, (90, 80, 90), (30, 26, 30))
    shop(im, 10, 290, rnd, (240, 220, 180), (40, 30, 30), h=80)
    board(im, 14, 286, 280, '神室シネマ', (30, 30, 60), (250, 240, 200), 22)
    d = ImageDraw.Draw(im)
    for x in range(30, 270, 50):
        d.rectangle((x, FLOOR - 74, x + 36, FLOOR - 24), fill=(20, 20, 20)); d.rectangle((x + 3, FLOOR - 71, x + 33, FLOOR - 27), fill=rnd.choice([(200, 60, 40), (40, 100, 180), (220, 180, 40), (120, 40, 140)]))
    # The Kamuro Theater: the square's great front, its marquee in bulbs.
    building(im, 300, 860, 120, rnd, (150, 140, 120), (70, 64, 52))
    d = ImageDraw.Draw(im)
    for x in range(330, 840, 60): d.rectangle((x, 130, x + 14, FLOOR - 100), fill=(180, 172, 150)); d.line((x + 2, 130, x + 2, FLOOR - 100), fill=(210, 204, 186))
    d.rectangle((340, 258, 820, 306), fill=(40, 20, 20)); d.rectangle((344, 262, 816, 302), fill=(160, 20, 30))
    for x in range(346, 816, 8): d.ellipse((x, 263, x + 4, 267), fill=(255, 236, 160)); d.ellipse((x, 297, x + 4, 301), fill=(255, 236, 160))
    text(im, (580, 283), 'KAMURO THEATER  神室劇場', 22, (255, 240, 200), glow=(255, 180, 120))
    glow(im, 580, 283, 300, 60, (255, 200, 140), 8)
    shop(im, 360, 800, rnd, (250, 220, 170), (60, 30, 30), h=84)
    # A fountain in the square, against the theatre's front.
    pavement(im, rnd, road=False, colour=(130, 126, 116))
    d = ImageDraw.Draw(im)
    d.rectangle((490, FLOOR - 24, 670, FLOOR + 2), fill=(80, 80, 76)); d.rectangle((494, FLOOR - 20, 666, FLOOR - 6), fill=(40, 80, 110))
    d.rectangle((574, FLOOR - 64, 586, FLOOR - 10), fill=(100, 100, 96)); d.ellipse((560, FLOOR - 72, 600, FLOOR - 60), fill=(110, 110, 104))
    for k in range(9): d.line((580, FLOOR - 70, 540 + k * 10, FLOOR - 14), fill=(170, 210, 230))
    # Shops round the square's right: a convenience store, a karaoke.
    building(im, 860, W, 190, rnd, (34, 50, 60), (10, 18, 22))
    shop(im, 870, 1030, rnd, (240, 250, 255), (40, 60, 70), goods='shelves')
    board(im, 874, 1026, 290, 'ポッポ', (220, 30, 80), (255, 255, 255), 20)
    shop(im, 1040, 1190, rnd, (250, 230, 160), (40, 30, 20), goods='tables')
    board(im, 1044, 1186, 290, 'カラオケ', (240, 200, 40), (40, 20, 10), 20)
    for x in (300, 860): lamp(im, x)
    save(im, 'theater')

if __name__ == '__main__':
    taihei(); tenkaichi(); nakamichi(); pink(); champion(); theater()
