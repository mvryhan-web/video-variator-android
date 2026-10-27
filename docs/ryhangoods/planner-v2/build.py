from pathlib import Path
import calendar,json,os,hashlib,collections
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
import fitz
R=Path(__file__).parent; B=R/'Buyer_Files'; P=R/'Previews'
B.mkdir(parents=True,exist_ok=True);P.mkdir(exist_ok=True)
for n,f in [('S','DejaVuSans.ttf'),('B','DejaVuSans-Bold.ttf'),('T','DejaVuSerif.ttf')]:pdfmetrics.registerFont(TTFont(n,'/usr/share/fonts/truetype/dejavu/'+f))
W,H=1024,768; BG='#FAF6EF';INK='#392733';MUT='#766871';ACC='#694254';LINE='#DED3CC';SAGE='#EBE2DB';LAV='#EAE2EC';PEACH='#F1DDD0';WHITE='#FFFDFA'
MONTH=[calendar.month_name[m] for m in range(1,13)];LENS=[31,29,31,30,31,30,31,31,30,31,30,31]
TOOLS=['Inbox','Quick wins','Focus log','Energy check','Habit grid','Reset','Notes','Year reflection']
DAYS=[(m,d) for m,num in enumerate(LENS,1) for d in range(1,num+1)]
PAGES=[('cover',{}),('how',{}),('home',{}),('year',{})]+[(f'month_{m}',{'m':m}) for m in range(1,13)]+[('weeks',{})]+[(f'week_{w}',{'w':w}) for w in range(1,53)]+[(f'day_{n}',{'n':n,'m':m,'d':d}) for n,(m,d) in enumerate(DAYS,1)]+[(f'tool_{i}',{'t':i}) for i in range(8)]
IDX={k:i for i,(k,v) in enumerate(PAGES)};assert len(PAGES)==443
LINKS=[];TEXT=[];ID='';C=None
def rect(x,y,w,h,fill=WHITE,stroke=None,r=3):
 C.setFillColor(HexColor(fill));C.setStrokeColor(HexColor(stroke or fill));C.setLineWidth(.8);C.roundRect(x,H-y-h,w,h,r,fill=1,stroke=bool(stroke))
def text(x,y,s,size=12,font='S',color=INK):
 C.setFont(font,size);C.setFillColor(HexColor(color));C.drawString(x,H-y-size*.82,s);TEXT.append((ID,x,y,pdfmetrics.stringWidth(s,font,size),size,s))
def line(x,y,x2,y2):C.setLineWidth(.65);C.setStrokeColor(HexColor(LINE));C.line(x,H-y,x2,H-y2)
def lines(x,y,w,n=4,gap=30):
 for i in range(n):line(x,y+i*gap,x+w,y+i*gap)
def link(x,y,w,h,dest):
 assert dest in IDX;LINKS.append({'source':ID,'target':dest,'rect':[x,y,x+w,y+h]})
def pill(x,y,w,label,dest,fill=SAGE,size=10):
 rect(x,y,w,30,fill,r=3);text(x+11,y+9,label,size,'B');link(x,y,w,30,dest)
def box(x,y,w,h,label,fill=WHITE):rect(x,y,w,h,fill,LINE);text(x+18,y+17,label,11,'B',MUT)
def check(x,y):
 C.setStrokeColor(HexColor(ACC));C.setLineWidth(.85);C.roundRect(x,H-y-11,11,11,2,fill=0,stroke=1)
def heading(title,sub='',label='PLAN GENTLY'):
 text(48,103,label,10,'B',ACC);text(48,122,title,40,'T')
 if sub:text(49,174,sub,11,'S',MUT)
def base(id,m=None):
 global ID;ID=id;C.setFillColor(HexColor(BG));C.rect(0,0,W,H,fill=1,stroke=0);text(48,28,'GENTLE FOCUS',14,'B')
 for x,w,lab,d in [(390,87,'HOME','home'),(487,82,'YEAR','year'),(579,92,'WEEKS','weeks'),(681,88,'TOOLS','tool_0')]:pill(x,20,w,lab,d,WHITE)
 line(48,66,938,66)
 for i in range(1,13):
  x,y=974,81+(i-1)*49;rect(x,y,42,42,ACC if m==i else SAGE,r=3);text(x+7,y+15,MONTH[i-1][:3].upper(),9,'B',WHITE if m==i else INK);link(x,y,42,42,f'month_{i}')
 text(48,735,'RyhanGoods / Gentle Focus / Undated',9,'S',MUT);text(838,735,f'{IDX[id]+1:03} / 443',9,'S',MUT)
 n=IDX[id]
 if n:pill(779,20,68,'BACK',PAGES[n-1][0],WHITE,9)
 if n+1<len(PAGES):pill(857,20,68,'NEXT',PAGES[n+1][0],WHITE,9)
def draw(id,a):
 base(id,a.get('m'))
 if id=='cover':
  rect(48,100,890,575,SAGE,r=24);text(88,144,'A LITTLE STRUCTURE. MORE ROOM TO BREATHE.',12,'B',ACC)
  text(85,219,'Gentle',72,'T');text(85,301,'Focus',72,'T');text(90,416,'Your undated digital planner',21);text(90,459,'12 months / 52 weeks / 366 daily pages',15,'S',MUT);text(90,496,'Choose one next step. Begin again whenever you need.',13,'S',MUT)
  pill(90,565,178,'OPEN MY PLANNER','home',WHITE,12);pill(282,565,151,'START HERE','how',LAV,12)
  for i,(color,lab) in enumerate([(WHITE,'plan'),(LAV,'focus'),(PEACH,'reset')]):rect(665,194+i*132,215,106,color,r=18);text(687,225+i*132,lab,27,'T');line(688,272+i*132,850,272+i*132)
 elif id=='how':
  heading('Start small. Come back often.','A blank page is a fresh start. There is no perfect streak to protect.','START HERE')
  items=[('01 SAVE A CLEAN COPY','Keep an untouched master PDF. Import a working copy into your annotation app.'),('02 USE THE LINKS','Tap the top menu or month tabs. In writing mode, a long press may open a link.'),('03 PLAN ONE NEXT STEP','Start with a daily page. Add one priority and a small action you can begin.'),('04 UNDERSTAND THE WEEKS','Weeks are fixed seven-day blocks, not Monday-to-Sunday calendar weeks.'),('05 USE THE OPTIONAL DAYS','February 29 is optional. Week 52 also links to December 30 and 31.'),('06 RETURN WITHOUT CATCHING UP','You can skip pages. Use RESET when you want a gentle way back in.')]
  for i,(lab,body) in enumerate(items):y=221+i*73;rect(48,y,890,62,WHITE,LINE);text(65,y+13,lab,11,'B');text(65,y+36,body,11,'S',MUT)
 elif id=='home':
  heading('Your quiet starting point','Choose a month, a planning block, or a fresh start.','HOME')
  for m in range(1,13):
   x=48+((m-1)%4)*225;y=223+((m-1)//4)*104;rect(x,y,210,88,[SAGE,LAV,WHITE,PEACH][(m-1)%4],LINE);text(x+18,y+14,f'{m:02}',11,'B',ACC);text(x+18,y+40,MONTH[m-1],20,'T');link(x,y,210,88,f'month_{m}')
  for x,lab,d in [(48,'CHOOSE A WEEK','weeks'),(278,'CLEAR MY HEAD','tool_0'),(508,'QUICK WINS','tool_1'),(738,'RESET','tool_5')]:pill(x,572,200,lab,d,WHITE)
  text(50,639,'Today can be a one-task day. That still counts.',15,'T',ACC)
 elif id=='year':
  heading('A year with room for you','YEAR: __________________     One word for this season: __________________','YEAR AT A GLANCE')
  for m in range(1,13):
   x=48+((m-1)%4)*225;y=222+((m-1)//4)*148;box(x,y,210,131,MONTH[m-1].upper());lines(x+18,y+65,174,2,32);link(x,y,210,42,f'month_{m}')
 elif id.startswith('month_'):
  m=a['m'];heading(MONTH[m-1],'Add your year and weekday notes. Each number opens its daily page.','MONTHLY VIEW');text(49,214,'DAY LINKS',11,'B',ACC);start=sum(LENS[:m-1])+1
  for d in range(1,LENS[m-1]+1):
   x=48+((d-1)%7)*85;y=241+((d-1)//7)*64;rect(x,y,76,55,WHITE,LINE,r=3);text(x+14,y+14,f'{d:02}',20,'T');link(x,y,76,55,f'day_{start+d-1}')
  if m==2:text(49,573,'29 is optional in a non-leap year. Skip it when not needed.',10,'S',MUT)
  weeks=sorted(set(min((n-1)//7+1,52) for n in range(start,start+LENS[m-1])));text(49,615,'PLANNING BLOCKS TOUCHING THIS MONTH',10,'B',ACC)
  for j,w in enumerate(weeks):pill(48+j*101,639,91,f'WEEK {w:02}',f'week_{w}',SAGE)
  for y,h,lab,fill in [(223,167,'ONE MONTHLY PRIORITY',SAGE),(407,137,'MAKE SPACE FOR',LAV),(561,136,'NOT NOW - PARK IT HERE',WHITE)]:box(674,y,264,h,lab,fill);lines(693,y+67,225,3 if h>150 else 2,31)
 elif id=='weeks':
  heading('Choose a planning block','52 seven-day blocks, plus two year-end pages. Write your own year and weekdays.','WEEK INDEX')
  for w in range(1,53):pill(48+((w-1)%8)*112,224+((w-1)//8)*61,100,f'WEEK {w:02}',f'week_{w}',WHITE)
  text(49,677,'These links follow month/day slots, not ISO week numbers. See START HERE.',11,'S',MUT)
 elif id.startswith('week_'):
  w=a['w'];heading(f'Block {w:02}','Seven-day planning block. Add weekday labels; choose one focus per day.','FLEXIBLE SEVEN-DAY PLAN')
  for j in range(7):
   n=(w-1)*7+j+1;m,d=DAYS[n-1];x=48+(j%4)*225;y=224+(j//4)*223;box(x,y,210,204,f'{MONTH[m-1][:3].upper()} {d:02}');link(x,y,210,40,f'day_{n}');text(x+18,y+53,'WEEKDAY: __________',9,'S',MUT);lines(x+18,y+99,174,3,37)
  x,y=723,447;box(x,y,210,204,'MAKE IT EASIER',SAGE);text(x+18,y+55,'What can be smaller?',11);lines(x+18,y+91,174,2,32);pill(x+18,y+157,174,'GENTLE RESET','tool_5',WHITE)
  if w==52:pill(48,672,190,'EXTRA: DECEMBER 30','day_365',LAV);pill(253,672,190,'EXTRA: DECEMBER 31','day_366',LAV)
  else:
   if w>1:pill(48,672,150,'PREVIOUS WEEK',f'week_{w-1}',SAGE)
   pill(214,672,150,'NEXT WEEK',f'week_{w+1}',SAGE)
 elif id.startswith('day_'):
  n,m,d=a['n'],a['m'],a['d'];wk=min((n-1)//7+1,52);heading(f'{MONTH[m-1]} {d:02}','YEAR: ____________    WEEKDAY: ____________    ENERGY:  1  2  3  4  5','ONE DAY AT A TIME');pill(751,113,187,f'OPEN WEEK {wk:02}',f'week_{wk}',SAGE)
  box(48,220,426,124,'THE ONE THING',SAGE);text(67,259,'If I do just this, today moves forward.',11,'S',MUT);lines(67,315,387,1)
  box(48,361,426,157,'SMALL NEXT STEPS')
  for j in range(3):check(68,411+j*32);line(94,424+j*32,454,424+j*32)
  box(48,535,426,155,'PARKING LOT');lines(67,592,387,3,32);box(492,220,446,266,'A FLEXIBLE PLAN');text(511,260,'TIME / WINDOW',9,'B',MUT);text(635,260,'WHAT I WANT TO DO',9,'B',MUT)
  for j in range(5):line(511,303+j*35,918,303+j*35)
  line(620,280,620,460);box(492,503,446,89,'A LITTLE CARE',LAV);text(511,542,'Water / food / movement / rest - choose what helps.',11);box(492,609,446,81,'ONE THING THAT COUNTED',PEACH);line(511,667,918,667)
 else:
  t=a['t'];subs=['Get it out of your head. Sorting can wait.','A tiny finish can make starting feel easier.','Notice your process without grading yourself.','A personal check-in, not a medical measurement.','Choose a few habits. Missing days need no explanation.','You do not need to catch up to begin again.','A place for whatever needs a little room.','Keep what helped. Leave what did not.'];heading(TOOLS[t],subs[t],'YOUR TOOLKIT')
  for j in range(8):pill(48+j*112,692,102,TOOLS[j].upper()[:13],f'tool_{j}',SAGE,8)
  if t==0:
   box(48,220,568,449,'BRAIN DUMP');lines(68,288,528,11,32);box(634,220,304,210,'ONE NEXT ACTION',SAGE);lines(654,285,264,4,32);box(634,448,304,221,'LATER IS A VALID PLACE',LAV);lines(654,515,264,4,32)
  elif t==1:
   box(48,220,436,449,'TINY TASKS I CAN FINISH')
   for j in range(10):check(68,282+j*35);line(94,295+j*35,463,295+j*35)
   box(502,220,436,210,'MY SMALL REWARD',PEACH);lines(522,286,396,4,32);box(502,448,436,221,'DONE COUNTS',SAGE);lines(522,515,396,4,32)
  elif t==2:
   cols=[48,170,505,655,938]
   for lab,x in zip(['DATE','TASK / NEXT STEP','MINUTES','WHAT HELPED'],cols):text(x+10,232,lab,10,'B',ACC)
   for j in range(11):line(48,274+j*35,938,274+j*35)
   for x in cols:line(x,266,x,659)
  elif t==3:
   box(48,220,890,91,'PERSONAL SCALE: 1 = LOW / 5 = HIGH',LAV);text(68,266,'Track your own experience. A number is information, not a score to beat.',12)
   for x,lab in [(48,'DATE'),(180,'ENERGY 1-5'),(357,'FOCUS 1-5'),(535,'ENJOYMENT 1-5'),(744,'A HELPFUL NOTE')]:text(x+8,342,lab,10,'B',ACC)
   for j in range(9):line(48,381+j*33,938,381+j*33)
  elif t==4:
   text(49,220,'MONTH: ____________________    Three habits are enough to start.',12)
   for g in range(3):
    y=263+g*130;text(49,y,'HABIT: ___________________________________________________',12,'B')
    for d in range(1,32):x=48+(d-1)*28.7;rect(x,y+38,25,37,WHITE,LINE,r=4);text(x+4,y+49,str(d),9)
   text(49,661,'Mark only the days you use. This page is for noticing, not perfect streaks.',11,'S',MUT)
  elif t==5:
   for x,y,w,h,lab,fill in [(48,220,436,190,'WHAT FEELS HEAVY?',WHITE),(502,220,436,190,'WHAT CAN WAIT?',LAV),(48,428,436,241,'MY SMALLEST NEXT STEP',SAGE),(502,428,436,241,'WHAT WOULD HELP ME START?',PEACH)]:box(x,y,w,h,lab,fill);lines(x+20,y+73,w-40,3 if h<200 else 5,32)
  elif t==6:box(48,220,890,449,'NOTES');lines(68,285,850,12,31)
  else:
   for x,y,lab,fill in [(48,220,'WHAT HELPED ME?',SAGE),(502,220,'WHAT CAN I LET GO?',LAV),(48,448,'SMALL WINS I WANT TO REMEMBER',WHITE),(502,448,'WHAT I WANT TO TAKE FORWARD',PEACH)]:box(x,y,436,221,lab,fill);lines(x+20,y+70,396,4,33)
original_draw=draw
def draw(id,a):
 if id not in ['cover'] and not id.startswith('day_'):
  original_draw(id,a);return
 base(id,a.get('m'))
 if id=='cover':
  rect(48,100,890,595,INK,r=4)
  text(86,140,'RYHANGOODS  /  THE UNDATED COLLECTION',11,'B','#EAD9CB')
  line(88,186,896,186)
  text(82,222,'Gentle Focus',68,'T',BG)
  text(88,326,'A quieter way to plan.',22,'T','#EAD9CB')
  text(89,382,'One priority. A little structure. Space to begin again.',14,'S',BG)
  for x,n,lab in [(89,'12','MONTHS'),(345,'52','FLEXIBLE BLOCKS'),(644,'366','DAILY PAGES')]:
   text(x,449,n,41,'T',BG);text(x,503,lab,10,'B','#EAD9CB')
  pill(89,570,217,'OPEN MY PLANNER','home',BG,12)
  pill(326,570,164,'START HERE','how',PEACH,12)
  text(89,653,'UNDATED  /  HYPERLINKED PDF  /  PERSONAL USE',10,'S','#EAD9CB')
 else:
  n,m,d=a['n'],a['m'],a['d'];wk=min((n-1)//7+1,52)
  text(48,101,'DAILY EDITION  /  ONE STEP AT A TIME',10,'B',ACC)
  text(46,128,f'{MONTH[m-1]} {d:02}',43,'T')
  text(50,189,'YEAR: __________    WEEKDAY: __________',10,'S',MUT)
  pill(741,135,197,f'OPEN BLOCK {wk:02}',f'week_{wk}',LAV,10)
  rect(48,235,310,151,PEACH,r=3)
  text(68,254,"01  /  TODAY'S PRIORITY",11,'B',INK)
  text(68,281,'What matters most?',17,'T',INK)
  for y in [331,362]:
   C.setStrokeColor(HexColor('#8B7481'));C.line(68,H-y,338,H-y)
  box(48,404,310,162,'02  /  THREE SMALL STEPS',SAGE)
  for j in range(3):check(68,457+j*33);line(93,468+j*33,338,468+j*33)
  box(48,584,310,111,'03  /  A LITTLE CARE',LAV)
  text(68,623,'What would help today?',13,'T');line(68,668,338,668)
  box(382,235,556,284,'04  /  MY FLEXIBLE PLAN')
  text(402,279,'TIME',9,'B',MUT);text(506,279,'TASK / APPOINTMENT',9,'B',MUT)
  for j in range(5):line(402,321+j*36,918,321+j*36)
  line(486,304,486,500)
  box(382,537,556,81,'05  /  PARK IT HERE',SAGE);line(402,593,918,593)
  box(382,636,556,59,'06  /  ONE SMALL WIN',PEACH);line(590,675,918,675)

def build():
 global C
 temp=Path('/tmp/gentle-focus-layout.pdf');C=canvas.Canvas(str(temp),pagesize=(W,H),pageCompression=1);C.setTitle('Gentle Focus - Undated Hyperlinked Digital Planner');C.setAuthor('RyhanGoods')
 for id,a in PAGES:draw(id,a);C.showPage()
 C.save()
 errors=[t for t in TEXT if t[1]<0 or t[1]+t[3]>W-3 or t[2]<0 or t[2]+t[4]>H];assert not errors,errors[:2]
 doc=fitz.open(temp);by=collections.defaultdict(list)
 for item in LINKS:by[IDX[item['source']]].append(item)
 for i,p in enumerate(doc):
  for l in by[i]:p.insert_link({'kind':fitz.LINK_GOTO,'from':fitz.Rect(l['rect']),'page':IDX[l['target']],'to':fitz.Point(0,0)})
 doc.set_toc([[1,(' '.join(id.split('_'))).title(),i+1] for i,(id,a) in enumerate(PAGES) if id in ['home','year','weeks'] or id.startswith('month_') or id.startswith('tool_')])
 linked=Path('/tmp/Gentle_Focus_Undated_Planner.pdf');doc.save(linked,garbage=4,deflate=True);doc.close();out=B/linked.name;os.replace(linked,out)
 final=fitz.open(out);assert len(final)==443;count=0
 for i,p in enumerate(final):
  actual=p.get_links();assert sorted(l.get('page',-1) for l in actual)==sorted(IDX[l['target']] for l in by[i]),i
  for l in actual:assert l['kind']==fitz.LINK_GOTO and p.rect.contains(l['from'])
  count+=len(actual)
 samples=['cover','how','home','year','month_1','weeks','week_1','day_1']+[f'tool_{i}' for i in range(8)]
 for j,id in enumerate(samples,1):final[IDX[id]].get_pixmap(matrix=fitz.Matrix(1.3,1.3)).save(P/f'{j:02}_{id}.png')
 (R/'page_map.json').write_text(json.dumps({'pages':[{'id':id,'index':i,**a} for i,(id,a) in enumerate(PAGES)],'links':LINKS},indent=2))
 qa={'pages':443,'months':12,'weekly_blocks':52,'daily_pages':366,'tools':8,'links':count,'all_targets_verified':True,'text_bounds':'PASS','native_app_tests':'not performed','size_pt':[W,H],'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()};(R/'quality_report.json').write_text(json.dumps(qa,indent=2));print(json.dumps(qa))
if __name__=='__main__':build()
