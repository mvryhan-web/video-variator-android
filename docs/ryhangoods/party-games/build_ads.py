from pathlib import Path
import fitz
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
ROOT=Path(__file__).resolve().parent
C=canvas.Canvas('/tmp/phone-party-ads.pdf',pagesize=(1000,750))
def rect(x,y,w,h,col):C.setFillColor(HexColor(col));C.rect(x,750-y-h,w,h,fill=1,stroke=0)
def text(t,x,y,size=18,font='Helvetica',col='#43202B'):
 C.setFillColor(HexColor(col));C.setFont(font,size);C.drawString(x,750-y-size*.8,t)
def base(title,sub,bg='#FFF8F7'):
 rect(0,0,1000,750,bg);text('PINOGRI / THE GIRLS\' NIGHT EDIT',64,35,10,'Helvetica-Bold','#AD2847');text(title,64,81,37,'Times-Italic');text(sub,65,132,14)
def card(page,x,y,w=260,letter=False,angle=0):
 size='US_Letter' if letter else 'A4';path=ROOT/'Previews'/f'AdSource_{size}_{page:02}.png';ratio=(792/612) if letter else (842/595);h=w*ratio
 C.saveState();C.translate(x,750-y);C.rotate(angle);C.setFillColor(HexColor('#D9CDCD'));C.rect(5,-h-6,w,h,fill=1,stroke=0);C.drawImage(str(path),0,-h,w,h)
 C.setFillColor(HexColor('#875C6A'));C.setFillAlpha(.18);C.setFont('Times-Italic',w*.12);C.drawCentredString(w/2,-h*.59,'Pinogri');C.restoreState()
def foot(t):text(t,65,710,11);C.showPage()
def source(name):C.drawImage(str(ROOT/'Sources'/name),0,0,1000,750)
for size in ['A4','US_Letter']:
 d=fitz.open(ROOT/'Buyer'/f'Pinogri_Phone_Party_{size}.pdf')
 for i,p in enumerate(d):
  temp=Path('/tmp')/f'AdSource_{size}_{i+1:02}.png';p.get_pixmap(matrix=fitz.Matrix(3,3),alpha=False).save(temp);temp.replace(ROOT/'Previews'/temp.name)
 d.close()
# 01 staged cover grounded in real pages
source('hero.png');C.setFillColor(HexColor('#875C6A'));C.setFillAlpha(.14);C.setFont('Times-Italic',48);C.drawCentredString(490,270,'Pinogri');C.setFillAlpha(1);C.showPage()
# 02 exact six-page catalog
base('Everything for your phone hunt.','One game. Six pages per paper size. Every page shown is a real file.')
for i,label in enumerate(['Cherry','Sage','Cobalt','Ink Saver','Host Rules','Scoreboard']):
 x=65+(i%3)*315;y=190+(i//3)*250;card(i+1,x,y,153);text(label,x+169,y+93,13,'Helvetica-Bold')
foot('A4 + US Letter PDFs / same game in both sizes / personal use for one private party.')
# 03 real cropped prompts, rendered directly from the PDF at high resolution
base('A few things you might find...','30 prompts across three point levels. What is hiding on your phone?')
d=fitz.open(ROOT/'Buyer/Pinogri_Phone_Party_A4.pdf');p=d[0]
clips=[fitz.Rect(42,290,202,495),fitz.Rect(217,290,377,495),fitz.Rect(392,290,553,495)]
for i,clip in enumerate(clips):
 path=Path('/tmp')/f'phone-crop-{i}.png';p.get_pixmap(matrix=fitz.Matrix(4,4),clip=clip,alpha=False).save(path)
 x=65+i*310;C.drawImage(str(path),x,750-204-359,280,359);text('Pinogri',x+59,422,30,'Times-Italic','#D9C4CB')
foot('Count what existed before GO. No new photos, downloads or lists for extra points.')
# 04 use setting, not an invented new product
source('lifestyle.png');C.showPage()
# 05 understandable arithmetic + actual bottom of game sheet
base('Friendly competition. Simple scoring.','Count the checks, multiply by the column value, then add.')
for x,num,label in [(82,'1','POINT EACH'),(390,'5','POINTS EACH'),(698,'10','POINTS EACH')]:
 rect(x,209,220,151,'#F6E0E5');text(num,x+70,224,78,'Times-Italic','#AD2847');text(label,x+48,330,12,'Helvetica-Bold','#AD2847')
text('7 checks x 1 + 4 checks x 5 + 3 checks x 10 = 57',87,399,26,'Times-Italic')
crop=Path('/tmp/phone-score-crop.png');p.get_pixmap(matrix=fitz.Matrix(4,4),clip=fitz.Rect(42,720,554,799),alpha=False).save(crop);C.drawImage(str(crop),67,750-469-129,836,129)
text('Maximum score: 160. Ties share the win.',87,640,21,'Times-Italic')
foot('The PDFs are for handwriting: scores do not calculate automatically.')
# 06 color choice, same game
base('Pick your party palette.','Cherry, Sage and Cobalt. Three looks for the same 30-prompt game.','#F3E8EC')
for i,label in enumerate(['Cherry','Sage','Cobalt']):
 x=83+i*309;card(i+1,x,200,240,angle=[3,-2,2][i]);text(label,x+72,595,20,'Times-Italic')
foot('Color choices are included together; you do not need to choose a variation at checkout.')
# 07 ink-saving utility
base('Keep the fun. Save the color ink.','A dedicated black-and-white game sheet is included.')
card(4,82,191,311);text('A clean print-friendly version',480,227,24,'Times-Italic')
for y,t in [(296,'Same 30 prompts and scoring'),(343,'No colored fills'),(390,'No ribbon illustration'),(437,'White page with clear margins')]:text(t,480,y,17)
text('Print one sheet per guest.',480,531,24,'Times-Italic')
foot('Ink Saver refers to the game page; the host rules and scoreboard use light cherry accents.')
# 08 correct paper sizes
base('Made for the paper you have.','Choose the PDF that matches your printer paper; print at Actual size / 100%.')
card(1,92,203,270);card(1,504,203,270,letter=True)
text('A4',92,619,22,'Times-Italic');text('210 x 297 mm',149,625,14)
text('US LETTER',504,619,22,'Times-Italic');text('8.5 x 11 in',660,625,14)
foot('Generous print margins / no cutting required / no borderless printer needed.')
# 09 actual setup and delivery steps
base('From download to the table.','A little preparation, then let the phone hunt begin.')
card(5,77,192,263,angle=2)
for i,(heading,desc) in enumerate([('Download & unzip','Save the ZIP from your Etsy purchases.'),('Choose & print','Pick a paper size and a game-page color.'),('Set the table','One sheet, one pen and one phone per guest.'),('Read the host rules','Choose the stop time and say GO together.')]):
 y=211+i*108;text('0'+str(i+1),414,y,28,'Times-Italic','#AD2847');text(heading,474,y,21,'Helvetica-Bold');text(desc,474,y+38,13)
foot('No game app, special account or seller customization is required.')
# 10 social comfort and honest boundaries
base('Good company. No oversharing.','Made for a private girls\' night, bridal shower or bachelorette gathering.')
card(6,83,197,285)
for y,title,body in [(221,'Your phone stays with you.','Self-reporting is enough; no screen-sharing required.'),(333,'Passing is always fine.','Skip a prompt without explanation or penalty.'),(445,'Printables, ready to use.','Static English PDFs, not editable templates.'),(557,'One game, personal use.','No physical items, props or commercial license.')]:
 text(title,461,y,22,'Times-Italic');text(body,461,y+36,12.5)
foot('For larger groups, print another scoreboard. These are color variants of one game.')
C.save();d.close();doc=fitz.open('/tmp/phone-party-ads.pdf');assert len(doc)==10
for i,p in enumerate(doc):
 tmp=Path('/tmp')/f'phone-ad-{i+1:02}.jpg';p.get_pixmap(matrix=fitz.Matrix(4,4),alpha=False).save(tmp);tmp.replace(ROOT/'Ads'/f'{i+1:02}_Phone_Party.jpg')
 tmp=Path('/tmp')/f'phone-ad-{i+1:02}.png';p.get_pixmap().save(tmp);tmp.replace(ROOT/'Previews'/f'Ad_{i+1:02}.png')
print('Ten individual 4000x3000 ad exports. Generated photos enlarged; precise page composites rendered from PDF.')
