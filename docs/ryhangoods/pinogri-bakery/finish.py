from pathlib import Path
import fitz,zipfile,os,tempfile,json,hashlib
P=Path(__file__).resolve().parent
src=fitz.open(P.parent.parent/'three-restored/RyhanGoods_Bakery_Kit_Download.pdf');d=fitz.open();pg=d.new_page(width=1103,height=1426);pg.insert_image(pg.rect,stream=src[0].get_pixmap().tobytes('png'))
for box,t,n in [((375,480,735,575),'Pinogri',48),((540,630,970,665),'Your Pinogri digital download',21),((235,1305,910,1350),'Questions? Message Pinogri on Etsy.',25)]:
 r=fitz.Rect(box);pg.draw_rect(r,fill=(1,.98,.95),color=None);assert pg.insert_textbox(r,t,fontsize=n,fontname='Times-Roman',align=1,color=(.08,.22,.18))>=0
url='https://drive.google.com/drive/folders/1LUYid9-idi-QMZQBjHbOlIh3H7_S_iTf';pg.insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(185,1060,925,1155),'uri':url});d.set_metadata({'author':'Pinogri','title':'Pinogri Bakery Kit Download'});d.save(P/'Delivery/Pinogri_Bakery_Kit_Download.pdf',garbage=4,deflate=True);pg.get_pixmap(matrix=fitz.Matrix(.7,.7)).save(P/'Previews/delivery.png')
fd,tmp=tempfile.mkstemp(suffix='.zip');os.close(fd)
with zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED,6) as z:
 for f in sorted((P/'Buyer').rglob('*')):
  if f.is_file():z.write(f,f.relative_to(P/'Buyer'))
with zipfile.ZipFile(tmp) as z:assert len(z.namelist())==31 and z.testzip() is None
dest=P/'Pinogri_Bakery_Business_Kit.zip';os.replace(tmp,dest)
listing=json.loads((P/'restored/listing.json').read_text());listing['description']=listing['description'].replace('image 8 shows','image 2 shows')+'\n\nThe five bakery illustrations were created with AI assistance and selected for this collection. Please message Pinogri on Etsy for file support.'
assert len(listing['tags'])==13 and all(len(t)<=20 for t in listing['tags']);(P/'listing.json').write_text(json.dumps(listing,ensure_ascii=False,indent=2))
report={'buyer_entries':31,'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'CRC':'PASS','PPTX_unchanged':True,'ads':10,'old_etsy_id':'4604040102','new_etsy_id':None,'status':'FILES_READY_BROWSER_BLOCKED','folder':'1LUYid9-idi-QMZQBjHbOlIh3H7_S_iTf','zip':'1gJmpjmwB9GKMFQ7HeEADg_Z_R8ocBPId','limitations':'Native PowerPoint render not tested; mockups illustrative; exact25layouts ad02; AI cover/photo ads exported enlarged from1448x1086; other ads4000x3000 exact page composition.'};(P/'CHECKPOINT.json').write_text(json.dumps(report,indent=2));print(report)
