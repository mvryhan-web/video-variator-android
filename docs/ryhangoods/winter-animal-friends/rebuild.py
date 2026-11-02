"""Rebuild approved coloring files from final_sources.json.
Requires pillow, vtracer, svglib, reportlab, pymupdf.
Recover each referenced source image from this conversation before running.
Paths in source metadata are historical; keep original source bytes.
"""
from pathlib import Path
import json, os, tempfile, shutil, zipfile
from PIL import Image
import vtracer, fitz
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPDF
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.pagesizes import A4, letter
ROOT=Path(__file__).resolve().parent

def png(im,dst,**kw):
    fd,t=tempfile.mkstemp(suffix='.png'); os.close(fd)
    im.save(t,**kw)
    with Image.open(t) as v:v.load()
    os.replace(t,dst)

def main():
    records=json.loads((ROOT/'final_sources.json').read_text())
    assert len(records)==40
    for name in ['Sources','Vectors','Buyer_PNG','Buyer_PDF','Previews_A4','Previews_Letter','Delivery']:
        (ROOT/name).mkdir(exist_ok=True)
    drawings=[]
    for r in records:
        n=f"{r['id']:02}"
        src=ROOT/'Sources'/f'{n}.png'
        if not src.exists():shutil.copy2(r['source'],src)
        im=Image.open(src).convert('L'); im.load()
        clean=ROOT/'Vectors'/f'{n}-threshold.png'
        png(im.point(lambda x:0 if x<170 else 255).convert('RGB'),clean)
        svg=ROOT/'Vectors'/f'{n}.svg'
        vtracer.convert_image_to_svg_py(str(clean),str(svg),colormode='binary',
            mode='spline',filter_speckle=4,corner_threshold=60,length_threshold=4,
            splice_threshold=45,path_precision=3)
        drawings.append(svg2rlg(str(svg)))
    for label,size in [('A4',A4),('US_Letter',letter)]:
        fd,t=tempfile.mkstemp(suffix='.pdf');os.close(fd)
        c=Canvas(t,pagesize=size,pageCompression=1)
        c.setTitle('Christmas & Winter Animal Friends - 40 Coloring Pages')
        c.setAuthor('Pinogri')
        c.setSubject('40 coloring scenes; ages 3-8; 20 Christmas and 20 winter')
        w,h=size;m=36
        for d in drawings:
            s=min((w-2*m)/d.width,(h-2*m)/d.height)
            c.saveState();c.translate((w-d.width*s)/2,(h-d.height*s)/2)
            c.scale(s,s);renderPDF.draw(d,c,0,0);c.restoreState();c.showPage()
        c.save();doc=fitz.open(t);assert len(doc)==40
        dest=ROOT/('Previews_A4' if label=='A4' else 'Previews_Letter')
        for i,page in enumerate(doc,1):
            assert not page.get_images()
            assert abs(page.rect.width-w)<.02 and abs(page.rect.height-h)<.02
            pm=page.get_pixmap(dpi=120,colorspace=fitz.csGRAY)
            png(Image.frombytes('L',(pm.width,pm.height),pm.samples),dest/f'{i:02}.png')
            if label=='A4':
                pm=page.get_pixmap(dpi=300,colorspace=fitz.csGRAY)
                im=Image.frombytes('L',(pm.width,pm.height),pm.samples)
                assert im.size==(2481,3508)
                name=f"{i:02}_{'Christmas' if i<=20 else 'Winter'}.png"
                png(im,ROOT/'Buyer_PNG'/name,dpi=(300,300),optimize=True)
        doc.close()
        os.replace(t,ROOT/'Buyer_PDF'/f'Pinogri_Christmas_Winter_40_{label}.pdf')
    for label,start,end in [('Christmas',1,20),('Winter',21,40)]:
        fd,t=tempfile.mkstemp(suffix='.zip');os.close(fd)
        with zipfile.ZipFile(t,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
            for i in range(start,end+1):
                f=next((ROOT/'Buyer_PNG').glob(f'{i:02}_*.png'));z.write(f,f.name)
            for name in ['START_HERE.txt','LICENSE.txt']:z.write(ROOT/name,name)
        with zipfile.ZipFile(t) as z:assert z.testzip() is None and len(z.namelist())==22
        assert os.path.getsize(t)<20_000_000
        os.replace(t,ROOT/'Delivery'/f'Pinogri_{label}_20_PNG.zip')
    print('Export complete. Recheck each file; physical printing NOT TESTED.')
if __name__=='__main__':main()
