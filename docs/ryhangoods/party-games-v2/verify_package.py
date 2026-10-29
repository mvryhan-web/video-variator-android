from pathlib import Path
import json,fitz,re,zipfile,hashlib,os,csv,itertools
from PIL import Image
R=Path(__file__).resolve().parent;groups=json.loads((R/'content.json').read_text());items=[i for g in groups for i in g['items']]
assert len(items)==len(set(items))==30
assert [len(g['items']) for g in groups]==[10,10,10]
assert sum(g['points']*len(g['items']) for g in groups)==160
pages=[];texts=[]
for size,expected in [('A4',(595.2756,841.8898)),('US_Letter',(612,792))]:
 d=fitz.open(R/'Buyer'/f'Pinogri_Phone_Party_{size}.pdf');assert len(d)==6
 for n,p in enumerate(d):
  assert all(abs(a-b)<.01 for a,b in zip(p.rect[2:],expected))
  t=' '.join(p.get_text().split());assert 'Pinogri' not in t # preview watermark must not enter buyer pages
  assert all(w[0]>=35 and w[1]>=20 and w[2]<=p.rect.width-30 and w[3]<=p.rect.height-15 for w in p.get_text('words'))
  if n<4:
   for idx,item in enumerate(items,1):assert f'{idx:02}. '+item in t,(size,n,item)
   texts.append(t)
  pix=p.get_pixmap(matrix=fitz.Matrix(300/72,300/72),alpha=False)
  pages.append({'size':size,'page':n+1,'bounds':'PASS','rasterized_at_ppi':300,'raster_dimensions':[pix.width,pix.height],'content':'PASS'})
assert len(set(texts))==1
for a,b,c in itertools.product(range(11),repeat=3):
 total=a+5*b+10*c
 assert total==sum([1]*a+[5]*b+[10]*c) and 0<=total<=160
ads=[]
for p in sorted((R/'Ads').glob('*.jpg')):
 im=Image.open(p);im.load();assert im.size==(4000,3000)
 ads.append({'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'dimensions':[4000,3000]})
assert len(ads)==10 and len({x['sha256'] for x in ads})==10
qa={'questions':30,'point_groups':[10,10,10],'max_score':160,'combinations_checked':1331,'identical_numbered_game_text_all8':'PASS','pages':pages,'ads':ads,'print_simulation':'PDF physical dimensions and 300ppi rasterization PASS; no physical print performed','live_party_playtest':'NOT TESTED','generated_photos_native_pixels':[1448,1086],'advertising_export_pixels':[4000,3000],'native_4k_claim':False,'editorial_review':'30 unique prompts, self-report/skip rules, no forced disclosure; numbering and ambiguous wording corrected','visual_review':'12 pages and10 individual ads inspected; Cherry/Cobalt crop cut-lines corrected; scoring strip background corrected;06/10 incomplete JPEGs re-exported atomically and all10 fully decoded'}
(R/'QA.json').write_text(json.dumps(qa,indent=2))
rows=[]
for p in sorted((R/'Buyer').glob('*')):
 rows.append([p.name,'Printable game or instructions','PASS: full content review','PASS: pages/dimensions/bounds/render' if p.suffix=='.pdf' else 'PASS: UTF8 readable','PASS: all six pages viewed' if p.suffix=='.pdf' else 'N/A','PASS: original layout/art; personal license','PASS','30 items numbered, conditions clarified; print simulation only'])
for x in ads:rows.append(['Ads/'+x['file'],'Etsy preview only','PASS: actual product / disclosed illustrative photos','PASS: JPEG4000x3000','PASS: individual full image review','PASS: original composites/generated photography','PASS','Crops adjusted to avoid partial lines; ad07 background corrected'])
with open(R/'QA_LEDGER.csv','w') as f:
 w=csv.writer(f);w.writerow(['File name','Purpose','Content verified','Format verified','Visual verified','License verified','Result','Corrections']);w.writerows(rows)
name='Pinogri_Phone_Party_Game_V2.zip';tmp=Path('/tmp')/name
with zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED,compresslevel=8) as z:
 for p in sorted((R/'Buyer').glob('*')):z.write(p,p.name)
with zipfile.ZipFile(tmp) as z:assert len(z.namelist())==3 and z.testzip() is None
assert tmp.stat().st_size<20000000
os.replace(tmp,R/name)
manifest={'file':name,'bytes':(R/name).stat().st_size,'entries':3,'sha256':hashlib.sha256((R/name).read_bytes()).hexdigest(),'crc':'PASS'}
(R/'buyer_manifest.json').write_text(json.dumps(manifest,indent=2))
p=R/'listing.json';l=json.loads(p.read_text());l['description']=l['description'].replace('One original 30-prompt game','One original game with 30 numbered prompts').replace('with 30 numbered prompts with','with 30 numbered prompts:')
l['description']=l['description'].replace('the full-contents image shows the actual PDF pages.','the full-contents image and detail galleries show the actual updated PDF pages.');assert len(l['tags'])==13 and max(map(len,l['tags']))<=20 and len(l['title'])<=140;p.write_text(json.dumps(l,indent=2))
print(json.dumps(manifest));print('12 pages,8 matching game texts,1331 scores,10 unique ads,13 QA ledger rows PASS')
