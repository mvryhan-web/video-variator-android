from pathlib import Path
import json, os, tempfile
from PIL import Image
import vtracer, fitz
from svglib.svglib import svg2rlg
from reportlab.pdfgen import canvas
from reportlab.graphics import renderPDF
from reportlab.lib.pagesizes import A4, A3
from reportlab.lib.units import mm

ROOT=Path(__file__).resolve().parent

def build(source):
    item=source.stem
    target=ROOT/'Print_Proofs'/item
    target.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='retro-proof-') as work:
        work=Path(work)
        im=Image.open(source).convert('RGB')
        # Contour refinement, not a claim of newly generated native detail.
        im.quantize(colors=192).convert('RGB').save(work/'quantized.png')
        vtracer.convert_image_to_svg_py(str(work/'quantized.png'),str(work/'art.svg'),
            colormode='color',hierarchical='stacked',mode='spline',filter_speckle=2,
            color_precision=8,layer_difference=2,corner_threshold=60,
            length_threshold=1.5,max_iterations=10,splice_threshold=45,path_precision=3)
        drawing=svg2rlg(str(work/'art.svg'))
        metrics={'source_pixels':list(im.size),'method':'192-color contour conversion; no new native illustration detail',
                 'status':'PRINT_PROOF_REQUIRES_VISUAL_QA','outputs':[]}
        for name,size in [('A4',A4),('A3',A3)]:
            pdf=work/(item+'_'+name+'.pdf')
            c=canvas.Canvas(str(pdf),pagesize=size,pageCompression=1)
            c.setTitle(item+' - '+name+' print proof')
            c.setAuthor('Pinogri')
            c.setSubject('Original AI-assisted illustration, contour-refined print proof')
            # White 6mm printer-safe surround; no important art is cropped.
            margin=6*mm
            scale=min((size[0]-2*margin)/drawing.width,(size[1]-2*margin)/drawing.height)
            c.saveState();c.translate((size[0]-drawing.width*scale)/2,(size[1]-drawing.height*scale)/2)
            c.scale(scale,scale);renderPDF.draw(drawing,c,0,0);c.restoreState();c.showPage();c.save()
            doc=fitz.open(pdf)
            assert len(doc)==1 and len(doc[0].get_images())==0
            preview=work/(item+'_'+name+'_preview.png')
            doc[0].get_pixmap(matrix=fitz.Matrix(1.25,1.25),alpha=False).save(preview)
            for artifact in (pdf,preview):os.replace(artifact,target/artifact.name)
            metrics['outputs'].append({'paper':name,'page_points':list(doc[0].rect),'raster_objects':0,
                                      'vector_paths':len(doc[0].get_drawings()),'pdf_bytes':(target/pdf.name).stat().st_size})
        (target/'qa.json').write_text(json.dumps(metrics,indent=2))
    return metrics

if __name__=='__main__':
    import sys
    for arg in sys.argv[1:]:
        print(arg,build(ROOT/'Sources'/(arg+'.png')),flush=True)
