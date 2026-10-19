# Lorelei's battle back picture, for her tag battle with you in Icefall Cave
# (FireRed has none: she never fights beside you there). May's back picture
# (assets/sprites/trainers/back/may.png, 4 frames of 64x64, 16-colour
# indexed) recoloured to Lorelei's front picture's colours: her bandana and
# brown hair long red hair, her red shirt a dark gray top, her gloves bare
# hands, her yellow trim a lilac skirt; and a fifth frame, the last repeated
# (this game's back pictures have 5: the throw ends on it).
#
#   python3 tools/build-lorelei-back.py   (needs Pillow)
#   -> assets/sprites/trainers/back/lorelei.png
from PIL import Image

SRC, OUT = "assets/sprites/trainers/back/may.png", "assets/sprites/trainers/back/lorelei.png"
HEAD_ROWS = 30   # rows below the top of her head: the bandana's slots are hair here
HAIR = {12: (230, 115, 90), 13: (180, 41, 57), 9: (230, 115, 90), 14: (238, 156, 120),
        4: (180, 41, 57), 7: (230, 115, 90), 8: (112, 24, 40), 3: (180, 41, 57)}
BODY = {12: (90, 98, 115), 13: (65, 74, 82), 9: (255, 222, 205), 14: (255, 240, 228),
        10: (205, 164, 255), 11: (156, 115, 205),
        4: (180, 41, 57), 7: (230, 115, 90), 8: (112, 24, 40)}   # (her hair, down her back)

src = Image.open(SRC)
pal = src.getpalette()
px = src.load()
w, h = src.size
out = Image.new("RGBA", (w, 64 * 5), (0, 0, 0, 0))
for f in range(5):
    fy = min(f, h // 64 - 1) * 64
    top = next((y for y in range(64) if any(px[x, fy + y] for x in range(w))), 0)
    for y in range(64):
        for x in range(w):
            i = px[x, fy + y]
            if not i:
                continue
            zone = HAIR if y - top < HEAD_ROWS else BODY
            out.putpixel((x, f * 64 + y), zone.get(i, tuple(pal[i * 3:i * 3 + 3])) + (255,))
out.save(OUT)
