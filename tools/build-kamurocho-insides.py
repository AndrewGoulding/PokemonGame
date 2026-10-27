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
# the Time Machine (time-machine.png, three times over) standing on its floor; and the manhole cover itself, for
# the backlot's asphalt.
#
#   python3 tools/build-kamurocho-insides.py
#
# (It needs only what's committed; run tools/build-kamurocho-sok.py first if those pictures change.)
#
# Writes assets/kamurocho/poppo.png (800x480), backlot.png (640x480), sewer.png (640x480) and manhole.png.
import os, random
from PIL import Image, ImageDraw

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
    # The Time Machine, on the floor beyond the ladder, three times over.
    tm = Image.open(os.path.join(K, 'time-machine.png')).convert('RGBA')
    tm = tm.resize((tm.width * 3, tm.height * 3), Image.NEAREST)
    glow = Image.new('RGBA', im.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    for r in range(90, 0, -15): gd.ellipse((300 - r * 1.6, floor + 20 - r * 0.5, 300 + r * 1.6, floor + 20 + r * 0.5), fill=(120, 200, 255, 14))
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

if __name__ == '__main__':
    poppo()
    backlot()
    sewer()
