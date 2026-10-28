#!/usr/bin/env python3
# The story's cast for Kamurocho (ui/game.js's Yakuza 0 first chapter), from the sheet of them given for this game
# (assets/kamurocho/cast-sheet/cast.webp: each one's front, back, left and right, two frames apiece, on black). The
# streets are side on, so each takes their right-facing pair (ui/street.js turns them round to face left): their
# black background flooded away from the cell's edge (their own dark outline kept), cut to them, turned to face
# right where a frame looks left, and brought to the street's people's height.
#
#   python3 tools/import-kamurocho-cast.py
#
# Writes assets/kamurocho/people/<name>.png (standing: the first frame) and <name>_walk.png (four frames, the two
# in turn), for Kuze, Kashiwagi, Awano, Oda, Shibusawa, Tachibana, Toko Credit's president and Dojima.
import os
from collections import deque
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SHEET = os.path.join(ROOT, 'assets/kamurocho/cast-sheet/cast.webp')
OUT = os.path.join(ROOT, 'assets/kamurocho/people')
TALL = 84          # (the street's people's height)

# (each one's right-facing column on the sheet, x0-x1, and its two rows, y0-y1 each)
TOP, BOTTOM = ((243, 372), (379, 498)), ((781, 887), (892, 991))
CAST = {'kuze': ((266, 327), TOP), 'kashiwagi': ((673, 734), TOP), 'awano': ((1057, 1121), TOP), 'oda': ((1445, 1512), TOP),
        'shibusawa': ((270, 326), BOTTOM), 'tachibana': ((675, 735), BOTTOM), 'president': ((1061, 1122), BOTTOM), 'dojima': ((1445, 1505), BOTTOM)}

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
    sheet = Image.open(SHEET).convert('RGB')
    for name, ((x0, x1), rows) in CAST.items():
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
        for i, f in enumerate([frames[0], frames[1], frames[0], frames[1]]): walk.alpha_composite(f, (i * w, 0))
        walk.save(os.path.join(OUT, name + '_walk.png'), optimize=True)
        print(name, (w, h))

if __name__ == '__main__':
    main()
