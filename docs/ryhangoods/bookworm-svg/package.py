from pathlib import Path
from PIL import Image
import json,hashlib,zipfile,os,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parent;B=R/'Buyer';data=json.loads((R/'designs.json').read_text())
(B/'START_HERE.txt').write_text('''PINOGRI | THE READING COLLECTION
20 Book Lover Designs — SVG + PNG

WHAT IS INCLUDED
20 SVG vector designs and 20 matching transparent PNGs.
Each PNG is 4500 x 4500 pixels, tagged at 300 DPI. The canvas prints
at 15 x 15 inches at 300 pixels per inch; the visible artwork has
transparent margins. SVG files can be scaled in a vector editor.
File numbers match the design list in DESIGN_INDEX.txt.

QUICK START
1. Download and extract the ZIP on a computer. Keep an untouched backup.
2. Use SVG for vector editing, or PNG for print layout work.
3. Import the file into software which supports that file format.
4. Set your output size, background and printer color profile.
5. Test a sample before producing a batch. Screen and print colors vary.

IMPORTANT FILE DETAILS
Text has been converted to vector paths. No fonts are needed and the
wording is not editable as live text. A vector editor can edit paths
and colors. The designs are multi-color compositions, not pre-separated
vinyl layers, single-line engraving files or editable text templates.
Ungroup and simplify details if your workflow requires it. Very small
cuts may lose details. SVGs were opened and rendered with Inkscape.
Physical printing, cutting, Cricut and Silhouette imports have not been
tested. Software settings, file support and results may vary.
PNG backgrounds are genuinely transparent. Cream areas inside books
and other illustrations are intentionally part of the art.

The supplied files do not include physical goods, mockup photography,
DXF/EPS/PDF versions, fonts, Canva links or resale rights to digital files.
See LICENSE.txt before commercial use.
''')
(B/'LICENSE.txt').write_text('''PINOGRI STANDARD PHYSICAL-PRODUCT LICENSE | Version 1.0

One purchaser may use each supplied design for unlimited personal
projects and up to 500 physical end products per design in total.
Physical products may be sold through your own store, including your own
print-on-demand shop. You may provide the design to a production service
solely to manufacture those physical products for you; require them not
to retain or redistribute the design for other purposes.

You may resize, recolor and modify the artwork for those permitted uses.
This is a non-exclusive license. Copyright ownership is not transferred.

You may NOT resell, share, sublicense or give away the original or
modified digital designs; upload them to stock, clipart or SVG libraries;
include them in digital downloads, templates or design bundles; or grant
customers editable/source files. Do not claim exclusivity or register
these non-exclusive designs as your own trademark.

For more than 500 physical products per design, obtain a separate written
license from Pinogri before exceeding the limit. No expanded rights are
included automatically. Third-party services and materials are not
included. Follow their rules and run production tests before sale.
''')
(B/'DESIGN_INDEX.txt').write_text('PINOGRI — 20 ORIGINAL COMPOSITIONS\n\n'+'\n'.join(f"{x['number']:02} | {x['phrase']}" for x in data)+'\n\nEach number has one SVG and one matching transparent PNG.\n')
checks=[]
for x in data:
 stem=f"{x['number']:02}_{x['name']}";sp=B/'SVG'/f'{stem}.svg';pp=B/'PNG'/f'{stem}.png';root=ET.parse(sp).getroot();tags=[e.tag.split('}')[-1] for e in root.iter()]
 assert 'text' not in tags and 'image' not in tags
 assert not any('href' in k for e in root.iter() for k in e.attrib)
 im=Image.open(pp);im.load();assert im.size==(4500,4500) and im.mode=='RGBA';assert abs(im.info['dpi'][0]-300)<0.1
 a=im.getchannel('A');bb=a.getbbox();assert bb and bb[0]>0 and bb[1]>0 and bb[2]<4500 and bb[3]<4500
 for pt in [(0,0),(4499,0),(0,4499),(4499,4499)]:assert a.getpixel(pt)==0
 checks.append({'design':stem,'svg_xml':'PASS','no_raster_or_live_text':'PASS','Inkscape_import_render':'PASS','png_size':[4500,4500],'mode':im.mode,'dpi':im.info['dpi'],'alpha_bbox':bb,'png_sha256':hashlib.sha256(pp.read_bytes()).hexdigest(),'svg_sha256':hashlib.sha256(sp.read_bytes()).hexdigest()})
p=R/'Pinogri_Book_Lover_20_SVG_PNG.zip';tmp=Path('/tmp')/p.name
with zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED,8) as z:
 for f in sorted(B.rglob('*')):
  if f.is_file():z.write(f,f.relative_to(B))
with zipfile.ZipFile(tmp) as z:assert z.testzip() is None;assert len(z.namelist())==44
os.replace(tmp,p);assert p.stat().st_size<20_000_000
ads=[]
for f in sorted((R/'Ads').glob('*.jpg')):
 im=Image.open(f);im.load();assert im.size==(3600,3600);assert f.read_bytes()[-2:]==b'\xff\xd9';ads.append({'name':f.name,'dimensions':im.size,'full_decode':'PASS','bytes':f.stat().st_size})
qa={'sku':'PINO-BW20-01','date':'2026-10-29','designs':checks,'ads':ads,'zip':{'name':p.name,'bytes':p.stat().st_size,'entries':44,'crc':'PASS','sha256':hashlib.sha256(p.read_bytes()).hexdigest()},'not_tested':['Physical print','Physical vinyl cut','Cricut import','Silhouette import'],'visual_fixes':['01 bottom label resized and raised to clear circle','13 removed superfluous bookmark'],'photo_assets':{'resolution':[1254,1254],'role':'Illustrative generated product application photos, not buyer files. Native-size photos within 3600px final marketing layouts.','exact_art':'Delivered artwork additionally displayed in native vector-derived panel beside each mockup.'},'quality_claim':'No objective 10/10 or sales guarantee. Owner reviews final draft.'}
(R/'QA_REPORT.json').write_text(json.dumps(qa,indent=2))
listing={'title':'20 Book Lover SVG Designs and Transparent PNGs for Totes, Shirts and Mugs','price_eur':'7.90','sku':'PINO-BW20-01','tags':['book lover svg','bookworm svg bundle','reading svg','bookish png','library design','book club svg','reader gift design','tote bag svg','reading shirt png','mug design png','book quote svg','transparent png','commercial use svg'],'description':'''A little well-read chaos, a cooling cup of tea, one more chapter. This collection brings 20 bookish sayings together in a warm palette of forest green, terracotta, gold and navy.

Use the artwork for a reading tote, a book-club shirt, a mug or a personal craft project. The designs pictured in the numbered collection image are the designs included in your download.

WHAT YOU RECEIVE
• 20 SVG files with vector artwork and lettering converted to paths
• 20 matching transparent PNG files, 4500 × 4500 pixels, tagged at 300 DPI
• Quick-start instructions, numbered design index, license and typography notice
• One organised ZIP file, delivered directly through Etsy

PNG canvas size is up to 15 × 15 inches at 300 pixels per inch; visible artwork has transparent margins. SVG files can be resized in a vector editor. No font installation is required. Wording is outlined artwork, not editable live text.

A FEW INCLUDED PHRASES
Quiet Hours, Loud Plots
Tea Cooling, Plot Thickening
My Social Battery Runs on Books
This Tote Carries Plot Twists
Soft Covers, Strong Opinions
See the collection image for all 20 designs.

LICENSE
Personal projects are allowed. One purchaser may also sell up to 500 physical products per design, including through their own print-on-demand shop. Do not resell, share or give away the original or modified digital designs, or include them in digital templates or downloads. See the included license for full terms.

BEFORE YOU BUY
This is a digital download. No tote, clothing, mug or other physical item is sent. Product scenes are illustrative mockups; actual results depend on your materials, equipment and settings. Cream-colored illustration areas are intentional; the area outside each design is transparent.

The files are multi-color compositions, not pre-separated vinyl layers or single-line engraving files. Small cutting projects may require simplifying details. SVGs were opened and rendered with Inkscape; physical printing, cutting and Cricut/Silhouette imports have not been tested. Check your software supports SVG or PNG before purchasing. No DXF, EPS, PDF artwork, Canva template or mockup photos are included.

HOW TO START
Download the ZIP from your Etsy purchases on a computer, extract it, then choose your SVG or PNG. Set the required production size and run a sample before a batch. Screen and print colors may differ.

Creation note: Original vector compositions and outlined typography were assembled and checked digitally. AI-assisted mockups are used to illustrate possible physical applications; the photographs are not included in the download.
'''}
assert len(listing['title'])<=140 and len(listing['tags'])==13 and all(len(t)<=20 for t in listing['tags']);(R/'listing.json').write_text(json.dumps(listing,indent=2));print(json.dumps({'zip':qa['zip'],'ads':len(ads),'title_chars':len(listing['title'])}))
