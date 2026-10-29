from pathlib import Path
import fitz,zipfile,json,os,tempfile,hashlib,re,collections
R=Path(__file__).resolve().parent
CONFIG=[('pinogri-newspaper','Wedding_Newspaper','RyhanGoods_Wedding_Newspaper_Download.pdf','1D01X41Ahy01dGIhhhYLtVllJRJMILCgo','11MGRqc0-HL90vtGC0YEBpd86dGFQvLNe','4603994001',3),('pinogri-midnight','Midnight_Star','RyhanGoods_Midnight_Star_Download.pdf','1Thy6ocKi4e2KThTWgjAJm99pd3fL4s9a','1WWZPMDstSpObaEnrFTP4cS3Ty9wNCFKB','4603725963',32)]
for product,slug,template,folder,zid,oldid,count in CONFIG:
 p=R/product;src=fitz.open(R.parent/'three-restored'/template);d=fitz.open();pg=d.new_page(width=1103,height=1426);pg.insert_image(pg.rect,stream=src[0].get_pixmap().tobytes('png'))
 for box,t,n in [((375,480,735,575),'Pinogri',48),((540,630,970,665),'Your Pinogri digital download',21),((235,1305,910,1350),'Questions? Message Pinogri on Etsy.',25)]:
  r=fitz.Rect(box);pg.draw_rect(r,fill=(1,.98,.95),color=None);assert pg.insert_textbox(r,t,fontsize=n,fontname='Times-Roman',align=1,color=(.08,.22,.18))>=0
 url='https://drive.google.com/drive/folders/'+folder;pg.insert_link({'kind':fitz.LINK_URI,'from':fitz.Rect(185,1060,925,1155),'uri':url});d.set_metadata({'author':'Pinogri','title':'Pinogri '+slug.replace('_',' ')+' Download'});d.save(p/f'Delivery/Pinogri_{slug}_Download.pdf',garbage=4,deflate=True);pg.get_pixmap(matrix=fitz.Matrix(.7,.7)).save(p/'Previews/delivery.png')
 # Compare all buyer text ignoring only replaced brand and reading order.
 original=p/('restored/Buyer_Files' if product=='pinogri-newspaper' else 'original')
 norm=lambda s:collections.Counter(re.findall(r'\S+',s.replace('RYHANGOODS','').replace('RyhanGoods','').replace('PINOGRI','').replace('Pinogri','')))
 pages={}
 for f in (p/'Buyer').glob('*.pdf'):
  a=fitz.open(original/f.name);b=fitz.open(f);assert len(a)==len(b)
  for x,y in zip(a,b):assert norm(x.get_text())==norm(y.get_text()),f.name
  pages[f.name]=len(b)
 for f in (p/'Buyer').rglob('*.jpg'):assert f.read_bytes()==(original/f.relative_to(p/'Buyer')).read_bytes()
 for f in (p/'Buyer').glob('*.pptx'):assert f.read_bytes()==(original/f.name).read_bytes()
 fd,tmp=tempfile.mkstemp(suffix='.zip');os.close(fd)
 with zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED,6) as z:
  for f in sorted((p/'Buyer').rglob('*')):
   if f.is_file():z.write(f,f.relative_to(p/'Buyer'))
 with zipfile.ZipFile(tmp) as z:assert len(z.namelist())==count and z.testzip() is None
 dest=p/f'Pinogri_{slug}.zip';os.replace(tmp,dest)
 if product=='pinogri-newspaper':
  listing=json.loads((p/'restored/listing.json').read_text());listing['description']=listing['description'].replace('an exact page overview is included in image 8','an exact page overview is included in image 2').replace('Microsoft offers basic PowerPoint editing on the web with a free Microsoft account. ','')+'\n\nMessage Pinogri on Etsy for download support.'
  listing['tags']=[t if t!='wedding booklet' else 'wedding keepsake' for t in listing['tags']]
 else:
  listing={'title':'The Midnight Star Christmas Escape Game: 7 Printable Puzzles for Kids, 25 Story Illustrations, A4 & Letter PDFs','price_eur':6.90,'quantity':999,'tags':['christmas escape','kids escape room','christmas game','printable puzzles','family christmas','kids mystery game','winter adventure','christmas activity','escape room pdf','logic puzzle game','holiday party game','story illustrations','printable adventure'],'description':'''Follow a missing star through a snowy village in my printable Christmas escape adventure, The Midnight Star. I have paired seven numbered puzzles with a separate adult Host Guide and a collection of story artwork for after the game.

WHAT YOU RECEIVE
One ZIP with 32 files:
• Player Book: 11 pages, in A4 and US Letter PDFs.
• Host Guide: 4 pages, in A4 and US Letter PDFs.
• Bonus Story Cards: 25 pages, in A4 and US Letter PDFs.
• 25 separate JPG story illustrations, 1448 × 1086 px.
• Read-me, printing instructions and personal-use licence.
The two paper sizes contain the same content. There are seven puzzles, not 25 puzzles.

WHO IT IS FOR
Designed for approximately ages 8–12 with an adult host. Play solo or as a small team. English-language story and clues. The adult gives players one numbered puzzle page at a time, checks the result and offers hints when needed. Players record the digits and use the final code at the end.

BEFORE PLAY
Print the Player Book on matching A4 or US Letter paper at 100% / Actual Size. Keep the Host Guide away from players because it contains hints and answers. A pencil and scrap paper are sufficient. No actual locks, room confinement, phone, audio or special physical props are required. Colour printing is recommended for the art, but clues do not rely on colour.

IMPORTANT BONUS TIMING
Give out the Story Cards and JPG artwork AFTER the game. Some images can suggest answers or associations. These are extra story pictures, not extra puzzle stages. Each Story Card presents an illustration at 4.5 × 3.375 inches. Preview watermarks are absent from buyer files.

DOWNLOAD
Download the Pinogri instruction PDF from Etsy after payment confirmation. Follow its Google Drive link, download the ZIP and extract it. Use a web browser if Etsy app downloads are unavailable. No seller customization or preparation is needed after purchase.

PLEASE NOTE
Static, noneditable, nonfillable PDFs and JPGs. This is a digital download; no printed game, locks, decorations or other props will be shipped. The game was checked for logic and layout, but a family-group playtest has not been completed. No playtime or difficulty for every child is guaranteed. Styled mockups are illustrative; actual PDF pages are shown in images 2, 5, 7 and 8. Artwork was created with AI assistance and selected for this collection.

PERSONAL USE
For your household or private gathering. You may reprint for that use. No classroom/site licence, resale, redistribution or commercial rights are included. Message Pinogri on Etsy for download help.'''}
 assert len(listing['tags'])==len(set(listing['tags']))==13 and max(map(len,listing['tags']))<=20 and len(listing['title'])<=140
 (p/'listing.json').write_text(json.dumps(listing,ensure_ascii=False,indent=2))
 cp={'status':'FILES_READY_BROWSER_BLOCKED','new_etsy_id':None,'old_etsy_id':oldid,'ads':10,'buyer_entries':count,'pages':pages,'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'CRC':'PASS','nonbrand_buyer_text_comparison':'PASS every page','original_jpg_and_pptx_bytes_preserved':True,'folder':folder,'zip':zid,'public_permissions':'owner-only observed29Oct2026; must open anyone/reader before buyer delivery','delivery_link':url,'etsy_provenance':'not interacted; owner selects; leave unset if UI permits'};(p/'CHECKPOINT.json').write_text(json.dumps(cp,indent=2));print(product,cp)
