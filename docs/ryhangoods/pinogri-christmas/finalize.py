from pathlib import Path
from PIL import Image
import fitz,os,shutil,json,zipfile
r=Path(__file__).resolve().parent;sr=r.parents[1];(r/'Delivery').mkdir(exist_ok=True);(r/'Source_Generated').mkdir(exist_ok=True)
images={'01':'Рождественская ёлка с подписью Pinogri.png','04':'Роскошная рождественская реклама Pinogri(1).png','05':'Роскошная рождественская реклама Pinogri(2).png','06':'Роскошная рождественская витрина Pinogri.png'}
for n,name in images.items():
 src=sr/'recovered-christmas-images'/name;shutil.copy2(src,r/'Source_Generated'/f'{n}.png');im=Image.open(src).convert('RGB').resize((4000,3000),Image.Resampling.LANCZOS);im.save('/tmp/christmas-ad.jpg',quality=96);os.replace('/tmp/christmas-ad.jpg',r/'Christmas/Ads'/f'{n}_Christmas.jpg');im.resize((1400,1050)).save(r/'Christmas/Ads'/f'{n}_preview.jpg',quality=94)
d=fitz.open(r.parent/'christmas-restored/Christmas/Delivery/RyhanGoods_Christmas_Clipart_Download.pdf');p=d[0]
for box,text,size in [((187,240,365,287),'Pinogri',31),((268,313,475,331),'Your Pinogri digital download',8),((117,657,436,674),'Questions? Message Pinogri on Etsy.',10)]:
 p.draw_rect(fitz.Rect(box),color=None,fill=(1,.98,.95));p.insert_font(fontname='Brand',fontfile='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');p.insert_textbox(fitz.Rect(box),text,fontname='Brand',fontsize=size,align=1,color=(.125,.24,.21))
d.save('/tmp/christmas-delivery.pdf',garbage=4,deflate=True);os.replace('/tmp/christmas-delivery.pdf',r/'Delivery/Pinogri_Christmas_Clipart_Download.pdf');p.get_pixmap(matrix=fitz.Matrix(1.4,1.4)).save(r/'Delivery/preview.png');assert p.get_links()[0]['uri']=='https://drive.google.com/drive/folders/1ZakASkTSKKL7SRpvZ4P3R1AHdT549CMe'
meta=json.load(open(r.parent/'christmas-restored/Metadata/listings.json'))['Christmas'];meta['description']=meta['description'].replace('RyhanGoods','Pinogri');meta['pdf']='Pinogri_Christmas_Clipart_Download.pdf';meta.pop('etsy_url',None);meta['status']='prepared_not_uploaded';(r/'listing.json').write_text(json.dumps(meta,indent=2))
assert len(list((r/'Christmas/Ads').glob('*_Christmas.jpg')))==10
with zipfile.ZipFile('/tmp/christmas-owner.zip','w',zipfile.ZIP_DEFLATED) as z:
 for x in r.rglob('*'):
  if x.is_file() and x.suffix!='.zip':z.write(x,'Pinogri_Christmas/'+str(x.relative_to(r)))
 for x in (r.parent/'christmas-restored/Christmas').glob('*.png'):z.write(x,'Buyer_PNG/'+x.name)
with zipfile.ZipFile('/tmp/christmas-owner.zip') as z:assert z.testzip() is None
os.replace('/tmp/christmas-owner.zip',r/'Pinogri_Christmas_Owner_Resources.zip')
print('PDF', (r/'Delivery/Pinogri_Christmas_Clipart_Download.pdf').stat().st_size, '10 ads; ownerbackup', (r/'Pinogri_Christmas_Owner_Resources.zip').stat().st_size)
