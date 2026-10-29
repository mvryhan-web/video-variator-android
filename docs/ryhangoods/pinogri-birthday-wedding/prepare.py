from pathlib import Path
from PIL import Image
import fitz,os,json,zipfile,shutil,subprocess
ROOT=Path(__file__).resolve().parent;WORK=ROOT.parent;SRC=ROOT/'birthday-wedding-restored'
configs={'Birthday':{'start':51,'stop':76,'folder':'1WxpG6ML_nXzH0nlCoCGEO9e4PhmnoQk8','buyer_library':'libfile_6a350c5db0b48191b62cf835fc3e93a7','images':{'01':'exec-3bc76544-9523-48b2-a4c5-718d87abb7f9.png','04':'exec-6fd76ffd-f12b-4c9b-be14-4869884aa57c.png','05':'exec-a16ac2c4-95d5-4ce5-a0de-ef44a85e32fa.png','06':'exec-b3842c54-1fb1-471c-b61b-ff7a5737b096.png'}},'Wedding':{'start':76,'stop':101,'folder':'1dvxMzzHBgVBrqekPqs-QiMwUjAyNqS65','buyer_library':'libfile_66d4e0d671548191a99f4ecd97ae5a8b','images':{'01':'exec-7cce0830-3de3-45b4-b892-3e2ea4cea572.png','04':'exec-a61218b3-bfc4-49a2-8ceb-16bfe250cf39.png','05':'exec-2a8e2e2e-7a08-4e23-a273-6c76b46236b9.png','06':'exec-f9d60199-1e0c-4211-98be-ec330be4a02e.png'}}}
for theme,cfg in configs.items():
 r=ROOT/('pinogri-'+theme.lower());r.mkdir(exist_ok=True)
 s=(SRC/'Source/build_campaigns.py').read_text();a=s.index('R=Path(__file__).parent;');b=s.index('\nC=',a)
 s=s[:a]+f"R=Path(__file__).parent;F=Path('/usr/share/fonts/opentype/urw-base35');M=[dict(id=i,theme='{theme}',final=str(next((R.parent/'birthday-wedding-restored/{theme}').glob(f'{{i:03}}_*.png')))) for i in range({cfg['start']},{cfg['stop']})]"+s[b:]
 s=s.replace("photos={'Christmas':'generated_images/exec-aff2119f-01fa-450d-b630-ccc507d1504c.png'}","photos={}").replace('for theme,c in C.items():',f"for theme,c in C.items():\n if theme!='{theme}':continue").replace("M[id-1]['final']","next(x['final'] for x in M if x['id']==id)").replace('RYHANGOODS','PINOGRI').replace('RyhanGoods','Pinogri')
 (r/'build_campaigns.py').write_text(s);subprocess.run(['python3',str(r/'build_campaigns.py')],check=True)
 (r/'Source_Generated').mkdir(exist_ok=True);(r/'Delivery').mkdir(exist_ok=True)
 for n,name in cfg['images'].items():
  p=Path('/tmp/pinogri-native-final')/(theme+n+'.png');(r/'Source_Generated'/f'{n}.png').write_bytes(p.read_bytes());im=Image.open(p).convert('RGB').resize((4000,3000),Image.Resampling.LANCZOS);im.save('/tmp/final-ad.jpg',quality=96);os.replace('/tmp/final-ad.jpg',r/theme/'Ads'/f'{n}_{theme}.jpg');im.resize((1400,1050)).save(r/theme/'Ads'/f'{n}_preview.jpg',quality=94)
 d=fitz.open(SRC/theme/'Delivery'/f'RyhanGoods_{theme}_Clipart_Download.pdf');p=d[0]
 for box,txt,size in [((187,240,365,287),'Pinogri',31),((268,313,475,331),'Your Pinogri digital download',8),((117,657,436,674),'Questions? Message Pinogri on Etsy.',10)]:
  p.draw_rect(fitz.Rect(box),color=None,fill=(1,.98,.95));p.insert_font(fontname='Brand',fontfile='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');p.insert_textbox(fitz.Rect(box),txt,fontname='Brand',fontsize=size,align=1,color=(.125,.24,.21))
 d.set_metadata({'title':f'Pinogri {theme} Clipart - Download Guide','author':'Pinogri','subject':'25 PNG illustrations - digital download'})
 d.save('/tmp/final-guide.pdf',garbage=4,deflate=True);pdf=r/'Delivery'/f'Pinogri_{theme}_Clipart_Download.pdf';os.replace('/tmp/final-guide.pdf',pdf);p.get_pixmap(matrix=fitz.Matrix(1.4,1.4)).save(r/'Delivery/preview.png')
 assert p.get_links()[0]['uri']=='https://drive.google.com/drive/folders/'+cfg['folder'];assert 'ryhangoods' not in p.get_text().lower()
 meta=json.load(open(SRC/'Metadata/listings.json'))[theme];meta['description']=meta['description'].replace('RyhanGoods','Pinogri');meta['pdf']=pdf.name;meta.pop('etsy_url',None);meta['status']='prepared';(r/'listing.json').write_text(json.dumps(meta,indent=2))
 assert len(list((r/theme/'Ads').glob(f'[0-9][0-9]_{theme}.jpg')))==10
 files=[r/'build_campaigns.py',r/'listing.json',pdf]+list((r/'Source_Generated').glob('[0-9][0-9].png'))+list((r/theme/'Ads').glob(f'[0-9][0-9]_{theme}.jpg'))
 with zipfile.ZipFile('/tmp/final-owner.zip','w',zipfile.ZIP_DEFLATED) as z:
  for f in files:z.write(f,'Pinogri_'+theme+'/'+str(f.relative_to(r)))
  z.write(Path(__file__),'prepare_pinogri_birthday_wedding.py');z.writestr('RESTORE_BUYER_FILES.txt','Original buyer ZIP Library '+cfg['buyer_library']+'. BuyerPNGunchanged;25designs. Generated adsupscaled4000x3000notnative4K.\n')
 with zipfile.ZipFile('/tmp/final-owner.zip') as z:assert z.testzip() is None
 backup=r/f'Pinogri_{theme}_Owner_Resources.zip';os.replace('/tmp/final-owner.zip',backup)
 print(theme,pdf.stat().st_size,backup.stat().st_size,flush=True)

