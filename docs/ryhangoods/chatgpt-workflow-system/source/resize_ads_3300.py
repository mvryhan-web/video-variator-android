"""Owner-authorized size conversion. No generation or design reconstruction."""
from pathlib import Path
from PIL import Image, ImageCms, ImageChops, ImageStat
import hashlib, json, math, os, tempfile, sys

ROOT=Path(__file__).resolve().parent
SOURCE_ROOT=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'review-source'
SRC=SOURCE_ROOT/'Images'
OUT=Path(sys.argv[2]) if len(sys.argv)>2 else ROOT/'Promo_V2_3300'
OUT.mkdir(exist_ok=True)
ICC=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
names=['MAIN','CONTENTS','WORKED_EXAMPLE','SKILLS','PROJECTS','CLIENT_TEMPLATES','ROLE_ROUTES','PDF_GUIDES','QUALITY_REVIEW','DOWNLOAD']
source_qa=json.loads((SOURCE_ROOT/'FINAL_SELECTION_QA.json').read_text())
report=[]
for n,name in enumerate(names,1):
    source=SRC/f'{n:02d}.png'
    raw=source.read_bytes();sha=hashlib.sha256(raw).hexdigest()
    assert sha==source_qa[n-1]['sha256']
    with Image.open(source) as check:check.verify()
    with Image.open(source) as img:
        original_size=img.size
        original_metadata_keys=sorted(img.info)
        rgb=img.convert('RGB')
        expected=rgb.resize((3300,3300),Image.Resampling.LANCZOS)
    exif=Image.Exif()
    exif[270]=f'Pinogri Workflow Studio advertising image {n:02d}; AI-assisted source 1254x1254; owner-authorized Lanczos resize to 3300x3300; source SHA256 {sha}. No new native detail.'
    exif[305]='Pillow Lanczos resize; JPEG quality 97; no generative edit'
    exif[315]='Pinogri'
    dest=OUT/f'{n:02d}_{name}_3300.jpg'
    fd,tmp=tempfile.mkstemp(prefix='pinogri-3300-',suffix='.jpg');os.close(fd)
    expected.save(tmp,'JPEG',quality=97,subsampling=0,optimize=True,progressive=True,dpi=(300,300),icc_profile=ICC,exif=exif)
    with Image.open(tmp) as check:check.verify()
    with Image.open(tmp) as check:
        check.load();assert check.size==(3300,3300) and check.mode=='RGB'
        assert check.info.get('dpi')==(300,300)
        assert check.info.get('icc_profile')==ICC
        assert sha in check.getexif()[270]
        diff=ImageChops.difference(expected,check)
        mse=sum(ImageStat.Stat(diff).sum2)/(3300*3300*3)
        psnr=10*math.log10(255**2/mse) if mse else float('inf')
        assert psnr>40,(n,psnr)
    os.replace(tmp,dest)
    report.append({'file':dest.name,'source_file':source.name,'source_sha256':sha,'source_dimensions':list(original_size),'source_metadata_keys':original_metadata_keys,'export_dimensions':[3300,3300],'mode':'RGB','format':'JPEG','jpeg_quality':97,'chroma_subsampling':'4:4:4','dpi_metadata':300,'icc':'sRGB; unprofiled source assumed sRGB','resize':'Pillow Lanczos interpolation; no added native detail; no crop or composition change','source_preserved':'Original PNG retained unchanged in saved V2 source archive','export_sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'bytes':dest.stat().st_size,'jpeg_psnr_against_resized_pixels_db':round(psnr,2),'technical_check':'PASS','visual_check':'PENDING individual inspection'})
    print(dest.name,'3300x3300',dest.stat().st_size,'bytes',round(psnr,2),'dB',flush=True)
(OUT/'EXPORT_QA.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
(OUT/'README_RU.txt').write_text('Pinogri Workflow Studio — рекламные изображения V2.\n10 отдельных JPEG: 3300×3300 px, RGB, профиль sRGB, метаданные 300 DPI, качество JPEG97, без цветовой субдискретизации.\nСозданы обычным программным увеличением исходников 1254×1254 методом Lanczos по поручению владельца от05.11.2026. Композиции, надписи и пропорции сохранены; кадрирование, генерация новых деталей и замена дизайна не выполнялись. Это увеличенные экспорты, а не нативная генерация в3300px. DPI — метаданные, а не дополнительная детализация.\nИсходные PNG сохранены отдельно в архиве V2 Design Review. Прежняя зелёно-белая серия V1 отклонена и не используется.\nЭто рекламные материалы цифрового комплекта. Изображённые устройства и предметы — демонстрационные элементы, физически не поставляются. Изображения не входят в архив покупателя.\nЭтот экспорт не означает загрузку или публикацию на Etsy/Google Drive.\n')
