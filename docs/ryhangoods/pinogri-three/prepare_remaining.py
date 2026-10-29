from pathlib import Path
import fitz,json
R=Path(__file__).resolve().parent
for product,source in [('pinogri-newspaper','restored/Buyer_Files'),('pinogri-midnight','original')]:
 p=R/product
 for d in ['Buyer','Ads','Sources','Delivery','QA','Pages']:(p/d).mkdir(exist_ok=True)
 for f in (p/source).rglob('*'):
  if not f.is_file():continue
  dest=p/'Buyer'/f.relative_to(p/source);dest.parent.mkdir(parents=True,exist_ok=True)
  if f.suffix=='.pdf':
   d=fitz.open(f)
   for pg in d:
    replacements=[]
    for b in pg.get_text('dict')['blocks']:
     for l in b.get('lines',[]):
      for s in l['spans']:
       if 'ryhangoods' in s['text'].lower():
        replacements.append((s,s['text'].replace('RYHANGOODS','PINOGRI').replace('RyhanGoods','Pinogri')));pg.add_redact_annot(fitz.Rect(s['bbox']),fill=(1,1,1))
    if replacements:
     pg.apply_redactions(images=0,graphics=0)
     for s,t in replacements:
      c=tuple(((s['color']>>v)&255)/255 for v in [16,8,0]);pg.insert_text(s['origin'],t,fontsize=s['size'],fontname='helv',color=c)
   meta=d.metadata;meta.update(author='Pinogri',creator='Pinogri');d.set_metadata(meta);d.save(dest,garbage=4,deflate=True)
   d=fitz.open(dest)
   for i,pg in enumerate(d):
    assert 'ryhangoods' not in pg.get_text().lower()
    target=p/'Pages'/f.stem;target.mkdir(exist_ok=True);pg.get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(target/f'{i+1:02}.png')
  elif f.suffix=='.txt':dest.write_text(f.read_text().replace('RYHANGOODS','PINOGRI').replace('RyhanGoods','Pinogri'))
  else:dest.write_bytes(f.read_bytes())
 print(product,'rebranded separate buyer copies')
