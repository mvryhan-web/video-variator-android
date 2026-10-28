from pathlib import Path
import json,zipfile,os,hashlib
R=Path(__file__).parent;M=json.loads((R/'product_manifest.json').read_text());D=R/'Delivery';D.mkdir(exist_ok=True)
readme='''RYHANGOODS | 100 SEASONAL & CELEBRATION CLIPART PNG

INCLUDED: 25 Christmas, 25 Halloween, 25 Birthday and 25 Wedding illustrations.
Download the four ZIP archives, then extract them before importing the separate PNG files into your design software. A desktop browser is recommended for these large downloads.

FILES: Transparent RGB PNG; 300 DPI metadata. Canvas sizes are 3000 x 4500, 4500 x 3000 or 3000 x 3000 pixels according to the artwork orientation. Files are proportionally enlarged from smaller generated originals; export dimensions do not indicate native illustration detail. Best suited to cards, tags and small-format craft projects. Test-print before large-scale production. Colors vary across screens and printers. No SVG, layered files or editable templates.

LICENSE: One buyer may use the illustrations for personal projects and finished physical products for sale, including print-on-demand physical products. No attribution required. Do not resell, share, sublicense or redistribute the original files, extractable digital assets, stock collections or competing clipart bundles. Digital template redistribution is not included. No exclusive rights or trademark rights are granted. Promotional layouts are examples only and are not supplied as templates.

HELP: Contact RyhanGoods through Etsy with your order number.
'''
(R/'Buyer_Files/READ_ME_AND_LICENSE.txt').write_text(readme);res=[]
for theme in ['Christmas','Halloween','Birthday','Wedding']:
 p=D/f'RyhanGoods_{theme}_25_PNG.zip';temp=p.with_suffix('.tmp')
 with zipfile.ZipFile(temp,'w',zipfile.ZIP_STORED) as z:
  z.write(R/'Buyer_Files/READ_ME_AND_LICENSE.txt','READ_ME_AND_LICENSE.txt')
  for x in M:
   if x['theme']==theme:z.write(x['final'],theme+'/'+Path(x['final']).name)
 with zipfile.ZipFile(temp) as z:assert z.testzip() is None;assert len([n for n in z.namelist() if n.endswith('.png')])==25
 os.replace(temp,p);res.append({'path':str(p.resolve()),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()});print(res[-1],flush=True)
(R/'delivery_manifest.json').write_text(json.dumps(res,indent=2))
