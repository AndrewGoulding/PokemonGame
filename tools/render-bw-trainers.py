"""Render original BW trainer archive frames; reference checkouts remain read-only."""
import sys
from pathlib import Path
from PIL import Image
bw, bw2, target = map(Path, sys.argv[1:4])
sys.path.insert(0, str(bw2))
from tools.data.narc import read_narc
from tools.data.nitro_2d import decompress, palette_colors, character_pixels
from tools.data.nitro_cells import read_nitro
archive = read_narc((bw / 'files/a/0/7/2').read_bytes())
target.mkdir(parents=True, exist_ok=True)
for index in range(len(archive)//8):
    files = archive[index*8:index*8+8]
    width, height, pixels = character_pixels(files[1], linear=True)
    palette = palette_colors(files[7])
    cells, animations, multi, motion = [read_nitro(decompress(files[i])) for i in [2,3,4,5]]
    sequence = motion['sequences'][min(1,len(motion['sequences'])-1)]
    frame = multi['multi_cells'][sequence['frames'][0]['content']['index']]
    out = Image.new('RGBA',(256,256))
    for node in reversed(frame['nodes']):
        content = animations['sequences'][node['sequence']]['frames'][0]['content']
        cell = cells['cells'][content['index']]
        for obj in reversed(cell['oams']):
            if obj.get('hidden'): continue
            w,h,char = obj['width'],obj['height'],obj['character']
            ox=128+node['x']+content.get('x',0)+obj['x']+(w//2 if obj.get('double_size') else 0)
            oy=128+node['y']+content.get('y',0)+obj['y']+(h//2 if obj.get('double_size') else 0)
            for y in range(h):
                for x in range(w):
                    sx=w-1-x if obj.get('flip_h') else x
                    sy=h-1-y if obj.get('flip_v') else y
                    tile=char+(sy//8)*(width//8)+sx//8
                    px,py=tile%(width//8)*8+sx%8,tile//(width//8)*8+sy%8
                    if not (0<=px<width and 0<=py<height):continue
                    value=pixels[py*width+px]
                    if value and 0<=ox+x<256 and 0<=oy+y<256:out.putpixel((ox+x,oy+y),tuple(palette[value][:3])+(255,))
    box=out.getbbox()
    if not box: continue
    body=out.crop(box)
    if max(body.size)>80:
        ratio=80/max(body.size);body=body.resize((round(body.width*ratio),round(body.height*ratio)),Image.Resampling.NEAREST)
    result=Image.new('RGBA',(80,80));result.alpha_composite(body,((80-body.width)//2,80-body.height));result.save(target/f'bw1_{index}.png')
print('Rendered original BW trainer sprite groups:',len(archive)//8)
