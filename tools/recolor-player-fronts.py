# Recolours Red's trainer-card picture (assets/sprites/trainers/front/red.png) into the custom
# player character's colours, like tools/recolor-player-overworld.py: black cap
# with an emblem, silver hair, red shirt, black backpack. Red's cap and vest
# share colours, so the picture is recoloured zone by zone (cap, hair, body).
#
#   python3 tools/recolor-player-fronts.py   (needs numpy, Pillow)
#   -> front_player_character.png, fronts_cmp.png
import numpy as np
from PIL import Image
# zones: list of (y0, y1, x0, x1, {colour: new colour}) applied in order to RGBA pixels
def recolor_rgba(arr, zones):
    out = arr.copy()
    for (y0, y1, x0, x1, table) in zones:
        for old, new in table.items():
            region = arr[y0:y1, x0:x1]
            m = (region[..., :3] == old).all(-1) & (region[..., 3] > 0)
            sub = out[y0:y1, x0:x1]
            sub[m, :3] = new
    return out
CAP = [(76, 69, 69), (60, 60, 61), (44, 44, 45), (19, 17, 19)]
SILVER = [(235, 225, 215), (196, 186, 180), (150, 140, 140)]
SHIRT = {"light": (245, 120, 105), "mid": (222, 66, 63), "dark": (170, 45, 43), "darker": (106, 47, 46)}
BLACK = [(90, 90, 90), (65, 65, 65), (44, 44, 45), (19, 17, 19)]

# Trainer card / front sprite (64x64): cap rows 8-16, hair 17-23 (x >= 24: not the raised arm), body below.
red = np.asarray(Image.open("/home/user/PokemonGame/assets/sprites/trainers/front/red.png").convert("RGBA"))
front = recolor_rgba(red, [
    (0, 17, 0, 64, {(255, 98, 90): CAP[0], (197, 65, 65): CAP[2], (213, 213, 222): CAP[1], (255, 255, 255): (150, 145, 150)}),
    # The cap's white brim (rows 16-17) goes black too.
    (16, 18, 24, 48, {(213, 213, 222): CAP[2], (255, 255, 255): CAP[1]}),
    # Red's hair here is navy (light blue where lit), outlined in brown.
    (17, 20, 24, 48, {(82, 139, 180): SILVER[0]}),
    (13, 26, 24, 48, {(24, 41, 82): SILVER[1]}),
    (17, 26, 24, 48, {(123, 90, 82): SILVER[2]}),
    (24, 64, 0, 64, {(197, 65, 65): SHIRT["mid"], (255, 98, 90): SHIRT["light"], (189, 156, 90): BLACK[1], (255, 197, 90): BLACK[0]}),
])
Image.fromarray(front).save("front_player_character.png")

s = Image.new("RGBA", (64 * 2 + 8, 64), (90, 90, 110, 255))
for i, im in enumerate([red, front]):
    s.alpha_composite(Image.fromarray(im), (i * 72, 0))
s.resize((s.width * 4, s.height * 4), Image.NEAREST).save("fronts_cmp.png")
