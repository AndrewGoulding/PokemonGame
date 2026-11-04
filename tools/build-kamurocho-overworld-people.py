#!/usr/bin/env python3
# Kamurocho's people on the overworld (the town top down, tools/build-kamurocho-town.py): FireRed's people sheets,
# 16x32, nine frames (standing facing down, up and left; two steps each way; facing right is left turned round),
# made from the sheets of them given for the game (assets/kamurocho/cast-sheet: each one's front, back, left and
# right on black, as tools/import-kamurocho-cast.py takes them for the side-on streets).
#
# Each view: its black flooded away from its edge (their dark outline kept), cut to them, brought down to 32 high
# (each pixel the average of those under it), fitted to the cell feet down. A step: one leg a pixel up (facing you or
# away), or the legs apart (side on). The townsfolk and the other foes are the gangs' passers-by in clothes of their
# own (tools/build-kamurocho-chibis.py's PEOPLE: recoloured as there, every view).
#
#   python3 tools/build-kamurocho-overworld-people.py
#
# Writes assets/world/sprites/kmr_<name>.png (144x32) for each.
import importlib.util, os
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SHEETS = os.path.join(ROOT, 'assets/kamurocho/cast-sheet')
OUT = os.path.join(ROOT, 'assets/world/sprites')

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, os.path.join(ROOT, 'tools', path)); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m
CHIBI = load('chibis', 'build-kamurocho-chibis.py')

# Each sheet: its bands (y0, y1) and the people along each (in fours: front, back, left, right). A sheet with two
# rows of the same people (cast.webp's second band is its other four) says which.
LAYOUT = {
    'cast.webp': [((240, 375), ['kuze', 'kashiwagi', 'awano', 'oda']), ((778, 890), ['shibusawa', 'tachibana', 'president', 'dojima'])],
    'heroes.webp': [((392, 615), ['kiryu', 'nishiki', 'majima'])],
    'story2.webp': [((392, 618), ['debtor', 'bacchus', 'kamoji'])],
    'gangs.webp': [((165, 298), ['thug_gray', 'thug_black', 'thug_brown', 'punk_track', 'punk_hoodie']),
                   ((487, 622), ['punk_bomber', 'punk_puffer', 'punk_shirt', 'punk_tank', 'punk_casual']),
                   ((825, 972), ['grunt_pinstripe', 'grunt_solid', 'grunt_white', 'grunt_purple', 'grunt_collar'])],
}

def columns(a, y0, y1):
    m = a[y0:y1].sum(2) > 60
    on = m.any(0); out, start, last = [], None, None
    for x, v in enumerate(on):
        if v:
            if start is None: start = x
            last = x
        elif start is not None and x - last > 4:
            if last - start >= 5: out.append((start, last))
            start = None
    if start is not None: out.append((start, last))
    return out

def cut(img, box):
    im = img.crop(box).convert('RGBA'); px = im.load(); w, h = im.size
    bg = lambda c: c[0] + c[1] + c[2] < 70
    seen, todo = set(), deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while todo:
        x, y = todo.popleft()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h) or not bg(px[x, y]): continue
        seen.add((x, y)); px[x, y] = (0, 0, 0, 0); todo.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return im.crop(im.getbbox())

def small(im):
    # (to 32 high, at most 16 wide: each pixel the average of those under it, the colour weighed by how solid)
    k = min(32 / im.height, 16 / im.width)
    w, h = max(1, round(im.width * k)), max(1, round(im.height * k))
    a = np.array(im).astype(float); a[..., :3] *= a[..., 3:4] / 255
    pre = Image.fromarray(a.astype(np.uint8), 'RGBA').resize((w, h), Image.BOX)
    b = np.array(pre).astype(float); al = b[..., 3:4]
    b[..., :3] = np.where(al > 0, b[..., :3] * 255 / np.maximum(al, 1), 0); b[..., 3] = np.where(b[..., 3] > 100, 255, 0)
    out = Image.new('RGBA', (16, 32), (0, 0, 0, 0)); out.alpha_composite(Image.fromarray(b.astype(np.uint8), 'RGBA'), ((16 - w) // 2, 32 - h))
    return out

def step(f, side, which):
    """A step from a standing frame: facing you or away, one leg (`which` 0 the left, 1 the right) a pixel up; side
    on, the legs apart (the near one forward or back)."""
    px = f.load(); out = Image.new('RGBA', f.size, (0, 0, 0, 0)); op = out.load()
    rows = [y for y in range(32) if any(px[x, y][3] for x in range(16))]
    hip = rows[0] + round((rows[-1] - rows[0]) * 0.78)
    xs = [x for y in range(hip, 32) for x in range(16) if px[x, y][3]]; mid = (min(xs) + max(xs)) / 2 if xs else 8
    for y in range(32):
        for x in range(16):
            c = px[x, y]
            if not c[3]: continue
            if y < hip: op[x, y] = c; continue
            if not side:
                up = 1 if (x < mid) == (which == 0) and y < 31 else 0
                op[x, y - up] = c
            else:
                t = (y - hip + 1) / max(1, 32 - hip)
                d = round((1 if which == 0 else -1) * 1.5 * t)
                for dx in (d, -d):
                    if 0 <= x + dx < 16 and not op[x + dx, y][3]: op[x + dx, y] = c
    return out

def sheet(views):
    """views: front, back, left standing -> FireRed's nine frames."""
    d, u, l = views
    frames = [d, u, l, step(d, False, 0), step(d, False, 1), step(u, False, 1), step(u, False, 0), step(l, True, 0), step(l, True, 1)]
    out = Image.new('RGBA', (144, 32), (0, 0, 0, 0))
    for i, f in enumerate(frames): out.alpha_composite(f, (i * 16, 0))
    return out

def main():
    views = {}
    for file, bands in LAYOUT.items():
        img = Image.open(os.path.join(SHEETS, file)).convert('RGB'); a = np.array(img).astype(int)
        for (y0, y1), people in bands:
            cols = columns(a, y0, y1)
            cols = [c for c in cols if c[1] - c[0] >= 20]   # (stray specks between them)
            assert len(cols) >= 4 * len(people), (file, y0, len(cols))
            for k, name in enumerate(people):
                views[name] = [cut(img, (cols[4 * k + j][0] - 2, y0, cols[4 * k + j][1] + 3, y1)) for j in range(3)]
    for name, v in views.items():
        sheet([small(x) for x in v]).save(os.path.join(OUT, 'kmr_' + name + '.png'), optimize=True)
    # (the townsfolk and the other foes: the gangs' in clothes of their own, as on the side-on streets)
    for name, (base, walk, colours, extra) in CHIBI.PEOPLE.items():
        extra = {k: v for k, v in extra.items() if k != 'wide'}
        one = lambda im: CHIBI.touches(CHIBI.recolour(im, **colours), **extra)
        sheet([small(one(x)) for x in views[base]]).save(os.path.join(OUT, 'kmr_' + name.replace('_idle', '') + '.png'), optimize=True)
    print(len(views) + len(CHIBI.PEOPLE), 'people')

if __name__ == '__main__':
    main()
