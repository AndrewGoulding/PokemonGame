#!/usr/bin/env python3
# The races' people (the character creator's, and you as you walk), from the sprite sheets given for the game
# (assets/world/sprites/looks-source): races.webp, a row for each race (standing facing down, up, left and right;
# then three frames each of walking down, left, up and right, and of running), and sheikah.webp, the Sheikah's man
# and woman (their standing views down the first panel, and each walk's first row its way).
#
# Each frame: cut from its cell, its panel's dark background flooded away from the cell's edge, the biggest piece
# of what's left kept (not a neighbour's edge), brought down to the game's size (a race's tallest standing frame 24
# high, as Kanto's people; each pixel the average of those under it), stood in a 32x32 cell where its cell put it
# (its feet on the bottom row; so a walk keeps still what doesn't move), and a race's frames all in one set of 16
# colours (crisp, as a GBA sprite's). Into this
# game's fifteen frames (tools/build-player-looks.py's): standing down, up, left; a walk's first and third frames
# its steps; its middle frame the frames between.
#
#   python3 tools/import-race-sprites.py
#
# Writes tools/data/race-sprites.png (a row of fifteen 32x32 frames for each, in RACES' order) and .json (the
# order), for tools/build-player-looks.py's own_people.
import json, os
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets/world/sprites/looks-source')
OUT = os.path.join(ROOT, 'tools/data/race-sprites')

# races.webp: each race's row (the middle of it, y), and the columns (x ranges): standing down, up, left, right;
# walking down (3), left (3), up (3).
ROWS = [('hylian', 122), ('kokiri', 165), ('zora', 210), ('gerudo', 252), ('human', 341), ('majin', 382), ('saiyan', 424),
        ('namekian', 467), ('android', 508), ('arcosian', 548), ('kai', 589), ('toad', 717), ('pianta', 759), ('goomba', 812),
        ('koopa', 852)]
COLS = {'stand': [(239, 271), (293, 326), (353, 386), (412, 444)], 'down': [(479, 512), (520, 552), (560, 592)],
        'left': [(618, 650), (660, 693), (702, 737)], 'up': [(761, 791), (802, 833), (842, 873)]}
# (how far above a row's middle its cells start: the Majin's tighter, the Humans' feet just above them)
TOP = {'majin': 19}
# sheikah.webp: the man's (top) and the woman's (bottom) cells' middles: standing down, left, up (the first panel's
# first column, rows one to three); each walk's first row, its two frames.
SHEIKAH = {'sheikah': 0, 'sheikah_f': 1}

def cut(a, box, bg, thr):
    """A cell -> its sprite (RGBA, cropped): the background flooded from the edge; the biggest piece left."""
    x0, y0, x1, y1 = box
    c = a[y0:y1, x0:x1]; h, w = c.shape[:2]
    near = np.abs(c - bg).sum(2) <= thr
    out = np.zeros((h, w), bool); todo = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while todo:
        x, y = todo.popleft()
        if not (0 <= x < w and 0 <= y < h) or out[y, x] or not near[y, x]: continue
        out[y, x] = True; todo.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    keep = ~out
    # (the biggest piece)
    seen = np.zeros_like(keep); best = []
    for y in range(h):
        for x in range(w):
            if not keep[y, x] or seen[y, x]: continue
            comp, st = [], [(x, y)]; seen[y, x] = True
            while st:
                u, v = st.pop(); comp.append((u, v))
                for du in (-1, 0, 1):
                    for dv in (-1, 0, 1):
                        p, q = u + du, v + dv
                        if 0 <= p < w and 0 <= q < h and keep[q, p] and not seen[q, p]: seen[q, p] = True; st.append((p, q))
            if len(comp) > len(best): best = comp
    img = np.zeros((h, w, 4), np.uint8)
    for u, v in best: img[v, u, :3] = c[v, u]; img[v, u, 3] = 255
    # (the whole cell, not cut to the sprite: where it stands in its cell is kept, so a walk doesn't jump about)
    return Image.fromarray(img, 'RGBA')

def small(im, k, foot):
    """A cell brought down by k (each pixel the average of those under it), its `foot` row on the frame's bottom row
    and its middle the frame's."""
    w, h = max(1, round(im.width * k)), max(1, round(im.height * k))
    a = np.array(im).astype(float); a[..., :3] *= a[..., 3:4] / 255
    b = np.array(Image.fromarray(a.astype(np.uint8), 'RGBA').resize((w, h), Image.BOX)).astype(float); al = b[..., 3:4]
    b[..., :3] = np.where(al > 0, b[..., :3] * 255 / np.maximum(al, 1), 0); b[..., 3] = np.where(b[..., 3] > 110, 255, 0)
    out = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    out.alpha_composite(Image.fromarray(b.astype(np.uint8), 'RGBA'), (16 - w // 2, 31 - round(foot * k)))
    return out

def crisp(frames, n=16):
    """A race's frames in one small set of colours, the same in every frame (as a GBA sprite's palette): no blur
    between colours, and nothing changing colour as it walks."""
    opaque = [f for f in frames]
    strip = Image.new('RGB', (32 * len(opaque), 32), (0, 0, 0))
    for i, f in enumerate(opaque): strip.paste(f.convert('RGB'), (i * 32, 0), f)
    mask = Image.new('L', strip.size, 0)
    for i, f in enumerate(opaque): mask.paste(f.getchannel('A'), (i * 32, 0))
    pts = [strip.getpixel((x, y)) for y in range(32) for x in range(strip.width) if mask.getpixel((x, y))]
    sample = Image.new('RGB', (len(pts), 1)); sample.putdata(pts)
    pal = sample.quantize(n, method=Image.Quantize.MEDIANCUT)
    out = []
    for f in frames:
        q = f.convert('RGB').quantize(palette=pal, dither=Image.Dither.NONE).convert('RGB').convert('RGBA')
        q.putalpha(f.getchannel('A')); out.append(q)
    return out

def fifteen(stand, walks, k, foot):
    """stand: down, up, left; walks: {down, up, left: [first, middle, third]} -> the fifteen frames."""
    s = [small(x, k, foot) for x in stand]
    w = {d: [small(x, k, foot) for x in v] for d, v in walks.items()}
    return crisp(s + [w['down'][0], w['down'][2], w['up'][0], w['up'][2], w['left'][0], w['left'][2],
                      w['down'][1], w['down'][1], w['up'][1], w['up'][1], w['left'][1], w['left'][1]])

TALL = 24   # (a race's standing height: as Kanto's people stand, not a head over them)
def scale_for(stand):
    """How much smaller, and the row its feet are on in its cells: by its standing frames."""
    boxes = [x.getbbox() for x in stand]
    t = max(b[3] - b[1] for b in boxes); wid = max(b[2] - b[0] for b in boxes)
    return min(TALL / t, 22 / wid), max(b[3] for b in boxes) - 1

def races():
    a = np.array(Image.open(os.path.join(SRC, 'races.webp')).convert('RGB')).astype(int)
    bg = np.array([23, 19, 31]); out = {}
    for rid, yc in ROWS:
        top = TOP.get(rid, 23)
        cell = lambda xr: cut(a, ((xr[0] + xr[1]) // 2 - 22, yc - top, (xr[0] + xr[1]) // 2 + 22, yc + 24), bg, 30)
        stand = [cell(COLS['stand'][i]) for i in (0, 1, 2)]
        walks = {d: [cell(x) for x in COLS[d]] for d in ('down', 'left', 'up')}
        out[rid] = fifteen(stand, walks, *scale_for(stand))
    return out

def sheikah():
    a = np.array(Image.open(os.path.join(SRC, 'sheikah.webp')).convert('RGB')).astype(int)
    bg = np.array([28, 26, 43]); out = {}
    for rid, half in SHEIKAH.items():
        dy = 0 if half == 0 else 430
        rows = [225 + dy, 325 + dy, 425 + dy]                   # (standing: down, left, up)
        cell = lambda x, y, hw=34: cut(a, (x - hw, y - 48, x + hw, y + 46), bg, 32)
        stand = [cell(310, rows[0]), cell(310, rows[2]), cell(310, rows[1])]
        walk = lambda x0, x1: [cell(x0, rows[0], 27), None, cell(x1, rows[0], 27)]
        walks = {'down': walk(520, 575), 'left': walk(658, 715), 'up': walk(792, 850)}
        # (its walks have two frames: between them, standing)
        for d, i in (('down', 0), ('up', 1), ('left', 2)): walks[d][1] = stand[i]
        # (its narrower walk cells, as wide as its standing ones round their middles; and, as its views are from
        # different panels, each one's feet put on the same row)
        for d in walks: walks[d] = [x if x.width == stand[0].width else pad(x, stand[0].width) for x in walks[d]]
        ref = stand[0].getbbox()[3]
        level = lambda im: shift(im, ref - im.getbbox()[3])
        stand = [level(x) for x in stand]
        for d in walks: walks[d] = [level(x) for x in walks[d]]
        k, foot = scale_for(stand)
        out[rid] = fifteen(stand, walks, k, foot)
    return out

def shift(im, dy):
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.alpha_composite(im, (0, dy)) if dy >= 0 else out.alpha_composite(im.crop((0, -dy, im.width, im.height)), (0, 0)); return out

def pad(im, w):
    out = Image.new('RGBA', (w, im.height), (0, 0, 0, 0)); out.alpha_composite(im, ((w - im.width) // 2, 0)); return out

def main():
    people = races(); people.update(sheikah())
    order = list(people)
    sheet = Image.new('RGBA', (32 * 15, 32 * len(order)), (0, 0, 0, 0))
    for j, rid in enumerate(order):
        for i, f in enumerate(people[rid]): sheet.alpha_composite(f, (i * 32, j * 32))
    sheet.save(OUT + '.png', optimize=True)
    json.dump(order, open(OUT + '.json', 'w'))
    print(len(order), 'people')

if __name__ == '__main__':
    main()
