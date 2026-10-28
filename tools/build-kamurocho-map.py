#!/usr/bin/env python3
# Kamurocho's map picture (the start menu's MAP, ui/game.js realmMap), from the picture of Yakuza 0's map given for
# the game (assets/kamurocho/map-source.webp): the town cut out of it and brought down to the map screen's size, a
# pixel at a time by what most of the picture under it is (a road, a block, West Park, a big building, purple,
# orange or yellow), the names written on it left out (they're drawn over it again, in the game's own letters).
#
#   python3 tools/build-kamurocho-map.py
#
# Writes assets/kamurocho/map.png; KAMUROCHO_STREET.map.picture says where it goes on the screen, and its scale.
import os
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets/kamurocho/map-source.webp')
OUT = os.path.join(ROOT, 'assets/kamurocho/map.png')
CROP = (355, 34, 1117, 919)      # (the town, in the picture)
SCALE = 0.1765                   # (the screen's pixels to the picture's: the town 156 high)
COLOURS = {1: (62, 64, 74), 2: (176, 178, 182), 3: (100, 196, 246), 4: (180, 150, 236), 5: (232, 168, 86), 6: (236, 222, 140)}

def kind(c):
    r, g, b = c
    if max(c) < 30: return 0                                   # (outside the town, or a name's dark edge)
    if min(c) > 225: return -1                                 # (a name's letters)
    if b > 200 and r < 140 and g > 150: return 3              # (West Park)
    if b > 200 and r > 150 and g < 190: return 4               # (purple)
    if r > 200 and 130 < g < 200 and b < 140: return 5         # (orange)
    if r > 200 and g > 200 and b < 180: return 6               # (yellow)
    if max(c) < 110: return 1                                  # (a road)
    return 2                                                   # (a block)

def main():
    im = np.array(Image.open(SRC).convert('RGB').crop(CROP)).astype(int)
    h, w = im.shape[:2]
    W, H = round(w * SCALE), round(h * SCALE)
    kinds = np.zeros((h, w), int)
    for y in range(h):
        for x in range(w): kinds[y, x] = kind(tuple(im[y, x]))
    # (the dark outside the town: the near-black flooded in from the picture's edge; any other near-black is a
    # name's dark edge, written over the town, and goes the way of its letters)
    from collections import deque
    outside = np.zeros((h, w), bool); todo = deque([(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)])
    while todo:
        x, y = todo.popleft()
        if not (0 <= x < w and 0 <= y < h) or outside[y, x] or kinds[y, x] != 0: continue
        outside[y, x] = True; todo.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    kinds[(kinds == 0) & ~outside] = -1
    # (and the dark outline round each name's letters: a few pixels about every white one)
    white = kinds == -1
    ring = white.copy()
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            if dx * dx + dy * dy <= 36: ring |= np.roll(np.roll(white, dy, 0), dx, 1)
    kinds[ring] = -1
    out = np.zeros((H, W), int)
    for Y in range(H):
        for X in range(W):
            cell = kinds[int(Y / SCALE):int((Y + 1) / SCALE), int(X / SCALE):int((X + 1) / SCALE)].ravel()
            votes = np.bincount(cell[cell > 0], minlength=7) if (cell > 0).any() else None
            if votes is None: out[Y, X] = 0 if (cell == 0).sum() > cell.size * 0.6 else -1
            else:
                # (a road wins its cell if a good part of it is road: they're thin at this size)
                out[Y, X] = 1 if votes[1] > 0.4 * votes.sum() else int(votes.argmax())
    # (a cell that was all a name's letters: what's round it)
    for _ in range(6):
        for Y in range(H):
            for X in range(W):
                if out[Y, X] == -1:
                    n = [out[j, i] for j, i in ((Y - 1, X), (Y + 1, X), (Y, X - 1), (Y, X + 1)) if 0 <= j < H and 0 <= i < W and out[j, i] > 0]
                    if n: out[Y, X] = max(set(n), key=n.count)
    # (a lone pixel of road in a block, from the block's own faint lines: the block)
    for Y in range(1, H - 1):
        for X in range(1, W - 1):
            if out[Y, X] == 1 and sum(out[j, i] == 1 for j, i in ((Y - 1, X), (Y + 1, X), (Y, X - 1), (Y, X + 1))) <= 1: out[Y, X] = 2
    pic = Image.new('RGBA', (W, H), (0, 0, 0, 0)); px = pic.load()
    for Y in range(H):
        for X in range(W):
            if out[Y, X] > 0: px[X, Y] = COLOURS[out[Y, X]] + (255,)
    pic.save(OUT, optimize=True)
    print('map: %dx%d' % (W, H))

if __name__ == '__main__':
    main()
