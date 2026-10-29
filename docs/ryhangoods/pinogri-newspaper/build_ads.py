from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageFilter
import fitz,io,tempfile,os
P=Path(__file__).resolve().parent;F=Path('/usr/share/fonts/opentype/urw-base35');BG='#faf7ef';INK='#25231f'
def ft(n,serif=False):return ImageFont.truetype(str(F/('NimbusRoman-Regular.otf' if serif else 'NimbusSans-Regular.otf')),n)
def tx(im,xy,s,n=65,c=INK,serif=False,anchor=None):ImageDraw.Draw(im).text(xy,s,font=ft(n,serif),fill=c,anchor=anchor,spacing=22)
def base(k,title,sub,bg=BG):
 im=Image.new('RGB',(4000,3000),bg);dr=ImageDraw.Draw(im);tx(im,(2000,140),'P I N O G R I    /    THE WEDDING EDITION',45,anchor='ma');dr.line((240,260,3760,260),fill=INK,width=3);tx(im,(2000,330),title,150,serif=True,anchor='ma');tx(im,(2000,540),sub,57,anchor='ma');dr.line((240,2780,3760,2780),fill=INK,width=3);tx(im,(250,2840),'EDITABLE A4 NEWSPAPER TEMPLATE',43);tx(im,(3750,2840),f'{k:02} / 10',43,anchor='ra');return im
D=fitz.open(P/'Buyer/Wedding_Newspaper_Sample_A4.pdf')
def pg(im,n,x,y,w,angle=0,crop=None):
 p=D[n-1];r=fitz.Rect(crop) if crop else p.rect;pix=p.get_pixmap(matrix=fitz.Matrix(w/r.width,w/r.width),clip=r);s=Image.frombytes('RGB',(pix.width,pix.height),pix.samples).convert('RGBA');ImageDraw.Draw(s).text((s.width//2,s.height//2),'Pinogri',font=ft(max(35,w//20),True),fill=(35,33,30,48),anchor='mm')
 if angle:s=s.rotate(angle,Image.Resampling.BICUBIC,expand=True)
 sh=Image.new('RGBA',(s.width+80,s.height+80));sh.paste((0,0,0,40),(30,30,s.width+30,s.height+30),s.getchannel('A'));sh=sh.filter(ImageFilter.GaussianBlur(20));im.paste(sh,(x,y),sh);im.paste(s,(x,y),s)
def save(im,n):
 b=io.BytesIO();im.convert('RGB').save(b,'JPEG',quality=95,subsampling=0,dpi=(300,300));fd,tmp=tempfile.mkstemp(suffix='.jpg');os.close(fd);Path(tmp).write_bytes(b.getvalue());os.replace(tmp,P/f'Ads/{n:02}_Wedding_Newspaper.jpg');im.resize((1440,1080),Image.Resampling.LANCZOS).convert('RGB').save(P/f'Previews/{n:02}.jpg',quality=93)
im=base(2,'Four pages for your celebration','Cover, your story, the day’s details and a little fun for your guests')
for i,t in enumerate(['THE COVER','YOUR STORY','THE BIG DAY','JUST FOR FUN']):pg(im,i+1,270+i*940,850,800);tx(im,(670+i*940,2420),t,47,anchor='ma')
tx(im,(2000,2600),'Actual supplied layouts. Replace the placeholders with your own wedding details.',49,anchor='ma');save(im,2)
im=base(3,'Your story deserves its own page','Space for the first hello, favourite memories and your photographs','#eeeae2');pg(im,2,2250,770,1270)
for y,a,b in [(950,'How it all began','Replace the example story with your own.'),(1450,'The chapters so far','Add dates and memories that matter to you.'),(1950,'Your favourite things','Personalise the song, place and Sunday prompts.')]:tx(im,(300,y),a,100,serif=True);tx(im,(300,y+160),b,53)
save(im,3)
im=base(4,'The day, at a glance','An editable schedule, wedding party and useful details in one layout');pg(im,3,320,760,1260)
tx(im,(2100,970),'Your schedule',120,serif=True);tx(im,(2100,1190),'Change every sample time and activity.',60);tx(im,(2100,1550),'Your people and places',100,serif=True);tx(im,(2100,1750),'Add names, roles, venue and contact details.',53);tx(im,(2100,2180),'A4 portrait / editable PPTX',57);save(im,4)
im=base(6,'A template you make personal','Editable text boxes and ordinary photo-placeholder shapes','#eeeae2');pg(im,1,260,850,1700,crop=(35,110,560,510))
for y,a,b in [(900,'Names, date and venue','Replace each bracketed field in the PPTX.'),(1400,'Your own photographs','Insert and crop a photo, then remove the grey shape.'),(1900,'Your words and type','Resize text boxes manually for longer wording.')]:tx(im,(2250,y),a,87,serif=True);tx(im,(2250,y+160),b,47)
tx(im,(250,2580),'Photo areas are not automatic drag-and-drop frames. Photographs are not included.',49);save(im,6)
im=base(7,'A4 pages, ready for your print setup','210 × 297 mm / four separate portrait pages');pg(im,1,430,780,1150,-2);pg(im,2,1900,850,1050,3)
tx(im,(2000,2480),'Export your personalised PPTX to PDF. Print a test at 100% / Actual Size.',55,anchor='ma');tx(im,(2000,2600),'No A3 booklet imposition, bleed or crop marks are supplied.',49,anchor='ma');save(im,7)
im=base(8,'A closer look at the guest page','Five couple-quiz questions, advice lines and photo prompts','#eeeae2');pg(im,4,400,780,1450,crop=(35,115,560,735));tx(im,(2670,1030),'Rewrite the quiz',100,serif=True);tx(im,(2670,1220),'Make the questions fit your story.',50);tx(im,(2670,1650),'Collect a wish',100,serif=True);tx(im,(2670,1840),'Leave space for a personal message.',49);save(im,8)
im=base(9,'From download to your wedding tables','Self-editing files with a guide included');pg(im,1,2650,1000,900,4)
for i,(a,b) in enumerate([('01  DOWNLOAD','Open your Etsy PDF, then its Google Drive link.'),('02  OPEN','Extract the ZIP and open the editable PPTX.'),('03  PERSONALISE','Replace sample text, times and photo placeholders.'),('04  PRINT','Export a PDF and check one A4 proof first.')]):y=820+i*420;tx(im,(300,y),a,90,serif=True);tx(im,(300,y+150),b,53)
save(im,9)
im=base(10,'Everything included, clearly explained','A digital template for one wedding or private celebration','#eeeae2');pg(im,1,2450,900,1000,-3)
for y,head,lines in [(830,'YOUR DOWNLOAD',['1 editable PPTX with four A4 pages','1 matching sample PDF with placeholders','Editing and printing guide + personal-use licence']),(1690,'BEFORE YOU BUY',['No Canva template link or photographs','No printed newspaper or styling props','Review spacing in your own editing application'])]:tx(im,(300,y),head,51);[tx(im,(300,y+160+j*145),t,60) for j,t in enumerate(lines)]
save(im,10)
print('8 exact-page newspaper ads built')
