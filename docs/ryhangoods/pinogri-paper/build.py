from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import fitz,os,json,zipfile,hashlib
R=Path(__file__).resolve().parent;W=R.parent.parent;F=Path('/usr/share/fonts/opentype/urw-base35');files=sorted((R/'buyer').glob('*.jpg'))
for x in ['Ads','Previews','Delivery','Sources']: (R/x).mkdir(exist_ok=True)
cream='#fff9ec';wine='#65182b';green='#103f32';gold='#c5aa72'
def font(s,serif=False):return ImageFont.truetype(str(F/('P052-Roman.otf' if serif else 'NimbusSans-Regular.otf')),s)
def txt(d,xy,t,s=48,c=cream,serif=False):d.text(xy,t,font=font(s,serif),fill=c)
def page(n,title,sub,dark=True):
 bg=green if dark else cream;fg=cream if dark else green
 im=Image.new('RGB',(4000,3000),bg);d=ImageDraw.Draw(im)
 txt(d,(170,100),'PINOGRI  /  THE CHRISTMAS PAPER ATELIER',38,gold)
 txt(d,(170,230),title,145,fg,True);txt(d,(175,440),sub,48,fg)
 d.line((175,2800,3825,2800),fill=gold,width=3);txt(d,(175,2860),'12 JPG BACKGROUNDS  /  DIGITAL DOWNLOAD',36,fg);txt(d,(3380,2860),f'PINOGRI / {n:02}',36,fg)
 return im,d,fg
def art(im,i,b,crop=False):
 a=Image.open(files[i-1]);w=b[2]-b[0];h=b[3]-b[1]
 a=ImageOps.fit(a,(w,h)) if crop else ImageOps.contain(a,(w,h));im.paste(a,(b[0],b[1]))
def save(im,n):
 l=Image.new('RGBA',im.size);d=ImageDraw.Draw(l)
 for y in [1000,1800,2500]:
  for x in [360,1640,2900]:d.text((x,y),'Pinogri',font=font(48,True),fill=(155,135,105,110))
 im.paste(l,(0,0),l);im.save('/tmp/paper-ad.jpg',quality=96);os.replace('/tmp/paper-ad.jpg',R/'Ads'/f'{n:02}_Christmas_Papers.jpg');im.resize((1400,1050)).save(R/'Previews'/f'{n:02}.jpg',quality=94)
im,d,fg=page(2,'All twelve. One festive palette.','The exact backgrounds included in your download.',False)
for j,f in enumerate(files):
 x=180+(j%4)*965;y=650+(j//4)*695;art(im,j+1,(x,y,x+600,y+600));txt(d,(x+620,y+210),f'{j+1:02}',58,wine,True)
 # Short names arranged beneath swatch
 txt(d,(x,y+610),f.stem[3:].replace('_',' '),37,green)
save(im,2)
im,d,fg=page(3,'Look closer at the collection','Actual file crops: botanical detail, painterly texture and a coordinated tartan.')
for j,i in enumerate([12,3,6]):
 x=180+j*1250;art(im,i,(x,750,x+1150,2370),True);txt(d,(x,2480),['Poinsettia botanicals','Gingerbread warmth','Evergreen tartan'][j],65,cream,True)
save(im,3)
im,d,fg=page(7,'Finished backgrounds, ready to place','JPG format. Opaque square artwork, with no transparent cutouts.',False)
art(im,1,(180,700,2080,2600));txt(d,(2330,830),'JPG / RGB',145,wine,True)
for k,t in enumerate(['12 separate square files','Import into JPG-compatible software','Use a single background or crop it','Seamless tiling is not guaranteed','Not transparent PNG or SVG']):txt(d,(2330,1170+k*240),t,52,green)
save(im,7)
im,d,fg=page(8,'The resolution, clearly explained','Know the canvas size and original detail before you print.')
art(im,10,(180,850,1680,2350))
for j,(a,b) in enumerate([('3600 x 3600 pixels','Every JPG has 300 DPI metadata.'),('Enlarged from 1254 x 1254','A larger export does not add native detail.'),('12 x 12 inch export canvas','Canvas size is not a guarantee of print sharpness.'),('Test print at your chosen size','Original detail corresponds to about 4.18 inches at 300 PPI.')]):
 y=770+j*460;txt(d,(1840,y),a,83,cream,True);txt(d,(1840,y+135),b,43,cream)
save(im,8)
im,d,fg=page(9,'Download. Unzip. Start creating.','Your Etsy PDF opens the complete collection on Google Drive.',False)
art(im,7,(2650,850,3830,2030));art(im,5,(2850,1650,3750,2550))
for j,(a,b) in enumerate([('01  Save your Etsy PDF','Available after payment confirmation.'),('02  Click the download button','Open the collection folder on Google Drive.'),('03  Download the ZIP archive','Save it to your device, then extract the files.'),('04  Choose your background','Import a JPG into your preferred design software.')]):
 y=760+j*455;txt(d,(190,y),a,85,wine,True);txt(d,(195,y+145),b,48,green)
save(im,9)
im,d,fg=page(10,'A little clarity before you create','A digital paper collection for your personal Christmas projects.')
art(im,4,(2810,860,3820,1870));art(im,2,(3010,1620,3820,2430))
for j,(a,b,c) in enumerate([('INCLUDED','12 JPG backgrounds + README/license','Download guide supplied separately through Etsy.'),('PERSONAL USE ONLY','Your own cards, albums and holiday crafts','No commercial license or resale of the files.'),('NOT INCLUDED','Physical paper, fonts or editable templates','Mockup cards and gift packaging are examples only.'),('PRINTED COLOR EFFECTS','Gold-colored details are part of the image','No metallic foil. Screen and print colors can vary.')]):
 y=730+j*490;txt(d,(190,y),a,40,gold);txt(d,(190,y+90),b,65,cream,True);txt(d,(190,y+195),c,43,cream)
save(im,10)
# Preserve original PDF as master; flatten its visible page into a separate branded copy.
source=fitz.open(W/'paper-restored/RyhanGoods_Christmas_Paper_Download.pdf');old=source[0];pdoc=fitz.open();p=pdoc.new_page(width=1103,height=1426);p.insert_image(p.rect,stream=old.get_pixmap(matrix=fitz.Matrix(1,1)).tobytes('png'))
for box,text,size in [((375,480,735,575),'Pinogri',48),((540,630,970,665),'Your Pinogri digital download',21),((235,1305,910,1350),'Questions? Message Pinogri on Etsy.',25)]:
 p.draw_rect(fitz.Rect(box),fill=(1,.98,.95),color=None);n=p.insert_textbox(fitz.Rect(box),text,fontsize=size,fontname='Times-Roman',align=1,color=(.08,.22,.18));assert n>=0,(text,n)
p.insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(190,1065,920,1150),'uri':'https://drive.google.com/drive/folders/1BWhnmL2-fLwA1_V9jvY6yafF6mCKz8Qr'})
pdoc.set_metadata({'title':'Pinogri Christmas Digital Papers - Download Guide','author':'Pinogri','subject':'12 JPG backgrounds - personal use'})
pdoc.save('/tmp/Pinogri_Christmas_Papers_Download.pdf',garbage=4,deflate=True);os.replace('/tmp/Pinogri_Christmas_Papers_Download.pdf',R/'Delivery/Pinogri_Christmas_Papers_Download.pdf');p.get_pixmap(matrix=fitz.Matrix(.8,.8)).save(R/'Delivery/preview.png')
print('Six technical images and PDF created')
