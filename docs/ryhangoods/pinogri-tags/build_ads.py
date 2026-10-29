from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import json,os,fitz
R=Path(__file__).resolve().parent;M=sorted((R/'buyer/Individual_JPG').glob('*.jpg'));F=Path('/usr/share/fonts/opentype/urw-base35')
cream='#fffaf0';green='#163c32';wine='#662637';gold='#b59a6c'
def ft(s,serif=False):return ImageFont.truetype(str(F/('P052-Roman.otf' if serif else 'NimbusSans-Regular.otf')),s)
def text(d,xy,t,s,c,serif=False):d.text(xy,t,font=ft(s,serif),fill=c)
def page(n,title,sub,dark=False):
 bg=wine if dark else cream;fg=cream if dark else green
 im=Image.new('RGB',(4000,3000),bg);d=ImageDraw.Draw(im);text(d,(170,100),'PINOGRI / CHRISTMAS GIFT TAGS',40,gold);text(d,(170,230),title,145,fg,True);text(d,(175,440),sub,47,fg)
 d.line((175,2800,3825,2800),fill=gold,width=3);text(d,(175,2860),'24 DESIGNS  /  PDF + JPG  /  PERSONAL USE',35,fg);text(d,(3370,2860),f'PINOGRI / {n:02}',35,fg)
 return im,d,fg
def tag(im,i,b):
 a=Image.open(M[i-1]);a=ImageOps.contain(a,(b[2]-b[0],b[3]-b[1]));im.paste(a,(int((b[0]+b[2]-a.width)/2),int((b[1]+b[3]-a.height)/2)))
def save(im,n):
 l=Image.new('RGBA',im.size);d=ImageDraw.Draw(l)
 for y in [1200,2000,2600]:
  for x in [380,1640,2900]:text(d,(x,y),'Pinogri',45,(150,125,95,100),True)
 im.paste(l,(0,0),l);im.save('/tmp/tags-ad.jpg',quality=96);os.replace('/tmp/tags-ad.jpg',R/'Ads'/f'{n:02}_Christmas_Tags.jpg');im.resize((1400,1050)).save(R/'Previews'/f'{n:02}.jpg',quality=94)
im,d,fg=page(2,'Meet all twenty-four designs','The exact finished tags included. Each design is supplied as an individual JPG.')
for j in range(24):
 x=170+(j%8)*460;y=650+(j//8)*700;tag(im,j+1,(x,y,x+380,y+570));text(d,(x+160,y+595),f'{j+1:02}',42,wine,True)
save(im,2)
im,d,fg=page(3,'Room for a name. Detail to enjoy.','Actual tag files shown large. Write the recipient and sender by hand.',True)
for j,i in enumerate([6,10,23]):
 x=210+j*1250;tag(im,i,(x,760,x+1070,2410))
for j,t in enumerate(['Winter robin','Woodland deer','Festive wreath']):text(d,(300+j*1250,2510),t,66,cream,True)
save(im,3)
im,d,fg=page(7,'A simple 2 x 3 inch finish','Rectangular tags with blank To / From lines. Finished artwork, not editable.')
tag(im,7,(270,700,1390,2380));d.line((270,2500,1390,2500),fill=wine,width=5);d.line((270,2470,270,2530),fill=wine,width=5);d.line((1390,2470,1390,2530),fill=wine,width=5);text(d,(630,2550),'2 inches',65,wine,True)
for j,(a,b) in enumerate([('2 x 3 inches','Approximately 5.08 x 7.62 cm when printed at Actual Size.'),('600 x 900 pixel JPGs','RGB, opaque white background, 300 DPI metadata.'),('Names are handwritten','No editable text, fonts, SVG or cutting-machine files.'),('Clean buyer files','Display watermarks are not printed in your downloads.')]):
 y=830+j*435;text(d,(1760,y),a,85,green,True);text(d,(1760,y+140),b,43,green)
save(im,7)
im,d,fg=page(8,'Choose your paper. Print at 100%.','Two PDF versions. The same 24 designs in each, across three pages.',True)
for j,(label,name) in enumerate([('A4','Christmas_Gift_Tags_A4.pdf'),('US Letter','Christmas_Gift_Tags_US_Letter.pdf')]):
 p=fitz.open(R/'buyer'/name)[0];pix=p.get_pixmap(matrix=fitz.Matrix(2,2));a=Image.frombytes('RGB',(pix.width,pix.height),pix.samples);a=ImageOps.contain(a,(1250,1810));im.paste(a,(180+j*1450,730));text(d,(180+j*1450,2600),label+' / Page 1 of 3',55,cream,True)
for j,t in enumerate(['Pages 1 + 2: 9 tags each','Page 3: 6 tags','Actual tag size: 2 x 3 in','Choose Actual Size / 100%','Do not select Fit to Page','Cut along the crop marks']):text(d,(3090,820+j*280),t,38,cream)
save(im,8)
im,d,fg=page(9,'From download to the finishing touch','Your Etsy PDF opens the complete ZIP archive on Google Drive.')
tag(im,2,(2700,900,3780,2520))
for j,(a,b) in enumerate([('01  Download the Etsy PDF','Save the instruction sheet after payment confirmation.'),('02  Open its download button','Download the ZIP from the linked Google Drive folder.'),('03  Extract and choose your size','Open the A4 or US Letter PDF. Print at Actual Size.'),('04  Cut, write and attach','Add names by hand. Tape on, or punch your own hole.')]):
 y=770+j*455;text(d,(190,y),a,80,wine,True);text(d,(195,y+140),b,45,green)
save(im,9)
im,d,fg=page(10,'Everything you receive, clearly','Digital files for your own personal Christmas gift wrapping.',True)
tag(im,12,(2800,920,3820,2450))
for j,(a,b,c) in enumerate([('INCLUDED','24 individual JPG tags + two PDF print layouts','A4 and US Letter, three pages each, plus README/license.'),('PERSONAL USE ONLY','Print for your own gifts and celebrations','No commercial license, resale or sharing of the digital files.'),('YOU WILL NEED','Printer-compatible cardstock and cutting tools','Ribbon, hole punch and gifts are not included.'),('PLEASE NOTE','Finished, non-editable, single-sided designs','No bleed, metallic foil, physical tags or cutting-machine files.')]):
 y=750+j*475;text(d,(190,y),a,40,gold);text(d,(190,y+95),b,65,cream,True);text(d,(190,y+205),c,41,cream)
save(im,10)
print('6 technical campaign panels created')
