from pathlib import Path
import fitz,json,shutil,collections,re,zipfile,hashlib,os
from PIL import Image
R=Path(__file__).resolve().parent
styles=['Minimal','Woodland','Glamour','Vintage','Urban']
manifest=json.loads((R/'layout_manifest.json').read_text())
qa=[]
def words(t):return collections.Counter(re.findall(r"[a-z0-9]+",t.lower()))
for st in styles:
 for mode in ['Print','Mobile']:
  stem=st+'_'+mode;src=R/'.build/native-pdf'/f'{stem}.pdf';dst=R/'Buyer'/f'{stem}_Sample.pdf';shutil.copy2(src,dst)
  doc=fitz.open(dst);assert len(doc)==3
  for i,page in enumerate(doc):
   expected=' '.join(x['text'] for x in manifest if x['style']==st and x['mobile']==(mode=='Mobile') and x['kind']==i)
   actual=page.get_text();missing=words(expected)-words(actual);extra=words(actual)-words(expected)
   if missing or extra:raise ValueError((stem,i,dict(missing),dict(extra)))
   out=R/'Previews'/f'{stem}_{i+1:02}.png';scale=3 if mode=='Mobile' else 1500/page.rect.width
   page.get_pixmap(matrix=fitz.Matrix(scale,scale),alpha=False).save(out)
   im=Image.open(out).convert('RGB')
   target=(1080,1920) if mode=='Mobile' else (1500,2100)
   if im.size!=target:im=im.resize(target,Image.Resampling.LANCZOS)
   d=R/'Buyer'/'Sample_JPGs';d.mkdir(exist_ok=True)
   im.save(d/f'{stem}_{i+1:02}.jpg',quality=95,subsampling=0,dpi=(300,300) if mode=='Print' else (96,96))
   bounds=[b for b in page.get_text('blocks') if b[0]<-0.1 or b[1]<-0.1 or b[2]>page.rect.width+.1 or b[3]>page.rect.height+.1]
   assert not bounds,(stem,i,bounds)
   qa.append({'file':dst.name,'page':i+1,'size_pt':[page.rect.width,page.rect.height],'word_match':True,'bounds':True,'native_render':'LibreOffice','sample_jpg':list(target)})
fonts=['NimbusRoman-Regular.otf','NimbusRoman-Italic.otf','NimbusSans-Regular.otf','NimbusSans-Bold.otf','P052-Roman.otf','P052-Italic.otf','C059-Roman.otf','C059-Italic.otf','URWGothic-Book.otf','URWGothic-Demi.otf','Z003-MediumItalic.otf']
fdir=R/'Buyer/Fonts';fdir.mkdir(exist_ok=True)
for f in fonts:shutil.copy2(Path('/usr/share/fonts/opentype/urw-base35')/f,fdir/f)
shutil.copy2('/usr/share/doc/fonts-urw-base35/copyright',fdir/'FONT_LICENSES.txt')
readme='''PINOGRI / FIVE WEDDING INVITATION SUITES / V2

ONE COLLECTION, FIVE STYLES
Minimal, Woodland, Glamour, Vintage and Urban. Each has Invitation, Details and RSVP. Fifteen layouts, plus fifteen mobile adaptations. Paper-size and mobile versions are not additional unique designs.

FILES IN EACH STYLE ZIP
2 editable PPTX files, each with3pages: Print5x7in and Mobile9:16.
2 sample PDFs, each with the same3pages.
6 sample JPGs:3 print1500x2100 and3 mobile1080x1920.
Fonts with their original license notice, and this guide.
These samples use fictional names, a demonstration address and a website placeholder. Replace all event details before use.

EDIT FIRST
Unzip to a normal folder. Install the included original URW fonts before opening a working copy of the PPTX. Use a desktop application that supports PPTX editing. Tested by export in LibreOffice, not in Microsoft PowerPoint or Canva. Font substitution and spacing can differ across applications. No Canva template link is supplied. Fonts retain their own included license; our event license does not restrict those font rights.
Open the chosen Print or Mobile file. Select the separate text fields to replace the names, date, venue, address, schedule, dress code and RSVP contact. Edit initials/monogram too. Keep wording short. For long names, reduce the name field font size or split onto another line, then inspect the result. Save your working copy.

RSVP
This is stationery, not an online form or response-collection service. Replace your-wedding-website.com with your own real wedding website, email or phone contact. Delete sample guest names and dietary placeholder text if printing blank cards for handwriting. Guests can reply through your chosen contact. A JPG cannot collect answers. QR codes, hosting and automatic RSVP tracking are not included.

EXPORT AND PRINT
For paper cards use the Print5x7in file. Export your personalized version as PDF and verify every page. Print at100percent/ActualSize on5x7 stock or ask a printer to place the5x7 card on a larger sheet. Samples are finished-size single cards, without bleed, crop marks or multi-card imposition. Do not enlarge5x7 sample JPGs beyond5x7in. Full color backgrounds require a suitable printer or print shop; borders stay inset. Test one copy before ordering a batch. Gold/champagne colors are printed effects, not real foil, embossing or metallic ink.
For messaging, export your personalized Mobile pages as1080x1920JPG. Included JPGs are examples until you replace demonstration details in the editable source. Sample PDFs are static, not fillable forms.

ART AND QUALITY
Text stays editable in the PPTX and vector text in the PDFs. Woodland and Vintage botanicals and the Glamour decorative border were created with AI assistance and incorporated into these original layouts. Raster elements retain their actual source resolution; the set is not advertised as native4K artwork. Print sample JPGs export at300ppi at5x7in; this does not add detail to embedded art. The mobile Glamour adaptation uses a top ornament instead of the full paper-card border.

PERSONAL LICENSE
Use this collection for one personal wedding celebration. Personalize and share your final exported invitations with your guests. A print shop may print your finished personalized PDFs. Do not resell, redistribute or publicly upload the editable templates, the original ZIPs or extracted illustrations. No physical cards, envelopes, photo props, customization service, app subscription or commercial client/event-planner license is included.
Need help accessing files? Contact Pinogri through Etsy.
'''
(R/'Buyer/START_HERE_AND_LICENSE.txt').write_text(readme)
(R/'QA.json').write_text(json.dumps({'native_pages':qa,'unique_layouts':15,'mobile_adaptations':15,'native_PowerPoint_tested':False,'physical_print_tested':False,'raster_sources':{p.name:list(Image.open(p).size) for p in (R/'Sources').glob('*.png')}},indent=2))
print('PASS',len(qa),'native PDF pages; fonts licensed; JPG exports created')
