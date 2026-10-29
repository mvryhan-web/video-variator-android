from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
import fitz
ROOT=Path(__file__).resolve().parent
C=canvas.Canvas('/tmp/invitation-ads.pdf',pagesize=(1000,750))
def rect(x,y,w,h,color):
 C.setFillColor(HexColor(color));C.rect(x,750-y-h,w,h,fill=1,stroke=0)
def text(t,x,y,size=18,font='Helvetica',color='#19342D'):
 C.setFillColor(HexColor(color));C.setFont(font,size);C.drawString(x,750-y-size*.8,t)
def card(style,kind,x,y,w=210,mobile=False,angle=0):
 h=w*(16/9 if mobile else 7/5);path=ROOT/'Previews'/f'{style}_{"Mobile" if mobile else "Print"}_{kind:02}.png'
 C.saveState();C.translate(x,750-y);C.rotate(angle)
 C.setFillColor(HexColor('#000000'));C.setFillAlpha(.12);C.rect(5,-h-6,w,h,stroke=0,fill=1);C.setFillAlpha(1)
 C.drawImage(str(path),0,-h,width=w,height=h)
 C.setFillColor(HexColor('#68776A'));C.setFillAlpha(.25);C.setFont('Times-Italic',w*.14);C.drawCentredString(w/2,-h*.58,'Pinogri');C.restoreState()
def base(title,sub,bg='#F1EFE8',dark=False):
 rect(0,0,1000,750,bg);col='#F8F3E6' if dark else '#19342D'
 text('PINOGRI / THE WEDDING EDIT',66,37,10,'Helvetica',col)
 text(title,65,78,39,'Times-Roman',col);text(sub,66,133,14,'Helvetica',col)
def foot(t,dark=False):text(t,66,706,11,'Helvetica','#E7DECB' if dark else '#42564A');C.showPage()
# 01 actual product-referenced editorial cover
C.drawImage(str(ROOT/'Sources/hero.png'),0,0,1000,750);C.showPage()
# 02 full contents, 15 actual designs (adaptations do not inflate count)
base('One collection. Fifteen designs.','Invitation + Details + RSVP in each of five styles.')
styles=['Minimal','Woodland','Glamour','Vintage','Urban']
for col,s in enumerate(styles):
 for row in range(3):card(s,row+1,68+col*180,194+row*156,99)
 text(s,68+col*180,675,12,'Helvetica-Bold')
foot('Also includes matching 9:16 mobile adaptations. Every card shown is an actual file.')
# 03 minimal clean asymmetrical layout
base('Quietly elegant. Entirely yours.','MINIMAL / Beautiful typography, generous space and a coordinated suite.')
card('Minimal',1,80,197,305);card('Minimal',2,475,214,207);card('Minimal',3,710,318,207)
foot('Editable names, date, venue and wording. Three matching 5 x 7 inch layouts.')
# 04 woodland premium natural detail
base('For a love that grows.','WOODLAND / Watercolor ferns and delicate white anemones.','#E4E8DE')
card('Woodland',1,110,194,300,angle=3);card('Woodland',2,469,236,213,angle=-3);card('Woodland',3,726,284,205,angle=3)
foot('Botanical artwork is a fixed image; all invitation text remains editable.')
# 05 glamour dramatically dark
base('An evening to remember.','GLAMOUR / Deep emerald, warm ivory and flat gold-tone lines.','#102C28',True)
card('Glamour',2,80,280,219,angle=3);card('Glamour',1,345,188,311);card('Glamour',3,720,272,219,angle=-3)
foot('Flat digital colors, not metallic foil. Print sample before ordering a full run.',True)
# 06 vintage warm stationery
base('A beautiful new chapter.','VINTAGE / Warm parchment tones and a classic romantic mood.','#E3D2B9')
card('Vintage',1,105,212,283,angle=4);card('Vintage',2,438,254,250,angle=-2);card('Vintage',3,734,316,203,angle=-4)
foot('Invitation, celebration details and reply card. Edit once, export your own stationery.')
# 07 urban bold independent composition
base('City wedding. Bold beginning.','URBAN / Strong typography, clean rules and a vermilion accent.','#F1EEE8')
card('Urban',1,80,209,302);card('Urban',2,470,201,220);card('Urban',3,727,321,212)
foot('Use your own real ceremony, reception, address and RSVP details.')
# 08 exact editable workflow, one real page not fake UI
base('Your names. Your day.','Editable PPTX files with separate text boxes. No Canva link required.')
card('Woodland',1,70,198,320)
for y,n,heading,desc in [(225,'01','Choose a style','Open the Print or Mobile PPTX.'),(342,'02','Replace the sample text','Names, date, time, venue and website.'),(459,'03','Export your finished cards','PDF for print; JPG or PNG for sharing.')]:
 text(n,465,y,31,'Times-Italic');text(heading,526,y+2,20,'Helvetica-Bold');text(desc,526,y+37,13)
foot('Editable in compatible presentation software. Fonts may need substitution on your device.')
# 09 real proportions
base('From envelope to phone.','Two intentionally sized versions of every layout.')
card('Glamour',1,90,206,310);card('Glamour',1,523,187,255,mobile=True)
text('PRINT',90,667,12,'Helvetica-Bold');text('5 x 7 in / portrait',155,667,12)
text('MOBILE',523,667,12,'Helvetica-Bold');text('9:16 / 1080 x 1920 samples',590,667,12)
foot('Samples are filled examples. Personalize the editable templates before sending.')
# 10 honest contents and use, strong actual card alongside clear features
base('Ready to make it personal.','A digital stationery collection for one private wedding.')
card('Vintage',1,102,206,298)
for i,t in enumerate(['10 editable PPTX files','10 sample PDFs / 30 pages','15 mobile sample JPGs','Quick-start and editing instructions','Personal-use license for one wedding']):text(t,478,222+i*59,20,'Times-Roman')
text('No physical delivery, envelopes or printing.',478,559,13)
text('RSVP collection and wedding website not included.',478,586,12)
text('No automatic responses from an image file.',478,613,12)
foot('Instant digital files. No resale, redistribution or selling the templates.')
C.save()
doc=fitz.open('/tmp/invitation-ads.pdf')
for i,p in enumerate(doc):
 pix=p.get_pixmap(matrix=fitz.Matrix(4,4),alpha=False)
 tmp=Path('/tmp')/f'ad{i+1:02}.jpg';pix.save(tmp);tmp.replace(ROOT/'Ads'/f'{i+1:02}_Wedding_Invitations.jpg')
 q=Path('/tmp')/f'ad-preview-{i+1:02}.png';p.get_pixmap(matrix=fitz.Matrix(1,1),alpha=False).save(q);q.replace(ROOT/'Previews'/f'Ad_{i+1:02}.png')
print('10 individual JPG ads, each 4000 x 3000. Hero enlarged from native generator output; other pages rendered from precise layout.')
