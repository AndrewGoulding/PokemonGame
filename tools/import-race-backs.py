#!/usr/bin/env python3
# Your back in a Pokémon battle, by your race: from the back sprites given for the game
# (assets/sprites/trainers/back/source: races.webp, a panel a race on a beige ground; goomba.png, the Goomba's own,
# with a ball on its head: the game's own, as items lie on the ground).
#
# Each: its panel's beige flooded away from the panel's edges (each row's own beige, as the ground is striped), cut
# to what's left (its biggest piece and those beside it big enough, not specks), brought down to FireRed's 64x64 (each pixel the average of those under it), its bottom on the
# frame's bottom as a back sprite's is; the same in all five of a back sheet's frames (FireRed's throw).
#
#   python3 tools/import-race-backs.py
#
# Writes assets/sprites/trainers/back/race_<id>.png (64x320) and data/race-backs.js (window.RACE_BACKS: the races
# that have one; ui/game.js gives you yours in battle).
import json, os
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets/sprites/trainers/back/source')
OUT = os.path.join(ROOT, 'assets/sprites/trainers/back')

# (each race's panel's inside, below its name: x0, y0, x1, y1 in races.webp)
PANELS = {
    'hylian': (28, 134, 384, 284), 'kokiri': (405, 134, 758, 284), 'zora': (781, 134, 1133, 284), 'gerudo': (1155, 134, 1511, 284),
    'human': (28, 378, 233, 529), 'majin': (253, 378, 448, 529), 'saiyan': (468, 378, 661, 529), 'namekian': (683, 378, 878, 529),
    'android': (898, 378, 1091, 529), 'arcosian': (1113, 378, 1306, 529), 'kai': (1328, 378, 1520, 529),
    'toad': (333, 625, 608, 775), 'pianta': (631, 625, 908, 775), 'koopa': (1231, 625, 1515, 775),
    'sheikah': (468, 872, 878, 1008),
}

def key(c, thr=34):
    """An RGB panel -> RGBA, its beige ground flooded away from its edges (each row's ground its own colour)."""
    h, w = c.shape[:2]
    beige = (c[..., 0] > 190) & (c[..., 1] > 175) & (c[..., 2] > 140) & (c[..., 0] >= c[..., 2])
    row_bg = np.array([np.median(c[y][beige[y]], axis=0) if beige[y].any() else np.array([235, 220, 190]) for y in range(h)])
    near = np.abs(c - row_bg[:, None, :]).sum(2) <= thr
    out = np.zeros((h, w), bool); todo = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while todo:
        x, y = todo.popleft()
        if not (0 <= x < w and 0 <= y < h) or out[y, x] or not near[y, x]: continue
        out[y, x] = True; todo.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    # (what's left: its biggest piece and any big enough beside it (a held ball), not specks at the panel's edge)
    keep = ~out; seen = np.zeros_like(keep); comps = []
    for y0 in range(h):
        for x0 in range(w):
            if not keep[y0, x0] or seen[y0, x0]: continue
            comp, st = [], [(x0, y0)]; seen[y0, x0] = True
            while st:
                u, v = st.pop(); comp.append((u, v))
                for du, dv in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    p_, q = u + du, v + dv
                    if 0 <= p_ < w and 0 <= q < h and keep[q, p_] and not seen[q, p_]: seen[q, p_] = True; st.append((p_, q))
            comps.append(comp)
    big = max((len(k) for k in comps), default=0)
    mask = np.zeros((h, w), bool)
    for k in comps:
        if len(k) >= big * 0.03:
            for u, v in k: mask[v, u] = True
    rgba = np.zeros((h, w, 4), np.uint8); rgba[..., :3] = c; rgba[..., 3] = np.where(mask, 255, 0)
    im = Image.fromarray(rgba, 'RGBA')
    return im.crop(im.getbbox())

def fit(im):
    k = min(64 / im.height, 64 / im.width)
    w, h = max(1, round(im.width * k)), max(1, round(im.height * k))
    a = np.array(im).astype(float); a[..., :3] *= a[..., 3:4] / 255
    b = np.array(Image.fromarray(a.astype(np.uint8), 'RGBA').resize((w, h), Image.BOX)).astype(float); al = b[..., 3:4]
    b[..., :3] = np.where(al > 0, b[..., :3] * 255 / np.maximum(al, 1), 0); b[..., 3] = np.where(b[..., 3] > 110, 255, 0)
    f = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); f.alpha_composite(Image.fromarray(b.astype(np.uint8), 'RGBA'), ((64 - w) // 2, 64 - h))
    return f

def sheet(f):
    out = Image.new('RGBA', (64, 320), (0, 0, 0, 0))
    for i in range(5): out.alpha_composite(f, (0, i * 64))
    return out

def main():
    big = np.array(Image.open(os.path.join(SRC, 'races.webp')).convert('RGB')).astype(int)
    have = []
    for rid, (x0, y0, x1, y1) in PANELS.items():
        sheet(fit(key(big[y0:y1, x0:x1]))).save(os.path.join(OUT, 'race_' + rid + '.png'), optimize=True); have.append(rid)
    # (the Goomba: its own picture, below its name; the Hylian's ball on its head)
    g = np.array(Image.open(os.path.join(SRC, 'goomba.png')).convert('RGB')).astype(int)
    goomba = key(g[30:131, 4:188], 60)
    # (its pale fringe, the picture's own ground left round its edge: a pass or two of light pixels beside the clear
    # taken off)
    ga = np.array(goomba)
    for _ in range(2):
        al = ga[..., 3] > 0; light = ga[..., :3].min(2) > 170
        edge = np.zeros_like(al); edge[1:] |= ~al[:-1]; edge[:-1] |= ~al[1:]; edge[:, 1:] |= ~al[:, :-1]; edge[:, :-1] |= ~al[:, 1:]
        ga[..., 3] = np.where(al & light & edge, 0, ga[..., 3])
    goomba = Image.fromarray(ga, 'RGBA'); goomba = goomba.crop(goomba.getbbox())
    # (the ball: the game's own, as items lie on the ground (assets/world/sprites/item_ball.png, its first frame), at
    # the size the others hold theirs)
    ib = Image.open(os.path.join(ROOT, 'assets/world/sprites/item_ball.png')).convert('RGBA')
    ball = ib.crop((0, 0, min(16, ib.width), min(16, ib.height))); ball = ball.crop(ball.getbbox())
    k = max(1, round(goomba.width * 0.2 / ball.width)); ball = ball.resize((ball.width * k, ball.height * k), Image.NEAREST)
    # (sitting on its head: the picture made taller to hold it)
    out = Image.new('RGBA', (goomba.width, goomba.height + ball.height - 3), (0, 0, 0, 0))
    out.alpha_composite(goomba, (0, ball.height - 3)); out.alpha_composite(ball, ((goomba.width - ball.width) // 2, 0))
    goomba = out
    sheet(fit(goomba)).save(os.path.join(OUT, 'race_goomba.png'), optimize=True); have.append('goomba')
    open(os.path.join(ROOT, 'data/race-backs.js'), 'w').write(
        '// Your back in battle by your race (tools/import-race-backs.py: assets/sprites/trainers/back/race_<id>.png).\n'
        'window.RACE_BACKS = ' + json.dumps(sorted(have)) + ';\n')
    print(len(have), 'backs')

if __name__ == '__main__':
    main()
