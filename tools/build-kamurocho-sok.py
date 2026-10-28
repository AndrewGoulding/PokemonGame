#!/usr/bin/env python3
# Kamurocho's streets and people, from Streets of Kamurocho (Empty Clip Studios and SEGA, 2020: freeware, on the
# Internet Archive as "Streets-of-Kamurocho"), for the Like a Dragon realm's side-on streets (ui/street.js).
#
#   python3 tools/build-kamurocho-sok.py "<the game's folder: AR_win32.mdf and .mtc>"
#
# (Its pictures are committed: the game needs no download to run, and nothing else builds from it. Run this again
# with the game to take them again.)
#
# How the game keeps its files: AR_win32.mtc is the index, AR_win32.mdf the data. The index: at 0x480 on, 32 bytes
# an entry (u32 1, its offset in the .mdf, its size padded to 4KB, its size, 0, its size padded to 16, 0, 0). Each
# entry is AES-128-CBC, a zero IV, its key the string "e13b293bec6" (in the game's .exe, beside "AR"; padded with
# zeros to 16 bytes, the .exe's own copy of it a 16-byte string with its last byte made zero). Entry 15 is the
# 4096x4096 atlas of the stages' backdrops (480 rows high each, the floor at the bottom) and most of the people's
# frames, 29 another 2048x2048 of people. (The game is Streets of Rage 2, entry 9, the Mega Drive cartridge, run with
# these pictures over its own: there's no list of whose frame is where, so the frames below are picked out by hand.)
#
# Writes assets/kamurocho/:
#   street.png    the street: the stage's long backdrop (the Stardust and Poppo, down past the Gyudon place to the
#                 batting cages and Bacchus), its two pieces side by side, 3103x480
#   alley.png     the back alley, 609x480 (the Empty Lot)
# (time-machine.png, the Time Machine, is this game's own, from the top-down Kamurocho it once had: kept as it is.)
#   bacchus.png   the bar, 816x480 (the first half of its stage: the rest is more of the same)
#   people/<id>.png   each one standing, facing right, their feet on the bottom row
#   people/nishiki.png, nishiki_walk.png   Nishiki, made from Kiryu (nishiki)
#   people/<id>_walk.png   and those who walk (and the foes), their walk: four frames side by side, each the width
#                 of <id>.png
import os, struct, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets/kamurocho')
KEY = (b'e13b293bec6' + bytes(16))[:16]

# The backdrops in entry 15: (x, y, width, height).
BACKDROPS = {'street_a': (1, 3142, 2000, 480), 'street_b': (1, 824, 1103, 480), 'alley': (1960, 908, 609, 480), 'bacchus': (1, 1507, 816, 480)}
# Each one's frame: (entry, x, y, width, height), standing in a fight, facing right.
PEOPLE = {
    'kiryu': (15, 3858, 1100, 54, 80), 'majima': (29, 1922, 1774, 56, 66), 'punk': (15, 3657, 1034, 49, 81),
    'drunk': (15, 3265, 310, 49, 79), 'thug': (15, 3952, 38, 41, 77), 'knife': (15, 2797, 1065, 88, 81),
    'host': (15, 2741, 472, 35, 82), 'biker': (15, 3632, 870, 44, 80), 'grunt': (15, 3978, 512, 49, 77),
    'shakedown': (15, 3770, 293, 41, 77), 'salaryman': (15, 3613, 466, 56, 78), 'dancer': (15, 1612, 144, 36, 91),
    # (Those who stand about and don't walk, at ease, not squaring up: Kiryu upright, his hands at his sides; Majima
    # with his hands in his jacket; the tout lighting up at the Stardust's door; and Poppo's clerk, made Poppo's by
    # tools/build-kamurocho-insides.py. Their fights keep the frames above.)
    'kiryu_idle': (15, 4064, 1952, 30, 82), 'majima_idle': (15, 1722, 156, 28, 84), 'host_idle': (15, 3198, 486, 37, 82),
    'loiterer': (15, 4054, 276, 38, 77),
}
# Those who walk up and down the pavement: their walk, a frame at a time (feet together, a step, a stride, a step:
# the way Streets of Rage 2's people walk, the same foot always first), as people/<id>_walk.png, each frame as wide
# as the next, their heads one above the other, their feet on the bottom row; and people/<id>.png, the first of them,
# standing. (The thug; the drunk, rolling along; a man in a grey suit, out on the town; and the same man in green,
# open-collared, a Yakuza.)
WALKS = {
    'thug_idle': (15, [(3746, 1770, 52, 84), (3614, 1372, 54, 84), (3774, 1348, 52, 82), (2216, 158, 54, 84)]),
    'drunk_idle': (15, [(2931, 292, 47, 83), (3670, 788, 50, 80), (2931, 292, 47, 83), (3854, 936, 50, 80)]),
    'grunt_idle': (15, [(3302, 1238, 50, 84), (2430, 40, 50, 82), (2880, 544, 50, 82), (2930, 544, 50, 82)]),
    'clubgoer': (15, [(3438, 1320, 50, 84), (3076, 712, 48, 82), (2828, 466, 50, 84), (3722, 1372, 50, 82)]),
}
# (and the same men again in other suits: the green-suited Yakuza's made navy, a salaryman; the grey suit's made
# wine-red and tan, men out on the town)
WALKS['salaryman_idle'] = (15, WALKS['grunt_idle'][1])
WALKS['reveller'] = (15, WALKS['clubgoer'][1])
WALKS['tourist'] = (15, WALKS['clubgoer'][1])
RECOLOUR = {
    'salaryman_idle': lambda r, g, b: (int(r * 0.7), int(g * 0.75), min(255, int(g * 1.3) + 10)) if g > r + 4 and g >= b else None,
    'reveller': lambda r, g, b: (min(255, int(g * 1.25) + 20), int(g * 0.45), int(g * 0.55)) if abs(r - g) < 14 and abs(g - b) < 18 and 40 < g < 200 else None,
    'tourist': lambda r, g, b: (min(255, int(g * 1.15) + 16), min(255, int(g * 1.0) + 6), int(g * 0.7)) if abs(r - g) < 14 and abs(g - b) < 18 and 40 < g < 200 else None,
}
# The street's foes' walks, as they come up the street at you (Streets of Rage 2's: squared up as they come), as
# people/<foe>_walk.png, four frames each as those above; their standing frames are PEOPLE's. (Majima's: his
# stance's steps, his feet together and apart, out of his boss fight's frames.)
FOE_WALKS = {
    'punk': (15, [(2482, 40, 42, 82), (3046, 544, 54, 82), (3938, 1264, 56, 82), (3316, 802, 54, 82)]),
    'biker': (15, [(3708, 1034, 46, 82), (3284, 148, 44, 78), (3022, 166, 50, 80), (3772, 372, 44, 78)]),
    'shakedown': (15, [(2938, 890, 52, 84), (2494, 378, 50, 84), (2376, 40, 52, 82), (3956, 1862, 52, 84)]),
    'grunt': (15, [(3478, 548, 46, 80), (3754, 1016, 44, 80), (2942, 2, 50, 80), (3754, 1016, 44, 80)]),
    'thug': WALKS['thug_idle'], 'drunk': WALKS['drunk_idle'],
    'majima': (15, [(2716, 214, 52, 84), (3832, 1684, 52, 84), (3060, 628, 52, 82), (3832, 1684, 52, 84)]),
}
# (The knife punk and the host have no walk in the atlas at all, only their stances (every frame of them the same
# legs: their breath, their spear's sway, the host's cigarette): theirs are made from their standing frame, its
# legs below the hip sheared apart and together about the crotch a stride at a time, the lifting foot raised, the
# body bobbing down on the strides. (frame, the hip's row, the crotch's column, the stride))
# (And Kiryu and Majima at ease, to walk behind you as your party: their standing frames, the same way.)
SYNTH_WALKS = {'knife': ((15, 2797, 1065, 88, 81), 50, 46, 6), 'host': ((15, 2741, 472, 35, 82), 46, 17, 4),
               'kiryu_idle': ((15, 4064, 1952, 30, 82), 46, 15, 4), 'majima_idle': ((15, 1722, 156, 28, 84), 48, 14, 4)}

# Nishiki (Akira Nishikiyama, Kiryu's sworn brother, as Yakuza 0 has him: shoulder-length black hair, a navy suit, a
# white shirt): Streets of Kamurocho hasn't him, so he's Kiryu at ease made him: his grey suit navy, his maroon shirt
# white, his hair grown down the back of his neck; and his walk made from it as Kiryu's is.
NISHIKI_FROM = (15, 4064, 1952, 30, 82)
def nishiki(im):
    im = im.copy(); px = im.load(); w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not a: continue
            v = (r + g + b) // 3
            if abs(r - g) < 16 and abs(g - b) < 20 and 60 < v < 250: px[x, y] = (int(v * 0.22) + 8, int(v * 0.27) + 10, int(v * 0.55) + 26, a)   # the suit
            elif r > g + 50 and g < 70 and abs(g - b) < 30: k = min(1.0, 0.55 + r / 300); px[x, y] = (int(236 * k), int(234 * k), int(226 * k), a)   # the shirt (maroon; not his skin)
    # (his hair: down the back of his head, two pixels wide, to his collar)
    hair = [(x, y) for y in range(18) for x in range(w) if px[x, y][3] and sum(px[x, y][:3]) < 120]
    if hair:
        bottom = max(y for x, y in hair)
        for y in range(bottom + 1, bottom + 6):
            row = [x for x in range(w) if px[x, y][3]]
            if not row: continue
            for x in (row[0], row[0] + 1): px[x, y] = (22, 18, 20, 255)
    return im

def stride(im, hip, split, d):
    W, H = im.width + 2 * d + 4, im.height + 2
    px, bottom, out = im.load(), im.height - 1, []
    for dd, lift, bob in ((0, 0, 0), (d, 0, 1), (0, 2, 0), (-d, 0, 1)):
        f = Image.new('RGBA', (W, H), (0, 0, 0, 0)); fp = f.load()
        for y in range(im.height):
            for x in range(im.width):
                c = px[x, y]
                if not c[3]: continue
                if y < hip: nx, ny = x + d + 2, y + bob + 1
                elif c[:3] == (0, 0, 0) and y > bottom - 4: nx, ny = x + d + 2, y + 1      # (the shadow stays put)
                else:
                    t, left = (y - hip) / max(1, bottom - hip), x < split
                    nx, ny = x + d + 2 + round((-dd if left else dd) * t), y + 1 - (round(lift * t) if lift and not left else 0)
                if 0 <= nx < W and 0 <= ny < H: fp[nx, ny] = c
        out.append(f)
    return out

# (Those whose frames face left in the atlas: turned round, so all of them face right.)
FACING_LEFT = {'majima_idle', 'host_idle', 'loiterer', 'drunk_idle', 'drunk_walk', 'majima_idle_walk'}   # (Kiryu at ease faces right as it is)

def strip(atlas, pid, rects, ims=None):
    # (each frame trimmed to itself, turned to face right, and set in a frame of one width: its head (the middle of
    # its top rows) in the middle, its feet on the bottom)
    frames = []
    for k, r in enumerate(ims or rects):
        im = r if ims else atlas.crop((r[0], r[1], r[0] + r[2], r[1] + r[3]))
        im = im.crop(im.getbbox())
        if pid in FACING_LEFT: im = im.transpose(Image.FLIP_LEFT_RIGHT)
        if pid in RECOLOUR:
            px = im.load()
            for i in range(im.width):
                for j in range(im.height):
                    r, g, b, a = px[i, j]
                    c = a and RECOLOUR[pid](r, g, b)
                    if c: px[i, j] = c + (a,)
        top = [i for i in range(im.width) for j in range(min(12, im.height)) if im.getpixel((i, j))[3]]
        frames.append((im, sum(top) / len(top)))
    half = int(max(max(hx, im.width - hx) for im, hx in frames)) + 1
    fh = max(im.height for im, _ in frames)
    out = Image.new('RGBA', (half * 2 * len(frames), fh), (0, 0, 0, 0))
    for k, (im, hx) in enumerate(frames): out.alpha_composite(im, (k * half * 2 + half - round(hx), fh - im.height))
    return out, half * 2

def entries(folder):
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    mtc = open(os.path.join(folder, 'AR_win32.mtc'), 'rb').read(); mdf = open(os.path.join(folder, 'AR_win32.mdf'), 'rb').read()
    out = []
    for o in range(0x480, len(mtc) - 32, 32):
        flag, off, _, real, _, padded, _, _ = struct.unpack_from('<8I', mtc, o)
        if flag != 1: break
        out.append(Cipher(algorithms.AES(KEY), modes.CBC(bytes(16))).decryptor().update(mdf[off:off + padded])[:real])
    return out

def main():
    if len(sys.argv) < 2: sys.exit('usage: python3 tools/build-kamurocho-sok.py "<Streets of Kamurocho folder>"')
    import io
    E = entries(sys.argv[1])
    atlas = {15: Image.open(io.BytesIO(E[15])).convert('RGBA'), 29: Image.open(io.BytesIO(E[29])).convert('RGBA')}
    os.makedirs(os.path.join(OUT, 'people'), exist_ok=True)
    cut = {k: atlas[15].crop((x, y, x + w, y + h)) for k, (x, y, w, h) in BACKDROPS.items()}
    street = Image.new('RGBA', (cut['street_a'].width + cut['street_b'].width, 480), (0, 0, 0, 255))
    street.paste(cut['street_a'], (0, 0)); street.paste(cut['street_b'], (cut['street_a'].width, 0))
    for name, im in (('street', street), ('alley', cut['alley']), ('bacchus', cut['bacchus'])):
        bg = Image.new('RGBA', im.size, (0, 0, 0, 255)); bg.alpha_composite(im)
        bg.convert('RGB').save(os.path.join(OUT, name + '.png'), optimize=True)
    for pid, (e, x, y, w, h) in PEOPLE.items():
        im = atlas[e].crop((x, y, x + w, y + h))
        if pid in FACING_LEFT: im = im.transpose(Image.FLIP_LEFT_RIGHT)
        im.save(os.path.join(OUT, 'people', pid + '.png'), optimize=True)
    for pid, (e, rects) in WALKS.items():
        im, fw = strip(atlas[e], pid, rects)
        im.save(os.path.join(OUT, 'people', pid + '_walk.png'), optimize=True)
        im.crop((0, 0, fw, im.height)).save(os.path.join(OUT, 'people', pid + '.png'), optimize=True)
    for foe, (e, rects) in FOE_WALKS.items():
        strip(atlas[e], foe + '_walk', rects)[0].save(os.path.join(OUT, 'people', foe + '_walk.png'), optimize=True)
    x, y, w, h = NISHIKI_FROM[1:]
    nk = nishiki(atlas[NISHIKI_FROM[0]].crop((x, y, x + w, y + h)))
    walk_, fw = strip(None, 'nishiki_walk', None, stride(nk, 46, 15, 4))
    walk_.save(os.path.join(OUT, 'people', 'nishiki_walk.png'), optimize=True)
    walk_.crop((0, 0, fw, walk_.height)).save(os.path.join(OUT, 'people', 'nishiki.png'), optimize=True)
    for foe, ((e, x, y, w, h), hip, split, d) in SYNTH_WALKS.items():
        ims = stride(atlas[e].crop((x, y, x + w, y + h)), hip, split, d)
        strip(None, foe + '_walk', None, ims)[0].save(os.path.join(OUT, 'people', foe + '_walk.png'), optimize=True)
    print('Kamurocho: %d scenes, %d people, %d of them walking, %d foes' % (3, len(PEOPLE) + len(WALKS), len(WALKS), len(FOE_WALKS) + len(SYNTH_WALKS)))

if __name__ == '__main__':
    main()
