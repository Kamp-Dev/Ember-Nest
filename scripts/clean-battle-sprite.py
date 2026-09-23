"""User-approved local cleanup of generated Water Elder checkerboard.

Conservative flood fill: only neutral background pixels connected to the edge
are removed. Colored outlines and enclosed pale belly scales stay intact.
Original input is never overwritten. Preview composites are QA artifacts.
"""
from collections import deque
from pathlib import Path
import argparse
from PIL import Image, ImageFilter
import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument('source')
parser.add_argument('output')
args = parser.parse_args()
source, output = Path(args.source), Path(args.output)
if source.resolve() == output.resolve():
    raise SystemExit('Refusing to overwrite source artwork')
im = Image.open(source).convert('RGBA')
a = np.array(im)
rgb = a[:, :, :3].astype(np.int16)
neutral = ((rgb.max(2)-rgb.min(2)) < 25) & (rgb.min(2) > 85)
h, w = neutral.shape
outside = np.zeros((h, w), dtype=bool)
queue = deque()
for x in range(w):
    for y in (0, h-1):
        if neutral[y, x]: outside[y, x] = True; queue.append((y, x))
for y in range(h):
    for x in (0, w-1):
        if neutral[y, x] and not outside[y, x]: outside[y, x] = True; queue.append((y, x))
# Inspected enclosed background gaps: near wing, tail loop, far wing and neck.
for fx, fy in ((.38,.49),(.25,.66),(.52,.35),(.57,.416),(.624,.50)):
    y, x = round(fy*h), round(fx*w)
    if neutral[y,x] and not outside[y,x]: outside[y,x] = True; queue.append((y,x))
while queue:
    y, x = queue.popleft()
    for ny, nx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
        if 0 <= ny < h and 0 <= nx < w and neutral[ny,nx] and not outside[ny,nx]:
            outside[ny,nx] = True
            queue.append((ny,nx))
a[outside, 3] = 0
# Preserve edge color; soften alpha over less than one pixel, not a blurry halo.
alpha = Image.fromarray(a[:,:,3]).filter(ImageFilter.GaussianBlur(.35))
result = Image.fromarray(a)
result.putalpha(alpha)
result.save(output)
thumb = result.copy()
thumb.thumbnail((500, 500))
preview = Image.new('RGB', (1000, 520), '#f7f0df')
preview.paste(Image.new('RGB', (500,520), '#162b36'), (500,0))
preview.paste(thumb, (0,10), thumb)
preview.paste(thumb, (500,10), thumb)
preview.save(output.with_name(output.stem+'-qa.jpg'))
print(f'{output}: removed {outside.sum()} exterior pixels; alpha range {np.asarray(alpha).min()}..{np.asarray(alpha).max()}')
