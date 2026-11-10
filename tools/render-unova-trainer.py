"""Render the first idle Nitro multi-cell frame for a trainer without single.png.
Reads the reference checkout; writes only the requested output artifact.
"""
import sys
from pathlib import Path
from PIL import Image
source, name, target = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
sys.path.insert(0, str(source))
from tools.data.nitro_cells import read_nitro
folder = source / 'res/trainers/sprites' / (sys.argv[4] if len(sys.argv) > 4 else 'front') / name
cells = read_nitro((folder / 'cells.ncer').read_bytes())
animations = read_nitro((folder / 'animations.nanr').read_bytes())
multi = read_nitro((folder / 'multi_cells.nmcr').read_bytes())
motion = read_nitro((folder / 'multi_animations.nmar').read_bytes())
seq = motion['sequences'][min(1, len(motion['sequences']) - 1)]
frame = multi['multi_cells'][seq['frames'][0]['content']['index']]
palette = [tuple(map(int, line.split())) for line in (folder / 'normal.pal').read_text().splitlines()[3:] if line.strip()]
sheet = Image.open(folder / 'sheet.png')
raw = sheet.load()
out = Image.new('RGBA', (256, 256))
# Reverse OAM order: lower OAM indices have priority in the DS's object renderer.
for node in reversed(frame['nodes']):
    content = animations['sequences'][node['sequence']]['frames'][0]['content']
    cell = cells['cells'][content['index']]
    for obj in reversed(cell['oams']):
        if obj.get('hidden'):
            continue
        w, h, char = obj['width'], obj['height'], obj['character']
        ox = 128 + node['x'] + content.get('x', 0) + obj['x'] + (w // 2 if obj.get('double_size') else 0)
        oy = 128 + node['y'] + content.get('y', 0) + obj['y'] + (h // 2 if obj.get('double_size') else 0)
        for y in range(h):
            for x in range(w):
                sx = w - 1 - x if obj.get('flip_h') else x
                sy = h - 1 - y if obj.get('flip_v') else y
                tile = char + (sy // 8) * (sheet.width // 8) + sx // 8
                px, py = tile % (sheet.width // 8) * 8 + sx % 8, tile // (sheet.width // 8) * 8 + sy % 8
                if not (0 <= px < sheet.width and 0 <= py < sheet.height):
                    continue
                value = raw[px, py]
                if value and 0 <= ox+x < 256 and 0 <= oy+y < 256:
                    out.putpixel((ox+x, oy+y), palette[value][:3] + (255,))
box = out.getbbox()
if box is None:
    raise ValueError('Empty source trainer frame: ' + name)
body = out.crop(box)
if max(body.size) > 80:
    ratio = 80 / max(body.size)
    body = body.resize((round(body.width*ratio), round(body.height*ratio)), Image.Resampling.NEAREST)
result = Image.new('RGBA', (80, 80))
result.alpha_composite(body, ((80-body.width)//2, 80-body.height))
result.save(target)
