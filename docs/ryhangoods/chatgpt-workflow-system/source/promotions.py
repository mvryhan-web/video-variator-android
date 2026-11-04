"""Native 3600px editorial layouts. Real PDF covers; no invented interface."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, fitz
R=Path(__file__).resolve().parent; B=R/'Buyer'; O=R/'Owner_Promotions';O.mkdir(exist_ok=True)
M=json.loads((B/'MANIFEST.json').read_text())
S=3600; G='#173C37'; P='#E9AD8D'; W='#FFFFFF'; L='#EEF1EC'; INK='#142F2B'; MUT='#527069'
FD=Path('/usr/share/fonts/opentype/urw-base35')
def font(n,serif=False):return ImageFont.truetype(str(FD/('URWBookman-Light.otf' if serif else 'NimbusSans-Regular.otf')),n)
checks=[]
def page(num,title,sub='',dark=False):
 global im,d,fg,bg,number
 number=num;bg=G if dark else W;fg=W if dark else INK
 im=Image.new('RGB',(S,S),bg);d=ImageDraw.Draw(im)
 text('PINOGRI  /  WORKFLOW STUDIO',190,150,48,P if dark else MUT)
 text(f'{num:02d} / 10',3050,150,46,P if dark else MUT)
 d.line((190,255,3410,255),fill=P,width=3)
 if title:text(title,190,380,158,fg,True,width=3200)
 if sub:text(sub,195,790,64,P if dark else MUT,width=3100)
 d.line((190,3310,3410,3310),fill=P,width=3)
 text('DIGITAL TOOLKIT  /  ENGLISH EDITION',190,3380,45,P if dark else MUT)
def text(s,x,y,size=64,color=None,serif=False,width=None,leading=1.25):
 f=font(size,serif);color=color or fg; lines=[]
 for paragraph in str(s).split('\n'):
  line=''
  for word in paragraph.split():
   trial=(line+' '+word).strip()
   if width and d.textlength(trial,font=f)>width and line:lines.append(line);line=word
   else:line=trial
  lines.append(line)
 for line in lines:
  box=d.textbbox((x,y),line,font=f)
  assert box[0]>=0 and box[2]<=S and box[3]<=S,(number,line,box)
  d.text((x,y),line,font=f,fill=color);y+=int(size*leading)
 return y
def rule(y,x=190,w=3220):d.line((x,y,x+w,y),fill=P,width=3)
def pdfcover(i,x,y,w):
 p=sorted((B/'16_pdf-manuals').glob('*.pdf'))[i-1];doc=fitz.open(p)
 pix=doc[0].get_pixmap(matrix=fitz.Matrix(w/doc[0].rect.width,w/doc[0].rect.width))
 img=Image.frombytes('RGB',(pix.width,pix.height),pix.samples);im.paste(img,(x,y))
 return img.height
def save(name):
 path=O/f'{number:02d}_{name}.png';tmp=O/f'.{number:02d}.tmp'
 im.save(tmp,format='PNG',dpi=(300,300))
 with Image.open(tmp) as check:check.verify()
 tmp.replace(path)
 checks.append({'file':path.name,'dimensions':[S,S],'dpi_metadata':300,'method':'Native text and document layout; actual PDF cover rendering','text_bounds':'PASS','png_integrity':'PASS'})

page(1,'',dark=True)
text('Workflow\nStudio',190,380,350,P,True,leading=1.03)
text('FOR CHATGPT',205,1200,93,P)
pdfcover(1,2130,1410,1190)
for y,n,label in [(1550,'156','ORGANIZED RESOURCES'),(2050,'16','PRACTICAL MODULES'),(2550,'4','PDF FIELD GUIDES')]:
 text(n,200,y,260,P,True);text(label,210,y+320,58,W);rule(y+420,200,1720)
save('cover')

page(2,'Find the right\nstarting point.','16 modules, with an index that links every counted resource.')
labels=['Foundations','Workflow library','Reusable skills','Project systems','Multi-step work','Codex practice','Design & images','Wireframe to website','Connected workflows','Automation recipes','Professional routes','Client templates','Worked examples','Troubleshooting','Execute / verify / fix','PDF manuals']
for i,label in enumerate(labels):
 col=i//8; row=i%8;x=190+col*1670;y=1110+row*255
 text(f'{i+1:02d}',x,y,55,MUT);text(label,x+145,y-5,65,INK,width=1420)
 rule(y+155,x,1480)
save('module_map')

page(3,'A workflow you\ncan follow.','Start with sources. Finish with a checked deliverable.',True)
steps=[('01','SOURCE PACKET','A fictional mug fact sheet: 350 ml, two colours, hand-wash care.'),('02','DRAFT WITH LIMITS','Choose a reader and produce five distinct social posts.'),('03','CHECK THE CLAIMS','Remove invented ratings, sustainability claims and sales results.'),('04','SAVE THE HANDOFF','Keep the final copy, source facts and unresolved questions together.')]
for i,(n,h,s) in enumerate(steps):
 y=1090+i*500;text(n,190,y,125,P,True);text(h,550,y+10,65,P);text(s,550,y+135,66,W,width=2770);rule(y+395)
save('worked_workflow')

page(4,'18 reusable\nskill specifications.','Editable SKILL.md files, each with a regular-chat fallback.')
skills=[x['title'] for x in M if x['module']==3]
for i,label in enumerate(skills):
 col=i//9;row=i%9;x=190+col*1670;y=1100+row*210
 text(f'{i+1:02d}',x,y,48,MUT);text(label,x+120,y-5,60,INK,width=1460)
text('Account-dependent native import. No skills are installed by this download.',195,3090,49,MUT,width=3150)
save('skill_library')

page(5,'16 project systems.\nLess rebuilding.','Project instructions, a source register and a decision log.',True)
names=[x['title'] for x in M if x['module']==4]
for i,label in enumerate(names):
 col=i//8;row=i%8;x=190+col*1670;y=1110+row*225
 text(label,x,y,65,W,width=1510);rule(y+150,x,1490)
text('Create and configure projects in your own account. Manual-chat route included.',195,3090,49,P,width=3150)
save('project_systems')

page(6,'Give client work\na clear beginning.','10 editable business worksheets, from intake to handoff.')
d.rectangle((190,1090,2080,3090),fill=L)
text('CLIENT INTAKE',290,1180,72,INK,True)
for i,label in enumerate(['Client / Project','Decision owner','Intended audience','Problem to solve','Deliverables','Source material','Deadline / Budget','Access limits / Questions']):
 y=1400+i*185;text(label,290,y,53,MUT);d.line((290,y+120,1980,y+120),fill='#AAB9AF',width=2)
text('Know the scope.',2260,1190,91,INK,True,width=1100)
text('Keep missing information visible.\n\nConfirm the deliverables before drafting.\n\nSave decisions for the next session.',2260,1510,66,INK,width=1060)
text('Excerpted field labels from the included editable intake worksheet.',2260,2740,47,MUT,width=1050)
save('client_templates')

page(7,'Choose your route.\nStart where you work.','Nine reading paths point you to the most relevant resources.',True)
routes=[x['title'] for x in M if x['module']==11]
for i,label in enumerate(routes):
 col=i//5;row=i%5;x=190+col*1670;y=1160+row*355
 text(f'{i+1:02d}',x,y,75,P,True);text(label,x+160,y,76,W,width=1410);rule(y+230,x,1490)
text('Use one small practice task before expanding to a larger project.',195,3090,54,P,width=3100)
save('role_routes')

page(8,'Four guides.\nOne shared method.','24 PDF pages total, with linked contents and resource references.')
for i in range(1,5):
 x=190+((i-1)%2)*1660;y=1090+((i-1)//2)*1100
 pdfcover(i,x,y,640)
 titles=['Start with a\nClear Brief','From Source to\nFinished Content','Code and Automate\nwith Checks','Client Work and\nQuality Control']
 text(f'GUIDE {i:02d}',x+740,y+90,50,MUT)
 text(titles[i-1],x+740,y+230,68,INK,True,width=795)
 text('8 practical chapters\nStatic reading PDF',x+740,y+620,47,MUT,width=790)
save('pdf_guides')

page(9,'Execute.\nVerify. Repair.','Use explicit acceptance checks instead of trusting a polished answer.',True)
for y,label,quote,body in [(1100,'DRAFT CLAIM','“Improved conversion by 26%.”','No source was supplied for this number.'),(1770,'REVIEW FINDING','Unsupported performance claim.','Trace the number to evidence or remove it.'),(2440,'CORRECTED HANDOFF','The copy is ready for review.','Conversion performance has not been measured.')]:
 text(label,200,y,52,P);text(quote,200,y+110,99,W,True,width=3150);text(body,205,y+370,65,P,width=3100);rule(y+545)
save('quality_loop')

page(10,'Know exactly\nwhat you receive.','A downloadable educational toolkit. No physical item is shipped.')
text('INCLUDED',190,1120,68,MUT)
for i,s in enumerate(['156 counted resources across 16 modules','Editable Markdown and CSV resources','18 skill specs + 16 project instruction sets','420 starter briefs in one organized CSV','4 PDF guides + 2 offline Python labs']):
 text(s,190,1290+i*190,68,INK,width=3210)
rule(2350)
text('SET UP IN YOUR OWN ACCOUNT',190,2460,63,MUT)
text('Downloading does not install skills, connect apps, create projects or activate schedules. Feature access varies by account.',190,2620,68,INK,width=3160)
text('Independent resource. Not affiliated with or endorsed by OpenAI.\nSubscriptions, API usage and third-party services are not included.',190,3030,44,MUT,width=3160)
save('contents_and_compatibility')
(O/'PROMOTION_QA.json').write_text(json.dumps(checks,indent=2))
print(json.dumps(checks,indent=2))
