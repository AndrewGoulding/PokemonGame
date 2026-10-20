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
# crosses the cheek at eye height to a lens past her profile; her wristband
# (Leaf's) is skin. Her hair is tied back in a ponytail: see PONY below. Leaf's bag strap becomes part of the top.
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
GLASS=(65,74,82,255); LENS=(197,197,222,255)
remap = {A:HAIR, C:HAIR_D, I:HAIR_L, Hn:TOP_D, L:TOP, K:TOP_D, M:TOP, J:SKIRT_D, N:SKIRT}
HATC = {D, E}
HAIRC = (HAIR, HAIR_D, HAIR_L)
def nb(x,y,r=1):
    for dx in range(-r,r+1):
        for dy in range(-r,r+1):
            if (dx or dy) and 0<=x+dx<W and 0<=y+dy<H: yield (x+dx,y+dy)

# The ponytail. Leaf's hair hangs loose over her back; Lorelei's is tied
# back. Below the dome the loose hair goes, her neck, back (her top) and the
# upper arm it hid are painted in, and a tail is drawn from a tie at the back
# of her head (in the throw, frames 3 and 4, it flies out behind her).
# Per frame: the tail's path, its width at the tie, the neck (x0, x1, y0,
# y1), the back (a polygon) and any upper arm (from, to, width).
PONY = [
    dict(tail=[(18,34),(15,41),(14,49),(15,58)], w=10, neck=(28,34,36,46), back=[(23,44),(37,44),(40,64),(20,64)], arms=[]),
    dict(tail=[(18,37),(15,44),(14,52),(15,61)], w=10, neck=(28,34,39,49), back=[(20,48),(36,48),(38,64),(18,64)], arms=[((21,50),(15,61),4.5)]),
    dict(tail=[(24,35),(21,42),(20,50),(21,59)], w=10, neck=(33,39,37,48), back=[(23,47),(38,47),(40,64),(22,64)], arms=[((17,45),(24,50),4.5)]),
    dict(tail=[(16,33),(10,36),(4,40),(0,44)], w=10, neck=(26,32,35,44), back=[(14,44),(30,42),(31,62),(12,62)], arms=[]),
    dict(tail=[(20,35),(13,39),(6,42),(1,45)], w=10, neck=(30,35,38,47), back=[(16,47),(34,46),(36,64),(14,64)], arms=[]),
]
TIE = SKIRT_D
def inside_poly(x, y, poly):
    c = False
    for i in range(len(poly)):
        (x1,y1),(x2,y2) = poly[i], poly[i-1]
        if (y1 > y) != (y2 > y) and x < (x2-x1)*(y-y1)/(y2-y1)+x1: c = not c
    return c
def seg_dist(px_, py_, a, b):
    (ax,ay),(bx,by) = a, b
    dx, dy = bx-ax, by-ay
    t = max(0.0, min(1.0, ((px_-ax)*dx+(py_-ay)*dy)/float(dx*dx+dy*dy or 1)))
    return math.hypot(px_-(ax+t*dx), py_-(ay+t*dy)), t, (dx, dy)
def ponytail(npx, f, base):
    P = PONY[f]
    hairs = (HAIR, HAIR_D, HAIR_L)
    # 1. the loose hair below the dome goes
    cut = base + 2
    curtain = {(x,y) for y in range(cut, H) for x in range(W) if npx[x,y] in hairs}
    for q in curtain: npx[q] = (0,0,0,0)
    for _ in range(2):   # (and the outline that was only round it)
        lone = [(x,y) for y in range(cut, H) for x in range(W) if npx[x,y] == B
                and not any(npx[q][3] and npx[q] != B for q in nb(x,y))]
        for q in lone: npx[q] = (0,0,0,0); curtain.add(q)
    # 2. neck, back and upper arm where the hair was (never over what's drawn)
    painted = set()
    def paint(x, y, c):
        if 0<=x<W and 0<=y<H and (not npx[x,y][3] or (x,y) in painted) and (x,y) in curtain | painted | region:
            npx[x,y] = c; painted.add((x,y))
    xs = [x for x,_ in curtain] or [0]; ys = [y for _,y in curtain] or [0]
    region = {(x,y) for x in range(max(0,min(xs)-1), min(W,max(xs)+2)) for y in range(max(0,min(ys)-1), H)}
    nx0, nx1, ny0, ny1 = P['neck']
    for y in range(ny0, ny1+1):
        for x in range(nx0, nx1+1):
            paint(x, y, G if x <= nx0+1 or y >= ny1-1 else F)
    for y in range(H):
        for x in range(W):
            if inside_poly(x+0.5, y+0.5, P['back']):
                paint(x, y, TOP_D if not inside_poly(x-1.5, y+0.5, P['back']) else TOP)
    for (a, b, w) in P['arms']:
        for y in range(H):
            for x in range(W):
                d, t, _ = seg_dist(x, y, a, b)
                if d <= w/2: paint(x, y, G if d > w/2-1.2 else F)
    # an outline round what was painted, where it meets nothing
    for (x,y) in list(painted):
        for q in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0<=q[0]<W and 0<=q[1]<H and not npx[q][3]: npx[q] = B
    # 3. the back of her head, down to the tie (no hard line where the dome ends)
    tx, ty = P['tail'][0]
    head = set()
    for y in range(H):
        for x in range(W):
            if ((x-(tx+4.5))/7.0)**2 + ((y-(ty-1.5))/5.0)**2 <= 1 and x < P['neck'][0] + 1: head.add((x,y))
    for (x,y) in head:
        if any(q not in head and not (npx[q][3] and npx[q] in hairs) for q in ((x-1,y),(x,y+1))) and npx[x,y] not in hairs:
            npx[x,y] = B
        elif npx[x,y] not in hairs or y >= base-1:
            npx[x,y] = HAIR_D if y >= ty+1 else HAIR
    for (x,y) in head:
        for q in ((x-1,y),(x,y+1),(x+1,y)):
            if 0<=q[0]<W and 0<=q[1]<H and q not in head and not npx[q][3]: npx[q] = B
    # 4. the tail, over her back
    pts = P['tail']; segs = list(zip(pts, pts[1:])); n = len(segs)
    tail = {}
    for y in range(H):
        for x in range(W):
            best = None
            for i, (a, b) in enumerate(segs):
                d, t, dv = seg_dist(x, y, a, b)
                u = (i + t) / n
                r = P['w']/2 * (0.7 + 1.98*u*(1-u)) * (1 - 0.55*u)
                if d <= r and (best is None or d - r < best[0]): best = (d - r, d, r, u, dv, (x-a[0])*dv[1]-(y-a[1])*dv[0])
            if best: tail[(x,y)] = best
    for (x,y), (_, d, r, u, dv, side) in tail.items():
        edge = any(q not in tail for q in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
        if edge: c = B
        elif u < 0.05: c = TIE
        elif abs(side) / (math.hypot(*dv) or 1) < 0.6 and 0.15 < u < 0.85 and d < r*0.3 and (x+y) % 3 == 0: c = HAIR_D
        elif side < 0 and d > r*0.35: c = HAIR_D
        elif side > 0 and d < r*0.55: c = HAIR_L
        else: c = HAIR
        npx[x,y] = c
    # the tie, round the tail where it leaves her head
    a, b = pts[0], pts[1]

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
            if not npx[x,y][3]: npx[x,y] = HAIR
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
        x1 = best[-1]
        for x in best[:-1]: npx[x,yg] = GLASS
        # the lens, past the profile: a rim round a glint (not when an arm is in front)
        lens = [(x1,yg-1),(x1+1,yg-1),(x1+2,yg-1),(x1+2,yg),(x1+2,yg+1),(x1+1,yg+1),(x1,yg+1),(x1,yg)]
        if all(x+1 < W and not npx[x+1,y][3] for (x,y) in lens if x > x1):
            for (x,y) in lens: npx[x,y] = GLASS
            npx[x1+1,yg] = LENS
    # Leaf's wristband (small patches of her top's blues on the hand) becomes skin
    comp_seen=set()
    for y in range(H):
        for x in range(W):
            if npx[x,y] in (TOP, TOP_D) and (x,y) not in comp_seen:
                comp=[(x,y)]; comp_seen.add((x,y)); k=0
                while k < len(comp):
                    for q in nb(*comp[k]):
                        if q not in comp_seen and npx[q] in (TOP, TOP_D): comp_seen.add(q); comp.append(q)
                    k+=1
                if len(comp) <= 24:
                    for q in comp: npx[q] = G
                    # outline pixels between the band and the skin go too
                    for q in comp:
                        for r in nb(*q):
                            if npx[r] == B:
                                xs = [npx[(r[0]-1,r[1])] if r[0]>0 else None, npx[(r[0]+1,r[1])] if r[0]<W-1 else None]
                                ys = [npx[(r[0],r[1]-1)] if r[1]>0 else None, npx[(r[0],r[1]+1)] if r[1]<H-1 else None]
                                skin = (F, G, SKIN_O)
                                if all(c in skin for c in xs) or all(c in skin for c in ys): npx[r] = G
    # ...and where it's drawn black: a thick black patch (not a 1-pixel
    # outline) among skin, with no hair or clothes around it, is skin too
    skin = (F, G, SKIN_O)
    for _ in range(3):
        fill = []
        for y in range(1, H-1):
            for x in range(1, W-1):
                if npx[x,y] != B: continue
                around = [npx[q] for q in nb(x,y)]
                if all(c[3] for c in around) and sum(c == B for c in around) >= 3 and any(c in skin for c in around) \
                   and all(c in skin or c == B for c in around):
                    fill.append((x,y))
        for q in fill: npx[q] = G
    ponytail(npx, f, base)
    # stray bits of Leaf's hat band above the hair: hair pixels touching no other hair
    hairs = (HAIR, HAIR_D, HAIR_L)
    for y in range(0, base):
        for x in range(W):
            if npx[x,y] in hairs and not any(npx[q] in hairs for q in nb(x,y)): npx[x,y] = (0,0,0,0)
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
