from pathlib import Path
import json,re,csv,hashlib,zipfile,tempfile,os,shutil
from collections import Counter
from xml.sax.saxutils import escape
import fitz
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor,Color,white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from manuals import GUIDES
from catalog import MODULES

ROOT=Path(__file__).resolve().parent;B=ROOT/'Buyer';PRE=ROOT/'Previews';PRE.mkdir(exist_ok=True)
M=json.loads((ROOT/'manifest_pending.json').read_text())
INK=HexColor('#173C37');PEACH=HexColor('#E9AD8D');PAPER=HexColor('#F6F1E8');MUTED=HexColor('#56615C')
for name,file in [('Book','DejaVuSerif.ttf'),('BookBold','DejaVuSerif-Bold.ttf'),('Text','DejaVuSans.ttf')]:
    pdfmetrics.registerFont(TTFont(name,'/usr/share/fonts/truetype/dejavu/'+file))
S=ParagraphStyle('body',fontName='Text',fontSize=9.6,leading=13.5,textColor=INK,spaceAfter=8)
H=ParagraphStyle('section',fontName='BookBold',fontSize=10.3,leading=13,textColor=INK)
W,HT=A4
def para(c,text,y,style=S,width=475,x=60):
    p=Paragraph(escape(text),style);_,h=p.wrap(width,1000)
    if y-h<62:raise ValueError('Page overflow: '+text[:65])
    p.drawOn(c,x,y-h);return y-h-8
def footer(c,guide,page):
    c.setFillColor(MUTED);c.setFont('Text',7.5);c.drawString(60,35,'PINOGRI  /  WORKFLOW STUDIO')
    c.drawRightString(W-60,35,f'{guide:02d} / {page:02d}')
def base(c,title,guide,page):
    c.setFillColor(PAPER);c.rect(0,0,W,HT,fill=1,stroke=0)
    c.setFillColor(MUTED);c.setFont('Text',7.5);c.drawString(60,HT-38,title.upper())
    c.setStrokeColor(PEACH);c.line(60,HT-49,W-60,HT-49);footer(c,guide,page)

P=B/'16_pdf-manuals';P.mkdir(exist_ok=True)
for g,(title,subtitle,chapters) in enumerate(GUIDES,1):
    path=P/f'{g:02d}_{re.sub("[^a-z0-9]+","-",title.lower()).strip("-")}.pdf'
    temp=Path(tempfile.gettempdir())/('pinogri-guide-'+str(g)+'.pdf')
    c=canvas.Canvas(str(temp),pagesize=A4,pageCompression=1)
    c.setTitle(title+' - Pinogri Workflow Studio');c.setAuthor('Pinogri');c.setSubject('Independent AI-assisted educational field guide')
    c.setFillColor(INK);c.rect(0,0,W,HT,fill=1,stroke=0)
    c.setFillColor(PEACH);c.setFont('Book',100);c.drawString(55,HT-180,f'{g:02d}')
    c.setFont('Text',10);c.setFillColor(white);c.drawString(60,HT-220,'PINOGRI  /  WORKFLOW STUDIO')
    st=ParagraphStyle('cover',fontName='Book',fontSize=36,leading=43,textColor=white)
    p=Paragraph(escape(title),st);_,h=p.wrap(W-120,400);p.drawOn(c,60,HT-300-h)
    p=Paragraph(escape(subtitle),ParagraphStyle('sub',fontName='Text',fontSize=13,leading=20,textColor=PEACH))
    _,h2=p.wrap(W-135,200);p.drawOn(c,60,HT-340-h-h2)
    c.setStrokeColor(PEACH);c.line(60,153,W-60,153)
    c.setFont('Text',9);c.setFillColor(white);c.drawString(60,125,'8 practical chapters  /  Editable resources in the toolkit')
    c.setFont('Text',8);c.drawString(60,98,'Independent resource. Not affiliated with or endorsed by OpenAI.')
    c.drawString(60,80,'Version 1.0  /  4 November 2026');c.showPage()
    base(c,title,g,2)
    c.setFillColor(INK);c.setFont('Book',29);c.drawString(60,HT-103,'Find your next step')
    y=HT-155
    for i,ch in enumerate(chapters,1):
        c.setFont('Text',9);c.setFillColor(MUTED);c.drawString(60,y,f'{i:02d}')
        c.setFont('Book',12);c.setFillColor(INK);c.drawString(95,y,ch[0])
        c.setFont('Text',9);c.drawRightString(W-60,y,str(3+(i-1)//2))
        c.linkRect('',f'ch-{i}',(60,y-5,W-60,y+17),relative=0,thickness=0)
        y-=43
    y=para(c,'Use this guide for the sequence and the numbered module resources for editable instructions, worksheets and examples. Resource IDs at the end of each chapter match INDEX.md and MANIFEST.json.',y-10)
    para(c,'The kit does not configure your account or run external actions. Feature availability varies. Use a regular chat and manual steps when optional tools are unavailable.',y)
    c.showPage()
    for i,(head,opening,steps,example,check,refs) in enumerate(chapters,1):
        if i%2:
            base(c,title,g,3+(i-1)//2);y=HT-78
        c.bookmarkHorizontalAbsolute(f'ch-{i}',y);c.addOutlineEntry(head,f'ch-{i}',0,False)
        c.setFillColor(MUTED);c.setFont('Text',8);c.drawString(60,y,f'CHAPTER {i:02d}')
        y=para(c,head,y-17,ParagraphStyle('head',fontName='Book',fontSize=19,leading=23,textColor=INK))
        y=para(c,opening,y-3)
        y=para(c,'Run the workflow',y,H);y=para(c,steps,y)
        y=para(c,'A concrete example',y,H);y=para(c,example,y)
        y=para(c,'Check before continuing',y,H);y=para(c,check,y)
        c.setFillColor(MUTED);c.setFont('Text',7.5);c.drawString(60,y-3,'EDITABLE RESOURCES  /  '+refs)
        y-=28
        if i%2==0:c.showPage()
        else:
            c.setStrokeColor(PEACH);c.line(60,y+12,W-60,y+12)
    c.save();os.replace(temp,path)
    doc=fitz.open(path)
    assert len(doc)==6
    for i,page in enumerate(doc):
        page.get_pixmap(matrix=fitz.Matrix(1.2,1.2),alpha=False).save(PRE/f'guide{g}_{i+1:02d}.png')
    M.append(dict(id=f'M16-{g:02d}',module=16,title=title,path=path.relative_to(B).as_posix(),format='pdf',kind='Original six-page field guide with eight chapters'))

for n,(title,directory,filename) in enumerate([('CSV margin lab','11_csv-margin-lab','margin_report.py'),('Action register lab','12_action-register-lab','action_report.py')],11):
    p=B/'06_codex-practice'/directory/filename
    M.append(dict(id=f'M06-{n:02d}',module=6,title=title,path=p.relative_to(B).as_posix(),format='py',kind='Offline Python starter with sample CSV, README and tests'))
    (p.parent/'AGENTS.md').write_text('''# Local practice instructions

Read README.md before editing. Use the sample CSV to reproduce current behaviour.
Use only the Python standard library. Do not add network access, sending, scheduling or live account connections.
Keep the original sample intact; use a copy for experiments.
Run the supplied unittest file and the sample CLI command after relevant changes.
Explain the original failure, focused correction, actual checks and remaining limits.
Never store credentials or claim that local tests prove a production integration works.
''')

M=sorted(M,key=lambda r:(r['module'],r['id']))
assert len(M)==156 and len({r['id'] for r in M})==156
index=['# Pinogri Workflow Studio','', '156 resources across 16 modules. The 420 starter rows belong to one CSV resource; companion files, indexes and alternative viewing formats do not increase the count.','', 'Start with [START_HERE.md](START_HERE.md). Read [COMPATIBILITY.md](COMPATIBILITY.md) for tested scope.','']
for module,title in MODULES.items():
    rows=[r for r in M if r['module']==module]
    index+=['## '+f'{module:02d} / {title} - {len(rows)} resources','']
    for row in rows:index.append(f"- {row['id']} - [{row['title']}]({row['path']})")
    index.append('')
(B/'INDEX.md').write_text('\n'.join(index))
for module,title in MODULES.items():
    d=next(B.glob(f'{module:02d}_*'))
    (d/'README.md').write_text(f'# {title}\n\nUse INDEX.md at the package root to locate the individual resources. Read the input and acceptance sections before running a task. This module contains {sum(r["module"]==module for r in M)} counted resources; this orientation file and companion examples are not additional counted resources.\n\nStart with a small, authorized input. Save the result and the checks actually performed. Keep unavailable features, external actions and untested environments explicit.\n')

# Embed the legally required font notice; no standalone font binaries are shipped.
notice=Path('/usr/share/doc/fonts-dejavu-core/copyright').read_text()
(B/'FONT_NOTICE.txt').write_text(notice.split('Files: debian/*')[0])

for row in M:
    p=B/row['path'];assert p.is_file() and p.stat().st_size>0
    row.update(bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),exists=True)
(B/'MANIFEST.json').write_text(json.dumps(M,indent=2))
with (B/'MANIFEST.csv').open('w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(M[0]));w.writeheader();w.writerows(M)

print('Resources:',len(M),'modules:',dict(sorted(Counter(r['module'] for r in M).items())))
print('PDF pages:',sum(len(fitz.open(B/r['path'])) for r in M if r['format']=='pdf'))
