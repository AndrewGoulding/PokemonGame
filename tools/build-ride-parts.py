#!/usr/bin/env python3
# The Bicycle and the water you Surf on, without Red on them, for your look to ride (ui/overworld.js composeRide).
#
#   python3 tools/build-ride-parts.py
#
# From Red's own FireRed sheets (assets/sprites/overworld/red_bike.png, red_surf.png: 16-colour, frames 32x32), the
# custom character's colours (assets/world/sprites/player_custom_bike.png, _surf.png, the same frames recoloured):
# in each frame, what's below where Red's hands are is the Bicycle (or the water under him), less his skin; what's
# above, him: he sits with his legs out of sight. So does your look: its body from the waist down (WAIST of the way
# from its neck to its feet) left out, its waist at the seat (each frame's SEAT row), and over to one side as Red leans
# (where his head is in the frame against where it is standing, red_normal.png's first frame).
#
# Writes:
#   assets/world/sprites/ride_bike.png   the Bicycle's nine frames (standing down, up, left; pedalling down, up, left)
#   assets/world/sprites/ride_surf.png   the six on the water (down, up, left; each twice)
#   data/type-chart.js (between its markers) window.RIDE_PARTS: for each sheet, each frame's [look frame, dx, seat]
#                                          (the standing frame of your look's to draw, how far across, the seat's row);
#                                          `waist`: each body's waist row, standing down, up and left
import json, os, re
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
RED = os.path.join(ROOT, 'assets/sprites/overworld')
OUT = os.path.join(ROOT, 'assets/world/sprites')
SKIN = [2, 3, 4]   # Red's skin, his hands on the handlebars or the water's edge
CAP = 8            # his cap's outline: the top of his head

LOOKS = os.path.join(OUT, 'looks')
WAIST = 0.55
SEAT = {'bike': {'d': 25, 'u': 26, 'l': 25}, 'surf': {'d': 18, 'u': 18, 'l': 19}}

# Each frame: which way he faces (your look's standing frame: 0 down, 1 up, 2 left) and the Bicycle or water, as
# boxes [x0, y0, x1, y1) of the frame (what's in them, less his skin).
FACE = {'d': 0, 'u': 1, 'l': 2}
BIKE_DOWN = [(0, 25, 32, 32)]
BIKE_UP = [(0, 26, 32, 32)]
BIKE_LEFT = [(0, 25, 32, 32), (0, 22, 14, 25)]   # (its handlebars, in front of him)
SURF_DOWN = [(0, 16, 32, 32)]
SURF_UP = [(0, 16, 32, 32)]
SURF_LEFT = [(0, 18, 32, 32), (0, 11, 11, 18)]   # (its head, in front of him)
SHEETS = {
    'bike': [('d', BIKE_DOWN), ('u', BIKE_UP), ('l', BIKE_LEFT), ('d', BIKE_DOWN), ('d', BIKE_DOWN),
             ('u', BIKE_UP), ('u', BIKE_UP), ('l', BIKE_LEFT), ('l', BIKE_LEFT)],
    'surf': [('d', SURF_DOWN), ('d', SURF_DOWN), ('u', SURF_UP), ('u', SURF_UP), ('l', SURF_LEFT), ('l', SURF_LEFT)],
}


def head(f, w):
    """Where Red's head is in a frame: its top row, and the middle of it across (from the frame's middle)."""
    y = np.where((f == CAP).any(1))[0][0]
    xs = np.where(f[y] == CAP)[0]
    return y, (xs[0] + xs[-1] + 1) / 2 - w / 2


def main():
    std = np.asarray(Image.open(os.path.join(RED, 'red_normal.png')))[:, :16]
    sy, sx = head(std, 16)
    parts = {}
    for name, frames in SHEETS.items():
        idx = np.asarray(Image.open(os.path.join(RED, 'red_%s.png' % name)))
        rgba = np.asarray(Image.open(os.path.join(OUT, 'player_custom_%s.png' % name)).convert('RGBA'))
        out = np.zeros((32, 32 * len(frames), 4), np.uint8)
        info = []
        for i, (face, boxes) in enumerate(frames):
            f = idx[:, i * 32:i * 32 + 32]
            keep = np.zeros(f.shape, bool)
            for x0, y0, x1, y1 in boxes:
                keep[y0:y1, x0:x1] = True
            keep &= (f != 0) & ~np.isin(f, SKIN)
            out[:, i * 32:i * 32 + 32][keep] = rgba[:, i * 32:i * 32 + 32][keep]
            y, x = head(f, 32)
            info.append([FACE[face], int(round(x - sx)), SEAT[name][face]])
        Image.fromarray(out).save(os.path.join(OUT, 'ride_%s.png' % name), optimize=True)
        parts[name] = info
    # Each body's waist: its neck (headAt; a whole character, its top) to its feet, standing each way.
    looks = json.loads(re.search(r'window\.PLAYER_LOOK_PARTS = (\{.*?\});\n', open(os.path.join(ROOT, 'data/type-chart.js')).read()).group(1))
    parts['waist'] = {}
    for n, part in sorted(looks.items()):
        if part['kind'] not in ('body', 'whole'):
            continue
        a = np.asarray(Image.open(os.path.join(LOOKS, n + '.png')).convert('RGBA'))[..., 3] > 0
        a = a.reshape(-1, 32, a.shape[1]).any(0)
        w = []
        for k in range(3):
            rows = np.where(a[:, k * 32:k * 32 + 32].any(1))[0]
            top = part['headAt'][k][1] if part.get('headAt') else rows[0]
            w.append(int(round(top + WAIST * (rows[-1] + 1 - top))))
        parts['waist'][n] = w
    f = os.path.join(ROOT, 'data/type-chart.js')
    src = open(f).read()
    START, END = '// <ride-parts>', '// </ride-parts>'
    block = START + '\nwindow.RIDE_PARTS = ' + json.dumps(parts, separators=(',', ':')) + ';\n' + END
    if START in src:
        src = src[:src.index(START)] + block + src[src.index(END) + len(END):]
    else:
        src = src.rstrip('\n') + '\n\n// The Bicycle and the water to Surf on, for your look (tools/build-ride-parts.py).\n' + block + '\n'
    open(f, 'w').write(src)
    print(json.dumps({k: v for k, v in parts.items() if k != 'waist'}), len(parts['waist']), 'bodies')


main()
