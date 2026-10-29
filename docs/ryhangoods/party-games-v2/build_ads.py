from pathlib import Path
import fitz,json
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase.pdfmetrics import stringWidth
R=Path(__file__).resolve().parent
C=canvas.Canvas(str(R/'ads-working.pdf'),pagesize=(1000,750))
texts=[];order=[]
def rect(x,y,w,h,color):C.setFillColor(HexColor(color));C.rect(x,750-y-h,w,h,fill=1,stroke=0)
def txt(t,x,y,size=16,font='Helvetica',color='#492533'):
 assert x>=0 and x+stringWidth(t,font,size)<=980,(t,x,size)
 C.setFillColor(HexColor(color));C.setFont(font,size);C.drawString(x,750-y-size*.8,t);texts.append({'text':t,'x':x,'y':y,'size':size})
def base(n,title,sub,bg='#FFF8F6',fg='#492533'):
 order.append(n);rect(0,0,1000,750,bg);txt('PINOGRI / THE GIRLS\' NIGHT EDIT',55,30,9,'Helvetica-Bold',fg);txt(title,55,77,34,'Times-Italic',fg);txt(sub,56,126,13,'Helvetica',fg)
def foot(t,color='#492533'):
 txt(t,55,710,10.5,'Helvetica',color);C.showPage()
def card(page,x,y,w,size='A4',angle=0):
 p=R/'Previews'/f'Source_{size}_{page:02}.png';im=fitz.Pixmap(str(p));h=w*im.height/im.width
 C.saveState();C.translate(x,750-y);C.rotate(angle);C.setFillColor(HexColor('#D4C8C8'));C.rect(4,-h-5,w,h,fill=1,stroke=0);C.drawImage(str(p),0,-h,w,h)
 C.setFillColor(HexColor('#7A6F73'));C.setFillAlpha(.18);C.setFont('Times-Italic',max(12,w*.075));
 for f in [.35,.7]:C.drawCentredString(w*.5,-h*f,'Pinogri')
 C.restoreState();return h
def crop(page,clip,x,y,w):
 d=fitz.open(R/'Buyer/Pinogri_Phone_Party_A4.pdf');p=d[page-1];pix=p.get_pixmap(matrix=fitz.Matrix(4,4),clip=fitz.Rect(*clip),alpha=False);pname=R/'Previews'/f'Crop_{len(texts)}.png';pix.save(pname);h=w*pix.height/pix.width;C.drawImage(str(pname),x,750-y-h,w,h)
 C.saveState();C.setFillColor(HexColor('#927B82'));C.setFillAlpha(.16);C.setFont('Times-Italic',24);C.drawCentredString(x+w/2,750-y-h*.58,'Pinogri');C.restoreState();d.close()
for size in ['A4','US_Letter']:
 d=fitz.open(R/'Buyer'/f'Pinogri_Phone_Party_{size}.pdf')
 for i,p in enumerate(d):p.get_pixmap(matrix=fitz.Matrix(3,3),alpha=False).save(R/'Previews'/f'Source_{size}_{i+1:02}.png')
 d.close()
#02 exact overview
base(2,'Your whole party kit.','One game, four print styles, a host guide and a scoreboard.')
for i,label in enumerate(['Cherry','Sage','Cobalt','Ink Saver','Host guide','Score sheet']):
 x=60+i*151;card(i+1,x,205,128);txt(label,x,401,12,'Helvetica-Bold')
rect(55,470,890,173,'#F3E4E8');txt('2 PDFs. Six pages in each.',79,491,27,'Times-Italic');txt('A4 + US Letter',79,539,19,'Helvetica-Bold');txt('Print the size you need. The same content appears in both PDFs.',79,578,14);txt('Instructions and personal-use license included in the ZIP.',79,611,13)
foot('One sheet per guest. Colors and paper sizes are versions of the same game.')
#03 Cherry
base(3,'A little cherry on top.','Cherry / generous spacing, clear checkboxes and 30 numbered prompts.','#F8E9ED','#8E1D3C')
card(1,592,184,333)
txt('See the details.',65,220,29,'Times-Italic','#8E1D3C');crop(1,[40,290,380,445],65,285,465)
txt('Mark the finds. Add the points.',65,566,20,'Times-Italic','#8E1D3C');txt('Ready to print. Nothing to customize.',65,610,14)
foot('Real Cherry PDF page and enlarged excerpt. Watermarks appear on previews only.')
#04 Sage
base(4,'Soft sage. Same good fun.','Sage / a calmer palette for a thoughtfully set table.','#E5EDE5','#244C3E')
card(2,70,191,332,angle=-1)
txt('A quieter kind of party color.',480,225,27,'Times-Italic','#244C3E');crop(2,[215,290,555,460],480,292,448)
txt('01-30 / numbered prompts',480,574,18,'Helvetica-Bold','#244C3E');txt('Your own phone. A pen. A little curiosity.',480,616,14,'Helvetica','#244C3E')
foot('Real Sage PDF page and detail. No additional app or game account required.','#244C3E')
#05 Cobalt
base(5,'Make it a blue-note evening.','Cobalt / crisp contrast with a confident splash of blue.','#182754','#FFFCF6')
card(3,568,188,337,angle=1)
rect(55,232,437,309,'#FFFFFF');crop(3,[40,290,555,530],69,246,408)
txt('Same game. A bolder mood.',57,579,25,'Times-Italic','#FFFCF6');txt('Three colors and Ink Saver come together.',57,625,14,'Helvetica','#FFFCF6')
foot('Real Cobalt PDF page and excerpt. Digital files only; no printed sheets are shipped.','#FFFCF6')
#06 InkSaver
base(6,'Print simple. Play beautifully.','Ink Saver / a dedicated black-and-white game page.','#F3F2EF','#242424')
card(4,75,182,338)
txt('Keep the ink for the checkmarks.',472,232,25,'Times-Italic','#242424')
for y,t in [(315,'Same 30 numbered prompts'),(363,'White background, no color fills'),(411,'No ribbon illustration'),(459,'Clear boxes and handwritten totals')]:txt(t,475,y,17,'Helvetica','#242424')
txt('Print one copy per guest.',475,556,23,'Times-Italic','#242424');txt('Host guide and score sheet have light cherry accents.',475,615,11.8,'Helvetica','#242424')
foot('Real Ink Saver page. Print at 100% / Actual Size on the matching paper.','#242424')
#07 scoring
base(7,'Three point levels. One clear total.','30 challenges: ten in each group. Every checked box counts once.','#8E1D3C','#FFF9F5')
for x,n,label in [(60,'1','10 PROMPTS'),(363,'5','10 PROMPTS'),(666,'10','10 PROMPTS')]:
 rect(x,199,274,160,'#F8E9ED');txt(n,x+87,214,78,'Times-Italic','#8E1D3C');txt(label,x+71,322,12,'Helvetica-Bold','#8E1D3C')
txt('10 x 1 + 10 x 5 + 10 x 10 = 160',92,405,36,'Times-Italic','#FFF9F5')
rect(55,491,890,147,'#FFFFFF');crop(1,[40,720,555,799],69,503,862)
txt('Example: 7 x 1 + 4 x 5 + 3 x 10 = 57',92,652,24,'Times-Italic','#FFF9F5')
foot('Add scores by hand. Highest score wins; ties share the win. No automatic calculation.','#FFF9F5')
#09 hostpages
base(9,'The host gets a head start.','Clear rules and a score sheet for twelve guests; print another for a larger group.','#E8EEE7','#244C3E')
card(5,131,181,326);card(6,543,181,326)
txt('HOST GUIDE',131,660,13,'Helvetica-Bold','#244C3E');txt('SCORE SHEET',543,660,13,'Helvetica-Bold','#244C3E')
foot('Actual included pages. Agree on a stop time, keep phones private and share a tie.','#244C3E')
#10 sizesdownload
base(10,'Your paper. Your party.','A4 and US Letter included. Choose the file that matches your printer paper.')
card(1,74,184,268);card(1,390,184,268,size='US_Letter')
txt('A4',75,585,20,'Times-Italic');txt('210 x 297 mm',75,618,13)
txt('US Letter',391,556,20,'Times-Italic');txt('8.5 x 11 inches',391,589,13)
rect(710,184,235,453,'#F4E1E6')
for y,head,sub in [(211,'01 / DOWNLOAD','ZIP from Etsy purchases'),(309,'02 / UNZIP','Choose A4 or US Letter'),(407,'03 / PRINT','100% / Actual Size'),(505,'04 / PLAY','Read the guide together')]:txt(head,730,y,13,'Helvetica-Bold');txt(sub,730,y+33,11.5)
txt('4 game-page looks. Static English PDFs. No physical product or editable template.',75,668,13)
foot('One private celebration license. Pens, phones, props and printing are not included.')
C.save()
d=fitz.open(R/'ads-working.pdf');assert len(d)==8
for i,p in enumerate(d):
 num=order[i];tmp=Path('/tmp')/f'phone-ad-v2-{num:02}.jpg';p.get_pixmap(matrix=fitz.Matrix(4,4),alpha=False).save(tmp);tmp.replace(R/'Ads'/f'{num:02}_Phone_Party_V2.jpg')
 for w in p.get_text('words'):assert w[0]>=0 and w[1]>=0 and w[2]<=1000 and w[3]<=750,w
(R/'ads_qa.json').write_text(json.dumps({'exact_page_composites':order,'dimensions':[4000,3000],'text_bounds':'PASS','illustrative_photos':[1,8]},indent=2))
print('8 exact PDF composite ads: 02-07,09-10')
