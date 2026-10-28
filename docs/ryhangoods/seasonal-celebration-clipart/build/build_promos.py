from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import json
R=Path(__file__).parent;M=json.loads((R/'checkpoint_work.json').read_text())['manifest'];fix={x['id']:x['path'] for x in json.loads((R/'recovery_map.json').read_text())};O=R/'Etsy_Promos';O.mkdir(exist_ok=True)
for a in M:
 if a['id'] in fix:a['source']=fix[a['id']]
F='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';B='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def text(im,x,y,s,n=55,b=False):ImageDraw.Draw(im).text((x,y),s,font=ImageFont.truetype(B if b else F,n),fill='#263d37')
def base(k,h,s):
 i=Image.new('RGB',(4000,3000),'#fbf6ec');d=ImageDraw.Draw(i);d.rectangle((0,0,4000,40),fill='#b86d45');text(i,170,115,'RYHANGOODS / THE CELEBRATION COLLECTION',40);text(i,170,225,h,112 if len(h)>36 else 124,True);text(i,170,425,s,49);text(i,170,2840,'100 INDIVIDUAL PNG FILES • DIGITAL DOWNLOAD • NO PHYSICAL ITEM',41);text(i,3710,2840,str(k),41);return i
def art(i,id,box):
 x,y,w,h=box;a=Image.open(M[id-1]['source']).convert('RGBA');a=a.crop(a.getchannel('A').point(lambda v:255 if v>3 else 0).getbbox());a=ImageOps.contain(a,(w,h),Image.Resampling.LANCZOS);i.paste(a,(x+(w-a.width)//2,y+(h-a.height)//2),a)
def save(i,k):
 a=Image.new('RGBA',i.size);d=ImageDraw.Draw(a)
 for y in range(650,2700,500):
  for x in range(150,3900,800):d.text((x,y),'RyhanGoods',font=ImageFont.truetype(F,38),fill=(55,55,55,65))
 i=Image.alpha_composite(i.convert('RGBA'),a).convert('RGB');i.save(O/f'{k:02}_RyhanGoods.jpg',quality=94);i.resize((1400,1050)).save(O/f'{k:02}_preview.jpg',quality=94)
i=base(1,'One bundle. Every celebration.','Christmas • Halloween • Birthday • Wedding');d=ImageDraw.Draw(i)
for j,(t,ids,c) in enumerate([('CHRISTMAS',[1,3,4],'#dce7d9'),('HALLOWEEN',[28,26,33],'#eaddeb'),('BIRTHDAY',[51,52,63],'#f5decf'),('WEDDING',[76,78,80],'#e6e6d4')]):
 x=160+j*930;d.rounded_rectangle((x,620,x+900,2400),50,fill=c);text(i,x+50,690,t,52,True);art(i,ids[0],(x+70,850,760,950));art(i,ids[1],(x+30,1750,410,530));art(i,ids[2],(x+450,1750,410,530))
text(i,180,2520,'100 PNG',160,True);text(i,1380,2580,'4 collections • 25 designs each',65);save(i,1)
for k,t in enumerate(['Christmas','Halloween','Birthday','Wedding'],2):
 i=base(k,f'25 {t} illustrations','Every design shown below is included as a separate transparent PNG.')
 for j,a in enumerate(x for x in M if x['theme']==t):
  x=200+j%5*730;y=600+j//5*430;art(i,int(a['id']),(x,y,650,360));text(i,x+260,y+365,a['id'],27)
 save(i,k)
i=base(6,'Little details. Big personality.','Painted textures, ribbon folds, botanicals and charming character illustrations.')
for j,id in enumerate([3,28,63,76]):art(i,id,(160+j*960,680,900,1800))
text(i,200,2600,'Preview images are watermarked. Your download files are clean.',57);save(i,6)
i=base(7,'Make something worth keeping.','Use the illustrations in your own cards, tags and printed craft projects.');d=ImageDraw.Draw(i)
for x,y,w,h,id,l in [(180,700,1100,1700,4,'MERRY & BRIGHT'),(1480,900,1000,1400,63,'A LITTLE PARTY'),(2680,700,1100,1700,76,'WITH LOVE')]:
 d.rectangle((x+25,y+30,x+w+25,y+h+30),fill='#dfd4c4');d.rectangle((x,y,x+w,y+h),fill='white');art(i,id,(x+80,y+100,w-160,h-500));text(i,x+100,y+h-270,l,51,True)
text(i,180,2610,'Example uses only • Card layouts and editable templates are not included.',48);save(i,7)
i=base(8,'Transparent. Ready to arrange.','Separate PNG files • RGB color • 300 DPI metadata');d=ImageDraw.Draw(i)
for y in range(700,2400,100):
 for x in range(180,1780,100):d.rectangle((x,y,x+100,y+100),fill='#dfdfdb' if (x//100+y//100)%2 else '#f6f6f3')
art(i,76,(220,730,1500,1600))
for y,t in [(800,'Up to 4500 px on the long edge'),(1040,'Canvas follows artwork orientation'),(1280,'Enlarged from smaller originals.'),(1520,'Best for small-format projects.'),(1760,'Test-print before large-scale use.'),(2100,'No SVG • No editable layered files')]:text(i,1960,y,t,53,y==800)
save(i,8)
i=base(9,'From download to your next project.','Your Etsy purchase includes a PDF with the collection download link.')
for j,(h,t) in enumerate([('DOWNLOAD PDF','Open your Etsy digital download.'),('OPEN THE LINK','Access the collection on Google Drive.'),('SAVE & UNZIP','Download the collection ZIP archives.'),('CREATE','Add PNG artwork to your own design.')]):
 x=200+j%2*1900;y=750+j//2*880;text(i,x,y,f'0{j+1}',160,True);text(i,x+260,y+20,h,65,True);text(i,x+260,y+150,t,43);art(i,[1,28,63,76][j],(x+450,y+300,750,430))
save(i,9)
i=base(10,'Know exactly what you receive.','One digital bundle. Four collections. No personalization required.')
for j,t in enumerate(['100 individual transparent PNG illustrations','25 Christmas + 25 Halloween + 25 Birthday + 25 Wedding','Organized ZIP downloads and a getting-started guide','Personal projects and finished physical products for sale','Do not resell, share or redistribute the original artwork files','No physical shipment • No SVG • No editable templates']):text(i,200,780+j*275,t,58,j==0)
save(i,10);print('10 promos created')
