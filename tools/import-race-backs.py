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
# Then the throws (source/throws.webp: five panels a race, ready, wind-up, throw, release, follow-through): each race's
# five keyed the same way, the ball let go of taken off (the game throws its own), all five brought down by the one
# amount and placed alike, so the arm swings and the body stays put: 160x64 frames, as the arm reaches past FireRed's
# 64, the body in the middle (ui/battle-screen.css's .trainer-back.wide).
#
# Writes assets/sprites/trainers/back/race_<id>.png (160x320, or 64x320 for a race with no throw) and data/race-backs.js (window.RACE_BACKS: the races
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

def key(c, thr=34, least=0.03, crop=True):
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
        if len(k) >= big * least:
            for u, v in k: mask[v, u] = True
    rgba = np.zeros((h, w, 4), np.uint8); rgba[..., :3] = c; rgba[..., 3] = np.where(mask, 255, 0)
    im = Image.fromarray(rgba, 'RGBA')
    return im.crop(im.getbbox()) if crop else im

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

# throws.webp: its rows of panels (y0, y1), by race (its second Human, the Mushroom Kingdom's, and its Pokémon
# Trainer not used), and its five columns (x0, x1)
THROW_ROWS = {'hylian': (91, 142), 'kokiri': (150, 196), 'zora': (205, 251), 'gerudo': (259, 308), 'human': (322, 366),
              'majin': (374, 416), 'saiyan': (423, 463), 'namekian': (470, 511), 'android': (519, 559),
              'arcosian': (567, 606), 'kai': (613, 656), 'toad': (712, 748), 'pianta': (755, 791), 'goomba': (799, 836),
              'koopa': (841, 882), 'sheikah': (958, 1007)}
THROW_COLS = [(362, 582), (592, 815), (823, 1045), (1056, 1281), (1292, 1522)]

def body(im):
    """Only the pieces over the biggest one (not a ball flying off to the side)."""
    a = np.array(im); al = a[..., 3] > 0; h, w = al.shape
    lab = np.zeros((h, w), int); n = 0; boxes = {}
    for y0 in range(h):
        for x0 in range(w):
            if not al[y0, x0] or lab[y0, x0]: continue
            n += 1; st = [(x0, y0)]; lab[y0, x0] = n; xs = []
            while st:
                u, v = st.pop(); xs.append(u)
                for du in (-1, 0, 1):
                    for dv in (-1, 0, 1):
                        p_, q = u + du, v + dv
                        if 0 <= p_ < w and 0 <= q < h and al[q, p_] and not lab[q, p_]: lab[q, p_] = n; st.append((p_, q))
            boxes[n] = (min(xs), max(xs), len(xs))
    if not boxes: return im
    big = max(boxes, key=lambda k: boxes[k][2]); bx0, bx1 = boxes[big][:2]
    keep = [k for k, (x0, x1, _) in boxes.items() if x1 >= bx0 - 2 and x0 <= bx1 + 2]
    a[..., 3] = np.where(np.isin(lab, keep), a[..., 3], 0)
    return Image.fromarray(a, 'RGBA')

def shrink(im, k):
    """Brought down by k (each pixel the average of those under it), its edge kept hard."""
    w, h = max(1, round(im.width * k)), max(1, round(im.height * k))
    a = np.array(im).astype(float); a[..., :3] *= a[..., 3:4] / 255
    b = np.array(Image.fromarray(a.astype(np.uint8), 'RGBA').resize((w, h), Image.BOX)).astype(float); al = b[..., 3:4]
    b[..., :3] = np.where(al > 0, b[..., :3] * 255 / np.maximum(al, 1), 0); b[..., 3] = np.where(b[..., 3] > 110, 255, 0)
    return Image.fromarray(b.astype(np.uint8), 'RGBA')

def throw(rid):
    """A race's five throw frames -> its 160x320 sheet, and where in its frame it lets go of the ball: its body, standing ready, in the middle of each frame (where a
    64-wide back's is), the swing out to either side of it."""
    big = np.array(Image.open(os.path.join(SRC, 'throws.webp')).convert('RGB')).astype(int)
    y0, y1 = THROW_ROWS[rid]; w = min(x1 - x0 for x0, x1 in THROW_COLS) - 12
    # (each panel the same width from its left, inside its border; the first two keep their ball, held)
    fr = [key(big[y0 + 3:y1 - 2, x0 + 8:x0 + 8 + w], crop=False) for x0, _ in THROW_COLS]
    fr = [f if i < 3 else body(f) for i, f in enumerate(fr)]
    # (where the ball leaves the hand: the reaching fist, its release frame's furthest point out)
    ra = np.array(fr[3])[..., 3] > 0; hx = np.nonzero(ra.any(0))[0][-1]; hy = np.nonzero(ra[:, hx - 3:hx + 1].any(1))[0].mean()
    boxes = [f.getbbox() for f in fr]
    ux0, uy0 = min(b[0] for b in boxes), min(b[1] for b in boxes)
    ux1, uy1 = max(b[2] for b in boxes), max(b[3] for b in boxes)
    # (its body's middle: half its ready frame on either side, column by column)
    cols = np.cumsum((np.array(fr[0])[..., 3] > 0).sum(0)); mid = int(np.searchsorted(cols, cols[-1] / 2))
    # (as drawn, no bigger; smaller only if its swing would leave the frame)
    k = min(1, 80 / max(1, mid - ux0), 80 / max(1, ux1 - mid), 64 / (uy1 - uy0))
    out = Image.new('RGBA', (160, 320), (0, 0, 0, 0)); left = 80 - round((mid - ux0) * k)
    for i, f in enumerate(fr):
        s = shrink(f.crop((ux0, uy0, ux1, uy1)), k)
        out.alpha_composite(s, (left, i * 64 + 64 - s.height))
    top = 64 - round((uy1 - uy0) * k)
    hand = [round(left + (hx - ux0) * k), round(top + (hy - uy0) * k)]
    return out, hand

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
    # (the throws, over the standing backs, for the races drawn throwing)
    hands = {}
    for rid in THROW_ROWS:
        im, hands[rid] = throw(rid); im.save(os.path.join(OUT, 'race_' + rid + '.png'), optimize=True)
    open(os.path.join(ROOT, 'data/race-backs.js'), 'w').write(
        '// Your back in battle by your race (tools/import-race-backs.py: assets/sprites/trainers/back/race_<id>.png).\n'
        'window.RACE_BACKS = ' + json.dumps(sorted(have)) + ';\n'
        '// (those drawn throwing: 160 wide, ui/battle-screen.css\'s .trainer-back.wide)\n'
        'window.RACE_THROWS = ' + json.dumps(sorted(THROW_ROWS)) + ';\n'
        '// (where in its 160x64 frame each lets go of the ball: ui/battle-screen.js throws yours from there)\n'
        'window.RACE_THROW_HANDS = ' + json.dumps(hands, sort_keys=True) + ';\n')
    print(len(have), 'backs')

if __name__ == '__main__':
    main()
