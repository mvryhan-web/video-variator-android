from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
import matplotlib,json,html
R=Path(__file__).resolve().parent
FD=Path(matplotlib.get_data_path())/'fonts/ttf'
fonts={k:TTFont(FD/v) for k,v in {'b':'STIXGeneralBol.ttf','i':'STIXGeneralItalic.ttf','r':'STIXGeneral.ttf','bi':'STIXGeneralBolIta.ttf'}.items()}
INK='#183C38';RED='#B64A37';GOLD='#BA8135';BLUE='#294C76';CREAM='#E8CF9A'
parts=[]
def path(d,c=INK,stroke=None,sw=8):
 parts.append(f'<path d="{d}" fill="{c}"'+(f' stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"' if stroke else '')+'/>')
def line(d,c=INK,sw=8):path(d,'none',c,sw)
def box(x,y,w,h,c=INK,rad=8):parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rad}" fill="{c}"/>')
def circle(x,y,r,c=INK):parts.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}"/>')
def ring(x,y,r,th=8,c=INK):parts.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="{c}" stroke-width="{th}"/>')
def text(t,x,y,size=90,font='b',c=INK,maxw=800,spacing=0):
 f=fonts[font];gs=f.getGlyphSet();cm=f.getBestCmap();u=f['head'].unitsPerEm
 widths=[f['hmtx'][cm[ord(ch)]][0] for ch in t];width=sum(widths)/u*size+spacing*(len(t)-1)
 scale=min(1,maxw/width);size*=scale;spacing*=scale;width*=scale;cursor=x-width/2
 for ch,adv in zip(t,widths):
  pen=SVGPathPen(gs);gs[cm[ord(ch)]].draw(pen);d=pen.getCommands()
  if d:parts.append(f'<path d="{d}" fill="{c}" transform="translate({cursor:.3f} {y}) scale({size/u:.6f} {-size/u:.6f})"/>')
  cursor+=adv/u*size+spacing
 return width
def book(x,y,w=330,h=180,c=INK,accent=RED):
 path(f'M{x},{y+20} Q{x+w*.25},{y-30} {x+w/2},{y+20} Q{x+w*.75},{y-30} {x+w},{y+20} L{x+w},{y+h} Q{x+w*.75},{y+h-40} {x+w/2},{y+h} Q{x+w*.25},{y+h-40} {x},{y+h} Z',CREAM,c,10)
 line(f'M{x+w/2},{y+20}V{y+h}',c,8)
 for side in [0,1]:
  for dy in [h*.28,h*.46,h*.64]:line(f'M{x+22+side*w/2},{y+dy} Q{x+w*.25+side*w/2},{y+dy-25} {x+w/2-22+side*w/2},{y+dy}',c,5)
 bh=min(80,h*.5);path(f'M{x+w*.7},{y+10}v{bh}l18,-17 18,17v{-bh}Z',accent)
def closed(x,y,w=370,h=58,c=RED):
 box(x,y,w,h,c,8);box(x+18,y+10,w-28,h-20,CREAM,3);box(x,y,18,h,c,3);line(f'M{x+33},{y+h/2}H{x+w-20}',c,3)
def stack(x,y,w=360,levels=3):
 for j in range(levels):
  off=[0,24,-15,10][j%4];closed(x+off,y-j*64,w-j*15,54,[INK,RED,BLUE,GOLD][j%4])
def star(x,y,s=20,c=GOLD):path(f'M{x},{y-s} L{x+s*.26},{y-s*.26} L{x+s},{y} L{x+s*.26},{y+s*.26} L{x},{y+s} L{x-s*.26},{y+s*.26} L{x-s},{y} L{x-s*.26},{y-s*.26}Z',c)
def moon(x,y,r=70,c=GOLD):path(f'M{x+r*.45},{y-r*.9} A{r},{r} 0 1 0 {x+r*.45},{y+r*.9} Q{x-r*.7},{y} {x+r*.45},{y-r*.9}Z',c)
def cup(x,y,w=185,h=125,c=RED):
 path(f'M{x},{y}H{x+w}L{x+w-18},{y+h}Q{x+w/2},{y+h+35} {x+18},{y+h}Z',c)
 line(f'M{x+w},{y+20}C{x+w+85},{y-10} {x+w+85},{y+h-10} {x+w-10},{y+h-25}',c,15)
 line(f'M{x-18},{y+h+32}H{x+w+18}',INK,8)
 for dx in [45,95,145]:line(f'M{x+dx},{y-20}C{x+dx-30},{y-42} {x+dx+30},{y-55} {x+dx},{y-78}',GOLD,7)
def spine(x,y,w=75,h=260,c=RED):
 box(x,y,w,h,c,6)
 for dy in [20,33,h-20,h-33]:box(x+9,y+dy,w-18,5,CREAM,1)
 circle(x+w/2,y+h*.5,11,CREAM)
def bookmark(x,y,w=150,h=280,c=RED):path(f'M{x},{y}h{w}v{h}l{-w/2},{-48} -{w/2},48Z',c)
def lamp(x,y):
 path(f'M{x},{y}h140l45,115H{x-45}Z',GOLD);box(x+63,y+115,14,160,INK);path(f'M{x-10},{y+290}Q{x+70},{y+245} {x+150},{y+290}Z',INK)
def ticket(x,y,w=650,h=400,c=RED):
 parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="35" fill="none" stroke="{c}" stroke-width="12"/>')
 for xx in [x+32,x+w-32]:line(f'M{xx},{y+40}V{y+h-40}',c,3)
def heading(lines,ys,sizes=None,fonts_=None,colors=None):
 for i,(t,y) in enumerate(zip(lines,ys)):text(t,500,y,(sizes or [80]*len(lines))[i],(fonts_ or ['b']*len(lines))[i],(colors or [INK]*len(lines))[i])
DATA=[]
def start(n,name,phrase):
 global parts
 parts=[];DATA.append({'number':n,'name':name,'phrase':phrase})
def save():
 d=DATA[-1];s='<svg xmlns="http://www.w3.org/2000/svg" width="4500" height="4500" viewBox="0 0 1000 1000"><title>'+html.escape(d['phrase'])+'</title>'+''.join(parts)+'</svg>'
 (R/'Sources'/f"{d['number']:02}_{d['name']}.svg").write_text(s)
#01 emblem
start(1,'Quiet_Hours','Quiet Hours, Loud Plots');ring(500,500,405,9);heading(['QUIET HOURS','LOUD PLOTS'],[270,780],[76,78]);book(295,470,410,190);moon(500,385,70);star(265,380,24);star(735,390,20);save()
#02 calendar
start(2,'Weekend_Chapters','My Weekend Has Chapters');heading(['MY WEEKEND','has chapters'],[225,355],[82,105],['b','i']);box(250,440,500,340,INK,25);box(267,510,466,252,CREAM,10)
for xx in [335,665]:box(xx,405,20,90,RED)
text('SAT / SUN',500,488,35,'b',CREAM);stack(335,700,320,2);save()
#03 bookmark
start(3,'Tiny_Commitments','Bookmarks Are Tiny Commitments');bookmark(150,180,170,620);star(235,320,48,CREAM);text('BOOKMARKS',610,330,75,'b',INK,520);text('are tiny',610,490,85,'i',INK,520);text('commitments',610,650,76,'bi',INK,520);line('M375,710H855',RED,9);save()
#04 tea
start(4,'Tea_And_Plots','Tea Cooling, Plot Thickening');heading(['TEA COOLING','plot thickening'],[235,365],[78,94],['b','i']);book(240,660,520,160);cup(375,460,185,125);save()
#05 shelves
start(5,'Shelf_Space','Shelf Space Is a Suggestion');heading(['SHELF SPACE','is a suggestion'],[230,350],[89,91],['b','i']);box(170,785,660,20,INK)
for j in range(6):spine(215+j*93,430+(j%2)*50,75,355-(j%2)*50,[RED,INK,BLUE,GOLD,INK,RED][j])
save()
#06 lamp
start(6,'One_Lamp','One Lamp, Many Worlds');text('ONE LAMP',600,260,93,'b',INK,600);text('many worlds',600,380,94,'i',RED,600);lamp(175,465);book(380,565,400,190);star(735,495,30);save()
#07 page transition
start(7,'Between_Chapters','Currently Between Chapters');heading(['currently','BETWEEN','CHAPTERS'],[255,395,535],[90,110,100],['i','b','b']);book(300,640,400,140);line('M180,600H820',RED,8);save()
#08 battery
start(8,'Book_Battery','My Social Battery Runs on Books');heading(['MY SOCIAL BATTERY','runs on books'],[240,365],[68,99],['b','bi']);parts.append('<rect x="190" y="475" width="595" height="245" rx="30" fill="none" stroke="#183C38" stroke-width="18"/>');box(785,550,35,95,INK)
for j in range(5):spine(220+j*107,505,82,185,[RED,GOLD,INK,BLUE,RED][j]);save() if False else None
save()
#09 night
start(9,'After_Dark','Plot Twists After Dark');heading(['PLOT TWISTS','AFTER DARK'],[220,840],[83,86]);moon(500,435,135,BLUE);book(305,580,390,140,INK,BLUE)
for x,y,s in [(260,340,25),(735,420,22),(270,545,17),(690,300,28)]:star(x,y,s)
save()
#10 library ticket
start(10,'Library_Visit','I Came, I Browsed, I Borrowed');ticket(150,170,700,660,INK);text('A VERY GOOD LIBRARY VISIT',500,235,31,'r',RED);text('I CAME',500,390,103,maxw=600);text('I BROWSED',500,520,97,maxw=600);text('I BORROWED',500,650,84,maxw=600);line('M210,720H790',RED,7)
for j in range(17):box(310+j*22,755,5+(j%3)*3,35,INK,0)
save()
#11 chaos
start(11,'Well_Read_Chaos','A Little Well-Read Chaos');heading(['A LITTLE','well-read','CHAOS'],[230,360,825],[66,102,124],['r','i','b']);stack(300,645,410,3);star(220,490,30);star(770,610,23);save()
#12 medallion
start(12,'Read_Rest_Repeat','Read, Rest, Repeat');ring(500,500,375,16,RED);ring(500,500,342,4,RED);heading(['READ','REST','REPEAT'],[290,470,760],[115,90,100],['b','i','b']);book(380,530,240,95,INK,RED);save()
#13 house
start(13,'Bookmark_Home','Home Is Where the Bookmark Is');heading(['HOME IS WHERE','the bookmark is'],[235,355],[78,91],['b','i']);path('M230,570L500,420 770,570V815H230Z',CREAM,INK,12);book(305,610,390,160);save()
#14 margin
start(14,'More_Margin','More Margin, Less Noise');book(185,440,630,340);heading(['MORE MARGIN','less noise'],[230,350],[81,105],['b','i']);line('M260,525V705',RED,10);line('M580,525V705',RED,10);save()
#15 progress
start(15,'Reading_Progress','Reading in Progress');heading(['READING','in progress'],[330,475],[125,112],['b','i']);box(180,190,640,19,RED);box(180,790,640,19,RED)
for j in range(7):path(f'M{180+j*95},725l45,-70h35l-45,70Z',GOLD)
book(375,530,250,90);save()
#16 saved
start(16,'Next_Page','Saved by the Next Page');heading(['SAVED BY','the next page'],[215,345],[88,100],['b','i']);ring(500,605,205,50,RED);book(315,535,370,155)
for x,y in [(335,440),(665,440),(335,770),(665,770)]:star(x,y,22,GOLD)
save()
#17 tote
start(17,'Tote_Plots','This Tote Carries Plot Twists');heading(['THIS TOTE CARRIES','PLOT TWISTS'],[245,390],[65,104]);path('M265,540H735L700,825H300Z',CREAM,INK,13);line('M380,540V485C380,385 620,385 620,485V540',INK,15);closed(350,680,300,65,RED);closed(365,604,270,65,BLUE);save()
#18 tiny library
start(18,'Tiny_Library','Tiny Library, Big Escapes');heading(['TINY LIBRARY','big escapes'],[230,350],[87,111],['b','i']);path('M215,530L500,405 785,530Z',RED);box(255,535,490,290,INK)
for j in range(5):spine(280+j*90,575+(j%2)*30,70,220-(j%2)*30,[GOLD,RED,BLUE,RED,GOLD][j])
save()
#19 plans
start(19,'Plans_Have_Spines','My Plans Have Spines');heading(['MY PLANS','have spines'],[230,350],[104,110],['b','i']);box(190,800,620,15,INK)
for j in range(4):
 spine(240+j*140,460+(j%2)*40,100,340-(j%2)*40,[BLUE,RED,GOLD,INK][j]);text(['I','II','III','IV'][j],290+j*140,610,30,'r',CREAM,80)
save()
#20 softstrong
start(20,'Soft_Covers','Soft Covers, Strong Opinions');heading(['SOFT','COVERS'],[245,370],[133,110],['bi','bi'],[RED,RED]);book(360,440,280,135);heading(['STRONG','OPINIONS'],[735,845],[108,103],['b','b']);star(230,535,36,BLUE);star(770,520,36,BLUE);save()
(R/'designs.json').write_text(json.dumps(DATA,indent=2));(R/'Buyer/TYPE_LICENSE_NOTICE.txt').write_text((FD/'LICENSE_STIX').read_text()+'\n\nNo font files are supplied. Typography is converted to paths in original artwork.\n')
print('20 original SVG compositions authored with outlined STIX type and original geometric illustrations')
