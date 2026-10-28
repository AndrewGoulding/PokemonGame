#!/usr/bin/env python3
# Kamurocho's people from the sheets of them given for this game (assets/kamurocho/cast-sheet: cast.webp, the
# story's cast; heroes.webp, Kiryu, Nishiki and Majima; each one's front, back, left and right, two frames apiece, on
# black; gangs.webp, the street's gangs, a frame each; story2.webp, the story's debtor, Bacchus and Kamoji). The
# streets are side on, so each takes their right-facing pair (ui/street.js turns them round to face left): their
# black background flooded away from the cell's edge (their own dark outline kept), cut to them, turned to face
# right where a frame looks left, and brought to the street's people's height.
#
#   python3 tools/import-kamurocho-cast.py
#
# Writes assets/kamurocho/people/<name>.png (standing: the first frame) and <name>_walk.png (four frames, the two
# in turn), for Kuze, Kashiwagi, Awano, Oda, Shibusawa, Tachibana, Toko Credit's president and Dojima; and Kiryu's and
# Majima's at ease (kiryu_idle, kiryu_idle_walk, majima_idle, majima_idle_walk) and Nishiki's, over
# tools/build-kamurocho-sok.py's (run this after it).
import os
from collections import deque
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SHEETS = os.path.join(ROOT, 'assets/kamurocho/cast-sheet')
OUT = os.path.join(ROOT, 'assets/kamurocho/people')
TALL = 84          # (the street's people's height)

# (each one's right-facing column on the sheet, x0-x1, and its two rows, y0-y1 each)
TOP, BOTTOM = ((243, 372), (379, 498)), ((781, 887), (892, 991))
# (and from heroes.webp, Kiryu, Nishiki and Majima, a row a frame: their names as the street knows them, standing
# and walking)
ROWS = ((395, 612), (670, 885))
CAST = {'kuze': ('cast.webp', (266, 327), TOP), 'kashiwagi': ('cast.webp', (673, 734), TOP), 'awano': ('cast.webp', (1057, 1121), TOP),
        'oda': ('cast.webp', (1445, 1512), TOP), 'shibusawa': ('cast.webp', (270, 326), BOTTOM), 'tachibana': ('cast.webp', (675, 735), BOTTOM),
        'president': ('cast.webp', (1061, 1122), BOTTOM), 'dojima': ('cast.webp', (1445, 1505), BOTTOM),
        'kiryu_idle': ('heroes.webp', (386, 474), ROWS), 'nishiki': ('heroes.webp', (898, 998), ROWS), 'majima_idle': ('heroes.webp', (1419, 1510), ROWS)}
# (and from gangs.webp, the street's gangs, a frame each: three suit thugs, seven street punks and five Yakuza
# grunts, worn by REALM_FOES' thug, punk and grunt as their `looks`)
G1, G2, G3 = ((169, 290),), ((491, 615),), ((828, 965),)
for name, x0, x1, row in (('thug_gray', 233, 280, G1), ('thug_black', 550, 596, G1), ('thug_brown', 872, 918, G1), ('punk_track', 1174, 1222, G1),
                          ('punk_hoodie', 1471, 1519, G1), ('punk_bomber', 236, 284, G2), ('punk_puffer', 549, 596, G2), ('punk_shirt', 865, 913, G2),
                          ('punk_tank', 1176, 1224, G2), ('punk_casual', 1471, 1519, G2), ('grunt_pinstripe', 231, 280, G3), ('grunt_solid', 554, 606, G3),
                          ('grunt_white', 866, 913, G3), ('grunt_purple', 1167, 1220, G3), ('grunt_collar', 1468, 1516, G3)):
    CAST[name] = ('gangs.webp', (x0, x1), row)
# (and from story2.webp, the debtor (Taichi Kurihara), Bacchus and Kamoji: its top row, the outfits they wear in
# the story; its second row is other clothes)
for name, x0, x1 in (('debtor', 406, 502), ('bacchus', 888, 1005), ('kamoji', 1400, 1499)):
    CAST[name] = ('story2.webp', (x0, x1), ((395, 616),))
WALKS = {'kiryu_idle': 'kiryu_idle_walk', 'majima_idle': 'majima_idle_walk'}   # (the rest: <name>_walk)

def cut(sheet, box):
    im = sheet.crop(box).convert('RGBA'); px = im.load(); w, h = im.size
    # (the background: the near-black flooded in from the edge, so their dark outline stays)
    bg = lambda c: c[0] + c[1] + c[2] < 70
    seen, todo = set(), deque((x, y) for x in range(w) for y in (0, h - 1)) 
    todo.extend((x, y) for y in range(h) for x in (0, w - 1))
    while todo:
        x, y = todo.popleft()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h) or not bg(px[x, y]): continue
        seen.add((x, y)); px[x, y] = (0, 0, 0, 0)
        todo.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return im.crop(im.getbbox())

def facing_right(im):
    # (which way they look: their face's skin to the right of their head's middle; turned round if not, as the
    # street's people all face right)
    px = im.load(); w, h = im.size
    head = [(x, y) for y in range(int(h * 0.4)) for x in range(w) if px[x, y][3]]
    skin = [x for x, y in head if px[x, y][0] > px[x, y][1] + 15 and px[x, y][0] > 110]
    if not head or not skin: return im
    mid = sum(x for x, y in head) / len(head)
    return im if sum(skin) / len(skin) >= mid else im.transpose(Image.FLIP_LEFT_RIGHT)

def main():
    sheets = {}
    for name, (file, (x0, x1), rows) in CAST.items():
        sheet = sheets.get(file) or sheets.setdefault(file, Image.open(os.path.join(SHEETS, file)).convert('RGB'))
        fr = [facing_right(cut(sheet, (x0, y0, x1, y1))) for y0, y1 in rows]
        k = TALL / max(f.height for f in fr)
        fr = [f.resize((max(1, round(f.width * k)), max(1, round(f.height * k))), Image.LANCZOS) for f in fr]
        for f in fr:
            a = f.getchannel('A').point(lambda v: 255 if v > 110 else 0); f.putalpha(a)
        w, h = max(f.width for f in fr), max(f.height for f in fr)
        frames = []
        for f in fr:
            c = Image.new('RGBA', (w, h), (0, 0, 0, 0)); c.alpha_composite(f, ((w - f.width) // 2, h - f.height)); frames.append(c)
        frames[0].save(os.path.join(OUT, name + '.png'), optimize=True)
        walk = Image.new('RGBA', (4 * w, h), (0, 0, 0, 0))
        if len(frames) == 1:
            # (one frame only: its walk that frame, bobbing a pixel on every other step)
            up = Image.new('RGBA', (w, h), (0, 0, 0, 0)); up.alpha_composite(frames[0].crop((0, 1, w, h)), (0, 0)); frames.append(up)
        for i, f in enumerate([frames[0], frames[1], frames[0], frames[1]]): walk.alpha_composite(f, (i * w, 0))
        walk.save(os.path.join(OUT, WALKS.get(name, name + '_walk') + '.png'), optimize=True)
        print(name, (w, h))

if __name__ == '__main__':
    main()
