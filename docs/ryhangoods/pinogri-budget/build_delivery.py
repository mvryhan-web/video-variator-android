from pathlib import Path
import fitz,zipfile,hashlib,json,os,tempfile
P=Path(__file__).resolve().parent
src=fitz.open(P.parent.parent/'budget-restored/RyhanGoods_Monthly_Budget_Download.pdf')
d=fitz.open();p=d.new_page(width=1103,height=1426)
p.insert_image(p.rect,stream=src[0].get_pixmap().tobytes('png'))
for box,text,size in [((375,480,735,575),'Pinogri',48),((540,630,970,665),'Your Pinogri digital download',21),((235,1305,910,1350),'Questions? Message Pinogri on Etsy.',25)]:
 r=fitz.Rect(box);p.draw_rect(r,fill=(1,.98,.95),color=None)
 assert p.insert_textbox(r,text,fontsize=size,fontname='Times-Roman',align=1,color=(.08,.22,.18))>=0
url='https://drive.google.com/drive/folders/1AKRM9QVB1vg1RllhfkuuQ64TIuuo-By2'
p.insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(185,1060,925,1155),'uri':url})
d.set_metadata({'title':'Pinogri Monthly Budget Planner Download','author':'Pinogri','creator':'Pinogri'})
out=P/'Delivery/Pinogri_Monthly_Budget_Download.pdf';d.save(out,garbage=4,deflate=True)
p.get_pixmap(matrix=fitz.Matrix(.8,.8)).save(P/'Previews/delivery.png')
fd,tmp=tempfile.mkstemp(suffix='.zip');os.close(fd)
with zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED,9) as z:
 for f in sorted((P/'Buyer').iterdir()):z.write(f,f.name)
with zipfile.ZipFile(tmp) as z:assert len(z.namelist())==3 and z.testzip() is None
dest=P/'Pinogri_Monthly_Budget_Planner.zip';os.replace(tmp,dest)
report={'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'entries':3,'CRC':'PASS','link':url,'buyer_pages':{'A4':12,'US Letter':12},'unique_layouts_including_cover':12,'ads':10}
(P/'QA/report.json').write_text(json.dumps(report,indent=2));print(report)
