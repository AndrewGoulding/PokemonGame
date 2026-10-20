# Lorelei's battle back picture, for her tag battle with you in Icefall Cave
# (FireRed has none: she never fights beside you there). Pixelled from her
# front picture (assets/sprites/trainers/front/elite_four_lorelei.png): long
# red hair, a dark sleeveless top, a purple skirt, bare arms, glasses. Leaf's
# back picture (assets/sprites/trainers/back/leaf.png, 5 frames of 64x64, the
# ball throw) gives the pose and the animation: her hat is taken off and a
# dome of hair drawn in its place, shaded from a light at the upper right
# with a few strands; the rest is recoloured to the front picture's palette
# (hair 180,41,57 / 230,115,90 / 120,30,46; top 90,98,115 / 65,74,82; skirt
# 205,164,255 / 156,115,205; skin outlines 123,90,82); her glasses' earpiece
# crosses the cheek at eye height. Leaf's bag strap becomes part of the top.
#
#   python3 tools/build-lorelei-back.py assets/sprites/trainers/back/lorelei.png
#
# Needs Pillow. Run from the repository's root.
import math, sys
from PIL import Image
src = Image.open('assets/sprites/trainers/back/leaf.png').convert('RGBA')
W, H = 64, 64
A=(139,98,74,255); B=(0,0,0,255); C=(90,65,41,255); D=(197,197,222,255); E=(238,238,255,255)
F=(255,230,180,255); G=(222,189,156,255); Hn=(57,57,123,255); I=(180,131,65,255); J=(205,98,74,255)
K=(222,180,106,255); L=(115,164,197,255); M=(255,222,106,255); N=(255,115,90,255)
HAIR=(180,41,57,255); HAIR_D=(120,30,46,255); HAIR_L=(230,115,90,255)
SKIN_O=(123,90,82,255)
TOP=(90,98,115,255); TOP_D=(65,74,82,255)
SKIRT=(205,164,255,255); SKIRT_D=(156,115,205,255)
GLASS=(65,74,82,255)
remap = {A:HAIR, C:HAIR_D, I:HAIR_L, Hn:TOP_D, L:TOP, K:TOP_D, M:TOP, J:SKIRT_D, N:SKIRT}
HATC = {D, E}
HAIRC = (HAIR, HAIR_D, HAIR_L)
def nb(x,y,r=1):
    for dx in range(-r,r+1):
        for dy in range(-r,r+1):
            if (dx or dy) and 0<=x+dx<W and 0<=y+dy<H: yield (x+dx,y+dy)
out = Image.new('RGBA', (W, H*5), (0,0,0,0))
for f in range(5):
    fr = src.crop((0, f*64, 64, f*64+64)); px = fr.load()
    hat = {(x,y) for y in range(H) for x in range(W) if px[x,y] in HATC}
    bot = max(y for _,y in hat)
    ring = set()
    for p in hat:
        for q in nb(*p):
            if q not in hat and px[q] in (B, Hn, J, N) and q[1] <= bot+1: ring.add(q)
    for p in list(ring):
        for q in nb(*p):
            if q not in hat and q not in ring and px[q] in (J, N) and q[1] <= bot+1: ring.add(q)
    erase = hat | ring
    new = fr.copy(); npx = new.load()
    for p in erase: npx[p] = (0,0,0,0)
    # recolour; browns next to skin are skin outline, not hair
    for y in range(H):
        for x in range(W):
            c = npx[x,y]
            if c in (A, C) and any(px[q] in (F, G) for q in nb(x,y)):
                npx[x,y] = SKIN_O
            elif c in remap: npx[x,y] = remap[c]
    # hair dome: sized from the head's width just under the hat
    base = bot + 1
    row = [x for x in range(W) if npx[x, base+1][3]]
    # the head is the run that contains the face: take the rightmost long run
    runs=[]; 
    for x in row:
        if runs and x == runs[-1][1]+1: runs[-1][1] = x
        else: runs.append([x,x])
    runs = [r for r in runs if r[1]-r[0] >= 12]
    lft, rgt = runs[-1]
    rx = min((rgt-lft)/2.0 + 0.6, 13.6); cx = rgt + 0.6 - rx; ry = 13.5
    ytop = int(round(base - ry))
    lx, ly = cx+4.5, base-10.5
    filled=set()
    for y in range(ytop, base+1):
        t = (base - y)/ry
        dx = rx*math.sqrt(max(0.0, 1-t*t))
        x0, x1 = int(round(cx-dx)), int(round(cx+dx))
        for x in range(x0, x1+1):
            if not (0<=x<W and 0<=y<H): continue
            cur = npx[x,y]
            if cur[3] and cur not in HAIRC and (x,y) not in erase and y >= base-1: continue
            edge = (x==x0 or x==x1 or y==ytop)
            d = math.hypot((x-lx)/1.3, y-ly)
            col = B if edge else HAIR_L if d < 4.2 else HAIR if d < 9.5 else HAIR_D
            npx[x,y] = col; filled.add((x,y))
    for (sx, sy, ddx, n, col) in ((cx-1, ytop+1, -0.55, 9, HAIR_D), (cx+1, ytop+1, 0.35, 7, HAIR_D), (cx+3.5, ytop+3, 0.7, 5, HAIR_L)):
        for i in range(n):
            x, y = int(round(sx+ddx*i)), int(sy+i)
            if (x,y) in filled and npx[x,y] != B: npx[x,y] = col
    # fill holes the brim left in the head, rows around the base
    for y in range(base-1, base+5):
        xs = [x for x in range(int(cx-rx)-1, int(cx+rx)+3) if 0<=x<W and npx[x,y][3]]
        if not xs: continue
        for x in range(min(xs), max(xs)+1):
            if not npx[x,y][3]: npx[x,y] = HAIR_D
    # blend the seam where the dome meets the hair that was under the hat
    for y in range(base+1, base+4):
        for x in range(int(cx-rx)+2, int(cx+rx)-1):
            if 0<=x<W and npx[x,y] == HAIR_D and npx[x,base-1] in (HAIR, HAIR_L) and all(npx[q][3] for q in nb(x,y)):
                npx[x,y] = HAIR
    # glasses: the earpiece across the cheek, only within the head
    yg = base + 5
    run=[]; best=None
    for x in range(int(cx-rx), min(W, int(cx+rx)+4)):
        if npx[x,yg] in (F, G): run.append(x)
        else:
            if 3 <= len(run) <= 9: best = run
            run=[]
    if 3 <= len(run) <= 9: best = run
    if best:
        for x in best[:-1]: npx[x,yg] = GLASS
        npx[best[-2], yg+1] = GLASS
    # drop specks
    seen=set()
    for y in range(H):
        for x in range(W):
            if npx[x,y][3] and (x,y) not in seen:
                comp=[(x,y)]; seen.add((x,y)); k=0
                while k < len(comp):
                    for q in nb(*comp[k]):
                        if q not in seen and npx[q][3]: seen.add(q); comp.append(q)
                    k+=1
                if len(comp) <= 6:
                    for q in comp: npx[q]=(0,0,0,0)
    out.paste(new, (0, f*64))
out.save(sys.argv[1])
