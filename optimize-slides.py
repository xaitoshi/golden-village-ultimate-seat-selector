# Converts the PNG renders from render-slides.cjs into optimized WebP (1600w + 800w) and the OG image.
from PIL import Image
import os
SRC='/tmp/seatview-slides';OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'assets','slides')
os.makedirs(OUT,exist_ok=True)
for f in sorted(os.listdir(SRC)):
    if not f.endswith('.png'):continue
    im=Image.open(os.path.join(SRC,f)).convert('RGB');n=f[:-4]
    im.resize((1600,900),Image.LANCZOS).save(f'{OUT}/{n}.webp','WEBP',quality=78,method=6)
    im.resize((800,450),Image.LANCZOS).save(f'{OUT}/{n}-800.webp','WEBP',quality=74,method=6)
og=Image.open(f'{SRC}/sis-220.png').convert('RGB');w,h=og.size;t=int(w*630/1200);og=og.crop((0,(h-t)//2,w,(h-t)//2+t)).resize((1200,630),Image.LANCZOS)
og.save(os.path.join(os.path.dirname(OUT),'og.jpg'),'JPEG',quality=82,optimize=True,progressive=True)
