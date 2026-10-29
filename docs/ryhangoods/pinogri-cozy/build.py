from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,fitz,os
R=Path(__file__).resolve().parent; W=R.parent.parent
M=json.loads((R.parent/'cozy-art-map.json').read_text());F=Path('/usr/share/fonts/opentype/urw-base35')
(R/'Ads').mkdir(exist_ok=True);(R/'Previews').mkdir(exist_ok=True);(R/'Delivery').mkdir(exist_ok=True)
cream='#faf3e7';green='#153f35';wine='#6d1e31';gold='#a18351'
def font(n,serif=False):return ImageFont.truetype(str(F/('P052-Roman.otf' if serif else 'NimbusSans-Regular.otf')),n)
def page(n,title,sub,dark=False):
 bg=green if dark else cream;fg=cream if dark else green
 im=Image.new('RGB',(4000,3000),bg);d=ImageDraw.Draw(im);d.text((180,110),'PINOGRI   /   COZY CHRISTMAS',font=font(39),fill=gold);d.text((180,250),title,font=font(150,True),fill=fg);d.text((185,455),sub,font=font(48),fill=fg)
 d.line((180,2800,3820,2800),fill=gold,width=3);d.text((180,2860),'30 PNG ILLUSTRATIONS   /   DIGITAL DOWNLOAD',font=font(35),fill=fg);d.text((3290,2860),f'PINOGRI / {n:02}',font=font(35),fill=fg)
 return im,d,fg
def art(im,i,box):
 a=Image.open(M[i-1]).convert('RGBA');a.thumbnail((box[2]-box[0],box[3]-box[1]),Image.Resampling.LANCZOS);im.paste(a,(int((box[0]+box[2]-a.width)/2),int((box[1]+box[3]-a.height)/2)),a)
def mark(im):
 l=Image.new('RGBA',im.size);d=ImageDraw.Draw(l)
 for y in [1050,1850,2550]:
  for x in [400,1650,2900]:d.text((x,y),'Pinogri',font=font(40,True),fill=(140,110,85,80))
 im.paste(l,(0,0),l)
def save(im,n):
 mark(im);im.save('/tmp/cozy-ad.jpg',quality=95);os.replace('/tmp/cozy-ad.jpg',R/'Ads'/f'{n:02}_Cozy_Christmas.jpg');im.resize((1400,1050)).save(R/'Previews'/f'{n:02}.jpg',quality=93)
im,d,fg=page(2,'Every illustration, at a glance','The exact 30 designs. Each is delivered as a separate transparent PNG.')
for k in range(30):
 x=180+(k%6)*610;y=650+(k//6)*420;art(im,k+1,(x,y,x+555,y+355));d.text((x+260,y+365),f'{k+1:02}',font=font(28),fill=wine)
save(im,2)
im,d,fg=page(3,'Small details. A warmer Christmas.','A closer look at the actual cottage, cocoa and knitted mitten artwork.',True)
for i,b in [(1,(180,700,1420,2500)),(5,(1450,900,2640,2500)),(7,(2720,760,3820,2500))]:art(im,i,b)
save(im,3)
im,d,fg=page(7,'Your background. Your composition.','One transparent PNG shown on three backgrounds; backgrounds are not files.')
for j,c in enumerate(['#ede6d9','#1c3c32','#ebd2c8']):
 x=180+j*1240;d.rounded_rectangle((x,700,x+1160,2470),radius=30,fill=c,outline=gold,width=3);art(im,5,(x+80,900,x+1080,2310))
d.text((180,2630),'PNG artwork imports into software that supports transparency.',font=font(48),fill=green);save(im,7)
im,d,fg=page(8,'Know the files before you buy','Clear export specifications and practical print-size guidance.',True);art(im,26,(190,900,1700,2500))
for j,(a,b) in enumerate([('30 separate PNGs','Transparent RGB artwork; not SVG or editable vectors.'),('4500 x 4500 pixels','Square canvas with 300 DPI metadata.'),('Enlarged from 1254 x 1254','Export size does not add native illustration detail.'),('Small projects first','Original detail: about 4.18 inches at 300 PPI.'),('Always test print','Check edges, colors and detail at your intended size.')]):
 y=780+j*365;d.text((1800,y),a,font=font(74,True),fill=cream);d.text((1800,y+110),b,font=font(41),fill=cream)
save(im,8)
im,d,fg=page(9,'From Etsy to your creative desk','Your Etsy PDF links to the complete collection on Google Drive.');art(im,1,(2400,1000,3800,2520))
for j,(a,b) in enumerate([('01   Download your Etsy PDF','Save the instruction sheet after payment.'),('02   Open the collection link','The button opens the correct Google Drive folder.'),('03   Save all six ZIP files','Each archive contains five PNG illustrations.'),('04   Extract and create','Unzip the files, then import PNGs into your software.')]):
 y=820+j*420;d.text((190,y),a,font=font(78,True),fill=wine);d.text((200,y+135),b,font=font(45),fill=green)
save(im,9)
im,d,fg=page(10,'A collection for your own Christmas','Please check the license and what is included.',True);art(im,3,(2550,1050,3820,2500))
for j,(a,b) in enumerate([('INCLUDED','30 transparent PNGs, six ZIP archives and download guide.'),('PERSONAL USE ONLY','Cards, scrapbook pages and your own holiday crafts.'),('NOT INCLUDED','Physical products, card templates, SVGs or fonts.'),('PLEASE DO NOT','Share, resell or redistribute the artwork files.')]):
 y=850+j*420;d.text((190,y),a,font=font(42),fill=gold);d.text((190,y+110),b,font=font(54,True),fill=cream)
save(im,10)
d=fitz.open(W/'cozy-restored/RyhanGoods_Cozy_Christmas_Download.pdf');p=d[0]
for rect,txt,size in [((375,480,735,575),'Pinogri',48),((540,630,970,665),'Your Pinogri digital download',21),((235,1305,910,1350),'Questions? Message Pinogri on Etsy.',25)]:
 p.draw_rect(fitz.Rect(rect),fill=(1,.98,.95),color=None);p.insert_textbox(fitz.Rect(rect),txt,fontname='Times-Roman',fontsize=size,align=1,color=(.08,.22,.18))
d.set_metadata({'title':'Pinogri Cozy Christmas - Download Guide','author':'Pinogri','subject':'30 PNG illustrations - six ZIP files'})
d.save('/tmp/Pinogri_Cozy_Christmas_Download.pdf',garbage=4,deflate=True);os.replace('/tmp/Pinogri_Cozy_Christmas_Download.pdf',R/'Delivery/Pinogri_Cozy_Christmas_Download.pdf');p.get_pixmap(matrix=fitz.Matrix(.8,.8)).save(R/'Delivery/preview.png')
assert p.get_links()[0]['uri']=='https://drive.google.com/drive/folders/1P3w1Lq_j6P28K_dMutxPh6qb4rrC1-1m'
m=json.loads((W/'output/cozy-recovered/RyhanGoods_Cozy_Christmas_Etsy_Draft_Pack/LISTING_EN.json').read_text());m['description']=m['description'].replace('RyhanGoods','Pinogri');m['status']='PREPUBLICATION_HOLD_SOURCE_EDGE_QA';m['qa_note']='Visible colored edge fringes on some existing buyer PNGs; do not treat as sale-ready. Source files must be repaired and verified before owner publishes.';assert len(m['tags'])==13 and max(map(len,m['tags']))<=20;(R/'listing.json').write_text(json.dumps(m,indent=2));print('6 technical panels + branded PDF prepared')
