#!/usr/bin/env python3
# The story's cast for Kamurocho (ui/game.js's Yakuza 0 first chapter), this game's own: each one Streets of
# Kamurocho's suited passers-by (assets/kamurocho/people, at ease, and their walks) made someone of their own, by
# their suit's colour, their shirt's, their hair, and a touch of their own:
#
#   kuze        the heavy build, a black suit and a red shirt, his head shaved to stubble
#   kashiwagi   a charcoal suit and black shirt, a scar down his cheek
#   awano       the white suit gone cream, a loud orange shirt
#   oda         the white suit gone pale blue-grey, a black shirt
#   shibusawa   a black suit and a white shirt, his hair slicked flat
#   tachibana   a light grey suit, a black glove on his left hand
#   president   a brown suit, his hair thinning on top (Toko Credit's)
#   dojima      the heavy build, a deep wine suit, grey hair
#
#   python3 tools/build-kamurocho-cast.py      (it needs only what's committed)
#
# Writes assets/kamurocho/people/<name>.png and, where the passer-by they're made from has one, <name>_walk.png.
import os, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
P = os.path.join(ROOT, 'assets/kamurocho/people')

# (each base: its idle picture and its walk, and the hue of its suit, to find the suit's pixels by)
BASES = {'grunt': ('grunt_idle', 'grunt_idle_walk', 0.38), 'salaryman': ('salaryman_idle', 'salaryman_idle_walk', 0.62),
         'host': ('host_idle', None, None), 'thug': ('thug_idle', 'thug_idle_walk', 0.08)}

def face(im):
    # (where the face is: the skin in the top third, its top row and its left and right)
    px = im.load(); w, h = im.size
    skin = [(x, y) for y in range(int(h * 0.32)) for x in range(w) if px[x, y][3] and px[x, y][0] > px[x, y][1] + 18 and px[x, y][0] > 120]
    if not skin: return None
    xs = sorted(x for x, y in skin)
    return min(y for x, y in skin), xs[len(xs) // 10], xs[-len(xs) // 10 - 1], px[skin[len(skin) // 2]]

def recolour(im, base, suit=None, shirt=None, hair=None, bald=False, scar=False, glove=False, glasses=True):
    im = im.convert('RGBA'); px = im.load(); w, h = im.size
    fc = face(im)
    if not fc: return im
    sy, fx0, fx1, sk = fc
    hue = BASES[base][2]
    eyes = []
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            if not c[3]: continue
            r, g, b = c[:3]; hh, sa, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            dark = r + g + b < 170
            head = y < sy + 12 and fx0 - 3 <= x <= fx1 + 3
            if dark and y < sy + 2:
                # (the hair: recoloured, or the scalp shaved or thinning)
                if bald == True or (bald == 'thin' and abs(x - (fx0 + fx1) // 2) <= 4 and y >= sy - 4):
                    px[x, y] = (sk[0] - (14 if (x + y) % 2 else 4), sk[1] - 16, sk[2] - 14, 255)
                elif hair: px[x, y] = tone(hair, v + 0.3) + (c[3],)
                continue
            if head and dark and sy + 2 <= y <= sy + 9:
                # (the sunglasses: kept, or taken off, his eyes under them)
                if not glasses:
                    px[x, y] = (sk[0] - 20, sk[1] - 22, sk[2] - 18, 255)
                    eyes.append((x, y))
                continue
            if head: continue
            skin = r > g + 18 and g > b + 4 and v > 0.45 and sa > 0.2
            if skin:
                if glove and x < w // 2 and y > h * 0.38: px[x, y] = (28, 26, 30, 255) if (x + y) % 3 else (62, 60, 68, 255)
                continue
            if hue is None: is_suit = sa < 0.14 and v > 0.5
            else: is_suit = sa > 0.15 and min(abs(hh - hue), 1 - abs(hh - hue)) < 0.09
            if is_suit and suit: px[x, y] = tone(suit, v) + (c[3],)
            elif shirt and ((sa < 0.25 and v > 0.55) or (0.15 < hh < 0.75 and sa < 0.5 and v > 0.45)) and y < h * 0.5: px[x, y] = tone(shirt, v) + (c[3],)
    if eyes:
        row = sorted(set(y for x, y in eyes))[len(set(y for x, y in eyes)) // 2]
        xs = sorted(x for x, y in eyes if y == row)
        for ex in (xs[len(xs) // 4], xs[3 * len(xs) // 4]): px[ex, row] = (24, 20, 20, 255)
    if scar:
        for k in range(6): px[fx0 + 1, sy + 6 + k] = (150, 56, 56, 255)
    return im

def tone(target, v):
    # (the colour as light or dark as the pixel was: its shading kept)
    k = 0.35 + 1.1 * v
    return tuple(max(0, min(255, int(c * k))) for c in target)

def frames(im, n):
    w = im.width // n
    return [im.crop((k * w, 0, (k + 1) * w, im.height)) for k in range(n)]

CAST = {
    'kuze':      ('thug', dict(suit=(40, 38, 44), shirt=(170, 30, 36), hair=(30, 26, 26)), dict(bald=True)),
    'kashiwagi': ('grunt', dict(suit=(78, 80, 86), shirt=(30, 30, 34), hair=(24, 22, 22)), dict(scar=True, glasses=False)),
    'awano':     ('host', dict(suit=(236, 220, 176), shirt=(240, 130, 40)), {}),
    'oda':       ('host', dict(suit=(176, 190, 206), shirt=(36, 36, 44)), {}),
    'shibusawa': ('grunt', dict(suit=(34, 34, 38), shirt=(236, 236, 236), hair=(18, 16, 16)), {}),
    'tachibana': ('salaryman', dict(suit=(176, 178, 186), shirt=(220, 228, 240), hair=(40, 34, 30)), dict(glove=True, glasses=False)),
    'president': ('salaryman', dict(suit=(120, 84, 52), shirt=(230, 220, 190), hair=(60, 50, 44)), dict(bald='thin', glasses=False)),
    'dojima':    ('thug', dict(suit=(96, 24, 40), shirt=(30, 26, 30), hair=(170, 170, 176)), dict(glasses=False)),
}

def main():
    for name, (base, colours, extra) in CAST.items():
        idle, walk, _ = BASES[base]
        im = recolour(Image.open(os.path.join(P, idle + '.png')), base, **colours, **extra)
        im.save(os.path.join(P, name + '.png'), optimize=True)
        if walk:
            wk = Image.open(os.path.join(P, walk + '.png')).convert('RGBA')
            out = Image.new('RGBA', wk.size, (0, 0, 0, 0))
            for k, fr in enumerate(frames(wk, 4)): out.alpha_composite(recolour(fr, base, **colours, **extra), (k * fr.width, 0))
            out.save(os.path.join(P, name + '_walk.png'), optimize=True)
        print(name, im.size)

if __name__ == '__main__':
    main()
