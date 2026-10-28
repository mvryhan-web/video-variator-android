from pathlib import Path
from PIL import Image,ImageOps
import json,io,os,re,hashlib
R=Path(__file__).parent;c=json.loads((R/'checkpoint_work.json').read_text());fix={x['id']:x for x in json.loads((R/'recovery_map.json').read_text())}
for x in c['manifest']:
 if x['id'] in fix:x['source']=str(Path(fix[x['id']]['path']).resolve());x['source_library_id']=fix[x['id']]['library_file_id']
 i=Image.open(x['source']).convert('RGBA');a=i.getchannel('A');bb=a.point(lambda v:255 if v>3 else 0).getbbox();art=i.crop(bb);r=art.width/art.height;s=(4500,3000) if r>1.35 else ((3000,3000) if r>.88 else (3000,4500));o=Image.new('RGBA',s);t=ImageOps.contain(art,(int(s[0]*.9),int(s[1]*.9)),Image.Resampling.LANCZOS);o.alpha_composite(t,((s[0]-t.width)//2,(s[1]-t.height)//2));p=R/'Buyer_Files'/x['theme']/(x['id']+'_'+re.sub('[^a-z0-9]+','_',x['subject'].lower()).strip('_')+'.png');p.parent.mkdir(exist_ok=True,parents=True);b=io.BytesIO();o.save(b,format='PNG',dpi=(300,300),compress_level=6);data=b.getvalue();temp=p.with_suffix('.tmp');temp.write_bytes(data);assert temp.stat().st_size==len(data);os.replace(temp,p)
 with Image.open(p) as v:v.load()
 x.update(final=str(p.resolve()),final_px=list(s),actual_px=list(i.size),status='final_file_QA_passed',sha256=hashlib.sha256(data).hexdigest());print(x['id'],flush=True)
for p in (R/'Buyer_Files/Christmas').glob('*_Christmas.png'):p.unlink()
assert len(list((R/'Buyer_Files').rglob('*.png')))==100
(R/'product_manifest.json').write_text(json.dumps(c['manifest'],indent=2));c['status']='100 PNG files restored and verified; final delivery pending';(R/'checkpoint_work.json').write_text(json.dumps(c,indent=2))
