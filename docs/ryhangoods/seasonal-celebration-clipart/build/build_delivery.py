from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader
R=Path(__file__).parent;P=R/'Delivery/RyhanGoods_Seasonal_Clipart_Download.pdf';url='https://drive.google.com/drive/folders/1Y8WWBnGHqzQ_F3yscMa_rD1V-I70-IPe'
pdfmetrics.registerFont(TTFont('DV','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'));pdfmetrics.registerFont(TTFont('DVB','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
w,h=551.5,713;c=canvas.Canvas(str(P),pagesize=(w,h));c.setTitle('RyhanGoods | 100 Seasonal Clipart | Download Instructions');c.drawImage(ImageReader('template-current/RyhanGoodsinstr(5).png'),0,0,w,h)
# Cover only the placeholder area in the owner's reusable template.
c.setFillColorRGB(.995,.975,.938);c.roundRect(101,142,350,35,5,fill=1,stroke=0);c.setFillColorRGB(.18,.34,.29);c.roundRect(111,143,330,33,7,fill=1,stroke=0);c.setFillColorRGB(1,1,1);c.setFont('DVB',13);c.drawCentredString(w/2,154,'DOWNLOAD YOUR 100 PNG FILES');c.linkURL(url,(101,140,451,177),relative=0,thickness=0)
c.setFont('DV',6.2);c.setFillColorRGB(.15,.22,.2);c.drawCentredString(w/2,134,'Christmas 25 | Halloween 25 | Birthday 25 | Wedding 25');c.save()
r=PdfReader(P);assert len(r.pages)==1;assert r.pages[0]['/Annots'][0].get_object()['/A']['/URI']==url;print(P)
