from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageFilter
import fitz,io,tempfile,os
P=Path(__file__).resolve().parent;F=Path('/usr/share/fonts/opentype/urw-base35');BG='#0d2235';GOLD='#efd59c';WHITE='#f6f3e9'
def ft(n,serif=False):return ImageFont.truetype(str(F/('URWBookman-Light.otf' if serif else 'NimbusSans-Regular.otf')),n)
def tx(im,xy,s,n=65,c=WHITE,serif=False,anchor=None):ImageDraw.Draw(im).text(xy,s,font=ft(n,serif),fill=c,anchor=anchor,spacing=24)
def base(k,title,sub):
 im=Image.new('RGB',(4000,3000),BG);tx(im,(250,140),'P I N O G R I    /    THE MIDNIGHT STAR',45,c=GOLD);tx(im,(250,310),title,133,c=GOLD,serif=True);tx(im,(250,540),sub,57);tx(im,(250,2830),'PRINTABLE CHRISTMAS ESCAPE ADVENTURE',43,c=GOLD);tx(im,(3750,2830),f'{k:02} / 10',43,c=GOLD,anchor='ra');return im
def shadow(im,s,x,y):
 sh=Image.new('RGBA',(s.width+80,s.height+80));sh.paste((0,0,0,120),(30,30,s.width+30,s.height+30),s.getchannel('A'));sh=sh.filter(ImageFilter.GaussianBlur(20));im.paste(sh,(x,y),sh);im.paste(s,(x,y),s)
def pg(im,stem,n,x,y,w):
 d=fitz.open(P/f'Buyer/{stem}.pdf');p=d[n-1];pix=p.get_pixmap(matrix=fitz.Matrix(w/p.rect.width,w/p.rect.width));s=Image.frombytes('RGB',(pix.width,pix.height),pix.samples).convert('RGBA');ImageDraw.Draw(s).text((s.width//2,s.height//2),'Pinogri',font=ft(max(30,w//20),True),fill=(30,55,70,45),anchor='mm');shadow(im,s,x,y)
def art(im,n,x,y,w):
 s=Image.open(P/f'Buyer/Story_Art_JPG/{n:02}_Midnight_Star.jpg').convert('RGBA');s=s.resize((w,round(w*s.height/s.width)),Image.Resampling.LANCZOS);ImageDraw.Draw(s).text((s.width//2,s.height//2),'Pinogri',font=ft(max(30,w//15),True),fill=(255,255,255,65),anchor='mm');shadow(im,s,x,y)
def save(im,n):
 b=io.BytesIO();im.convert('RGB').save(b,'JPEG',quality=95,subsampling=0,dpi=(300,300));fd,tmp=tempfile.mkstemp(suffix='.jpg');os.close(fd);Path(tmp).write_bytes(b.getvalue());os.replace(tmp,P/f'Ads/{n:02}_Midnight_Star.jpg');im.resize((1440,1080),Image.Resampling.LANCZOS).convert('RGB').save(P/f'Previews/{n:02}.jpg',quality=93)
im=base(2,'One complete printable adventure','Player Book + separate Host Guide + bonus Story Cards and artwork')
for stem,x,t in [('Midnight_Star_Player_Book_A4',300,'11-PAGE PLAYER BOOK'),('Midnight_Star_Host_Guide_A4',1500,'4-PAGE HOST GUIDE'),('Midnight_Star_Story_Cards_A4',2700,'25-PAGE STORY CARDS')]:pg(im,stem,1,x,820,970);tx(im,(x+485,2310),t,49,c=GOLD,anchor='ma')
tx(im,(2000,2540),'All three PDFs come in A4 and US Letter. Same content in both sizes.',52,anchor='ma');save(im,2)
im=base(3,'A village waiting for its missing star','Follow the story through seven numbered puzzles, then reveal the final code')
art(im,1,300,850,1600);art(im,2,2150,850,1600)
tx(im,(400,2250),'Winter scenes from the actual story-art set',84,c=GOLD,serif=True);tx(im,(400,2440),'25 different JPG illustrations are included as a post-game bonus.',57);save(im,3)
im=base(5,'Real pages, real puzzles','A close look at two supplied player pages. Answers stay in the Host Guide.')
pg(im,'Midnight_Star_Player_Book_A4',3,430,740,1180);pg(im,'Midnight_Star_Player_Book_A4',4,2300,740,1180);save(im,5)
im=base(6,'25 story illustrations to keep','Bonus JPGs and Story Cards: share them AFTER the game to avoid clues')
for i in range(25):art(im,i+1,420+(i%5)*650,760+(i//5)*365,440)
tx(im,(2000,2650),'JPG artwork: 1448 × 1086 px. Story art prints at 4.5 × 3.375 inches.',49,anchor='ma');save(im,6)
im=base(7,'A separate guide for your adult host','Setup, staged hints and answers help you run the adventure')
pg(im,'Midnight_Star_Host_Guide_A4',1,2400,750,1210)
for y,a,b in [(900,'One page at a time','Give players the puzzles in numbered order.'),(1400,'Help when it is needed','Offer the first hint before the more revealing hint.'),(1900,'Keep the answers private','Store the Host Guide and bonus cards separately.')]:tx(im,(300,y),a,91,c=GOLD,serif=True);tx(im,(300,y+170),b,51)
tx(im,(300,2490),'No guaranteed playtime. Family-group playtesting has not been completed.',48);save(im,7)
im=base(8,'Choose your paper size','Print single-sided at 100% / Actual Size. English-language content.')
pg(im,'Midnight_Star_Player_Book_A4',1,500,780,1120);pg(im,'Midnight_Star_Player_Book_US_Letter',1,2250,880,1120)
tx(im,(1060,2490),'A4 / 210 × 297 mm',58,c=GOLD,anchor='ma');tx(im,(2810,2490),'US LETTER / 8.5 × 11 in',58,c=GOLD,anchor='ma');save(im,8)
im=base(9,'Your adventure starts with a download','Instant digital files. No personalization or seller preparation after purchase.')
art(im,8,2500,1100,1100)
for i,(a,b) in enumerate([('01  DOWNLOAD','Open the Etsy PDF and follow the Drive link.'),('02  EXTRACT','Download and unzip the complete game archive.'),('03  PRINT','Choose A4 or US Letter and print the Player Book.'),('04  HOST','Keep answers separate. Bring pencils and scrap paper.')]):y=800+i*430;tx(im,(300,y),a,83,c=GOLD,serif=True);tx(im,(300,y+150),b,51)
save(im,9)
im=base(10,'A clear plan for family game time','Designed for ages 8–12 with an adult host. Solo or a small team.')
art(im,11,2500,1100,1100)
for y,a,lines in [(810,'YOU RECEIVE',['7 puzzles in an 11-page Player Book','4-page Host Guide + 25-page Story Cards','Both paper sizes + 25 JPGs + read-me']),(1690,'PLEASE NOTE',['Personal household/private gathering use','No physical locks, props or online checker','No editable files, audio or resale licence'])]:tx(im,(300,y),a,50,c=GOLD);[tx(im,(300,y+160+j*145),t,59) for j,t in enumerate(lines)]
save(im,10)
print('8 exact-content Midnight Star ads built')
