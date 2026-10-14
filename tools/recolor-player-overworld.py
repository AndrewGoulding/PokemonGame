# Recolours Red's FireRed overworld sheets (assets/sprites/overworld/red_*.png,
# 16-colour indexed, frames 32 pixels tall) into the custom character's colours
# (assets/sprites/trainers/back/player_character.png): black cap with a white
# emblem, silver hair, red shirt with dark trim, black backpack.
#
#   python3 tools/recolor-player-overworld.py assets/sprites/overworld \
#       normal bike fish item surf surf_run vs_seeker_bike
#   -> player_character_<sheet>.png in the current directory (needs numpy, Pillow)
#
# Red's palette uses some slots for different things on the head and the body
# (12 is the cap band and the vest), so each frame is split at a row: above it
# is the head (cap, hair), below it the body. Extra colours go into the
# palette (an 8-bit sheet when that's more than 16).
import sys
import numpy as np
from PIL import Image

# Zones are measured from the top of the cap in each frame (Red's poses sit at
# different heights: standing, on the bike, sitting to surf), in rows below it.
HEAD_ROWS = 9            # cap and hair
BACK_HEAD_ROWS = 11      # facing away, the back of the head reaches lower
CAP_FRONT_ROWS = 6       # the cap's front panel ends here; below is the brim
LEG_ROWS = 15            # navy below this is trousers (kept); above, sleeves (red)
FRAME_WIDTH = {"normal": 16, "item": 16, "surf_run": 16}   # others: 32
# slot -> colour, on the head and on the body (None: keep Red's colour)
HEAD = {
    11: (76, 69, 69),    # cap top: black cap, lit
    12: (44, 44, 45),    # cap band
    8:  (19, 17, 19),    # cap outline
    10: (150, 145, 150), # cap brim shine
    4:  (196, 186, 180), # hair (Red's dark brown) -> silver
    1:  (235, 225, 215), # hair highlights
    6:  (216, 206, 198), # hair fringe under the brim (Red's navy)
}
# Red's cap has a white front panel; the custom cap is black, with only a small
# white emblem (above CAP_FRONT_ROWS). Below that row white is the brim.
BRIM = (44, 44, 45)
SLEEVE = (180, 52, 50)   # Red's navy sleeves -> the red shirt's sleeves (a shade darker)
BODY = {
    12: (222, 66, 63),   # vest -> red shirt
    11: (245, 120, 105), # shirt highlights
    8:  (106, 47, 46),   # shirt shading
    9:  (60, 60, 61),    # white trim -> black collar / wristbands
    10: (41, 39, 40),
    13: (65, 65, 65),    # yellow backpack -> black backpack
    14: (34, 34, 35),
}

# Sheets where Red stands as when walking. On the others (the bike, the fishing
# rod, sitting to surf) navy and white are also the bike, the rod and his legs,
# so the sleeves and the white trim keep Red's colours there.
STANDING = {"normal", "surf_run", "item"}

def recolor(src, out, standing=True, frame=32):
    im = Image.open(src)
    px = np.asarray(im).copy()
    pal = im.getpalette()[:48]
    colours = [tuple(pal[i * 3:i * 3 + 3]) for i in range(16)]
    # rows: each pixel's row below its frame's cap top (slot 11, the cap's lit top).
    rows = np.zeros(px.shape, int)
    limit = np.full(px.shape, HEAD_ROWS)
    for x in range(0, px.shape[1], frame):
        for y in range(0, px.shape[0], 32):
            f = px[y:y + 32, x:x + frame]
            cap = np.where((f == 11).any(1))[0]
            top = cap[0] if len(cap) else 12
            rows[y:y + 32, x:x + frame] = np.arange(32)[:, None] - top
            # Facing away (a big backpack in view): a taller head zone.
            if (f == 13).sum() > 4: limit[y:y + 32, x:x + frame] = BACK_HEAD_ROWS
    head = rows < limit
    brim = head & (rows >= CAP_FRONT_ROWS) & (px == 9)
    sleeves = ~head & (rows < LEG_ROWS) & (px == 6) & standing
    body_table = BODY if standing else {k: v for k, v in BODY.items() if k not in (9, 10)}
    # Each (slot, zone) pair that changes gets its own palette entry.
    new_colours, remap = list(colours), {}
    for zone_mask, table in ((brim, {9: BRIM}), (sleeves, {6: SLEEVE}), (head & ~brim, HEAD), (~head, body_table)):
        for slot, colour in table.items():
            m = zone_mask & (px == slot)
            if not m.any(): continue
            if colour not in new_colours: new_colours.append(colour)
            remap.setdefault(colour, []).append(m)
    out_px = px.copy()
    for colour, masks in remap.items():
        idx = new_colours.index(colour)
        for m in masks: out_px[m] = idx
    used = sorted(set(out_px.flatten().tolist()))
    # Pack the colours actually used, transparent first.
    order = [0] + [i for i in used if i != 0]
    lut = np.zeros(256, np.uint8)
    for n, i in enumerate(order): lut[i] = n
    packed = lut[out_px]
    # More than 16 colours (head and body each need their own): an 8-bit sheet,
    # which tools/build-maps.js reads like the 4-bit ones.
    img = Image.fromarray(packed, "P")
    img.putpalette([c for i in order for c in new_colours[i]] + [0] * (3 * (256 - len(order))))
    img.save(out, bits=4 if len(order) <= 16 else 8, transparency=0)
    return len(order)

for name in sys.argv[2:]:
    n = recolor(f"{sys.argv[1]}/red_{name}.png", f"player_character_{name}.png", name in STANDING, FRAME_WIDTH.get(name, 32))
    print(name, n, "colours")
