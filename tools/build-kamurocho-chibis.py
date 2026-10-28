#!/usr/bin/env python3
# Kamurocho's other people in the chibi style of the sheets given for the game (tools/import-kamurocho-cast.py's):
# the townsfolk on its streets and the gangs' foes that had only Streets of Kamurocho's pictures, each made from one
# of the sheet's own passers-by (its thugs, punks and grunts) in clothes of their own: its jacket, its shirt, its
# trousers and its hair recoloured (the shading kept), and a touch apiece (a red drunk's face, sunglasses, a knife,
# a broader build). Kiryu's and Majima's fighting pictures become their chibi at ease too.
#
#   python3 tools/build-kamurocho-chibis.py     (after tools/import-kamurocho-cast.py)
#
# Writes over assets/kamurocho/people/<name>.png and <name>_walk.png, keeping the names data/kamurocho-street.js
# and REALM_FOES know them by.
import os, colorsys, shutil
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
P = os.path.join(ROOT, 'assets/kamurocho/people')

def lum(c): return (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255
def is_skin(c):
    r, g, b = c[:3]
    return r > g + 14 and g > b and r > 120 and r - b > 40

def regions(im):
    # (each pixel's part: hair (the big head's top, not skin), torso, legs, shoes (the bottom rows), skin; and the
    # torso's own colour, its median, so its shirt and tie are what differ from it)
    px = im.load(); w, h = im.size
    part = {}
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            if not c[3]: continue
            if is_skin(c): part[x, y] = 'skin'
            elif y < h * 0.44: part[x, y] = 'hair'
            elif y < h * 0.74: part[x, y] = 'torso'
            elif y < h * 0.93: part[x, y] = 'legs'
            else: part[x, y] = 'shoes'
    torso = sorted((px[p][:3] for p, k in part.items() if k == 'torso'), key=lum)
    med = torso[len(torso) // 2] if torso else (0, 0, 0)
    for p, k in list(part.items()):
        if k == 'torso':
            c = px[p]
            if sum(abs(a - b) for a, b in zip(c[:3], med)) > 150 and lum(c) > 0.12: part[p] = 'inner'
    return part

def recolour(im, jacket=None, inner=None, pants=None, hair=None, skin=None, shoes=None):
    im = im.convert('RGBA'); px = im.load()
    part = regions(im)
    want = {'torso': jacket, 'inner': inner, 'legs': pants, 'hair': hair, 'skin': skin, 'shoes': shoes}
    # (each part's own light, to keep its shading: the new colour as much lighter or darker as the pixel was)
    means = {}
    for k in want:
        vs = [lum(px[p]) for p, kk in part.items() if kk == k]
        means[k] = (sum(vs) / len(vs)) if vs else 0.5
    for p, k in part.items():
        t = want.get(k)
        if not t: continue
        c = px[p]; f = (lum(c) + 0.04) / (means[k] + 0.04)
        px[p] = tuple(max(0, min(255, int(v * f))) for v in t) + (c[3],)
    return im

def touches(im, shades=False, knife=False, bald=False, red=False, wide=1.0):
    px = im.load(); w, h = im.size
    face = [(x, y) for y in range(int(h * 0.5)) for x in range(w) if px[x, y][3] and is_skin(px[x, y])]
    if face and red:
        for x, y in face: r, g, b, a = px[x, y]; px[x, y] = (min(255, r + 8), max(0, g - 14), max(0, b - 12), a)
    if face and shades:
        # (sunglasses: a dark band across the face, a third of the way down it)
        top = min(y for x, y in face); bot = max(y for x, y in face)
        y0 = top + (bot - top) // 3
        xs = [x for x, y in face if y == y0] or [x for x, y in face]
        for y in (y0, y0 + 1):
            for x in range(min(xs) + 1, max(xs) + 1): px[x, y] = (20, 20, 26, 255)
    if face and bald:
        top = min(y for x, y in face)
        sk = px[face[len(face) // 2]]
        for y in range(0, top + 3):
            for x in range(w):
                c = px[x, y]
                if c[3] and not is_skin(c):
                    k = 0.62 + 0.5 * lum(c) - (0.06 if (x + y) % 3 == 0 else 0)
                    px[x, y] = tuple(max(0, min(255, int(v * k))) for v in sk[:3]) + (255,)
    if knife:
        # (a blade in the front hand: the lowest skin at the front, the right)
        hand = [(x, y) for y in range(int(h * 0.5), int(h * 0.8)) for x in range(w // 2, w) if px[x, y][3] and is_skin(px[x, y])]
        if hand:
            hx, hy = max(hand)
            for k in range(1, 9):
                if hx + k < w and hy - k // 2 >= 0: px[hx + k - 1 if hx + k >= w else hx + k, hy - k // 2] = (220, 226, 236, 255)
    if wide != 1.0:
        im = im.resize((round(w * wide), h), Image.NEAREST)
    return im

def frames(im, n=4):
    fw = im.width // n
    return [im.crop((k * fw, 0, (k + 1) * fw, im.height)) for k in range(n)]

def build(name, base, walk_name=None, colours=None, extra=None):
    colours, extra = colours or {}, extra or {}
    one = lambda im: touches(recolour(im, **colours), **extra)
    stand = one(Image.open(os.path.join(P, base + '.png')))
    stand.save(os.path.join(P, name + '.png'), optimize=True)
    if walk_name:
        fr = [one(f) for f in frames(Image.open(os.path.join(P, base + '_walk.png')).convert('RGBA'))]
        out = Image.new('RGBA', (fr[0].width * 4, fr[0].height), (0, 0, 0, 0))
        for k, f in enumerate(fr): out.alpha_composite(f, (k * f.width, 0))
        out.save(os.path.join(P, walk_name + '.png'), optimize=True)
    print(name, stand.size)

# name: (the sheet's passer-by it's made from, its walk's name or None, its clothes, its touches)
PEOPLE = {
    # the townsfolk
    'host_idle':      ('grunt_white', None, dict(inner=(30, 30, 34), hair=(226, 186, 90)), {}),
    'clubgoer':       ('punk_shirt', 'clubgoer_walk', dict(jacket=(40, 170, 170), pants=(210, 210, 220), hair=(120, 70, 40)), {}),
    'thug_idle':      ('punk_tank', 'thug_idle_walk', dict(jacket=(236, 236, 232), pants=(70, 80, 110)), {}),
    'loiterer':       ('punk_casual', None, dict(jacket=(190, 160, 110), pants=(90, 70, 50), hair=(70, 60, 56)), {}),
    'salaryman_idle': ('grunt_solid', 'salaryman_idle_walk', dict(jacket=(40, 56, 110), inner=(236, 236, 240), pants=(40, 56, 110)), {}),
    'drunk_idle':     ('grunt_solid', 'drunk_idle_walk', dict(jacket=(120, 120, 126), inner=(200, 60, 60), pants=(110, 110, 116)), dict(red=True)),
    'tourist':        ('punk_shirt', 'tourist_walk', dict(jacket=(236, 200, 60), pants=(190, 170, 120), hair=(150, 110, 60)), {}),
    'reveller':       ('punk_bomber', 'reveller_walk', dict(jacket=(230, 120, 40), inner=(250, 240, 220), pants=(60, 60, 70)), {}),
    'grunt_idle':     ('grunt_pinstripe', 'grunt_idle_walk', dict(jacket=(36, 70, 50), pants=(36, 70, 50)), {}),
    # the gangs' foes (their walks as KAMUROCHO_STREET.foeWalks has them)
    'drunk':          ('grunt_solid', 'drunk_walk', dict(jacket=(90, 84, 70), inner=(230, 230, 220), pants=(80, 76, 64)), dict(red=True)),
    'knife':          ('punk_hoodie', 'knife_walk', dict(jacket=(110, 116, 124), pants=(40, 40, 50)), dict(knife=True)),
    'host':           ('grunt_white', 'host_walk', dict(jacket=(40, 40, 60), inner=(220, 60, 140), pants=(40, 40, 60), hair=(200, 150, 80)), {}),
    'biker':          ('punk_puffer', 'biker_walk', dict(jacket=(30, 28, 30), pants=(50, 60, 90)), dict(shades=True)),
    'shakedown':      ('punk_tank', 'shakedown_walk', dict(jacket=(60, 110, 70), pants=(150, 120, 60)), dict(shades=True, wide=1.3)),
}
# (pictures that are another's as they are: the gangs' fallbacks, and Kiryu's and Majima's fighting pictures, their
# chibi at ease)
SAME = {'punk': 'punk_track', 'thug': 'thug_gray', 'grunt': 'grunt_solid', 'kiryu': 'kiryu_idle', 'majima': 'majima_idle'}
WALK_OF = {'kiryu_idle': 'kiryu_idle_walk', 'majima_idle': 'majima_idle_walk'}

def main():
    for name, (base, walk, colours, extra) in PEOPLE.items(): build(name, base, walk, colours, extra)
    for name, src in SAME.items():
        shutil.copyfile(os.path.join(P, src + '.png'), os.path.join(P, name + '.png'))
        shutil.copyfile(os.path.join(P, WALK_OF.get(src, src + '_walk') + '.png'), os.path.join(P, name + '_walk.png'))
        print(name, '=', src)

if __name__ == '__main__':
    main()
