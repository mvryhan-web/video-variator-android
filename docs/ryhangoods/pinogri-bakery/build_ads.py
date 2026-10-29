from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageFilter
import io,os,tempfile
P=Path(__file__).resolve().parent;F=Path('/usr/share/fonts/opentype/urw-base35');INK='#4b3029';CREAM='#fcf5e8';SAGE='#e5ebdd';BLUSH='#f3e0d5'
def ft(n,serif=False):return ImageFont.truetype(str(F/('C059-Roman.otf' if serif else 'NimbusSans-Regular.otf')),n)
def tx(im,xy,s,n=65,c=INK,serif=False,anchor=None):ImageDraw.Draw(im).text(xy,s,font=ft(n,serif),fill=c,anchor=anchor,spacing=24)
def base(k,title,sub,bg=CREAM):
 im=Image.new('RGB',(4000,3000),bg);tx(im,(250,140),'P I N O G R I   /   THE BAKERY COLLECTION',45);tx(im,(250,310),title,145,serif=True);tx(im,(255,530),sub,60);tx(im,(250,2830),'EDITABLE PPTX TEMPLATES   /   DIGITAL DOWNLOAD',43);tx(im,(3740,2830),f'{k:02} / 10',43,anchor='ra');return im
def asset(g,n):return P/f'Buyer/PNG_Previews/{g}_{n:02}.png'
def page(im,g,n,x,y,w,angle=0):
 s=Image.open(asset(g,n)).convert('RGBA');s=s.resize((w,round(w*s.height/s.width)),Image.Resampling.LANCZOS);dd=ImageDraw.Draw(s)
 dd.text((s.width//2,s.height//2),'Pinogri',font=ft(max(30,w//20),True),fill=(75,48,41,50),anchor='mm')
 if angle:s=s.rotate(angle,Image.Resampling.BICUBIC,expand=True)
 sh=Image.new('RGBA',(s.width+80,s.height+80));sh.paste((50,30,20,45),(30,30,s.width+30,s.height+30),s.getchannel('A'));sh=sh.filter(ImageFilter.GaussianBlur(20));im.paste(sh,(x,y),sh);im.paste(s,(x,y),s)
def save(im,k):
 b=io.BytesIO();im.convert('RGB').save(b,'JPEG',quality=95,subsampling=0,dpi=(300,300));fd,tmp=tempfile.mkstemp(suffix='.jpg');os.close(fd);Path(tmp).write_bytes(b.getvalue());os.replace(tmp,P/f'Ads/{k:02}_Bakery_Kit.jpg');im.resize((1440,1080),Image.Resampling.LANCZOS).convert('RGB').save(P/f'Previews/{k:02}.jpg',quality=93)
# 02 grouped contents: 25 actual layouts.
im=base(2,'25 layouts, thoughtfully coordinated','8 A4 documents + 6 customer cards + 11 square social posts')
for i in range(8):page(im,'Business_Documents_A4',i+1,240+i*442,780,385)
for i in range(6):page(im,'Customer_Cards',i+1,260+i*590,1530,520)
for i in range(11):page(im,'Social_Posts',i+1,250+i*323,2090,285)
tx(im,(250,2620),'ACTUAL FILE PREVIEWS / Five bakery illustrations are reused across the layouts.',45);save(im,2)
# 03 the two everyday selling documents.
im=base(3,'Your menu and cake price guide','Replace the placeholders with your own products, prices and ordering details.',BLUSH)
page(im,'Business_Documents_A4',1,540,760,1200,-2);page(im,'Business_Documents_A4',2,2220,760,1200,2);save(im,3)
# 06 order paperwork and weekly organization.
im=base(6,'Keep your bakery details together','Order request, confirmation, weekly planner and custom cake brief',SAGE)
for j,n in enumerate([3,4,5,6]):page(im,'Business_Documents_A4',n,270+j*930,900,790)
tx(im,(2000,2350),'Manual entries. No automatic calculations or order-management software.',55,anchor='ma');save(im,6)
# 07 accurate enlarged samples and edit explanation.
im=base(7,'Make the templates your own','Editable text, rules, shapes and embedded illustrations in three PPTX files')
page(im,'Customer_Cards',1,220,900,1850)
for y,a,b in [(900,'Your business name','Replace YOUR BAKERY on each layout.'),(1400,'Your wording and colours','Edit text boxes and shape fills in your editor.'),(1900,'Your photographs','Insert and crop your own photo over the placeholder.')]:
 tx(im,(2350,y),a,88,serif=True);tx(im,(2350,y+160),b,49)
tx(im,(250,2570),'Compatible presentation editor required. Application and font differences may affect spacing.',46);save(im,7)
# 08 formats with actual pages, no invented interfaces.
im=base(8,'The right format for each job','Editable PPTX masters, sample PDFs and 25 unwatermarked PNG previews',BLUSH)
page(im,'Business_Documents_A4',8,300,830,900);page(im,'Customer_Cards',3,1500,1170,1000);page(im,'Social_Posts',10,2800,1000,920)
for x,a,b in [(750,'A4 DOCUMENTS','210 × 297 mm'),(2000,'CUSTOMER CARDS','5 × 3.5 inches'),(3260,'SOCIAL POSTS','1080 × 1080 px export')]:tx(im,(x,2350),a,54,anchor='ma');tx(im,(x,2470),b,50,anchor='ma')
tx(im,(250,2650),'PDF/PNG samples contain placeholders. Edit the PPTX before printing or posting.',46);save(im,8)
# 09 actual layout accompanies concise download instructions.
im=base(9,'Download, personalize, then share','A self-editing kit. No customization service is required.',SAGE)
page(im,'Social_Posts',2,2500,1050,1100,3)
for j,(a,b) in enumerate([('01  DOWNLOAD','Open the Etsy PDF and its Google Drive link.'),('02  EXTRACT','Download the ZIP and unzip the files.'),('03  PERSONALIZE','Open your PPTX and replace every placeholder.'),('04  EXPORT','Save a finished PDF or PNG and check a proof.')]):
 y=800+j*430;tx(im,(280,y),a,82,serif=True);tx(im,(280,y+150),b,54)
save(im,9)
# 10 included / limitations, with an example card.
im=base(10,'A clear purchase, from the start','One-business use: personalize, print and post your finished designs.')
page(im,'Customer_Cards',6,2300,1080,1350,-3)
for y,head,lines in [(820,'INCLUDED',['3 editable PPTX files / 25 layouts','2 sample PDFs + 25 PNG previews','Editing guide and one-business licence']),(1690,'PLEASE NOTE',['No Canva template link or photographs','No physical products or food included','No resale or sharing of the templates'])]:
 tx(im,(280,y),head,50,c='#ad7155')
 for j,line in enumerate(lines):tx(im,(280,y+160+j*150),line,65)
tx(im,(250,2630),'Check spacing in your own editor. Native PowerPoint rendering has not been verified.',45);save(im,10)
print('7 exact-content bakery ads ready; 01,04,05 await generated mockups')
