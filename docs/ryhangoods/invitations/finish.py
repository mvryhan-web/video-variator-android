from pathlib import Path
import json,zipfile,hashlib
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
import fitz
ROOT=Path(__file__).resolve().parent
URL='https://drive.google.com/drive/folders/1lM2ws-C1ScN6Xwn_qz1WnvjuKHYRjaDW'
def buyer_zip():
 files=sorted(f for f in (ROOT/'Buyer').rglob('*') if f.is_file());assert len(files)==36
 tmp=Path('/tmp/Pinogri_Wedding_Invitation_Collection.zip')
 with zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED) as z:
  for f in files:z.write(f,f.relative_to(ROOT/'Buyer'))
 with zipfile.ZipFile(tmp) as z:assert z.testzip() is None
 obj={'files':[str(f.relative_to(ROOT/'Buyer')) for f in files],'zip_entries':len(files),'bytes':tmp.stat().st_size,'sha256':hashlib.sha256(tmp.read_bytes()).hexdigest(),'crc':'PASS'}
 tmp.replace(ROOT/tmp.name);(ROOT/'buyer_manifest.json').write_text(json.dumps(obj,indent=2));return obj
def delivery():
 (ROOT/'Delivery').mkdir(exist_ok=True)
 out=ROOT/'Delivery/Pinogri_Wedding_Invitations_Download.pdf';tmp=Path('/tmp')/out.name
 c=canvas.Canvas(str(tmp),pagesize=(551.5,713));c.setAuthor('Pinogri');c.setCreator('Pinogri');c.setTitle('Pinogri - Wedding Invitation Collection Download');c.scale(.5,.5)
 c.drawImage(str(ROOT.parents[1]/'invitation-template/RyhanGoodsinstr(5).png'),0,0,1103,1426)
 def box(x,top,w,h):c.setFillColor(HexColor('#FFFAF2'));c.rect(x,1426-top-h,w,h,fill=1,stroke=0)
 def text(t,x,top,size,font='Helvetica',center=False):
  c.setFillColor(HexColor('#173F35'));c.setFont(font,size)
  (c.drawCentredString if center else c.drawString)(x,1426-top,t)
 box(370,482,385,96);text('Pinogri',551.5,552,70,'Times-Italic',True)
 box(535,626,400,35);text('Your Pinogri digital stationery collection',541,651,17)
 box(240,1003,625,52);text('WEDDING INVITATION COLLECTION',551.5,1041,25,'Helvetica-Bold',True)
 box(205,1075,700,70);c.setFillColor(HexColor('#173F35'));c.roundRect(220,1426-1142,664,62,15,fill=1,stroke=0)
 c.setFillColor(HexColor('#FFFFFF'));c.setFont('Helvetica-Bold',27);c.drawCentredString(552,1426-1121,'DOWNLOAD YOUR FILES')
 c.linkURL(URL,(220,1426-1142,884,1426-1080),relative=1,thickness=0)
 box(232,1310,643,40);text('Questions? Please message Pinogri on Etsy.',551.5,1337,21,'Helvetica',True)
 c.showPage();c.save();tmp.replace(out)
 d=fitz.open(out);assert d[0].get_links()[0]['uri']==URL
 p=Path('/tmp/invitation-delivery.png');d[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False).save(p);p.replace(ROOT/'Previews/Delivery.png')
 print(out)
if __name__=='__main__':print(json.dumps(buyer_zip()));delivery()
