"""User-approved deterministic cleanup of generated assets; originals untouched.
Requires Pillow and numpy. Produces 39 numbered sprites and three portrait frames.
"""
from pathlib import Path
from collections import deque
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'Images/elements'

def remove_background(image, black=False, frame=False):
    pixels = np.array(image.convert('RGBA'))
    rgb = pixels[:, :, :3].astype(int)
    hi, lo = rgb.max(axis=2), rgb.min(axis=2)
    candidate = hi < 45 if black else ((hi-lo < 36) & (lo > 65))
    # A writable copy is necessary: floodfill's PixelAccess does not detach
    # Pillow images backed by a read-only numpy array.
    mask = Image.fromarray((candidate * 255).astype('uint8')).copy()
    # Flood only background-connected pixels, preserving enclosed white highlights.
    w, h = image.size
    seeds = [(x, 0) for x in range(0, w, 16)] + [(x, h-1) for x in range(0, w, 16)]
    seeds += [(0, y) for y in range(0, h, 16)] + [(w-1, y) for y in range(0, h, 16)]
    if frame:
        seeds.append((w//2, h//2))
    for seed in seeds:
        if mask.getpixel(seed) == 255:
            ImageDraw.floodfill(mask, seed, 128, thresh=0)
    removed = np.array(mask) == 128
    pixels[removed, 3] = 0
    # Clear neutral fringe only immediately beside removed background.
    near = np.array(Image.fromarray((removed*255).astype('uint8')).filter(ImageFilter.MaxFilter(3))) > 0
    fringe = near & ~removed & (hi-lo < 45)
    pixels[fringe, 3] = np.minimum(pixels[fringe, 3], 100)
    return Image.fromarray(pixels)

def remove_dust(image, minimum=30):
    data = np.array(image)
    alive = data[:,:,3] > 20
    seen = np.zeros(alive.shape, dtype=bool)
    h,w = alive.shape
    for y,x in zip(*np.nonzero(alive)):
        if seen[y,x]: continue
        todo=deque([(y,x)]); seen[y,x]=True; component=[]
        while todo:
            cy,cx=todo.popleft(); component.append((cy,cx))
            for ny,nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
                if 0<=ny<h and 0<=nx<w and alive[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx]=True;todo.append((ny,nx))
        if len(component)<minimum:
            for cy,cx in component: data[cy,cx,3]=0
    return Image.fromarray(data)

def square_sprite(image):
    image=remove_dust(image)
    # Ignore near-invisible alpha specks when measuring the actual subject.
    box=image.getchannel('A').point(lambda a: 255 if a > 20 else 0).getbbox()
    assert box, 'Empty sprite'
    image=image.crop(box)
    # thumbnail() only shrinks: small atlas cells previously stayed ~250px
    # inside a 512px canvas. Resize in BOTH directions to a consistent footprint.
    scale=480/max(image.size)
    image=image.resize(tuple(max(1,round(edge*scale)) for edge in image.size), Image.Resampling.LANCZOS)
    square=Image.new('RGBA',(512,512))
    square.alpha_composite(image,((512-image.width)//2,(512-image.height)//2))
    visible=square.getchannel('A').point(lambda a: 255 if a > 20 else 0).getbbox()
    assert 474 <= max(visible[2]-visible[0],visible[3]-visible[1]) <= 482, 'Inconsistent dragon footprint'
    return square

def main():
    OUT.mkdir(exist_ok=True)
    frames=ROOT/'assets/avatar'
    paths=[]
    water_wyrmlings=Image.open(ROOT/'assets/elemental-drafts/water-wyrmling-v4-source.png').convert('RGBA')
    if water_wyrmlings.getpixel((0,0))[3] != 0:
        water_wyrmlings=remove_background(water_wyrmlings)
    fire_wyrmlings=Image.open(ROOT/'assets/elemental-drafts/fire-wyrmling-v2-source.png').convert('RGBA')
    if fire_wyrmlings.getpixel((0,0))[3] != 0:
        fire_wyrmlings=remove_background(fire_wyrmlings)
    for element, source, rows in [
        ('fire',OUT/'fire-atlas-v1.png',[0,315,615,895,1254]),
        ('water',ROOT/'assets/elemental-drafts/water-atlas-source.png',[0,315,625,915,1254]),
        ('nature',OUT/'nature-atlas-v1.png',[0,315,610,910,1254]),
    ]:
        atlas=Image.open(source).convert('RGBA')
        if element=='water': atlas=remove_background(atlas)
        for row,stage in enumerate(['wyrmling','young','hearth','elder']):
            for count in range(1,2 if stage=='elder' else 5):
                left=round((count-1)*atlas.width/4);right=round(count*atlas.width/4)
                if element=='fire' and stage=='wyrmling':
                    # Four distinct legs; split in the actual gutter to retain wings.
                    col=(count-1)%2;group_row=(count-1)//2
                    w,h=fire_wyrmlings.size
                    split=round(w*(0.479 if group_row==0 else 0.5))
                    crop=fire_wyrmlings.crop((0 if col==0 else split,round(group_row*h/2),split if col==0 else w,round((group_row+1)*h/2)))
                elif element=='water' and stage=='wyrmling':
                    # Style-matched chibi redesign with four legs and dorsal wings.
                    # The top pair extends just left of center; split in the gutter.
                    col=(count-1)%2;group_row=(count-1)//2
                    w,h=water_wyrmlings.size
                    split=round(w*(0.46 if group_row==0 else 0.5))
                    crop=water_wyrmlings.crop((0 if col==0 else split,round(group_row*h/2),split if col==0 else w,round((group_row+1)*h/2)))
                else:
                    crop=atlas.crop((left,rows[row],right,rows[row+1]))
                tile=square_sprite(crop)
                path=OUT/f'{element}-{stage}-{count}.png'
                tile.save(path,optimize=True);paths.append(path)
    for name in ['ember','tide','grove']:
        source=ROOT/f'assets/elemental-drafts/{name}-frame-source.png'
        frame=remove_background(Image.open(source),black=name=='tide',frame=True)
        frame=remove_dust(frame,50)
        frame.thumbnail((512,512),Image.Resampling.LANCZOS)
        path=frames/f'border_{name}_v1.png';frame.save(path,optimize=True);paths.append(path)
        assert frame.getpixel((256,256))[3]==0, 'Opaque portrait opening'
    for path in paths:
        im=Image.open(path)
        assert im.mode=='RGBA' and im.getpixel((0,0))[3]==0
    # QA contact sheet on the actual dark-brown game palette.
    sheet=Image.new('RGB',(720,12*185),(33,20,14));draw=ImageDraw.Draw(sheet)
    for i,path in enumerate(paths):
        tile=Image.open(path);tile.thumbnail((170,160),Image.Resampling.LANCZOS)
        x=(i%4)*180;y=(i//4)*185
        sheet.paste(tile,(x,y),tile);draw.text((x+3,y+163),path.stem,fill='white')
    sheet.crop((0,0,720,((len(paths)+3)//4)*185)).save(ROOT/'tests/elemental-contact-sheet.png')
    print(f'Prepared and alpha-checked {len(paths)} assets: 39 dragons, 3 frames.')

if __name__=='__main__': main()
