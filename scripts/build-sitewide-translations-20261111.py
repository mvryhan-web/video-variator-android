#!/usr/bin/env python3
"""Prepare fully local, no-per-visitor-cost DEEPSYQ translation catalogs.
Text extraction is intentionally read-only. Payment values, URLs, HTML,
CSS, code and authentication are NEVER fed into output replacements.
Model translation runs at build time only (open-source Argos Translate).
"""
from __future__ import annotations
import ast
import html
from html.parser import HTMLParser
import json
import os
import re
import sys
from pathlib import Path
from collections import Counter

ROOT=Path("app/src/main/assets")
OUT=ROOT/"i18n"
LANGUAGES=("ru","fr","es")
SKIP={"script","style","svg","noscript","code","pre","textarea","template"}
SIMPLE=set("Home Help Studio Pricing More Image Video Audio Tools Upload Download Settings Save Create Start Stop Back Continue Close Delete Edit Preview Share Search Free New History Cancel Subscribe Trial Basic Pro Business Lifetime Monthly Yearly Sign in Contact Terms Privacy Refunds Language Account Credits Canvas".split())
SIMPLE.update({"AI Credits","AI Studio","Get started","Read more","View all","My creations","Sign in","Create image","Create video","Generate","Try now","Get started","No results","Search models","Choose file","Upload image","Open settings","Go back","New chat","Loading..."})
JS_STRING=re.compile(r"""(?P<quote>['"])(?P<text>(?:\\.|(?!\1)[^\\\r\n]){1,240})(?P=quote)""")
WORD=re.compile(r"[A-Za-zÀ-ÿА-Яа-яЁё]{2,}")
BAD_PATTERN=re.compile(r"(?:https?://|[/?#]\w+\.html|\.js\b|\.css\b|\.png\b|\.webp\b|\.mp4\b|\.json\b|\\n|\\t|=>|:root|\.querySelector|^--|^#[a-f0-9]{3,8}$|\b(?:const|function|export|return|document|localStorage|window|fetch)\b)")
TAG_RE=re.compile(r"<[^>]+>")
UNSAFE_CLASSES=("token","secret","password","apiKey","authorization","Bearer ")
STATIC_ALLOW_ATTRS={"title","aria-label","placeholder","alt"}
manual={
"ru":{
 "Home":"Главная","Pricing":"Тарифы","Monthly":"Ежемесячно","Yearly":"Ежегодно",
 "Trial":"Пробный","Basic":"Базовый","Pro":"Про","Business":"Бизнес","Lifetime":"Навсегда",
 "Choose Basic":"Выбрать Базовый","Choose Pro":"Выбрать Про","Choose Business":"Выбрать Бизнес","Choose Lifetime":"Выбрать Навсегда",
 "Start Trial":"Начать пробный период","Plan features":"Возможности тарифа",
 "Video Uniquifier":"Видеоуникализатор","Everyday Tools":"Повседневные инструменты",
 "Canvas":"Canvas","AI Credits":"AI-кредиты","Credits":"Кредиты","Image":"Изображение","Video":"Видео","Audio":"Аудио",
 "Upload":"Загрузить","Download":"Скачать","Download PNG":"Скачать PNG","Settings":"Настройки","Save":"Сохранить",
 "Sign in":"Войти","Sign out":"Выйти","Account":"Аккаунт","Create":"Создать","Generate":"Сгенерировать",
 "Cancel":"Отмена","Continue":"Продолжить","Delete":"Удалить","Edit":"Редактировать","Preview":"Предпросмотр",
 "Privacy":"Конфиденциальность","Terms":"Условия","Refunds":"Возвраты","Contact":"Контакты","Help":"Помощь",
 "Search":"Поиск","Loading...":"Загрузка…","Language":"Язык","Choose file":"Выбрать файл","Open settings":"Открыть настройки",
 "My Creations":"Мои работы","Inspiration":"Вдохновение","Recent activity":"Последние операции",
 "Power Your Creativity":"Раскройте свои творческие возможности","one time":"разово",
 "Price unavailable":"Цена недоступна","85% OFF":"СКИДКА 85%",
 "Free":"Бесплатно","Premium":"Премиум","New chat":"Новый чат","Your AI credits":"Ваши AI-кредиты",
 "View your AI wallet and purchase availability":"Посмотреть AI-кошелёк и доступность покупки",
 "Sign in to view balance":"Войти и посмотреть баланс",
 "AI generation is billed separately through the verified AI wallet.":"AI-генерации оплачиваются отдельно через подтверждённый AI-кошелёк.",
 "The server has not supplied a verified price.":"Сервер не предоставил подтверждённую цену.",
 "One account for your tools, plan and history.":"Один аккаунт для инструментов, тарифа и истории.",
},
"fr":{
 "Home":"Accueil","Pricing":"Tarifs","Monthly":"Mensuel","Yearly":"Annuel",
 "Trial":"Essai","Basic":"Essentiel","Pro":"Pro","Business":"Entreprise","Lifetime":"À vie",
 "Choose Basic":"Choisir Essentiel","Choose Pro":"Choisir Pro","Choose Business":"Choisir Entreprise","Choose Lifetime":"Choisir À vie",
 "Start Trial":"Commencer l’essai","Plan features":"Fonctionnalités de la formule",
 "Video Uniquifier":"Outil de personnalisation vidéo","Everyday Tools":"Outils du quotidien",
 "Canvas":"Canvas","AI Credits":"Crédits IA","Credits":"Crédits","Image":"Image","Video":"Vidéo","Audio":"Audio",
 "Upload":"Importer","Download":"Télécharger","Download PNG":"Télécharger le PNG","Settings":"Paramètres","Save":"Enregistrer",
 "Sign in":"Se connecter","Sign out":"Se déconnecter","Account":"Compte","Create":"Créer","Generate":"Générer",
 "Cancel":"Annuler","Continue":"Continuer","Delete":"Supprimer","Edit":"Modifier","Preview":"Aperçu",
 "Privacy":"Confidentialité","Terms":"Conditions","Refunds":"Remboursements","Contact":"Contact","Help":"Aide",
 "Search":"Rechercher","Loading...":"Chargement…","Language":"Langue","Choose file":"Choisir un fichier","Open settings":"Ouvrir les paramètres",
 "My Creations":"Mes créations","Inspiration":"Inspiration","Recent activity":"Activité récente",
 "Power Your Creativity":"Libérez votre créativité","one time":"paiement unique",
 "Price unavailable":"Prix indisponible","85% OFF":"85 % DE RÉDUCTION",
 "Free":"Gratuit","Premium":"Premium","New chat":"Nouvelle discussion","Your AI credits":"Vos crédits IA",
 "View your AI wallet and purchase availability":"Consulter votre portefeuille IA et les options d’achat",
 "Sign in to view balance":"Se connecter pour voir le solde",
 "AI generation is billed separately through the verified AI wallet.":"Les générations IA sont facturées séparément via le portefeuille IA vérifié.",
 "The server has not supplied a verified price.":"Le serveur n’a pas fourni de prix vérifié.",
 "One account for your tools, plan and history.":"Un seul compte pour vos outils, votre formule et votre historique.",
},
"es":{
 "Home":"Inicio","Pricing":"Precios","Monthly":"Mensual","Yearly":"Anual",
 "Trial":"Prueba","Basic":"Básico","Pro":"Pro","Business":"Empresa","Lifetime":"De por vida",
 "Choose Basic":"Elegir Básico","Choose Pro":"Elegir Pro","Choose Business":"Elegir Empresa","Choose Lifetime":"Elegir De por vida",
 "Start Trial":"Comenzar prueba","Plan features":"Funciones del plan",
 "Video Uniquifier":"Personalizador de vídeo","Everyday Tools":"Herramientas cotidianas",
 "Canvas":"Canvas","AI Credits":"Créditos IA","Credits":"Créditos","Image":"Imagen","Video":"Vídeo","Audio":"Audio",
 "Upload":"Subir","Download":"Descargar","Download PNG":"Descargar PNG","Settings":"Configuración","Save":"Guardar",
 "Sign in":"Iniciar sesión","Sign out":"Cerrar sesión","Account":"Cuenta","Create":"Crear","Generate":"Generar",
 "Cancel":"Cancelar","Continue":"Continuar","Delete":"Eliminar","Edit":"Editar","Preview":"Vista previa",
 "Privacy":"Privacidad","Terms":"Términos","Refunds":"Reembolsos","Contact":"Contacto","Help":"Ayuda",
 "Search":"Buscar","Loading...":"Cargando…","Language":"Idioma","Choose file":"Elegir archivo","Open settings":"Abrir configuración",
 "My Creations":"Mis creaciones","Inspiration":"Inspiración","Recent activity":"Actividad reciente",
 "Power Your Creativity":"Impulsa tu creatividad","one time":"pago único",
 "Price unavailable":"Precio no disponible","85% OFF":"85 % DE DESCUENTO",
 "Free":"Gratis","Premium":"Premium","New chat":"Nuevo chat","Your AI credits":"Tus créditos IA",
 "View your AI wallet and purchase availability":"Ver tu cartera de IA y la disponibilidad de compra",
 "Sign in to view balance":"Iniciar sesión para ver el saldo",
 "AI generation is billed separately through the verified AI wallet.":"Las generaciones con IA se cobran por separado mediante la cartera de IA verificada.",
 "The server has not supplied a verified price.":"El servidor no ha proporcionado un precio verificado.",
 "One account for your tools, plan and history.":"Una cuenta para tus herramientas, tu plan y tu historial.",
}}
def normalized(s):
    return re.sub(r"\s+"," ",html.unescape(s)).strip()
def accepted(s, from_js=False):
    s=normalized(s)
    if len(s)<2 or len(s)>(110 if from_js else 2000) or not WORD.search(s):return False
    if from_js and (len(s.split())>16 or re.search(r"[А-Яа-яЁё]",s)):return False
    if from_js and len(s)>70 and s.count(" ")>10:return False
    if TAG_RE.search(s) or BAD_PATTERN.search(s):return False
    if any(sensitive in s for sensitive in UNSAFE_CLASSES):return False
    if s.count("{") or s.count("}") or s.count("$") or s.count("\\"):return False
    if sum(c.isdigit() for c in s) > len(s)*0.4:return False
    if sum(ord(c)>128 for c in s)/len(s)>.65 and not re.search(r"[А-Яа-яЁё]",s):return False
    if from_js and len(s)<12 and " " not in s and s not in SIMPLE:return False
    if from_js and re.match(r"^[-_.:@/\\\w]+$",s) and s not in SIMPLE:return False
    if re.match(r"^[-/\w]+(?:\.[\w.-]+)+$",s) and s not in SIMPLE:return False
    return True

class TextVisitor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags=[];self.items=set()
    def handle_starttag(self,tag,attrs):
        self.tags.append(tag)
        if any(t in SKIP for t in self.tags):return
        for key,value in attrs:
            if key in STATIC_ALLOW_ATTRS and value and accepted(value):
                self.items.add(normalized(value))
    def handle_startendtag(self,tag,attrs):
        self.handle_starttag(tag,attrs);self.handle_endtag(tag)
    def handle_endtag(self,tag):
        if tag in self.tags:
            while self.tags:
                t=self.tags.pop()
                if t==tag:break
    def handle_data(self,data):
        if not any(t in SKIP for t in self.tags) and accepted(data):
            self.items.add(normalized(data))
def visible_strings():
    html_files=sorted(ROOT.glob("*.html"))
    if len(html_files)<33:raise RuntimeError(f"Expected 33+ HTML pages; found {len(html_files)}")
    known=set();per_page={}
    for page in html_files:
        parser=TextVisitor();parser.feed(page.read_text(encoding="utf8"))
        known.update(parser.items);per_page[page.name]=len(parser.items)
    js_files=sorted(ROOT.glob("*.js"))
    for file in js_files:
        if file.stat().st_size>280_000:continue
        source=file.read_text(encoding="utf8",errors="replace")
        for match in JS_STRING.finditer(source):
            raw=match.group("quote")+match.group("text")+match.group("quote")
            try:
                value=ast.literal_eval(raw)
            except (SyntaxError,ValueError,UnicodeError):continue
            if isinstance(value,str) and accepted(value,from_js=True):
                known.add(normalized(value))
    for entries in manual.values():known.update(entries)
    return sorted(known,key=lambda x:(len(x),x)),per_page,len(js_files)
def install_packages(lang):
    from argostranslate import package
    package.update_package_index()
    available=package.get_available_packages()
    needed=[("en",lang)] + ([("ru","en")] if lang!="ru" else [])
    for src,dst in needed:
        installed=package.get_installed_packages()
        if any(p.from_code==src and p.to_code==dst for p in installed):continue
        selection=next((p for p in available if p.from_code==src and p.to_code==dst),None)
        if selection is None:raise RuntimeError(f"Offline translation model missing: {src}->{dst}")
        print("INSTALLING_OPEN_MODEL",src,dst,flush=True)
        package.install_from_path(selection.download())
def source_language(text):
    return "ru" if len(re.findall(r"[А-Яа-яЁё]",text))>=2 else "en"
def make_catalog(lang,texts):
    from argostranslate import translate
    result={}
    stored=OUT/f"catalog-{lang}.json"
    prev={}
    if stored.exists():
        try:prev=json.loads(stored.read_text(encoding="utf8")).get("entries",{})
        except Exception:prev={}
    for i,key in enumerate(texts):
        if key in manual[lang]: value=manual[lang][key]
        elif key in prev and isinstance(prev[key],str) and prev[key]:value=prev[key]
        elif source_language(key)==lang:value=key
        else:
            try:value=translate.translate(key,source_language(key),lang)
            except Exception as error:raise RuntimeError(f"Could not translate {key[:40]}: {error}") from error
        value=normalized(value)
        if not value:raise RuntimeError(f"Empty translation: {key[:70]}")
        result[key]=value
        if i%500==0:print("TRANSLATION_PROGRESS",lang,i,len(texts),flush=True)
    output={"language":lang,"source":"en+ru","entryCount":len(result),"pageCount":34,"entries":result}
    stored.write_text(json.dumps(output,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf8")
    print("CATALOG_COMPLETED",lang,len(result),flush=True)
def main():
    OUT.mkdir(exist_ok=True)
    texts,counts,js_count=visible_strings()
    print("EXTRACTED_SITE_TRANSLATABLE_TEXT",json.dumps({"htmlPages":len(counts),"jsFiles":js_count,"uniqueTexts":len(texts),"perPage":counts},ensure_ascii=False),flush=True)
    if len(texts)<500:raise RuntimeError("Insufficient site content captured")
    if len(texts)>12000:raise RuntimeError("Too many strings, safety review required")
    lang=sys.argv[1] if len(sys.argv)>1 else None
    if lang not in LANGUAGES:raise RuntimeError('Run with one required language: ru, fr or es')
    install_packages(lang)
    make_catalog(lang,texts)
    (OUT/"coverage.json").write_text(json.dumps({"htmlPages":len(counts),"pageStrings":counts,"translationEntries":len(texts),"languages":LANGUAGES},ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    f=OUT/f"catalog-{lang}.json"
    assert f.stat().st_size>10000
if __name__=="__main__":
    main()
