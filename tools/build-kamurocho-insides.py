#!/usr/bin/env python3
# Kamurocho's insides (the Like a Dragon realm's side-on streets, ui/street.js), this game's own: Streets of Kamurocho
# has no insides of its shops, nor anything under its streets.
#
# Poppo, the convenience store, put together from the street's own pictures: Poppo's
# sign off its shopfront on the street (assets/kamurocho/street.png), and its clerk (people/loiterer.png, standing
# at ease) in Poppo's blue and white uniform, behind the counter; the shelves, the drinks fridge, the counter
# and the floor are drawn here, in the street's colours and its 480-high frame (the floor at the bottom).
#
# Serena's backlot: the yard behind the bar, down the passage beside its door on the street, at night: Serena's back
# wall in its green tiles, its back door (the sign off its front, assets/kamurocho/street.png, beside it) under a
# lamp, beer crates and bin bags, an air conditioner on the wall and pipes up it, the next building's brown tiles and
# its outdoor unit, a chain-link fence at the far end, and the asphalt floor (with the manhole cover on it, drawn by
# ui/street.js from manhole.png).
#
# Under the manhole in Serena's backlot: a storm drain's chamber, the ladder down at its left, a culvert behind, and
# the Time Machine (time-machine.png, twice over) standing on its floor; and the manhole cover itself, for
# the backlot's asphalt.
#
#   python3 tools/build-kamurocho-insides.py
#
# (It needs only what's committed; run tools/build-kamurocho-sok.py first if those pictures change.)
#
# Writes assets/kamurocho/poppo.png (800x480), backlot.png (640x480), sewer.png (640x480), heroine.png (760x480),
# limo.png and manhole.png; and the story's offices, dojima.png, kazama.png and toko.png (760x480).
import os, random
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
K = os.path.join(ROOT, 'assets/kamurocho')
W, H = 800, 480
WALL_TOP, FLOOR_Y = 238, 410          # (the ceiling's edge, and where the floor meets the back wall)
COUNTER = (548, 790)                   # (the counter's left and right, along the right-hand wall)

def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c[:3]) + ((c[3],) if len(c) > 3 else ())

def poppo():
    rnd = random.Random(7)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    d = ImageDraw.Draw(im)
    # The ceiling, its strip lights, and the back wall (the shop's white, lit).
    d.rectangle((0, WALL_TOP - 22, W, WALL_TOP), fill=(58, 62, 60))
    for x in range(40, W, 150):
        d.rectangle((x, WALL_TOP - 16, x + 90, WALL_TOP - 10), fill=(250, 252, 240))
        d.rectangle((x - 4, WALL_TOP - 10, x + 94, WALL_TOP - 8), fill=(150, 156, 150))
    for y in range(WALL_TOP, FLOOR_Y):
        k = 0.95 - 0.25 * (y - WALL_TOP) / (FLOOR_Y - WALL_TOP)
        d.line((0, y, W, y), fill=shade((226, 230, 220), k))
    # Poppo's own sign, off its shopfront, along the top of the wall.
    sign = Image.open(os.path.join(K, 'street.png')).convert('RGBA').crop((642, 26, 812, 52))
    sign = sign.resize((sign.width * 2, sign.height * 2), Image.NEAREST)
    im.alpha_composite(sign, ((W - sign.width) // 2 - 40, WALL_TOP + 6))
    # The door, on the left: glass in a steel frame, the street dark beyond.
    d.rectangle((14, 300, 104, FLOOR_Y), fill=(96, 104, 100))
    d.rectangle((20, 306, 98, FLOOR_Y), fill=(24, 34, 40))
    d.line((59, 306, 59, FLOOR_Y), fill=(96, 104, 100), width=3)
    for x in (24, 63):
        d.line((x + 4, 312, x + 24, 340), fill=(70, 86, 96), width=2)
    # The drinks fridge: glass doors, rows of cans and bottles.
    fx0, fx1 = 122, 262
    d.rectangle((fx0, 288, fx1, FLOOR_Y), fill=(70, 78, 82))
    for k in range(3):
        x0 = fx0 + 6 + k * 45
        d.rectangle((x0, 294, x0 + 40, FLOOR_Y - 6), fill=(196, 222, 228))
        for row in range(5):
            y = 300 + row * 21
            d.line((x0, y + 18, x0 + 40, y + 18), fill=(150, 160, 162))
            for b in range(5):
                c = rnd.choice([(200, 40, 40), (40, 110, 200), (250, 200, 40), (60, 160, 70), (230, 230, 230), (240, 120, 30)])
                tall = rnd.choice([14, 16, 17])
                d.rectangle((x0 + 3 + b * 8, y + 18 - tall, x0 + 8 + b * 8, y + 17), fill=c)
                d.point((x0 + 4 + b * 8, y + 19 - tall), fill=shade(c, 1.3))
        d.line((x0 + 37, 300, x0 + 37, FLOOR_Y - 12), fill=(140, 150, 150), width=2)
    # The shelves: three, from the fridge to the counter, stocked (snacks, noodles, rice balls, magazines).
    for k in range(3):
        x0 = 280 + k * 88
        x1 = x0 + 80
        d.rectangle((x0, 318, x1, FLOOR_Y), fill=(120, 124, 120))
        for row in range(4):
            y = 326 + row * 21
            d.rectangle((x0 + 2, y + 16, x1 - 2, y + 19), fill=(176, 180, 174))
            x = x0 + 4
            while x < x1 - 8:
                w = rnd.choice([6, 8, 10, 12])
                h = rnd.choice([9, 11, 13, 15])
                c = rnd.choice([(220, 60, 50), (240, 190, 40), (70, 140, 210), (250, 250, 240), (110, 180, 80), (230, 120, 170), (240, 140, 40)])
                d.rectangle((x, y + 16 - h, min(x + w, x1 - 4), y + 15), fill=c)
                d.line((x, y + 16 - h, min(x + w, x1 - 4), y + 16 - h), fill=shade(c, 1.25))
                d.line((x, y + 16 - h, x, y + 15), fill=shade(c, 0.7))
                x += w + 2
    # The clerk, behind the counter: someone standing at ease (people/loiterer.png, hands at his sides, not squaring
    # up), his grey-green jacket made Poppo's blue uniform, a white stripe across it at the chest as the shop's own.
    clerk = Image.open(os.path.join(K, 'people/loiterer.png')).convert('RGBA').transpose(Image.FLIP_LEFT_RIGHT)
    px = clerk.load()
    for y in range(clerk.height):
        for x in range(clerk.width):
            r, g, b, a = px[x, y]
            if not a: continue
            lum = (r + g + b) / 3
            # (the jacket: greener than it is red, above the waist; as bright a blue as it was)
            if g > r + 4 and 30 < lum < 150 and 14 < y < 46:
                k = 0.45 + lum / 110
                px[x, y] = (255, 255, 255, a) if y in (27, 28) else (min(255, int(46 * k)), min(255, int(98 * k)), min(255, int(178 * k)), a)
    cs = 2
    clerk = clerk.resize((clerk.width * cs, clerk.height * cs), Image.NEAREST)
    cx = (COUNTER[0] + COUNTER[1]) // 2 + 10
    im.alpha_composite(clerk, (cx - clerk.width // 2, FLOOR_Y + 34 - clerk.height))
    # The counter: its top, the till, the hot food case, and its front.
    top = FLOOR_Y - 46
    d.rectangle((COUNTER[0], top, COUNTER[1], top + 8), fill=(214, 206, 188))
    d.rectangle((COUNTER[0], top + 8, COUNTER[1], FLOOR_Y + 2), fill=(152, 68, 74))
    d.rectangle((COUNTER[0], top + 18, COUNTER[1], top + 24), fill=(232, 206, 70))
    for x in range(COUNTER[0] + 12, COUNTER[1], 40):
        d.line((x, top + 28, x, FLOOR_Y - 2), fill=(126, 54, 60))
    d.rectangle((COUNTER[0] + 20, top - 22, COUNTER[0] + 62, top), fill=(70, 74, 78))       # (the till)
    d.rectangle((COUNTER[0] + 26, top - 18, COUNTER[0] + 56, top - 8), fill=(120, 200, 150))
    d.rectangle((COUNTER[1] - 74, top - 30, COUNTER[1] - 10, top), fill=(200, 120, 60))     # (the hot food case)
    d.rectangle((COUNTER[1] - 70, top - 26, COUNTER[1] - 14, top - 4), fill=(250, 214, 150))
    for x in range(COUNTER[1] - 66, COUNTER[1] - 16, 12):
        d.ellipse((x, top - 14, x + 9, top - 6), fill=(214, 140, 60))
    # The floor: pale tiles, lit from above, lines running away from you.
    for y in range(FLOOR_Y + 2, H):
        k = 1.0 - 0.3 * (y - FLOOR_Y) / (H - FLOOR_Y)
        d.line((0, y, W, y), fill=shade((206, 208, 198), k))
    for y in (FLOOR_Y + 14, FLOOR_Y + 32, FLOOR_Y + 54):
        d.line((0, y, W, y), fill=(170, 172, 164))
    for x in range(-400, W + 400, 48):
        d.line((x, FLOOR_Y + 2, x + (x - W // 2) * 0.35, H), fill=(170, 172, 164))
    d.rectangle((0, FLOOR_Y, W, FLOOR_Y + 2), fill=(120, 124, 118))
    im.convert('RGB').save(os.path.join(K, 'poppo.png'), optimize=True)
    print('Poppo: %dx%d' % (W, H))

BACKLOT_W = 640
def tiles(d, box, base, grout, rnd, tw=8, th=6):
    # (a wall of small square tiles, as the street's buildings are faced: each a shade off the next, the grout dark)
    x0, y0, x1, y1 = box
    d.rectangle(box, fill=grout)
    for y in range(y0, y1, th):
        for x in range(x0, x1, tw):
            d.rectangle((x, y, min(x1, x + tw - 2), min(y1, y + th - 2)), fill=shade(base, rnd.uniform(0.85, 1.12)))

def backlot():
    rnd = random.Random(23)
    im = Image.new('RGBA', (BACKLOT_W, H), (0, 0, 0, 255))
    d = ImageDraw.Draw(im)
    top, floor = 250, FLOOR_Y
    # The passage back to the street, at the left: walls close either side, the street's light at its far end.
    d.rectangle((0, top, 64, floor), fill=(6, 14, 8))
    d.polygon([(12, floor), (64, floor), (44, 372), (26, 372)], fill=(40, 46, 34))
    d.rectangle((26, 330, 44, 372), fill=(96, 104, 70)); d.rectangle((28, 334, 42, 372), fill=(150, 150, 104))
    d.rectangle((0, top, 12, floor), fill=(20, 30, 20)); d.line((12, top, 12, floor), fill=(44, 58, 36))
    d.polygon([(12, top), (26, 320), (26, 372), (12, floor)], fill=(16, 26, 16))
    d.polygon([(64, top), (44, 320), (44, 372), (64, floor)], fill=(12, 20, 12))
    # Serena's back wall: its green tiles, as its front on the street; a ledge along its top.
    tiles(d, (64, top, 330, floor), (22, 44, 26), (6, 16, 8), rnd)
    d.rectangle((64, top, 330, top + 8), fill=(40, 52, 34)); d.line((64, top + 8, 330, top + 8), fill=(10, 20, 12))
    d.rectangle((326, top, 334, floor), fill=(12, 22, 14))
    # Its back door: steel, a kick plate, a handle; a step before it.
    d.rectangle((136, 318, 194, floor), fill=(14, 22, 18))
    d.rectangle((140, 322, 190, floor), fill=(70, 86, 78))
    d.rectangle((143, 325, 187, floor - 2), fill=(84, 102, 92))
    d.line((143, 325, 187, 325), fill=(120, 136, 126))
    d.rectangle((143, floor - 22, 187, floor - 2), fill=(66, 80, 72))
    d.rectangle((180, 362, 184, 368), fill=(190, 190, 170))
    d.rectangle((130, floor - 4, 200, floor), fill=(60, 64, 56))
    # Its lamp over the door, and the light it throws.
    d.rectangle((158, 300, 172, 306), fill=(40, 44, 38)); d.rectangle((160, 306, 170, 311), fill=(255, 236, 170))
    glow = Image.new('RGBA', im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    for r in range(80, 0, -8): gd.ellipse((165 - r, 310 - r * 0.8, 165 + r, 310 + r * 1.3), fill=(255, 220, 140, 9))
    im.alpha_composite(glow)
    d = ImageDraw.Draw(im)
    # Serena's sign, off its front on the street, on the wall beside the door.
    sign = Image.open(os.path.join(K, 'street.png')).convert('RGBA').crop((537, 68, 572, 108))
    im.alpha_composite(sign, (212, 312))
    d.rectangle((210, 310, 248, 350), outline=(30, 40, 26))
    # An air conditioner on the wall, its pipe down to the floor; a drain pipe from the roof.
    d.rectangle((246, 270, 306, 300), fill=(176, 180, 168)); d.rectangle((246, 270, 306, 272), fill=(214, 216, 204))
    d.ellipse((276, 274, 300, 298), fill=(96, 100, 94)); d.ellipse((280, 278, 296, 294), fill=(60, 62, 58))
    for x in range(250, 272, 4): d.line((x, 276, x, 296), fill=(130, 134, 124))
    d.rectangle((300, 300, 304, floor), fill=(150, 150, 140)); d.line((300, 300, 300, floor), fill=(190, 190, 180))
    d.rectangle((84, top, 92, floor), fill=(64, 72, 60)); d.line((85, top, 85, floor), fill=(104, 112, 96))
    for y in range(top + 20, floor, 46): d.rectangle((82, y, 94, y + 4), fill=(40, 46, 38))
    # Beer crates stacked by the door (yellow and red), and bin bags.
    for (x, y, c) in ((96, 384, (220, 170, 30)), (96, 362, (200, 46, 40)), (112, 340, (220, 170, 30)), (116, 362, (220, 170, 30)), (116, 384, (200, 46, 40))):
        d.rectangle((x, y, x + 20, y + 22), fill=shade(c, 0.6)); d.rectangle((x + 2, y + 2, x + 18, y + 20), fill=c)
        for k in range(3): d.line((x + 4 + k * 6, y + 4, x + 4 + k * 6, y + 18), fill=shade(c, 0.55))
        for k in range(3): d.ellipse((x + 3 + k * 6, y - 3, x + 7 + k * 6, y + 2), fill=(60, 110, 50))
    for (x, y, r) in ((206, 396, 14), (226, 400, 12), (216, 384, 11), (316, 398, 13)):
        d.ellipse((x - r, y - r, x + r, y + r), fill=(18, 22, 26)); d.ellipse((x - r + 3, y - r + 2, x - 2, y - 2), fill=(52, 58, 66))
        d.line((x, y - r, x + 2, y - r - 5), fill=(18, 22, 26), width=2)
    # The next building's back: brown tiles, a barred window lit low, its outdoor unit, a cable run.
    tiles(d, (334, top, 520, floor), (94, 84, 64), (26, 22, 12), rnd)
    d.rectangle((370, 290, 430, 336), fill=(20, 18, 12)); d.rectangle((374, 294, 426, 332), fill=(120, 104, 60))
    for x in range(378, 426, 8): d.line((x, 294, x, 332), fill=(40, 34, 20), width=2)
    d.line((334, 268, 520, 272), fill=(16, 16, 12), width=2); d.line((334, 274, 520, 280), fill=(16, 16, 12))
    d.rectangle((452, 360, 512, floor), fill=(150, 154, 146)); d.rectangle((452, 360, 512, 363), fill=(196, 198, 190))
    d.ellipse((462, 368, 494, 400), fill=(90, 94, 90)); d.ellipse((468, 374, 488, 394), fill=(48, 50, 48))
    for k in range(4): d.line((478, 384, 478 + (8, -8, 0, 0)[k], 384 + (0, 0, 8, -8)[k]), fill=(130, 134, 128))
    d.rectangle((504, 366, 510, 400), fill=(120, 124, 116))
    # The far end: a chain-link fence, the city's glow beyond it.
    d.rectangle((520, top, BACKLOT_W, floor), fill=(10, 10, 20))
    glow = Image.new('RGBA', im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    for r in range(120, 0, -10): gd.ellipse((590 - r, 300 - r * 0.5, 590 + r, 300 + r * 0.5), fill=(200, 60, 140, 8))
    im.alpha_composite(glow)
    d = ImageDraw.Draw(im)
    for x in range(520, BACKLOT_W, 60): d.rectangle((x + 2, 296, x + 6, floor), fill=(90, 96, 100))
    d.line((520, 298, BACKLOT_W, 298), fill=(110, 116, 120), width=2)
    for x in range(510, BACKLOT_W + 60, 8):
        d.line((x, 300, x + 60, floor), fill=(64, 70, 74)); d.line((x + 60, 300, x, floor), fill=(64, 70, 74))
    # (the night: the walls darker towards their foot)
    dark = Image.new('RGBA', im.size, (0, 0, 0, 0)); dd = ImageDraw.Draw(dark)
    for y in range(330, floor): dd.line((64, y, BACKLOT_W, y), fill=(0, 0, 0, int(110 * (y - 330) / (floor - 330))))
    im.alpha_composite(dark)
    d = ImageDraw.Draw(im)
    # The floor: asphalt, a puddle catching the lamp, the kerb of the wall.
    for y in range(floor, H):
        k = 0.9 - 0.3 * (y - floor) / (H - floor)
        d.line((0, y, BACKLOT_W, y), fill=shade((52, 56, 58), k))
    d.rectangle((0, floor, BACKLOT_W, floor + 3), fill=(34, 36, 36))
    for _ in range(500):
        x = rnd.randrange(BACKLOT_W); y = rnd.randrange(floor + 4, H)
        d.point((x, y), fill=rnd.choice([(70, 74, 76), (36, 40, 42), (84, 86, 84)]))
    d.ellipse((140, 448, 240, 466), fill=(40, 52, 56)); d.ellipse((160, 452, 200, 460), fill=(150, 136, 96))
    for _ in range(6):
        x = rnd.randrange(0, BACKLOT_W - 60); y = rnd.randrange(floor + 10, H - 6)
        d.line((x, y, x + rnd.randrange(20, 60), y + rnd.randrange(-3, 4)), fill=(30, 32, 34))
    im.convert('RGB').save(os.path.join(K, 'backlot.png'), optimize=True)
    print("Serena's backlot: %dx%d" % (BACKLOT_W, H))

SEWER_W = 640
def sewer():
    rnd = random.Random(11)
    im = Image.new('RGBA', (SEWER_W, H), (0, 0, 0, 255))
    d = ImageDraw.Draw(im)
    top, floor = 250, FLOOR_Y
    # The vault: wet concrete, darker towards the floor, its blocks' joins.
    for y in range(top, floor):
        k = 0.85 - 0.45 * (y - top) / (floor - top)
        d.line((0, y, SEWER_W, y), fill=shade((112, 116, 104), k))
    for y in range(top + 24, floor, 26):
        d.line((0, y, SEWER_W, y), fill=(52, 56, 50))
        off = 0 if (y // 26) % 2 else 30
        for x in range(off, SEWER_W, 60): d.line((x, y - 25, x, y), fill=(52, 56, 50))
    d.rectangle((0, top - 14, SEWER_W, top), fill=(36, 38, 34))
    # Damp streaks and moss.
    for _ in range(60):
        x = rnd.randrange(SEWER_W); y = rnd.randrange(top, floor - 30); h = rnd.randrange(10, 50)
        d.line((x, y, x, min(floor, y + h)), fill=rnd.choice([(70, 84, 60), (60, 70, 56), (88, 98, 74)]))
    # The culvert behind: a round mouth, dark, with water running out of it.
    cx = 470
    d.ellipse((cx - 70, 300, cx + 70, 440), fill=(44, 46, 42))
    d.ellipse((cx - 58, 312, cx + 58, 428), fill=(10, 12, 12))
    # Pipes along the wall, and a caged lamp.
    for y, c in ((276, (120, 72, 46)), (290, (84, 92, 96))):
        d.rectangle((0, y, SEWER_W, y + 8), fill=c)
        d.line((0, y + 1, SEWER_W, y + 1), fill=shade(c, 1.35))
        for x in range(40, SEWER_W, 120): d.rectangle((x, y - 2, x + 6, y + 10), fill=shade(c, 0.7))
    d.rectangle((300, 304, 316, 326), fill=(60, 60, 50))
    d.rectangle((303, 307, 313, 323), fill=(250, 226, 140))
    for r in range(70, 0, -10):
        a = Image.new('RGBA', im.size, (0, 0, 0, 0)); ImageDraw.Draw(a).ellipse((308 - r * 2, 315 - r, 308 + r * 2, 315 + r), fill=(250, 220, 140, 10))
        im.alpha_composite(a)
    d = ImageDraw.Draw(im)
    # The ladder down from the manhole, at the left, and the light from up the shaft.
    d.polygon([(40, top - 14), (120, top - 14), (110, floor), (50, floor)], fill=(150, 150, 120, 255))
    for x in (60, 100):
        d.rectangle((x - 3, top - 14, x + 3, floor), fill=(96, 70, 40))
        d.line((x - 2, top - 14, x - 2, floor), fill=(140, 104, 60))
    for y in range(top, floor, 18): d.rectangle((60, y, 100, y + 4), fill=(110, 82, 46))
    # The floor: wet concrete, a gutter of water along the front.
    for y in range(floor, H):
        k = 0.75 - 0.25 * (y - floor) / (H - floor)
        d.line((0, y, SEWER_W, y), fill=shade((96, 100, 90), k))
    d.rectangle((0, floor, SEWER_W, floor + 2), fill=(50, 52, 46))
    for y in range(H - 12, H):
        d.line((0, y, SEWER_W, y), fill=(34, 64, 70) if y % 3 else (70, 110, 116))
    for _ in range(80):
        x = rnd.randrange(SEWER_W); y = rnd.randrange(floor + 4, H - 14)
        d.line((x, y, x + rnd.randrange(4, 16), y), fill=(120, 126, 112))
    # The Time Machine, on the floor beyond the ladder, twice over (a head taller than you are on the street).
    tm = Image.open(os.path.join(K, 'time-machine.png')).convert('RGBA')
    tm = tm.resize((tm.width * 2, tm.height * 2), Image.NEAREST)
    glow = Image.new('RGBA', im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    for r in range(60, 0, -10): gd.ellipse((300 - r * 1.6, floor + 20 - r * 0.5, 300 + r * 1.6, floor + 20 + r * 0.5), fill=(120, 200, 255, 14))
    im.alpha_composite(glow)
    im.alpha_composite(tm, (300 - tm.width // 2, floor + 26 - tm.height))
    im.convert('RGB').save(os.path.join(K, 'sewer.png'), optimize=True)
    # The manhole cover, as it lies on the pavement (seen from the side: flat), its rim and grip holes.
    mh = Image.new('RGBA', (56, 18), (0, 0, 0, 0)); m = ImageDraw.Draw(mh)
    m.ellipse((0, 2, 55, 17), fill=(28, 30, 30))
    m.ellipse((2, 0, 53, 14), fill=(74, 78, 76))
    m.ellipse((6, 2, 49, 12), fill=(96, 100, 96))
    for x in range(10, 48, 6): m.line((x, 3, x - 3, 11), fill=(70, 74, 72))
    m.ellipse((14, 5, 18, 7), fill=(30, 30, 30)); m.ellipse((37, 5, 41, 7), fill=(30, 30, 30))
    mh.save(os.path.join(K, 'manhole.png'), optimize=True)
    print('The sewer: %dx%d' % (SEWER_W, H))

# Heroine, the karaoke bar off Theater Square (where Kiryu and Nishiki go drinking, as Yakuza 0 begins): its walls in
# deep violet under a mirror-ball's spots, its name in pink neon over the stage at the right (the street's letters,
# off the theatre's board), the stage with its screen and microphone stand, the bar along the left with its bottles
# and stools, a booth's red seat between, and the floor's dark boards. Its door at the far left.
HEROINE_W = 760
def heroine():
    rnd = random.Random(41)
    im = Image.new('RGBA', (HEROINE_W, H), (0, 0, 0, 255)); d = ImageDraw.Draw(im)
    top, floor = 250, FLOOR_Y
    for y in range(top, floor):
        k = 0.8 - 0.3 * (y - top) / (floor - top)
        d.line((0, y, HEROINE_W, y), fill=shade((64, 30, 92), k))
    for x in range(0, HEROINE_W, 32): d.line((x, top, x, floor), fill=(44, 20, 66))
    d.rectangle((0, top - 12, HEROINE_W, top), fill=(24, 12, 34))
    # (the mirror ball's spots on the walls)
    for _ in range(70):
        x, y = rnd.randrange(HEROINE_W), rnd.randrange(top + 6, floor - 10)
        d.rectangle((x, y, x + 1, y + 1), fill=rnd.choice([(255, 220, 255), (200, 220, 255), (255, 255, 200)]))
    d.ellipse((370, top - 6, 386, top + 10), fill=(200, 200, 220)); d.line((378, top - 12, 378, top - 6), fill=(120, 120, 130))
    # the door, at the left
    d.rectangle((12, 296, 92, floor), fill=(40, 22, 30)); d.rectangle((18, 302, 86, floor), fill=(110, 48, 56))
    d.rectangle((74, 352, 80, 358), fill=(230, 200, 120))
    # the bar: its shelf of bottles, its counter and stools
    d.rectangle((110, 290, 300, 300), fill=(70, 40, 30))
    for x in range(116, 296, 9):
        c = rnd.choice([(150, 84, 32), (60, 120, 60), (200, 200, 210), (140, 30, 40), (210, 170, 60)])
        h = rnd.choice([16, 18, 20]); d.rectangle((x, 290 - h, x + 5, 290), fill=c); d.rectangle((x + 1, 290 - h - 4, x + 4, 290 - h), fill=c)
        d.line((x + 1, 290 - h + 2, x + 1, 288), fill=shade(c, 1.4))
    d.rectangle((104, floor - 50, 306, floor + 4), fill=(96, 50, 34)); d.rectangle((104, floor - 54, 306, floor - 48), fill=(150, 90, 54))
    for x in range(110, 306, 24): d.line((x, floor - 46, x, floor + 2), fill=(76, 38, 26))
    # a booth's red seat
    d.rounded_rectangle((330, floor - 58, 470, floor + 4), 8, fill=(150, 24, 40)); d.rectangle((336, floor - 26, 464, floor + 4), fill=(120, 18, 32))
    for x in range(346, 470, 22): d.line((x, floor - 54, x, floor - 30), fill=(120, 18, 32))
    d.rectangle((370, floor - 18, 430, floor - 10), fill=(60, 36, 30)); d.rectangle((380, floor - 10, 420, floor + 4), fill=(40, 24, 20))
    # the stage, its screen and the microphone
    sx = 500
    d.rectangle((sx, floor - 6, HEROINE_W - 10, floor + 10), fill=(60, 30, 50)); d.line((sx, floor - 6, HEROINE_W - 10, floor - 6), fill=(140, 90, 130))
    d.rectangle((sx + 40, 286, sx + 200, 372), fill=(20, 20, 24)); d.rectangle((sx + 46, 292, sx + 194, 366), fill=(40, 80, 150))
    for y in range(292, 366, 3): d.line((sx + 46, y, sx + 194, y), fill=(50, 96, 170))
    d.rectangle((sx + 60, 340, sx + 180, 348), fill=(250, 250, 250)); d.rectangle((sx + 60, 340, sx + 120, 348), fill=(255, 208, 64))
    d.line((sx + 120, floor - 6, sx + 120, 344), fill=(170, 170, 180), width=2); d.ellipse((sx + 116, 336, sx + 124, 346), fill=(60, 60, 70))
    d.line((sx + 108, floor - 6, sx + 132, floor - 6), fill=(170, 170, 180), width=2)
    # its name in pink neon over the stage
    sign = Image.new('RGBA', (180, 30), (0, 0, 0, 0)); sd = ImageDraw.Draw(sign)
    letters = {'H': ['1001', '1001', '1111', '1001', '1001'], 'E': ['1111', '1000', '1110', '1000', '1111'], 'R': ['1110', '1001', '1110', '1010', '1001'],
               'O': ['0110', '1001', '1001', '1001', '0110'], 'I': ['111', '010', '010', '010', '111'], 'N': ['1001', '1101', '1011', '1001', '1001']}
    x = 6
    for ch in 'HEROINE':
        g = letters[ch]
        for j, row in enumerate(g):
            for i, v in enumerate(row):
                if v == '1': sd.rectangle((x + i * 4, 4 + j * 4, x + i * 4 + 2, 4 + j * 4 + 2), fill=(255, 120, 210))
        x += len(g[0]) * 4 + 6
    glow = sign.filter(ImageFilter.GaussianBlur(3)); im.alpha_composite(glow, (sx + 30, 254)); im.alpha_composite(glow, (sx + 30, 254)); im.alpha_composite(sign, (sx + 30, 254))
    # the floor's dark boards
    for y in range(floor + 2, H):
        k = 0.9 - 0.4 * (y - floor) / (H - floor)
        d.line((0, y, HEROINE_W, y), fill=shade((70, 40, 36), k))
    for y in (floor + 16, floor + 36, floor + 60): d.line((0, y, HEROINE_W, y), fill=(44, 24, 22))
    im.convert('RGB').save(os.path.join(K, 'heroine.png'), optimize=True)
    print('Heroine: %dx%d' % (HEROINE_W, H))

# The story's offices (ui/game.js, Yakuza 0's first chapter): a yakuza family's office, or a loan company's, side on,
# in the 480-high frame: the door at the left, the back wall's panels, the window's blinds, the family's crest and its
# scroll over the boss's desk, black leather sofas round a low table, a kamidana shelf; the floor's boards. `crest`:
# the family's mon on the wall; `files`: a loan office's filing cabinets and a counter instead of the sofas.
OFFICE_W = 760
def office(name, wall, trim, floorc, crest=True, files=False, seed=51):
    rnd = random.Random(seed)
    im = Image.new('RGBA', (OFFICE_W, H), (0, 0, 0, 255)); d = ImageDraw.Draw(im)
    top, floor = 250, FLOOR_Y
    for y in range(top, floor):
        d.line((0, y, OFFICE_W, y), fill=shade(wall, 0.85 - 0.3 * (y - top) / (floor - top)))
    for x in range(0, OFFICE_W, 40): d.line((x, top, x, floor), fill=shade(wall, 0.55))
    d.rectangle((0, floor - 40, OFFICE_W, floor - 36), fill=trim)                     # (the dado rail)
    d.rectangle((0, top - 12, OFFICE_W, top), fill=shade(wall, 0.35))
    for x in range(30, OFFICE_W, 150): d.rectangle((x, top - 10, x + 40, top - 6), fill=(230, 230, 200))   # (the lights)
    # the door
    d.rectangle((12, 296, 92, floor), fill=shade(trim, 0.5)); d.rectangle((18, 302, 86, floor), fill=trim)
    d.rectangle((74, 352, 80, 358), fill=(230, 200, 120))
    # the window and its blinds, the night outside
    d.rectangle((120, 272, 250, 362), fill=(20, 20, 28))
    for y in range(276, 360, 5): d.line((124, y, 246, y), fill=(150, 150, 160))
    for _ in range(14): x, y = rnd.randrange(126, 244), rnd.randrange(278, 358); d.point((x, y), fill=rnd.choice([(255, 120, 210), (255, 220, 120), (120, 220, 255)]))
    if crest:
        # the family's crest (a ring and a diamond in it), the scroll beside it, the kamidana shelf
        cx = 520
        d.ellipse((cx - 30, 268, cx + 30, 328), fill=(16, 12, 12)); d.ellipse((cx - 24, 274, cx + 24, 322), fill=(200, 170, 60))
        d.polygon([(cx, 280), (cx + 16, 298), (cx, 316), (cx - 16, 298)], fill=(16, 12, 12))
        d.rectangle((600, 262, 640, 352), fill=(236, 228, 204)); d.rectangle((598, 258, 642, 262), fill=(60, 40, 30)); d.rectangle((598, 352, 642, 356), fill=(60, 40, 30))
        for y in range(272, 344, 14): d.rectangle((616, y, 624, y + 8), fill=(30, 26, 24))
        d.rectangle((300, 268, 380, 274), fill=(150, 110, 70)); d.rectangle((316, 256, 364, 268), fill=(190, 150, 100))
        d.rectangle((336, 258, 344, 268), fill=(220, 220, 220))
        # the boss's desk and its chair
        d.rectangle((470, floor - 26, 580, floor + 4), fill=(60, 36, 24)); d.rectangle((464, floor - 32, 586, floor - 26), fill=(96, 60, 40))
        d.rounded_rectangle((500, floor - 64, 550, floor - 30), 6, fill=(20, 20, 22))
        # the sofas and the low table
        for x0 in (270, 640):
            d.rounded_rectangle((x0, floor - 40, x0 + 100, floor + 4), 8, fill=(22, 22, 24)); d.rectangle((x0 + 6, floor - 14, x0 + 94, floor + 4), fill=(34, 34, 38))
        d.rectangle((390, floor - 14, 450, floor - 8), fill=(80, 50, 34))
    if files:
        # a loan office: its filing cabinets, a counter with a ledger, a safe, a calendar
        for x in range(290, 470, 44):
            d.rectangle((x, floor - 80, x + 38, floor + 2), fill=(120, 126, 130))
            for y in range(floor - 74, floor, 20): d.rectangle((x + 4, y, x + 34, y + 16), fill=(140, 146, 150)); d.rectangle((x + 15, y + 6, x + 23, y + 9), fill=(70, 70, 74))
        d.rectangle((500, floor - 40, 700, floor + 4), fill=(90, 80, 70)); d.rectangle((496, floor - 46, 704, floor - 40), fill=(130, 116, 100))
        d.rectangle((560, floor - 52, 600, floor - 46), fill=(220, 210, 170))
        d.rectangle((710, floor - 60, 750, floor + 4), fill=(50, 54, 60)); d.ellipse((722, floor - 40, 738, floor - 24), fill=(150, 150, 160))
        d.rectangle((560, 270, 610, 330), fill=(240, 240, 230)); d.rectangle((560, 270, 610, 280), fill=(200, 40, 40))
        for y in range(286, 326, 8):
            for x in range(564, 606, 8): d.point((x, y), fill=(60, 60, 60))
    for y in range(floor + 2, H):
        d.line((0, y, OFFICE_W, y), fill=shade(floorc, 0.9 - 0.4 * (y - floor) / (H - floor)))
    for y in (floor + 16, floor + 36, floor + 60): d.line((0, y, OFFICE_W, y), fill=shade(floorc, 0.6))
    im.convert('RGB').save(os.path.join(K, name + '.png'), optimize=True)
    print('%s: %dx%d' % (name, OFFICE_W, H))

# A loan shark's limousine, side on, for the street (the prologue's): long and black, its chrome, its windows dark,
# the rear one down, its wheels.
def limo():
    im = Image.new('RGBA', (260, 76), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((4, 30, 256, 64), 10, fill=(22, 22, 28))                     # the body
    d.polygon([(52, 30), (72, 8), (196, 8), (220, 30)], fill=(28, 28, 34))            # the cabin
    d.line((4, 44, 256, 44), fill=(150, 150, 160)); d.line((6, 45, 254, 45), fill=(60, 60, 70))   # the chrome along it
    for x0, x1 in ((76, 120), (126, 170)): d.polygon([(x0, 12), (x1, 12), (x1, 28), (x0 - 10 if x0 == 76 else x0, 28)], fill=(52, 60, 80))
    d.polygon([(176, 12), (194, 12), (214, 28), (176, 28)], fill=(52, 60, 80))
    d.rectangle((126, 22, 170, 28), fill=(14, 14, 18))                                 # the rear window, down a way
    d.line((74, 10, 198, 10), fill=(90, 90, 104))
    for cx in (52, 206):
        d.ellipse((cx - 16, 50, cx + 16, 76), fill=(12, 12, 14)); d.ellipse((cx - 8, 56, cx + 8, 70), fill=(150, 150, 160)); d.ellipse((cx - 3, 61, cx + 3, 66), fill=(70, 70, 80))
    d.rectangle((248, 36, 255, 41), fill=(250, 240, 200)); d.rectangle((4, 36, 9, 42), fill=(200, 30, 30))
    for x in range(20, 240, 3): im.putpixel((x, 33), (60, 60, 72, 255))
    im.save(os.path.join(K, 'limo.png'), optimize=True)

if __name__ == '__main__':
    poppo()
    backlot()
    sewer()
    heroine()
    limo()
    office('dojima', (70, 20, 20), (110, 60, 40), (60, 40, 30), seed=51)
    office('kazama', (84, 64, 40), (120, 84, 50), (70, 50, 34), seed=61)
    office('toko', (90, 96, 92), (110, 110, 100), (80, 80, 76), crest=False, files=True, seed=71)
