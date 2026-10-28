from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps,ImageFilter,ImageChops
import json,math,io,os
R=Path(__file__).parent;F=Path('/usr/share/fonts/opentype/urw-base35');M=[dict(id=i,theme='Halloween',final=str(next((R.parent/'halloween-restored/Halloween').glob(f'{i:03}_*.png')))) for i in range(26,51)]
C={'Christmas':dict(bg='#123c30',ink='#f7edcf',accent='#d5ad68',light='#fffaf0',serif='P052-Roman.otf',script='Z003-MediumItalic.otf',ids=[1,3,4,14,23],line='Ornate details. Timeless Christmas charm.',card='Merry Christmas',tag='WITH LOVE'), 'Halloween':dict(bg='#26172e',ink='#ffe9c5',accent='#e7a256',light='#fff8ef',serif='URWBookman-Demi.otf',script='P052-Italic.otf',ids=[28,27,26,33,46],line='A little magic for your next creation.',card='A little magic',tag='BOO TO YOU'), 'Birthday':dict(bg='#f6d9df',ink='#80324d',accent='#078d92',light='#fffaf5',serif='URWBookman-DemiItalic.otf',script='Z003-MediumItalic.otf',ids=[51,63,52,59,73],line='Big color. Little details. Happy moments.',card='Make a wish',tag='FOR YOU'), 'Wedding':dict(bg='#e6e9df',ink='#334e43',accent='#96734e',light='#fffdf7',serif='P052-Roman.otf',script='Z003-MediumItalic.otf',ids=[76,78,80,77,99],line='Romantic florals for beautifully personal details.',card='Together forever',tag='WITH LOVE')}
photos={}
if (R/'photo_sources.json').exists():photos.update(json.load(open(R/'photo_sources.json')))
def ft(n,name='NimbusSans-Regular.otf'):return ImageFont.truetype(str(F/name),n)
def t(im,xy,s,n=60,col='#123c30',face='NimbusSans-Regular.otf',maxw=None):
 f=ft(n,face)
 if maxw:
  while f.getlength(s)>maxw:n-=1;f=ft(n,face)
 ImageDraw.Draw(im).text(xy,s,font=f,fill=col,stroke_width=0);return f.getlength(s)
def centered(im,y,s,n,col,face,maxw=3500):
 f=ft(n,face)
 while f.getlength(s)>maxw:n-=1;f=ft(n,face)
 ImageDraw.Draw(im).text(((4000-f.getlength(s))/2,y),s,font=f,fill=col)
CACHE={}
def art(im,id,box,angle=0):
 if id not in CACHE:
  a=Image.open(next(x['final'] for x in M if x['id']==id)).convert('RGBA');bb=a.getchannel('A').point(lambda v:255 if v>3 else 0).getbbox();CACHE[id]=a.crop(bb)
 a=ImageOps.contain(CACHE[id],(int(box[2]),int(box[3])),Image.Resampling.LANCZOS)
 if angle:a=a.rotate(angle,resample=Image.Resampling.BICUBIC,expand=True)
 x=int(box[0]+(box[2]-a.width)/2);y=int(box[1]+(box[3]-a.height)/2);im.paste(a,(x,y),a)
def fresh(theme,k,dark=False):
 c=C[theme];im=Image.new('RGB',(4000,3000),c['bg'] if dark else c['light']);ink=c['ink'] if dark else c['bg'] if theme not in ['Birthday','Wedding'] else c['ink'];d=ImageDraw.Draw(im)
 d.line((170,180,385,180),fill=c['accent'],width=4);t(im,(430,140),'PINOGRI',41,ink,'NimbusSans-Regular.otf');t(im,(3150,140),theme.upper()+' / '+str(k).zfill(2),36,ink,maxw=650)
 d.line((170,2795,3830,2795),fill=c['accent'],width=3);t(im,(180,2840),'25 PNG ILLUSTRATIONS  /  INSTANT DIGITAL DOWNLOAD',39,ink);t(im,(3100,2840),'NO PHYSICAL ITEM',34,ink,maxw=710);return im,ink
bounds=[]
def head(im,c,ink,h,sub):t(im,(200,290),h,166,ink,c['serif'],3600);t(im,(210,515),sub,53,ink,maxw=3550)
def save(im,theme,k):
 # Protective marks over artwork; clean buyer PNGs are never changed.
 layer=Image.new('RGBA',im.size);d=ImageDraw.Draw(layer);col=(255,255,255,45) if k in [1,3,9] and theme not in ['Birthday','Wedding'] else (60,45,45,43)
 for y in [1000,1650,2300]:
  for x in [420,1450,2550,3370]:d.text((x,y),'Pinogri',font=ft(40,'P052-Italic.otf'),fill=col)
 im=Image.alpha_composite(im.convert('RGBA'),layer).convert('RGB');out=R/theme/'Ads';out.mkdir(parents=True,exist_ok=True);b=io.BytesIO();im.save(b,format='JPEG',quality=96,subsampling=0);p=out/f'{k:02}_{theme}.jpg';tmp=p.with_suffix('.tmp');tmp.write_bytes(b.getvalue());os.replace(tmp,p);im.resize((1400,1050)).save(out/f'{k:02}_preview.jpg',quality=94)
 # Mobile square crop used for internal QA.
 if k==1:im.crop((500,0,3500,3000)).resize((600,600)).save(out/'hero_square_QA.jpg',quality=95)
def photo_canvas(theme):
 im=Image.open(photos[theme]).convert('RGB').resize((4000,3000),Image.Resampling.LANCZOS);c=C[theme];ids=c['ids'];
 # All three print surfaces are exactly front-on in the generated flat-lay backdrops.
 # Coordinates are calibrated per backdrop after visual inspection.
 maps={'Christmas':[(510,540,1380,1650),(2640,660,490,640),(2510,1770,800,720)]}
 maps.update(json.load(open(R/'photo_regions.json')) if (R/'photo_regions.json').exists() else {})
 for j,box in enumerate(maps[theme]):art(im,ids[[0,1,2][j]],box)
 return im
for theme,c in C.items():
 if theme!='Halloween':continue
 ids=c['ids'];items=[x for x in M if x['theme']==theme];ink=c['ink'];im,ink=fresh(theme,1,True);d=ImageDraw.Draw(im)
 if theme=='Birthday':
  for x,y,r in [(250,650,75),(3550,2500,100),(3500,550,55),(450,2450,65)]:d.ellipse((x-r,y-r,x+r,y+r),fill=c['accent'])
 else:
  d.rectangle((125,110,3875,2735),outline=c['accent'],width=3);d.rectangle((148,133,3852,2712),outline=c['accent'],width=1)
 t(im,(550,610),theme,270,ink,c['serif'],1600);t(im,(570,990),'Clipart',260,ink,c['script'],1500);t(im,(580,1440),'THE '+('HEIRLOOM' if theme=='Christmas' else 'ENCHANTED' if theme=='Halloween' else 'CELEBRATION' if theme=='Birthday' else 'ROMANCE')+' COLLECTION',43,ink,maxw=1500)
 t(im,(570,1690),'25',450,c['accent'],c['serif']);t(im,(1140,1815),'PNG',135,ink,'NimbusSans-Bold.otf');t(im,(590,2220),'Transparent backgrounds',66,ink);t(im,(590,2340),'For your own creative projects',57,ink,maxw=1450)
 art(im,ids[0],(2150,630,1150,1600));art(im,ids[1],(3020,1380,720,1000));art(im,ids[2],(1830,1670,760,900));save(im,theme,1)
 im,ink=fresh(theme,2);head(im,c,ink,'The complete collection','All 25 designs. Every one delivered as a separate transparent PNG.')
 for j,x in enumerate(items):
  xx=270+j%5*710;yy=730+j//5*390;art(im,int(x['id']),(xx,yy,620,330));t(im,(xx+265,yy+330),str(j+1).zfill(2),28,ink)
 save(im,theme,2)
 im,ink=fresh(theme,3,True);head(im,c,ink,'Take a closer look',c['line'])
 for j,id in enumerate(ids[:3]):art(im,id,(180+j*1250,780,1160,1700))
 centered(im,2590,'Actual collection artwork. Download files have no watermarks.',52,ink,'NimbusSans-Regular.otf');save(im,theme,3)
 if theme in photos:
  photo=photo_canvas(theme)
  for k,region,h,sub in [(4,(180,350,2140,2670),'Create a keepsake','Greeting cards with your own words.'),(5,(2250,160,3420,1510),'The finishing touch','Turn a small tag into a personal detail.'),(6,(2120,1450,3650,2900),'Give it personality','Add artwork to your own gift packaging.')]:
   im,ink=fresh(theme,k);d=ImageDraw.Draw(im);tile=ImageOps.fit(photo.crop(region),(2430,2400),Image.Resampling.LANCZOS);im.paste(tile,(1480,300));t(im,(200,600),h.split()[0],172,ink,c['serif'],1150);rest=' '.join(h.split()[1:]);t(im,(200,835),rest,142,ink,c['script'],1150)
   # Wrap short copy without shrinking it to a footnote.
   words=sub.split();lines=[];line=''
   for w in words:
    if ft(64).getlength((line+' '+w).strip())>1070:lines.append(line);line=w
    else:line=(line+' '+w).strip()
   lines.append(line)
   for j,l in enumerate(lines):t(im,(210,1200+j*100),l,64,ink)
   art(im,ids[k-4],(280,1640,880,800));ImageDraw.Draw(im).rounded_rectangle((1580,2530,3740,2670),18,fill='#18382e');t(im,(1660,2575),'EXAMPLE USE / TEMPLATE NOT INCLUDED',43,'#ffffff',maxw=2000);save(im,theme,k)
 im,ink=fresh(theme,7);head(im,c,ink,'No white box. More possibilities.','Transparent PNG artwork layers over your own backgrounds.');d=ImageDraw.Draw(im)
 for j,bg in enumerate([c['light'],c['bg'],'#dac6ae']):
  x=180+j*1260;d.rounded_rectangle((x,800,x+1120,2450),30,fill=bg,outline=c['accent'],width=3)
  if j==0:
   for yy in range(800,2450,100):
    for xx in range(x,x+1100,100):
     if (xx//100+yy//100)%2:d.rectangle((xx,yy,xx+99,min(yy+99,2449)),fill='#e4e6e1')
  art(im,ids[0],(x+80,950,960,1320))
 centered(im,2575,'Same PNG. Three backgrounds. Arrange it in your own design.',53,ink,'NimbusSans-Regular.otf');save(im,theme,7)
 im,ink=fresh(theme,8);head(im,c,ink,'Know your files','Clear specifications. No hidden extras.');art(im,ids[1],(180,800,1630,1750));d=ImageDraw.Draw(im);d.line((1870,800,1870,2500),fill=c['accent'],width=4)
 info=[('PNG + transparency','25 separate RGB artwork files'),('300 DPI metadata','Canvas dimensions vary by orientation'),('Up to 4500 px','3000 square, 3000×4500 or 4500×3000'),('Enlarged from smaller originals','Best for small-format creative projects'),('Test before large-scale printing','No SVG or editable layered files')]
 for j,(h,s) in enumerate(info):t(im,(2050,820+j*350),h,81,ink,c['serif'],1700);t(im,(2050,955+j*350),s,49,ink,maxw=1700)
 save(im,theme,8)
 im,ink=fresh(theme,9,True);head(im,c,ink,'From purchase to your next project','One PDF gives you access to your collection.');steps=[('Open your Etsy PDF','After payment, save the download PDF.'),('Follow the collection link','Open your themed Google Drive folder.'),('Download & unzip','Save the ZIP and extract your 25 PNGs.'),('Make it your own','Import artwork into your design software.')]
 for j,(h,s) in enumerate(steps):
  x=260;y=820+j*450;t(im,(x,y),str(j+1).zfill(2),175,c['accent'],c['serif']);t(im,(x+300,y+5),h,91,ink,c['serif'],1800);t(im,(x+300,y+155),s,51,ink,maxw=1800)
 art(im,ids[0],(2350,800,1450,1750))
 save(im,theme,9)
 im,ink=fresh(theme,10);head(im,c,ink,'Your artwork. Your next idea.','Everything you need to know before you create.');art(im,ids[2],(2400,750,1350,1700));lines=[('INCLUDED','25 clean PNGs + download guide + license'),('YOU MAY','Create personal projects and physical products for sale'),('NOT INCLUDED','Physical goods, SVG or editable templates'),('PLEASE DO NOT','Resell or share the original artwork files')]
 for j,(h,s) in enumerate(lines):t(im,(230,840+j*450),h,49,c['accent'],'NimbusSans-Bold.otf');t(im,(230,965+j*450),s,69,ink,c['serif'],2000)
 save(im,theme,10);print(theme,flush=True)
