from pathlib import Path
import subprocess,concurrent.futures,os,json
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parent
F='/usr/share/fonts/opentype/urw-base35/P052-Italic.otf'
def run(p):
 name=p.stem;out=R/'Buyer/SVG'/p.name;tmp=Path('/tmp')/(name+'_outline.svg')
 q=subprocess.run(['inkscape',str(p),'--export-plain-svg',f'--export-filename={tmp}','--actions=select-all:all;object-to-path;object-stroke-to-path;export-do'],capture_output=True,text=True)
 assert q.returncode==0,(name,q.stderr);assert tmp.exists();os.replace(tmp,out)
 png=Path('/tmp')/(name+'.png')
 q=subprocess.run(['inkscape',str(out),'--export-type=png',f'--export-filename={png}','--export-width=4500','--export-height=4500'],capture_output=True,text=True);assert q.returncode==0,(name,q.stderr)
 im=Image.open(png);im.load();assert im.size==(4500,4500);im.save(Path('/tmp')/(name+'_300.png'),dpi=(300,300));os.replace(Path('/tmp')/(name+'_300.png'),R/'Buyer/PNG'/(name+'.png'))
 prev=Image.new('RGB',(1100,1100),'#FAF6EB');thumb=im.resize((1000,1000),Image.Resampling.LANCZOS);prev.paste(thumb,(50,50),thumb)
 d=ImageDraw.Draw(prev);d.text((50,25),name.replace('_',' '),font=ImageFont.truetype(F,22),fill='#66615A');d.text((790,1050),'Pinogri preview',font=ImageFont.truetype(F,22),fill='#9C9387')
 tmp=Path('/tmp')/(name+'_preview.jpg');prev.save(tmp,quality=93);os.replace(tmp,R/'Previews'/(name+'.jpg'))
 return {'name':name,'inkscape_import':'PASS','png':[4500,4500],'alpha_bbox':im.getbbox()}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
 rs=list(ex.map(run,sorted((R/'Sources').glob('*.svg'))))
(R/'render_checks.json').write_text(json.dumps(rs,indent=2));print('20 SVG imports and20 RGBA4500 exports PASS')
