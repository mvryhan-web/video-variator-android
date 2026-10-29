from pathlib import Path
import fitz,json
P=Path(__file__).resolve().parent
for d in ['Buyer','Pages/A4','Pages/US_Letter','Ads','Previews','Delivery','Sources']: (P/d).mkdir(parents=True,exist_ok=True)
for size in ['A4','US_Letter']:
    doc=fitz.open(P/f'original/Monthly_Budget_Planner_{size}.pdf')
    for page in doc:
        replacements=[]
        for b in page.get_text('dict')['blocks']:
            for l in b.get('lines',[]):
                for s in l['spans']:
                    if 'RYHANGOODS' in s['text']:
                        replacements.append((s,s['text'].replace('RYHANGOODS','PINOGRI').replace('US_Letter','US LETTER')))
                        page.add_redact_annot(fitz.Rect(s['bbox']),fill=(1,1,1))
        page.apply_redactions(images=0,graphics=0)
        for s,t in replacements:
            color=tuple(((s['color']>>v)&255)/255 for v in [16,8,0])
            page.insert_text(s['origin'],t,fontsize=s['size'],fontname='helv',color=color)
    doc.set_metadata({'title':f'Pinogri Monthly Budget Planner - {size.replace("_"," ")}','author':'Pinogri','subject':'12 undated print-and-handwrite pages; personal use','creator':'Pinogri'})
    target=P/f'Buyer/Pinogri_Monthly_Budget_{size}.pdf';doc.save(target,garbage=4,deflate=True);doc.close()
    doc=fitz.open(target)
    assert len(doc)==12
    for i,page in enumerate(doc):
        assert 'RYHAN' not in page.get_text().upper()
        assert not list(page.widgets() or [])
        page.get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(P/f'Pages/{size}/{i+1:02}.png')
readme=(P/'original/READ_ME_LICENSE.txt').read_text().replace('RyhanGoods','Pinogri').replace('RYHANGOODS','PINOGRI')
(P/'Buyer/READ_ME_LICENSE.txt').write_text(readme)
print(readme)
