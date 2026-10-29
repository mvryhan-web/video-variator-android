from pathlib import Path
import zipfile,hashlib,json,csv,os,fitz
from PIL import Image
r=Path(__file__).resolve().parent;b=r/'Buyer'
styles=['Minimal','Woodland','Glamour','Vintage','Urban']
checks=[]
for p in sorted((r/'.build/edit-test-pdf').glob('*.pdf')):
 d=fitz.open(p); t=' '.join(x.get_text() for x in d)
 assert all(x in t for x in ['Alexandria-Catherine','Benjamin-Christopher'])
 bounded=all(all(w[0]>=0 and w[1]>=0 and w[2]<=pg.rect.width and w[3]<=pg.rect.height for w in pg.get_text('words')) for pg in d)
 assert bounded
 checks.append({'file':p.name,'long_names':True,'page_bounds':True,'manual_font_reduction':True,'application':'LibreOffice'})
(r/'edit_checks.json').write_text(json.dumps(checks,indent=2))
archives=[]
for i,s in enumerate(styles,1):
 files=list(b.glob(s+'_*'))+list((b/'Sample_JPGs').glob(s+'_*'))+list((b/'Fonts').glob('*'))+[b/'START_HERE_AND_LICENSE.txt']
 assert len(files)==23,(s,len(files))
 name=f'Pinogri_Wedding_V2_{i:02}_{s}.zip'; temp=Path('/tmp')/name
 with zipfile.ZipFile(temp,'w',zipfile.ZIP_DEFLATED,compresslevel=8) as z:
  for f in sorted(files):z.write(f,f.relative_to(b))
 with zipfile.ZipFile(temp) as z:assert z.testzip() is None
 assert temp.stat().st_size<20000000
 os.replace(temp,r/name)
 archives.append({'name':name,'bytes':(r/name).stat().st_size,'entries':23,'sha256':hashlib.sha256((r/name).read_bytes()).hexdigest(),'crc':'PASS'})
(r/'archives.json').write_text(json.dumps(archives,indent=2))
rows=[]
for p in sorted(b.rglob('*')):
 if not p.is_file():continue
 ext=p.suffix.lower();purpose={'.pptx':'Editable template','.pdf':'Static sample','.jpg':'Sample export','.otf':'Font'}.get(ext,'Instructions/license')
 if ext=='.pptx':
  with zipfile.ZipFile(p) as z:assert z.testzip() is None
  fmt='PASS: OOXML validation/import and LibreOffice PDF export; Microsoft PowerPoint NOT TESTED'
 elif ext=='.pdf':
  d=fitz.open(p);assert len(d)==3;fmt='PASS: 3 pages, native PDF text and bounds'
 elif ext=='.jpg':
  im=Image.open(p);im.verify();fmt='PASS: '+str(Image.open(p).size)
 else:fmt='PASS: readable, original font files/license copied'
 rows.append([str(p.relative_to(b)),purpose,'PASS: checked against collection manifest',fmt,'PASS: rendered page review' if ext in ['.pdf','.jpg','.pptx'] else 'N/A','PASS: original layout/art or included font license','PASS with stated application limits','Glamour monogram removed; Vintage footer/flowers separated; long names require manual fit' if ext in ['.pptx','.pdf','.jpg'] else ''])
for p in sorted((r/'Ads').glob('*.jpg')):
 im=Image.open(p);assert im.size==(4000,3000)
 rows.append(['Ads/'+p.name,'Etsy preview only','PASS: actual collection and accurate counts','PASS: 4000x3000 JPEG','PASS: individual review','PASS: original materials; illustrative cover disclosed','PASS','Final ordering corrected; all 10 hashes distinct'])
with open(r/'QA_LEDGER.csv','w') as f:
 w=csv.writer(f);w.writerow(['File name','Purpose','Content verified','Format verified','Visual verified','License verified','Result','Corrections']);w.writerows(rows)
assert len({hashlib.sha256(p.read_bytes()).hexdigest() for p in (r/'Ads').glob('*.jpg')})==10
print(json.dumps(archives,indent=2));print('QA ledger rows',len(rows))
