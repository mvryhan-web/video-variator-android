from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageFilter
import fitz,io,os,tempfile
P=Path(__file__).resolve().parent
W,H=4000,3000
INK='#233f37';CREAM='#f5f2e9';SAGE='#e5ebe4';GOLD='#9c7547'
F=Path('/usr/share/fonts/opentype/urw-base35')
def font(n=100,serif=False):return ImageFont.truetype(str(F/('P052-Roman.otf' if serif else 'NimbusSans-Regular.otf')),n)
def tx(im,xy,s,n=80,c=INK,serif=False,anchor=None):ImageDraw.Draw(im).text(xy,s,font=font(n,serif),fill=c,anchor=anchor,spacing=18)
def base(k,title,sub,bg=CREAM):
 im=Image.new('RGB',(W,H),bg);tx(im,(240,150),'P I N O G R I   /   EVERYDAY COLLECTION',44);tx(im,(240,290),title,160,serif=True);tx(im,(245,510),sub,61)
 ImageDraw.Draw(im).line((240,2760,3760,2760),fill='#bdc8bd',width=3);tx(im,(240,2820),'MONTHLY BUDGET PLANNER  /  DIGITAL DOWNLOAD',42);tx(im,(3760,2820),f'{k:02} / 10',42,anchor='ra');return im
DOC=fitz.open(P/'Buyer/Pinogri_Monthly_Budget_A4.pdf')
def pg(im,idx,x,y,h,angle=0,size='A4'):
 d=DOC if size=='A4' else fitz.open(P/'Buyer/Pinogri_Monthly_Budget_US_Letter.pdf')
 p=d[idx-1];pix=p.get_pixmap(matrix=fitz.Matrix(h/p.rect.height,h/p.rect.height),alpha=False);s=Image.frombytes('RGB',(pix.width,pix.height),pix.samples).convert('RGBA')
 # Watermarks are preview overlays, never in buyer files.
 dd=ImageDraw.Draw(s)
 for yy in [int(h*.35),int(h*.65)]:dd.text((s.width//2,yy),'Pinogri',font=font(max(25,int(h*.03)),True),fill=(35,63,55,48),anchor='mm')
 if angle:s=s.rotate(angle,resample=Image.Resampling.BICUBIC,expand=True,fillcolor=(0,0,0,0))
 shadow=Image.new('RGBA',(s.width+100,s.height+100));shadow.paste((20,35,26,48),(45,45,s.width+45,s.height+45),s.getchannel('A'));shadow=shadow.filter(ImageFilter.GaussianBlur(25));im.paste(shadow,(x-15,y-10),shadow);im.paste(s,(x,y),s)
def save(im,k):
 buf=io.BytesIO();im.save(buf,format='JPEG',quality=95,subsampling=0,dpi=(300,300));fd,tmp=tempfile.mkstemp(suffix='.jpg');os.close(fd);Path(tmp).write_bytes(buf.getvalue());os.replace(tmp,P/f'Ads/{k:02}_Monthly_Budget.jpg');im.resize((1440,1080),Image.Resampling.LANCZOS).save(P/f'Previews/{k:02}.jpg',quality=93)
# 01: photo background + exact vector pages, composed as a stationery cover.
im=Image.open(P/'Sources/desk.png').convert('RGB').resize((W,H),Image.Resampling.LANCZOS)
pg(im,1,2150,640,1790,5);pg(im,3,2280,640,1920,-4)
tx(im,(620,290),'P I N O G R I',58)
tx(im,(620,540),'Monthly',225,serif=True);tx(im,(620,800),'Budget',225,serif=True);tx(im,(620,1060),'Planner',225,serif=True)
tx(im,(630,1420),'Make space for a clearer month.',65)
ImageDraw.Draw(im).rounded_rectangle((620,1640,1900,1940),radius=25,fill=INK)
tx(im,(1260,1690),'12 UNDATED PAGES',74,c='white',anchor='ma');tx(im,(1260,1810),'A4 + US LETTER PDFs',54,c='white',anchor='ma')
tx(im,(630,2130),'Print. Plan. Check in.',80,serif=True);tx(im,(630,2320),'PRINT & HANDWRITE',53);tx(im,(630,2420),'Instant digital download',48)
tx(im,(630,2790),'Actual planner pages shown. Styling props not included.',42);save(im,1)
# 02 exact contents grid.
im=base(2,'Your complete monthly toolkit.','12 unique layouts, including the cover. The same pages in both paper sizes.')
names=['Cover','Intentions','Monthly Budget','Income','Bills','Expenses','Weekly Check-ins','Savings','Debt','Subscriptions','Monthly Review','Year Overview']
for i in range(12):
 x=285+(i%6)*580;y=760+(i//6)*945;pg(im,i+1,x,y,770);tx(im,(x+270,y+805),names[i],42,anchor='ma')
save(im,2)
# 03 readable actual budget hero.
im=base(3,'See the plan. Track the reality.','A clear planned-versus-actual budget, with space to make adjustments.',SAGE)
pg(im,3,2280,710,1880)
for y,num,title,body in [(880,'01','Income','Main income, other income and totals.'),(1330,'02','Outgoings','Everyday categories, debt and savings.'),(1780,'03','Monthly balance','Calculate the difference by hand.')]:
 tx(im,(280,y),num,110,c=GOLD,serif=True);tx(im,(510,y+10),title,104,serif=True);tx(im,(510,y+170),body,55)
tx(im,(285,2390),'Static PDF / no automatic calculations',53);save(im,3)
# 04 two pages.
im=base(4,'Give every transaction a home.','Record what comes in and what goes out. Keep the details in one place.')
pg(im,4,500,770,1740,-2);pg(im,6,2200,770,1740,2)
tx(im,(1130,2570),'INCOME TRACKER',48,anchor='ma');tx(im,(2800,2570),'EXPENSE LOG',48,anchor='ma');save(im,4)
# 05 billing and subscriptions.
im=base(5,'Remember the recurring costs.','Use the bill log and subscription audit to review due dates and renewals.',SAGE)
pg(im,5,430,780,1720);pg(im,10,2180,780,1720)
tx(im,(1025,2570),'BILLS + PAID DATES',48,anchor='ma');tx(im,(2785,2570),'KEEP / CHANGE / CANCEL',48,anchor='ma');save(im,5)
# 06 goals.
im=base(6,'Make room for your next step.','Separate savings and debt logs, with balances you enter yourself.')
pg(im,8,430,780,1720);pg(im,9,2180,780,1720)
tx(im,(1025,2570),'SAVINGS TRACKER',48,anchor='ma');tx(im,(2785,2570),'DEBT TRACKER',48,anchor='ma');save(im,6)
# 07 monthly rhythm actual three sheets.
im=base(7,'A rhythm you can return to.','Set an intention, check in weekly, then reflect at the end of the month.',SAGE)
for n,idx,title,x in [(1,2,'SET YOUR FOCUS',280),(2,7,'CHECK IN',1500),(3,11,'REVIEW & RESET',2720)]:
 pg(im,idx,x,880,1390);tx(im,(x+480,2370),f'0{n}  {title}',52,anchor='ma')
tx(im,(2000,2590),'Undated pages. Start whenever you need.',56,anchor='ma');save(im,7)
# 08 accurate paper sizes.
im=base(8,'Two paper sizes. One thoughtful set.','Choose the PDF that matches your printer paper. Both contain the same 12 pages.')
pg(im,1,540,790,1710);pg(im,1,2230,900,1590,size='US_Letter')
tx(im,(1150,2570),'A4  /  210 × 297 mm',55,anchor='ma');tx(im,(2830,2570),'US LETTER  /  8.5 × 11 in',55,anchor='ma');save(im,8)
# 09 guide.
im=base(9,'From download to your next month.','No personalization required. Ready to print and complete by hand.',SAGE)
steps=[('01','Download','Save the instruction PDF from Etsy.','Open its link to the Google Drive folder.'),('02','Unzip','Download and extract the ZIP archive.','Choose the A4 or US Letter planner PDF.'),('03','Print','Use matching paper at 100% / Actual Size.','Test one page before printing the full set.'),('04','Make it yours','Fill in your month, year and currency.','Print worksheets again for personal use.')]
for i,(n,title,a,b) in enumerate(steps):
 x=280+(i%2)*1850;y=850+(i//2)*850;tx(im,(x,y),n,140,c=GOLD,serif=True);tx(im,(x+230,y+20),title,110,serif=True);tx(im,(x,y+240),a,53);tx(im,(x,y+340),b,53)
tx(im,(280,2590),'A digital file only. No physical product will be shipped.',53);save(im,9)
# 10 purchase clarity.
im=base(10,'Know exactly what you receive.','A simple printable planner for personal budgeting, in English.')
pg(im,12,2380,760,1830)
lines=[('IN THE DOWNLOAD','2 planner PDFs: A4 + US Letter','12 pages each / same 12 layouts','Read-me and personal-use license'),('PLEASE NOTE','Print and handwrite your entries','Static PDF: not fillable or editable','No spreadsheet or automatic calculations')]
for j,(head,*items) in enumerate(lines):
 y=840+j*850;tx(im,(280,y),head,48,c=GOLD)
 for k,t in enumerate(items):tx(im,(280,y+140+k*145),t,65)
tx(im,(280,2550),'Personal use only / no resale or redistribution',48);save(im,10)
im=Image.open(P/'Previews/01.jpg');im.crop((180,0,1260,1080)).resize((600,600)).save(P/'Previews/cover_square.jpg')
print('10 ads built from exact PDF pages')
