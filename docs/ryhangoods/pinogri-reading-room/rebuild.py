from pathlib import Path
import fitz,os,json,shutil
from PIL import Image,ImageDraw,ImageFont,ImageOps
R=Path(__file__).resolve().parent; S=R.parent/'reading-room-notion'; (R/'Etsy_Ads').mkdir(exist_ok=True);(R/'Buyer_Files').mkdir(exist_ok=True);(R/'Previews').mkdir(exist_ok=True)
URL='https://chartreuse-bolt-dc6.notion.site/The-Reading-Room-406051b0d561811b9526ff93d1357ce1'
d=fitz.open(S/'Buyer_Files/RyhanGoods_Reading_Room_Access.pdf');p=d[0]
# Overlay only old brand on a copy; retain original user design and live link.
for box,text,size in [((187,240,365,287),'Pinogri',31),((268,313,475,331),'Your Pinogri digital download',8),((117,657,436,674),'Questions? Message Pinogri on Etsy.',10)]:
 p.draw_rect(fitz.Rect(box),color=None,fill=(1,.98,.95)); p.insert_font(fontname='Brand',fontfile='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');p.insert_textbox(fitz.Rect(box),text,fontname='Brand',fontsize=size,align=1,color=(.125,.24,.21))
pdf=R/'Buyer_Files/Pinogri_Reading_Room_Access_VERIFIED.pdf';d.save('/tmp/reading-verified.pdf',garbage=4,deflate=True);d.close();os.replace('/tmp/reading-verified.pdf',pdf)
d=fitz.open(pdf); assert len(d)==1 and any(x.get('uri')==URL for x in d[0].get_links());assert pdf.stat().st_size>100000;d[0].get_pixmap(matrix=fitz.Matrix(2,2)).save('/tmp/reading-delivery.png')
meta=json.loads((S/'listing.json').read_text());meta['description']=meta['description'].replace('RyhanGoods','Pinogri');(R/'listing.json').write_text(json.dumps(meta,indent=2))
fonts=Path('/usr/share/fonts/opentype/urw-base35')
def f(n,s):return ImageFont.truetype(str(fonts/(n+'.otf')),s)
G='#183e34'; W='#fffdfa'; A='#d1b080'; dark=False

def base(title,sub,num,darkmode=False):
 global im,dr,dark; dark=darkmode;im=Image.new('RGB',(4000,3000),G if dark else W);dr=ImageDraw.Draw(im)
 dr.text((180,110),'PINOGRI  /  THE READING ROOM',font=f('NimbusSans-Regular',40),fill=A if dark else G)
 size=145
 while dr.textbbox((0,0),title,font=f('P052-Roman',size))[2]>3660:size-=2
 dr.text((180,240),title,font=f('P052-Roman',size),fill=W if dark else G)
 dr.text((185,440),sub,font=f('NimbusSans-Regular',49),fill=A if dark else G)
 dr.text((180,2850),'NOTION TEMPLATE  /  INSTANT DIGITAL DOWNLOAD',font=f('NimbusSans-Regular',36),fill=A if dark else G)
 dr.text((3710,2850),f'{num:02}',font=f('NimbusSans-Regular',36),fill=A if dark else G)
def text(x,y,t,size=58,bold=False,serif=False,fill=None):
 dr.text((x,y),t,font=f('P052-Roman' if serif else 'NimbusSans-Bold' if bold else 'NimbusSans-Regular',size),fill=fill or (W if dark else G))
def shot(name,crop,box):
 src=Image.open(S/'Screenshots'/name).convert('RGB').crop(crop);scale=min((box[2]-32)/src.width,(box[3]-32)/src.height);src=src.resize((round(src.width*scale),round(src.height*scale)),Image.Resampling.LANCZOS)
 dr.rounded_rectangle((box[0],box[1],box[0]+box[2],box[1]+box[3]),radius=24,fill=W,outline=A,width=5)
 x=box[0]+(box[2]-src.width)//2;y=box[1]+(box[3]-src.height)//2;im.paste(src,(x,y))
 overlay=Image.new('RGBA',im.size);o=ImageDraw.Draw(overlay)
 for yy in range(y+200,y+src.height-20,450):o.text((x+src.width//3,yy),'Pinogri',font=f('NimbusSans-Regular',50),fill=(60,70,60,55))
 im.paste(Image.alpha_composite(im.convert('RGBA'),overlay).convert('RGB'))
def save(n):
 out=R/'Etsy_Ads'/f'{n:02}.jpg';im.save('/tmp/reading-ad.jpg',quality=95);os.replace('/tmp/reading-ad.jpg',out);im.resize((1200,900)).save(R/'Previews'/f'{n:02}.jpg',quality=92)
hero=next((R.parents[1]/'reading-hero-recovered').glob('*.png'));im=Image.open(hero).convert('RGB').resize((4000,3000),Image.Resampling.LANCZOS);save(1)
base('One room for your reading life.','Five connected databases. A calmer place to keep it all.',2,True)
for j,(h,t) in enumerate([('BOOKS','Your personal reading library'),('AUTHORS','Connect books to their writers'),('GENRES','Browse your reading interests'),('QUOTES','Keep your own saved words'),('YEAR GOALS','Choose a target at your pace')]):text(190,720+365*j,h,70,True,fill=A);text(190,820+365*j,t,48)
shot('02_Examples.jpg',(310,230,1040,905),(2050,650,1740,1960));save(2)
base('Pick up where you left off.','Enter your page numbers. See your progress at a glance.',3)
shot('03_Book.jpg',(310,120,1120,730),(180,650,2200,1870));text(2600,820,'40%',280,serif=True);text(2600,1190,'96 / 240 pages',64,True);text(2600,1530,'144',190,serif=True);text(2600,1800,'pages remaining',56,True);text(190,2670,'Fictional sample shown. Manual entry; no Kindle or Goodreads sync.',43);save(3)
base('Keep more than a rating.','Your notes and reflections belong inside each book.',4,True);shot('04_Notes.jpg',(310,165,1040,875),(180,670,2280,1960))
for j,(h,b) in enumerate([('BEFORE','Capture first impressions.'),('DURING','Save thoughts as you read.'),('AFTER','Write your own review.')]):text(2660,900+580*j,h,72,True,fill=A);text(2660,1020+580*j,b,46)
save(4)
base('Your next chapter. Your own goal.','Set your year and target. Link the books you finish.',5);shot('05_Goal_Card.jpg',(310,120,1070,760),(2000,650,1760,1950));text(190,840,'ONE YEAR.',120,serif=True);text(190,1030,'YOUR TARGET.',120,serif=True);text(190,1370,'A clear view of your reading year.',57);text(190,1470,'Completed linked books count.',57);text(190,1770,'Tutorial samples stay out of totals.',54,True);text(190,2440,'You control the pace.',90,serif=True);save(5)
base('Learn with three examples.','Explore the system before adding your own library.',6,True);shot('02_Examples.jpg',(310,230,1040,905),(200,700,2320,1840));text(2750,900,'3',280,serif=True);text(2750,1280,'FICTIONAL BOOKS',58,True,fill=A);text(2750,1660,'3',280,serif=True);text(2750,2040,'ORIGINAL QUOTES',58,True,fill=A);text(190,2660,'Personal views hide tutorial entries. No real book files are included.',43);save(6)
base('Every reading mood belongs.','Move between your library and focused reading views.',7);shot('08_Library.jpg',(90,45,1280,270),(180,720,3640,720))
for j,t in enumerate(['Library','Reading','TBR','Finished','Paused & DNF']):
 x=185+1220*(j%3);y=1770+340*(j//3);dr.rounded_rectangle((x,y,x+1100,y+220),radius=60,fill=G);text(x+60,y+65,t,67,True,fill=W)
text(190,2640,'Actual library view above; view names illustrated below.',44);save(7)
base('Start with just one book.','A simple first step, with a Start here guide inside.',8,True);shot('06_Start.jpg',(310,225,1090,785),(2050,700,1720,1800))
for j,(h,b) in enumerate([('ADD A TITLE','Create your first library entry.'),('CHOOSE A STATUS','Start with where you are today.'),('MAKE IT YOURS','Add notes, pages and a goal.')]):text(190,850+580*j,h,72,True,fill=A);text(190,970+580*j,b,48)
save(8)
base('Download. Duplicate. Make it yours.','An access PDF connects you to the complete native template.',9)
pg=Image.open('/tmp/reading-delivery.png').convert('RGB');pg.thumbnail((1400,2100));im.paste(pg,(2360,650))
for j,(h,b) in enumerate([('01  SAVE YOUR PDF','Download from your Etsy purchase.'),('02  OPEN THE TEMPLATE','Follow the button in your PDF.'),('03  DUPLICATE','Save a copy in your Notion workspace.')]):text(185,850+570*j,h,72,True);text(185,970+570*j,b,48)
text(190,2670,'Notion account required. No subscription or custom setup included.',43);save(9)
base('Know exactly what you receive.','A complete reading workspace, ready for your own entries.',10,True);shot('02_Examples.jpg',(310,500,1040,900),(2200,1100,1600,1250))
for j,(h,lines) in enumerate([('INCLUDED',['Native Notion template + access PDF.','Five databases, guide and tutorial entries.']),('PERSONAL USE',['Editable in your own private workspace.','No resale or redistribution.']),('NOT INCLUDED',['Books, ISBN lookup or reminders.','Goodreads sync or custom setup.'])]):
 text(190,750+650*j,h,70,True,fill=A)
 for k,line in enumerate(lines):text(190,870+650*j+90*k,line,45)
save(10)
print('PDF',pdf.stat().st_size,'10 ads',len(list((R/'Etsy_Ads').glob('*.jpg'))))
