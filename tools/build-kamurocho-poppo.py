#!/usr/bin/env python3
# Inside Poppo, Kamurocho's convenience store (the Like a Dragon realm's side-on streets, ui/street.js). Streets of
# Kamurocho has no insides of its shops, so this one is this game's own, put together from its own pictures: Poppo's
# sign off its shopfront on the street (assets/kamurocho/street.png), and its clerk the Salaryman
# (people/salaryman.png) in Poppo's blue and white, behind the counter; the shelves, the drinks fridge, the counter
# and the floor are drawn here, in the street's colours and its 480-high frame (the floor at the bottom).
#
#   python3 tools/build-kamurocho-poppo.py
#
# (It needs only what's committed; run tools/build-kamurocho-sok.py first if those pictures change.)
#
# Writes assets/kamurocho/poppo.png, 800x480.
import os, random
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
K = os.path.join(ROOT, 'assets/kamurocho')
W, H = 800, 480
WALL_TOP, FLOOR_Y = 238, 410          # (the ceiling's edge, and where the floor meets the back wall)
COUNTER = (548, 790)                   # (the counter's left and right, along the right-hand wall)

def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c[:3]) + ((c[3],) if len(c) > 3 else ())

def main():
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
    # The clerk, behind the counter: the Salaryman, his jacket Poppo's blue and his shirt white.
    clerk = Image.open(os.path.join(K, 'people/salaryman.png')).convert('RGBA').transpose(Image.FLIP_LEFT_RIGHT)
    px = clerk.load()
    for y in range(clerk.height):
        for x in range(clerk.width):
            r, g, b, a = px[x, y]
            if not a: continue
            lum = (r + g + b) / 3
            # (the dark suit: Poppo's blue, as bright as it was dark)
            if max(r, g, b) - min(r, g, b) < 40 and lum < 90 and y > 14:
                k = 0.6 + lum / 90
                px[x, y] = (int(46 * k), int(98 * k), int(178 * k), a)
    cs = 2
    clerk = clerk.resize((clerk.width * cs, clerk.height * cs), Image.NEAREST)
    cx = (COUNTER[0] + COUNTER[1]) // 2 + 10
    im.alpha_composite(clerk, (cx - clerk.width // 2, FLOOR_Y + 58 - clerk.height))
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

if __name__ == '__main__':
    main()
