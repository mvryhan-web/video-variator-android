#!/usr/bin/env python3
"""Build static DEEPSYQ EN/RU/FR/ES catalogs using offline Argos translation.
Only customer-facing literal phrases are localized. Billing and HTML untouched.
Output 34 per-page JSON files plus one shared dictionary. Deterministic keys,
with a curated override layer for labels, prices and safety disclosures.
"""
import argparse
from collections import Counter
from html import unescape
from html.parser import HTMLParser
import json
import re
from pathlib import Path
import sys
import time

ROOT=Path('app/src/main/assets')
OUT=ROOT/'i18n'
LANGS=('ru','fr','es')
EXCLUDED={'script','style','svg','noscript','template'}
ATTRS={'title','placeholder','aria-label','aria-description','alt'}
CURATED={
 'Home':('Главная','Accueil','Inicio'),
 'Pricing':('Тарифы','Tarifs','Precios'),
 'Studio':('Студия','Studio','Estudio'),
 'Help':('Помощь','Aide','Ayuda'),
 'Settings':('Настройки','Paramètres','Configuración'),
 'Download':('Скачать','Télécharger','Descargar'),
 'Upload':('Загрузить','Importer','Subir'),
 'Image':('Изображение','Image','Imagen'),
 'Video':('Видео','Vidéo','Vídeo'),
 'Audio':('Аудио','Audio','Audio'),
 'Canvas':('Canvas','Canvas','Canvas'),
 'Trial':('Пробный','Essai','Prueba'),
 'Basic':('Базовый','Essentiel','Básico'),
 'Pro':('Про','Pro','Pro'),
 'Business':('Бизнес','Entreprise','Empresa'),
 'Lifetime':('Навсегда','À vie','De por vida'),
 'Monthly':('Ежемесячно','Mensuel','Mensual'),
 'Yearly':('Ежегодно','Annuel','Anual'),
 'Choose Basic':('Выбрать Базовый','Choisir Essentiel','Elegir Básico'),
 'Choose Pro':('Выбрать Про','Choisir Pro','Elegir Pro'),
 'Choose Business':('Выбрать Бизнес','Choisir Entreprise','Elegir Empresa'),
 'Choose Lifetime':('Выбрать Навсегда','Choisir À vie','Elegir De por vida'),
 'Start Trial':('Начать пробный период','Commencer l’essai','Comenzar prueba'),
 'Check Trial availability':('Проверить доступность пробного периода','Vérifier la disponibilité de l’essai','Comprobar disponibilidad de prueba'),
 'Price unavailable':('Цена недоступна','Prix indisponible','Precio no disponible'),
 'Plan features':('Возможности тарифа','Fonctionnalités de la formule','Funciones del plan'),
 'one time':('разово','paiement unique','pago único'),
 '/ month':('/ месяц','/ mois','/ mes'),
 '85% OFF':('СКИДКА 85%','85 % DE RÉDUCTION','85 % DE DESCUENTO'),
 'AI Credits':('AI-кредиты','Crédits IA','Créditos IA'),
 'AI credits':('AI-кредиты','Crédits IA','Créditos IA'),
 'Your AI credits':('Ваши AI-кредиты','Vos crédits IA','Tus créditos IA'),
 'Recent activity':('Последние операции','Activité récente','Actividad reciente'),
 'Available':('Доступно','Disponible','Disponible'),
 'Held':('Зарезервировано','Réservé','Reservado'),
 'Debt':('Задолженность','Dette','Deuda'),
 'Purchase':('Купить','Acheter','Comprar'),
 'Purchase credits':('Купить кредиты','Acheter des crédits','Comprar créditos'),
 'Sign in':('Войти','Se connecter','Iniciar sesión'),
 'Terms':('Условия','Conditions','Términos'),
 'Refunds':('Возвраты','Remboursements','Reembolsos'),
 'Contact':('Контакты','Contact','Contacto'),
 'Privacy':('Конфиденциальность','Confidentialité','Privacidad'),
 'Edit':('Редактировать','Modifier','Editar'),
 'Delete':('Удалить','Supprimer','Eliminar'),
 'Cancel':('Отмена','Annuler','Cancelar'),
 'Save':('Сохранить','Enregistrer','Guardar'),
 'Search':('Поиск','Rechercher','Buscar'),
 'Next':('Далее','Suivant','Siguiente'),
 'Previous':('Назад','Précédent','Anterior'),
 'Back':('Назад','Retour','Atrás'),
 'Retry':('Повторить','Réessayer','Reintentar'),
 'Close':('Закрыть','Fermer','Cerrar'),
 'Copy':('Копировать','Copier','Copiar'),
 'Loading...':('Загрузка...','Chargement...','Cargando...'),
 'Logout':('Выйти','Se déconnecter','Cerrar sesión'),
 'Image Studio':('Студия изображений','Studio d’images','Estudio de imágenes'),
 'Video Studio':('Видеостудия','Studio vidéo','Estudio de vídeo'),
 'Video Uniquifier':('Уникализатор видео','Outil de variation vidéo','Variador de vídeo'),
 'My Creations':('Мои работы','Mes créations','Mis creaciones'),
 'Everyday Tools':('Повседневные инструменты','Outils du quotidien','Herramientas cotidianas'),
 'AI Apps':('AI-приложения','Applications IA','Aplicaciones IA'),
 'Power Your Creativity':('Раскройте свой творческий потенциал','Libérez votre créativité','Impulsa tu creatividad'),
 'PRICING PLANS':('ТАРИФНЫЕ ПЛАНЫ','FORMULES ET TARIFS','PLANES Y PRECIOS'),
 '♛ BEST VALUE':('♛ ЛУЧШИЙ ВЫБОР','♛ MEILLEUR RAPPORT QUALITÉ-PRIX','♛ MEJOR OPCIÓN'),
 'Stripe TEST checkout':('Тестовая оплата Stripe','Paiement TEST Stripe','Pago de prueba de Stripe'),
 'Check availability':('Проверить доступность','Vérifier la disponibilité','Comprobar disponibilidad'),
 'Choose billing period':('Выберите период оплаты','Choisissez la période de facturation','Elige el periodo de facturación'),
 'Your balance and recent activity are private. Sign in to see your AI credits.':(
  'Ваш баланс и история операций конфиденциальны. Войдите, чтобы увидеть AI-кредиты.',
  'Votre solde et votre activité récente sont privés. Connectez-vous pour consulter vos crédits IA.',
  'Tu saldo y tu actividad reciente son privados. Inicia sesión para consultar tus créditos IA.'),
 'AI generation is billed separately through the verified AI wallet.':(
  'AI-генерации оплачиваются отдельно через подтверждённый AI-кошелёк.',
  'Les générations IA sont facturées séparément via le portefeuille IA vérifié.',
  'Las generaciones con IA se cobran por separado mediante la cartera de IA verificada.'),
 'ⓘ Lifetime does not include unlimited paid AI generation; purchase AI credits separately.':(
  'ⓘ Тариф «Навсегда» не включает безлимитную платную AI-генерацию; AI-кредиты покупаются отдельно.',
  'ⓘ La formule À vie n’inclut pas de génération IA payante illimitée ; achetez les crédits IA séparément.',
  'ⓘ El plan De por vida no incluye generación de IA de pago ilimitada; compra créditos IA por separado.')
}
class Extractor(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True)
  self.skip=[]
  self.phrases=[]
 def handle_starttag(self,tag,attrs):
  if tag in EXCLUDED:self.skip.append(tag)
  if self.skip:return
  for name,val in attrs:
   if name in ATTRS and val:self.phrases.append(val)
 def handle_endtag(self,tag):
  if self.skip and self.skip[-1]==tag:self.skip.pop()
 def handle_data(self,text):
  if not self.skip:self.phrases.append(text)

def normalize(s):
 s=unescape(str(s))
 s=s.replace('\u00a0',' ')
 return re.sub(r'\s+',' ',s).strip()

def valid(s):
 if not s or len(s)>900 or '\x00' in s:return False
 if not re.search(r'[a-zA-Z]{2}',s):return False
 if s.startswith(('http:','https:','data:','mailto:','/api/','--','//')):return False
 if any(x in s for x in ('</','{','}','=>','document.','window.','localStorage.','[object','@media','SELECT ','INSERT ','UPDATE ')):return False
 if re.search(r'(?i)\.(js|css|html|json|png|webp)\b',s) and len(s)<140:return False
 if re.fullmatch(r'[A-Za-z_0-9\-.:/#%?&=|+]+',s) and s not in CURATED:return False
 if re.search(r'[A-Za-z_]{5}\(',s):return False
 return True

def english_script_phrases(content):
 # UI literals passed to textContent/placeholder, node(), notices, aria-label and list data.
 patterns=[
  r'''(?:textContent|innerText|placeholder|title)\s*=\s*(['"])((?:\\.|(?!\1).)*?)\1''',
  r'''(?:setAttribute)\s*\(\s*['"](?:aria-label|title|placeholder)['"]\s*,\s*(['"])((?:\\.|(?!\1).)*?)\1''',
  r'''(?:node|createElementText)\s*\(\s*['"][^'"]+['"]\s*,\s*['"][^'"]*['"]\s*,\s*(['"])((?:\\.|(?!\1).)*?)\1''',
  r'''(?:message|status|notify|announce|toast)\s*\(\s*[^,\n]{1,80},\s*(['"])((?:\\.|(?!\1).)*?)\1'''
 ]
 for pat in patterns:
  for m in re.finditer(pat,content):
   phrase=normalize(m.group(2))
   if valid(phrase):yield phrase
 # User-facing text also occurs inside plan benefits, tool arrays and modal
 # configurations. Collect natural-language quoted literals, not API keys.
 for m in re.finditer(r'''(['"])((?:\\.|(?!\1).){3,550}?)\1''',content):
  phrase=normalize(m.group(2))
  if not valid(phrase):continue
  if phrase.count(' ')<1 and phrase not in CURATED:continue
  if not re.search(r'[a-zA-Z]{2,}',phrase):continue
  if re.search(r'[=<>;\\\[\]{}$]|(?:\.\w+\()|\b(?:const|function|return|document|window|localStorage)\b',phrase):continue
  if len(phrase)>450:continue
  yield phrase

def collect():
 htmls=sorted(ROOT.glob('*.html'))
 output={}
 shared=Counter()
 for page in htmls:
  s=page.read_text(encoding='utf-8')
  parser=Extractor()
  parser.feed(s)
  keys={normalize(x) for x in parser.phrases}
  scripts=set(re.findall(r'<script\b[^>]*\bsrc=["\']([^"\']+)["\']',s,flags=re.I))
  for src in scripts:
   name=src.split('?')[0]
   if name.startswith(('http:','https:','/')):continue
   script=ROOT/name
   if script.is_file() and script.suffix=='.js':
    keys.update(english_script_phrases(script.read_text(encoding='utf-8',errors='replace')))
  keys={k for k in keys if valid(k)}
  output[page.name]=sorted(keys)
  shared.update(keys)
 print('DEEPSYQ_I18N_COLLECT',json.dumps({'pages':len(output),'totalSourceStrings':sum(map(len,output.values())),'uniqueSourceStrings':len(shared),'pageSizes':{k:len(v) for k,v in output.items()}},ensure_ascii=False),flush=True)
 return output,shared

def load_engines():
 import argostranslate.package,argostranslate.translate
 available=argostranslate.package.get_available_packages()
 for lang in LANGS:
  pack=next((x for x in available if x.from_code=='en' and x.to_code==lang),None)
  if not pack:raise RuntimeError('Offline English→'+lang+' language pack unavailable')
  print('DEEPSYQ_I18N_PACK',lang,flush=True)
  argostranslate.package.install_from_path(pack.download())
 return argostranslate.translate

def translate_keys(keys,translator):
 translated={}
 started=time.time()
 for i,key in enumerate(sorted(keys)):
  if key in CURATED:
   vals=CURATED[key]
  else:
   values=[]
   for lang in LANGS:
    try:out=normalize(translator.translate(key,'en',lang))
    except Exception as e:
     raise RuntimeError('Translation failed for '+repr(key[:60])+' to '+lang) from e
    if not out:raise RuntimeError('Empty translated string '+repr(key))
    values.append(out)
   vals=tuple(values)
  translated[key]={lang:vals[j] for j,lang in enumerate(LANGS)}
  if i and i%200==0:
   print('DEEPSYQ_I18N_PROGRESS',i,'/',len(keys),'seconds',round(time.time()-started,1),flush=True)
 return translated

def main():
 parser=argparse.ArgumentParser()
 parser.add_argument('--collect-only',action='store_true')
 opts=parser.parse_args()
 pages,count=collect()
 if opts.collect_only:return
 translator=load_engines()
 common={s for s,n in count.items() if n>=3 or s in CURATED}
 unique=set(count)
 values=translate_keys(unique,translator)
 OUT.mkdir(parents=True,exist_ok=True)
 for page,keys in pages.items():
  own={k:values[k] for k in keys if k not in common}
  (OUT/(page+'.json')).write_text(json.dumps({'version':'20261111','page':page,'strings':own},ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
 shared={k:values.get(k,dict(zip(LANGS,CURATED[k]))) for k in sorted(common)}
 (OUT/'shared.json').write_text(json.dumps({'version':'20261111','strings':shared},ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
 total=sum(len(v) for v in pages.values())
 assert len(pages)==34 and len(values)>500
 assert all(len(values[k])==3 and all(values[k].values()) for k in values)
 print('DEEPSYQ_I18N_BUILT',json.dumps({'pages':len(pages),'sourcePhrases':total,'uniquePhrases':len(unique),'translatedValues':len(unique)*3,'shared':len(common),'fileCount':len(list(OUT.glob('*.json')))},ensure_ascii=False),flush=True)
if __name__=='__main__':main()
