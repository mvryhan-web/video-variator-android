from pathlib import Path
import json, textwrap, hashlib, zipfile
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, letter
from reportlab.pdfbase.pdfmetrics import stringWidth
import fitz
ROOT=Path(__file__).resolve().parent
for d in ['Buyer','Previews','Ads','Sources']:(ROOT/d).mkdir(exist_ok=True)
GROUPS=[
 {'points':1,'label':'EVERYDAY ESSENTIALS','items':['A selfie from this month','A photo of a pet','A weather app','An alarm set for tomorrow','A shopping list saved in Notes','A photo of coffee or tea','A contact saved with an emoji','A screenshot of a recipe','A reminder due this week','A music playlist you created']},
 {'points':5,'label':'LITTLE SURPRISES','items':['Battery at 20% or below','10 or more open browser tabs','A screenshot of a delivery update','A photo of matching outfits','A saved place you have not visited','A voice memo under 10 seconds','A calendar event for a wedding','A downloaded podcast episode','A photo of a handmade gift','A screenshot of an abandoned cart']},
 {'points':10,'label':'PLOT TWISTS','items':['A photo of yourself in costume',"An alarm with 'coffee' in its name",'A note titled only in CAPITALS','A panorama you photographed','A photo taken before 2020','A screenshot showing 11:11','A playlist over 24 hours long','A photo of heart-shaped food','An offline map of another country','A screenshot of a spelling mistake']}
]
PALETTES=[('Cherry','#AD2847','#FBE8EB'),('Sage','#315D4C','#E9F0E9'),('Cobalt','#263E94','#E9EDFA'),('Ink_Saver','#202020','#FFFFFF')]
class Page:
 def __init__(self,c,w,h,accent='#AD2847',tint='#FBE8EB'):
  self.c=c;self.w=w;self.h=h;self.a=accent;self.tint=tint
 def text(self,t,x,y,size=11,font='Helvetica',color='#2B2929',align='left'):
  self.c.setFillColor(HexColor(color));self.c.setFont(font,size)
  if align=='center':self.c.drawCentredString(x,self.h-y-size*.8,t)
  else:self.c.drawString(x,self.h-y-size*.8,t)
 def line(self,x,y,x2,y2,color='#BEB9B5',width=.6):
  self.c.setStrokeColor(HexColor(color));self.c.setLineWidth(width);self.c.line(x,self.h-y,x2,self.h-y2)
 def rect(self,x,y,w,h,color,stroke=False):
  self.c.setFillColor(HexColor(color));self.c.setStrokeColor(HexColor(self.a));self.c.setLineWidth(.6);self.c.rect(x,self.h-y-h,w,h,fill=not stroke,stroke=stroke)
 def para(self,t,x,y,width,size=11,font='Helvetica',color='#2B2929',leading=None):
  leading=leading or size*1.4;words=t.split();line='';lines=[]
  for word in words:
   cand=(line+' '+word).strip()
   if stringWidth(cand,font,size)>width and line:lines.append(line);line=word
   else:line=cand
  if line:lines.append(line)
  for i,line in enumerate(lines):self.text(line,x,y+i*leading,size,font,color)
  return y+len(lines)*leading
 def masthead(self,label):
  self.text(label,42,35,8.5,'Helvetica-Bold',self.a);self.line(42,54,self.w-42,54,self.a,1)
 def foot(self):self.text('ONE PHONE. A FEW SURPRISES. A VERY GOOD STORY.',self.w/2,self.h-30,7,'Helvetica',self.a,'center')

def game(p,palette):
 p.masthead('THE GIRLS\' NIGHT EDIT  /  PRINT & PLAY')
 p.text("What's on",42,74,43,'Times-BoldItalic',p.a);p.text('your phone?',42,123,46,'Times-Italic',p.a)
 art=ROOT/'Sources/bow.png'
 if palette!='Ink_Saver' and art.exists():p.c.drawImage(str(art),p.w-143,p.h-174,90,90,mask='auto')
 p.text('30 finds. Three point levels. One winner.',44,185,11)
 p.text('NAME',43,221,8,'Helvetica-Bold',p.a);p.line(79,232,p.w-43,232)
 p.text('Check what was on your phone BEFORE the host said GO.',43,247,9.5)
 p.text('Self-report is enough. Keep private things private; passing is always fine.',43,263,8.7)
 usable=p.w-84;gap=15;cw=(usable-gap*2)/3
 for col,g in enumerate(GROUPS):
  x=42+col*(cw+gap)
  p.rect(x,290,cw,42,p.tint,stroke=palette=='Ink_Saver')
  p.text(str(g['points']),x+10,297,22,'Times-Bold',p.a)
  p.text('POINT'+('' if g['points']==1 else 'S')+' EACH',x+46,299,8,'Helvetica-Bold',p.a)
  p.text(g['label'],x+46,314,6.5,'Helvetica',p.a)
  step=(p.h-460)/10
  for i,item in enumerate(g['items']):
   y=348+i*step;p.rect(x+1,y,8,8,'#FFFFFF',True)
   end=p.para(item,x+16,y-1,cw-18,10.1,leading=11.6)
   assert end<=y+step-3,(palette,item,end,y+step)
  y=p.h-116;p.line(x,y-6,x+cw,y-6,p.a)
  p.text('CHECKED: ____ / 10',x+2,y+5,8.5,'Helvetica-Bold',p.a)
  p.text('POINTS: ____ x '+str(g['points'])+' = ____',x+2,y+24,8.2)
 p.text('TOTAL',43,p.h-65,9,'Helvetica-Bold',p.a);p.line(88,p.h-52,177,p.h-52,p.a);p.text('/ 160',186,p.h-65,16,'Times-Italic',p.a)
 p.text('Use a different photo, file or entry for each checked item.',280,p.h-63,7.5)
 p.foot()

def rules(p):
 p.masthead('THE HOST\'S CHEAT SHEET')
 p.text('Little prep.',42,80,39,'Times-BoldItalic',p.a);p.text('Lovely company.',42,126,39,'Times-Italic',p.a)
 blocks=[('01 / SET THE TABLE','Print one game sheet per guest in any of the four print styles. Add a pen for each guest. Guests use their own phone; no app, login or purchase is required.'),('02 / TAKE A SNAPSHOT IN TIME','Before saying GO, ask everyone to note their battery level and number of open browser tabs. Count only items that already existed before GO. Do not create new photos, lists, downloads or reminders for points.'),('03 / FIND & CHECK','Read each item and mark the box when it applies. One photo, file or entry may count for only one box: choose one if it fits several. Each box earns its stated value once. There is no penalty for passing.'),('04 / KEEP IT COMFORTABLE','Use the honor system. No one needs to hand over their phone, open private messages, play voice recordings, reveal an address or show a screen. No drinks, dares or posting to social media are required.'),('05 / ADD IT UP','Count the checks in each column, then multiply by 1, 5 or 10. Add the three subtotals. Highest score wins. For a tie, share the win. Choose your own stop time and give the same time to everyone.')]
 y=196
 for title,body in blocks:
  p.text(title,43,y,10,'Helvetica-Bold',p.a);y=p.para(body,43,y+21,p.w-86,10.7,leading=14.5)+19
 y=max(y,p.h-166)
 p.rect(42,y,p.w-84,74,p.tint)
 p.text('A LITTLE SCORE CHECK',56,y+12,8.5,'Helvetica-Bold',p.a)
 p.text('7 x 1  +  4 x 5  +  3 x 10  =  57 points',56,y+32,14,'Times-Italic')
 p.text('Maximum: 10 + 50 + 100 = 160. The color versions are the same game.',56,y+55,8.5)
 assert y+74<p.h-38
 p.foot()

def scoreboard(p):
 p.masthead('THE FINAL REVEAL')
 p.text('Who won',42,80,42,'Times-BoldItalic',p.a);p.text('the phone hunt?',42,129,42,'Times-Italic',p.a)
 p.text('Write each guest\'s points, not their number of checked boxes.',43,190,10)
 xs=[43,74,p.w-245,p.w-190,p.w-131,p.w-76]
 p.rect(42,222,p.w-84,31,p.tint)
 for text,x in zip(['NO.','GUEST','1 PT','5 PT','10 PT','TOTAL'],xs):p.text(text,x+4,233,8,'Helvetica-Bold',p.a)
 step=(p.h-375)/12
 for i in range(12):
  y=254+i*step
  p.text(f'{i+1:02}',xs[0]+5,y+13,10,'Times-Italic',p.a)
  p.line(43,y+step,p.w-43,y+step)
  for x in xs[2:]:p.line(x-5,y,x-5,y+step,'#D6CECC',.4)
 p.text('THE WINNER(S)',43,p.h-78,9,'Helvetica-Bold',p.a);p.line(149,p.h-64,p.w-43,p.h-64,p.a)
 p.text('More than 12 guests? Print another scoreboard. Ties share the win.',43,p.h-50,8.5)

manifest=[]
for name,size in [('A4',A4),('US_Letter',letter)]:
 w,h=size;tmp=Path('/tmp')/f'Pinogri_Phone_Party_{name}.pdf';c=canvas.Canvas(str(tmp),pagesize=size);c.setAuthor('Pinogri');c.setCreator('Pinogri');c.setTitle("What's on Your Phone? - Girls Night Game")
 for palette,a,tint in PALETTES:game(Page(c,w,h,a,tint),palette);c.showPage()
 rules(Page(c,w,h));c.showPage();scoreboard(Page(c,w,h));c.showPage();c.save();out=ROOT/'Buyer'/tmp.name;tmp.replace(out)
 doc=fitz.open(out)
 for i,p in enumerate(doc):
  dest=ROOT/'Previews'/f'{name}_{i+1:02}.png';temp=Path('/tmp')/dest.name;p.get_pixmap(matrix=fitz.Matrix(1.4,1.4),alpha=False).save(temp);temp.replace(dest)
 manifest.append({'file':out.name,'pages':len(doc),'size_points':[w,h],'page_order':['Cherry','Sage','Cobalt','Ink Saver','Host Rules','Scoreboard']})
assert len({t.lower() for g in GROUPS for t in g['items']})==30
assert sum(len(g['items'])*g['points'] for g in GROUPS)==160
(ROOT/'content.json').write_text(json.dumps(GROUPS,indent=2));(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2))
print('Two six-page vector PDFs created; 30 unique prompts; max score 160.')
