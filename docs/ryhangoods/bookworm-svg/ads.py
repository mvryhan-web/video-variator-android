from PIL import Image,ImageDraw,ImageFont,ImageOps
from pathlib import Path
import json,matplotlib,os,shutil
R=Path(__file__).resolve().parent
S=3;W=H=3600
CREAM='#FAF6EB';INK='#183C38';RED='#B64A37';GOLD='#BA8135';BLUE='#294C76'
FD=Path(matplotlib.get_data_path())/'fonts/ttf'
F={'r':FD/'STIXGeneral.ttf','b':FD/'STIXGeneralBol.ttf','i':FD/'STIXGeneralItalic.ttf','s':Path('/usr/share/fonts/opentype/urw-base35/NimbusSans-Regular.otf')}
files=sorted((R/'Buyer/PNG').glob('*.png')); data=json.loads((R/'designs.json').read_text())
def font(size,f='r'):return ImageFont.truetype(str(F[f]),round(size*S))
def txt(t,x,y,size=32,c=INK,f='r',anchor=None):D.text((x*S,y*S),t,font=font(size,f),fill=c,anchor=anchor)
def rect(b,c):D.rectangle(tuple(int(v*S) for v in b),fill=c)
def rule(y,c=INK):D.line((70*S,y*S,1130*S,y*S),fill=c,width=2*S)
def art(n,b):
 a=Image.open(files[n-1]).convert('RGBA');a=a.crop(a.getbbox());a.thumbnail((int(b[2]*S),int(b[3]*S)),Image.Resampling.LANCZOS);C.paste(a,(int((b[0]+b[2]/2)*S-a.width/2),int((b[1]+b[3]/2)*S-a.height/2)),a)
def base(n,tag,bg=CREAM):
 global C,D
 C=Image.new('RGB',(W,H),bg);D=ImageDraw.Draw(C);txt('PINOGRI  /  THE READING COLLECTION',70,42,15,c=INK if bg==CREAM else CREAM,f='s');txt(f'{n:02}  /  {tag}',1130,42,15,c=INK if bg==CREAM else CREAM,f='s',anchor='ra')
def foot(n,dark=False):
 c=CREAM if dark else INK;D.line((70*S,1115*S,1130*S,1115*S),fill=c,width=S)
 txt('20 DESIGNS  ·  SVG + TRANSPARENT PNG',70,1136,16,c,'s');txt('Pinogri preview  /  Digital files only',1130,1136,16,c,'i','ra')
 p=R/'Ads'/f'{n:02}_{names[n-1]}.jpg';tmp=Path('/tmp')/p.name;C.save(tmp,quality=96,subsampling=0,dpi=(300,300));os.replace(tmp,p)
 C.resize((1000,1000),Image.Resampling.LANCZOS).save(R/'Previews'/f'Ad_{n:02}.jpg',quality=94)
names=['Book_Lover_Hero','All_20_Designs','Tote_Bag','Bookish_Apparel','Reading_Mug','Typography_Detail','Vector_Scaling','Transparent_PNG','File_Formats','License_Download']
base(1,'THE BUNDLE',INK);txt('20',62,80,265,c=CREAM,f='b');txt('BOOK LOVER',395,127,72,c=CREAM,f='b');txt('SVG DESIGNS',395,212,72,c=CREAM,f='b');txt('A well-read little collection.',400,315,32,c='#E8CF9A',f='i')
for n,b in [(1,(80,435,320,285)),(20,(440,435,320,285)),(4,(800,435,320,285)),(17,(80,770,320,285)),(8,(440,770,320,285)),(10,(800,770,320,285))]:
 x,y,w,h=b;rect((x-8,y-10,x+w+8,y+h+10),CREAM);art(n,(x+25,y+15,w-50,h-30))
foot(1,True)
base(2,'COMPLETE COLLECTION');txt('Every design. Included.',70,95,65,f='b');txt('20 different compositions — numbered to match your files',72,177,23,f='s')
for i in range(20):
 col=i%5;row=i//5;x=60+col*220;y=235+row*210
 art(i+1,(x+13,y+20,194,160));txt(f'{i+1:02}',x+15,y+181,15,f='s',c=RED)
foot(2)
# Lifestyle photos are generated examples; adjacent panels use exact delivered artwork.
photos=['exec-f8dce1c1-6c7a-4be0-9fec-cce64074fb25.png','exec-40855f15-d0ec-4948-b95d-06a40bcf674b.png','exec-bd9edabc-cffc-47c7-87fd-a30c17609d35.png']
for n,title,sub,num,ph in [(3,'Carry a good story.','Totes, book-club gifts & market days',17,photos[0]),(4,'Wear your reading mood.','Bookish apparel, made your way',20,photos[1]),(5,'A chapter. A warm cup.','A book-lover gift with personality',4,photos[2])]:
 base(n,'APPLICATION EXAMPLE');txt(title,70,105,66,f='b');txt(sub,74,190,26,f='i');rule(252)
 im=Image.open(R.parent.parent/'generated_images'/ph).convert('RGB');im.thumbnail((1980,1980),Image.Resampling.LANCZOS)
 # Keep source photo at native pixels; typography and delivered art render natively at 3600.
 px,py=70*S,315*S;C.paste(im,(px,py));D=ImageDraw.Draw(C)
 txt('DESIGN INCLUDED',770,330,19,f='s',c=RED);art(num,(765,405,355,400));txt(f'No. {num:02}',945,835,27,f='i',anchor='ma')
 txt('SVG + transparent PNG',770,900,21,f='s');txt('Use your own printer or',770,945,20,f='s');txt('production service.',770,978,20,f='s')
 txt('Illustrative mockup — physical product not included.',70,1050,21,f='i');foot(n)
base(6,'CLOSE-UP');txt('Good type. Clean paths.',70,100,72,f='b');txt('Real vector lettering — no fonts to install',73,194,26,f='s');rule(260)
art(3,(90,320,1000,500));txt('Letters are shapes.',80,895,47,f='i');txt('Scale the SVG; keep the original phrase or edit paths in a vector editor.',80,975,24,f='s');txt('These are not editable-text templates.',80,1020,24,f='s');foot(6)
base(7,'VECTOR FILES');txt('One design.',70,100,75,f='b');txt('Room to scale.',70,188,75,f='i');txt('SVG stays vector at your chosen output size.',73,295,25,f='s');rule(360)
for b in [(100,610,180,180),(370,530,270,270),(730,420,380,380)]:art(12,b)
for t,x in [('SMALL',190),('MEDIUM',505),('LARGE',920)]:txt(t,x,860,21,f='s',anchor='ma')
txt('Choose a size your printer or cutter can reproduce.',72,977,26,f='i');txt('Fine details may need simplification for small vinyl cuts.',72,1022,23,f='s');foot(7)
base(8,'TRANSPARENT FILES');txt('No white square.',70,100,76,f='b');txt('20 transparent PNGs',73,195,32,f='i');txt('4500 × 4500 pixels  /  300 DPI',73,260,24,f='s');rule(325)
for b,bg in [((90,400,480,490),'#E7D8BA'),((630,400,480,490),'#BFCFC8')]:
 x,y,w,h=b
 for yy in range(y,y+h,30):
  for xx in range(x,x+w,30):rect((xx,yy,min(xx+30,x+w),min(yy+30,y+h)),bg if ((xx-x)//30+(yy-y)//30)%2 else '#FAF7EF')
 art(9 if x<500 else 6,(x+45,y+45,w-90,h-90))
txt('Checkerboards show transparency; they are not in the files.',72,950,24,f='i');txt('Up to 15 × 15 inches at 300 pixels per inch.',72,1010,25,f='s');foot(8)
base(9,'EXACT CONTENTS',INK);txt('Your digital toolbox.',70,100,75,c=CREAM,f='b');txt('One ZIP. Everything organised.',73,199,29,c=CREAM,f='i');rect((55,290,1145,1085),CREAM)
for y,no,title,lines in [(340,'20','SVG files',['Scalable vector artwork','Type converted to paths']),(560,'20','PNG files',['4500 × 4500 px · RGBA','Transparent · 300 DPI']),(780,'+','Quick-start & license',['Numbered file names','Commercial-use terms included'])]:
 txt(no,80,y,101,f='b',c=RED);txt(title,300,y+5,46,f='b')
 for j,t in enumerate(lines):txt(t,303,y+76+j*36,24,f='s')
txt('No DXF, EPS, Canva templates or physical items.',73,1045,22,f='s');foot(9,True)
base(10,'START MAKING');txt('Open. Choose. Create.',70,100,73,f='b');txt('A small collection with plenty of possibilities.',72,195,28,f='i');rule(265)
for y,num,head,sub in [(330,'01','Download & unzip','Open your Etsy purchase on a computer.'),(485,'02','Choose SVG or PNG','SVG for vector work. PNG for print layouts.'),(640,'03','Make a personal or shop project','Up to 500 physical items per design.')]:
 txt(num,80,y,65,f='b',c=RED);txt(head,230,y+2,36,f='b');txt(sub,233,y+57,23,f='s')
rect((70,835,1130,1035),INK);txt('LICENSE IN PLAIN ENGLISH',100,861,20,CREAM,'s');txt('Physical products allowed, including your own POD shop.',100,910,24,CREAM,'r');txt('Do not resell, share or give away the digital designs.',100,957,24,CREAM,'r');foot(10)
print('10 marketing JPGs exported, 3600 x 3600; photos remain native-size within exact-art layouts')
