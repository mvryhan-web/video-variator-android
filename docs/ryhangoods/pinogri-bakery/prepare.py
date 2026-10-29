from pathlib import Path
import fitz,json,shutil,hashlib
P=Path(__file__).resolve().parent
for folder in ['Buyer','Ads','Previews','Sources','Delivery','QA']: (P/folder).mkdir(exist_ok=True)
for f in (P/'restored/Buyer_Files').rglob('*'):
 if not f.is_file():continue
 target=P/'Buyer'/f.relative_to(P/'restored/Buyer_Files');target.parent.mkdir(parents=True,exist_ok=True)
 if f.suffix=='.pdf':
  d=fitz.open(f);meta=d.metadata;meta.update(author='Pinogri',creator='Pinogri');d.set_metadata(meta);d.save(target,garbage=4,deflate=True)
 elif f.suffix=='.txt':target.write_text(f.read_text().replace('RYHANGOODS','PINOGRI').replace('RyhanGoods','Pinogri'))
 else:target.write_bytes(f.read_bytes())
for f in (P/'Buyer').glob('*.pptx'):
 assert f.read_bytes()==(P/'restored/Buyer_Files'/f.name).read_bytes()
print('Buyer files prepared; PPTX unchanged, sample PDF metadata and guide rebranded')
