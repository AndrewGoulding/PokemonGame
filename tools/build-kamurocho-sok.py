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
#   alley.png     the back alley, 609x480 (the Empty Lot, with the Time Machine: time-machine.png)
#   bacchus.png   the bar, 1632x480
#   people/<id>.png   each one standing, facing right, their feet on the bottom row
import os, struct, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets/kamurocho')
KEY = (b'e13b293bec6' + bytes(16))[:16]

# The backdrops in entry 15: (x, y, width, height).
BACKDROPS = {'street_a': (1, 3142, 2000, 480), 'street_b': (1, 824, 1103, 480), 'alley': (1960, 908, 609, 480), 'bacchus': (1, 1507, 1632, 480)}
# Each one's frame: (entry, x, y, width, height), standing in a fight, facing right.
PEOPLE = {
    'kiryu': (15, 3858, 1100, 54, 80), 'majima': (29, 1922, 1774, 56, 66), 'punk': (15, 3657, 1034, 49, 81),
    'drunk': (15, 3265, 310, 49, 79), 'thug': (15, 3952, 38, 41, 77), 'knife': (15, 2797, 1065, 88, 81),
    'host': (15, 2741, 472, 35, 82), 'biker': (15, 3632, 870, 44, 80), 'grunt': (15, 3978, 512, 49, 77),
    'shakedown': (15, 3770, 293, 41, 77), 'host2': (15, 2865, 1360, 54, 90), 'salaryman': (15, 3613, 466, 56, 78),
    'dancer': (15, 1612, 144, 36, 91),
}

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
        atlas[e].crop((x, y, x + w, y + h)).save(os.path.join(OUT, 'people', pid + '.png'), optimize=True)
    # (The Time Machine, as Kamurocho's Empty Lot had it, off its ground: the lot's dirt colours made clear.)
    lot = Image.open(os.path.join(ROOT, 'assets/world/maps/Kamurocho.png')).convert('RGBA')
    tm = lot.crop((1246, 1716, 1298, 1784)); g = lot.crop((1120, 1700, 1236, 1800)).load(); px = tm.load()
    dirt = {g[x, y] for x in range(116) for y in range(100)}
    for y in range(tm.height):
        for x in range(tm.width):
            if px[x, y] in dirt: px[x, y] = (0, 0, 0, 0)
    tm.crop(tm.getbbox()).save(os.path.join(OUT, 'time-machine.png'), optimize=True)
    print('Kamurocho: %d scenes, %d people' % (3, len(PEOPLE)))

if __name__ == '__main__':
    main()
