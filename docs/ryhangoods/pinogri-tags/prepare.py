from pathlib import Path
import fitz,os,json
R=Path(__file__).resolve().parent;W=R.parent.parent
for d in ['Ads','Previews','Delivery','Sources','Print_QA']:(R/d).mkdir(exist_ok=True)
import zipfile
with zipfile.ZipFile(W/'tags-restored/RyhanGoods_Christmas_Gift_Tags_24.zip') as z:z.extractall(R/'buyer')
for f in (R/'buyer').glob('*.pdf'):
 doc=fitz.open(f)
 for pg in doc:
  rs=pg.search_for('RyhanGoods')
  for b in pg.get_text('blocks'):
   if 'RyhanGoods' in b[4]:
    rect=fitz.Rect(b[:4]);pg.add_redact_annot(rect,fill=(1,1,1))
  pg.apply_redactions(images=0,graphics=0)
  label='A4' if 'A4' in f.name else 'US Letter'
  t=f'Pinogri | {label} | Print at 100% / Actual Size | 2 x 3 in tags | Page {pg.number+1}/3'
  pg.insert_textbox(fitz.Rect(50,pg.rect.height-31,pg.rect.width-50,pg.rect.height-13),t,fontname='helv',fontsize=8,align=1,color=(.35,.35,.35))
 for pg in doc:
  for info in pg.get_image_info():
   x0,y0,x1,y1=info['bbox']
   for x,sx in [(x0,-1),(x1,1)]:
    for y,sy in [(y0,-1),(y1,1)]:
     pg.draw_line((x+sx*2,y),(x+sx*6,y),color=(.38,.38,.38),width=.35)
     pg.draw_line((x,y+sy*2),(x,y+sy*6),color=(.38,.38,.38),width=.35)
 doc.set_metadata({'title':'Pinogri - 24 Christmas Gift Tags - '+label,'author':'Pinogri','subject':'Printable 2 x 3 inch tags - personal use','creator':'Pinogri'})
 temp=Path('/tmp')/f.name;doc.save(temp,garbage=4,deflate=True);doc.close();os.replace(temp,f)
 d=fitz.open(f)
 for i,p in enumerate(d):
  assert 'Ryhan' not in p.get_text();p.get_pixmap(matrix=fitz.Matrix(1.2,1.2)).save(R/'Print_QA'/f'{label.replace(" ","_")}_{i+1}.png')
 # Check every inserted tag is exactly 144x216 points /2x3in.
 for p in d:
  boxes=[b['bbox'] for b in p.get_image_info()];assert len(boxes)==(9 if p.number<2 else 6)
  for b in boxes:assert abs((b[2]-b[0])-144)<.02 and abs((b[3]-b[1])-216)<.02
f=R/'buyer/READ_ME_LICENSE.txt';f.write_text(f.read_text().replace('RYHANGOODS','PINOGRI').replace('RyhanGoods','Pinogri'))
source=fitz.open(W/'tags-restored/RyhanGoods_Christmas_Gift_Tags_Download.pdf');old=source[0];print('Delivery source',old.rect,old.get_links())
doc=fitz.open();p=doc.new_page(width=old.rect.width,height=old.rect.height);p.insert_image(p.rect,stream=old.get_pixmap(matrix=fitz.Matrix(1,1)).tobytes('png'))
for box,text,size in [((375,480,735,575),'Pinogri',48),((540,630,970,665),'Your Pinogri digital download',21),((235,1305,910,1350),'Questions? Message Pinogri on Etsy.',25)]:
 p.draw_rect(fitz.Rect(box),fill=(1,.98,.95),color=None);n=p.insert_textbox(fitz.Rect(box),text,fontsize=size,fontname='Times-Roman',align=1,color=(.08,.22,.18));assert n>=0
p.insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(190,1065,920,1150),'uri':'https://drive.google.com/drive/folders/1RBm0fL9Nsgn-NdJOgqXmO_Lozmk6tq2N'})
doc.set_metadata({'title':'Pinogri Christmas Gift Tags - Download Guide','author':'Pinogri','subject':'24 designs - PDF and JPG - personal use'})
doc.save('/tmp/Pinogri_Christmas_Gift_Tags_Download.pdf',garbage=4,deflate=True);os.replace('/tmp/Pinogri_Christmas_Gift_Tags_Download.pdf',R/'Delivery/Pinogri_Christmas_Gift_Tags_Download.pdf');p.get_pixmap(matrix=fitz.Matrix(.8,.8)).save(R/'Delivery/preview.png')
print('Print layouts rebranded; all24tag image boxes measure2x3in in both sizes')
