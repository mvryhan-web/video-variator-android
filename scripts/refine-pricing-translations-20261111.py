#!/usr/bin/env python3
"""Owner pricing terminology review for static RU/FR/ES dictionaries only.
No changes to numeric prices, Stripe checkout, model billing or images.
"""
from pathlib import Path
import json
root=Path("app/src/main/assets/i18n")
# Exact approved visible English -> Russian, French, Spanish text.
rows=[
("PRICING PLANS","ТАРИФНЫЕ ПЛАНЫ","FORMULES ET TARIFS","PLANES Y PRECIOS"),
("Power Your Creativity","Раскройте свои творческие возможности","Libérez votre créativité","Impulsa tu creatividad"),
("Professional AI Tools","Профессиональные AI-инструменты","Outils IA professionnels","Herramientas de IA profesionales"),
("Quality","Качество","Qualité","Calidad"),
("Press Release","Пресс-релиз","Communiqué de presse","Comunicado de prensa"),
("85% OFF","СКИДКА 85%","85 % DE RÉDUCTION","85 % DE DESCUENTO"),
("♛ BEST VALUE","♛ ЛУЧШИЙ ВЫБОР","♛ MEILLEURE OFFRE","♛ MEJOR OPCIÓN"),
("one time","разово","paiement unique","pago único"),
("/ month","/ месяц","/ mois","/ mes"),
("/ month · billed yearly","/ месяц · оплата за год","/ mois · facturation annuelle","/ mes · facturación anual"),
("Price unavailable","Цена недоступна","Prix indisponible","Precio no disponible"),
("For everyday video variations and essential tools","Для повседневной обработки видео и основных инструментов","Pour les variantes vidéo du quotidien et les outils essentiels","Para variaciones de vídeo cotidianas y herramientas esenciales"),
("For regular creators needing higher quality and more variants","Для авторов, которым нужно более высокое качество и больше вариантов","Pour les créateurs qui ont besoin d'une meilleure qualité et de plus de variantes","Para creadores que necesitan mayor calidad y más variantes"),
("For larger video workloads and all supported variation modes","Для больших объёмов видео и всех доступных режимов обработки","Pour les volumes vidéo importants et tous les modes de variation disponibles","Para grandes volúmenes de vídeo y todos los modos de variación disponibles"),
("One-time access to the included tools","Разовая покупка доступа к включённым инструментам","Accès aux outils inclus par paiement unique","Acceso de pago único a las herramientas incluidas"),
("3-day trial pass for DeepSyQ tools","Пробный доступ к инструментам DeepSyQ на 3 дня","Accès d'essai de 3 jours aux outils DeepSyQ","Acceso de prueba de 3 días a las herramientas DeepSyQ"),
("100 tool processing credits included","Включено 100 кредитов для обработки инструментами","100 crédits de traitement inclus","Se incluyen 100 créditos de procesamiento"),
("One-time payment: no automatic renewal","Разовая оплата без автоматического продления","Paiement unique sans renouvellement automatique","Pago único sin renovación automática"),
("Explore the Canvas workspace; paid AI requires credits","Изучайте Canvas; платные AI-генерации требуют отдельных кредитов","Découvrez Canvas ; les générations IA payantes nécessitent des crédits","Explora Canvas; las generaciones de IA de pago requieren créditos"),
("Watermark-free exports during trial","Экспорт без водяных знаков во время пробного периода","Exports sans filigrane pendant l'essai","Exportaciones sin marca de agua durante la prueba"),
("Up to 5 variants","До 5 вариантов","Jusqu'à 5 variantes","Hasta 5 variantes"),
("Up to 10 variants","До 10 вариантов","Jusqu'à 10 variantes","Hasta 10 variantes"),
("Up to 15 variants","До 15 вариантов","Jusqu'à 15 variantes","Hasta 15 variantes"),
("Gentle mode","Мягкий режим","Mode doux","Modo suave"),
("Gentle + Balance modes","Мягкий и сбалансированный режимы","Modes doux et équilibré","Modos suave y equilibrado"),
("Gentle, Balance + Dynamic","Мягкий, сбалансированный и динамический режимы","Modes doux, équilibré et dynamique","Modos suave, equilibrado y dinámico"),
("720p quality","Качество 720p","Qualité 720p","Calidad 720p"),
("1080p quality","Качество 1080p","Qualité 1080p","Calidad 1080p"),
("4K quality","Качество 4K","Qualité 4K","Calidad 4K"),
("Up to 4K quality","Качество до 4K","Qualité jusqu'à 4K","Calidad de hasta 4K"),
("Included Basic tools","Включены инструменты тарифа «Базовый»","Outils Essentiel inclus","Herramientas del plan Básico incluidas"),
("Included Pro tools","Включены инструменты тарифа «Про»","Outils Pro inclus","Herramientas del plan Pro incluidas"),
("Included Business tools","Включены инструменты тарифа «Бизнес»","Outils Entreprise inclus","Herramientas del plan Empresa incluidas"),
("Included Lifetime Tools","Включённые инструменты доступны навсегда","Outils inclus accessibles à vie","Herramientas incluidas disponibles de por vida"),
("Tool credits: see current terms","Кредиты инструментов: см. действующие условия","Crédits d'outils : voir les conditions en vigueur","Créditos de herramientas: consulta las condiciones vigentes"),
("Video Uniquifier and tools included in this plan","Видеоуникализатор и инструменты включены в тариф","L'outil vidéo et les autres outils sont inclus dans cette formule","El personalizador de vídeo y otras herramientas están incluidos en este plan"),
("Canvas workspace; AI generation requires paid credits","Canvas включён; для AI-генерации нужны оплаченные кредиты","Canvas inclus ; les générations IA nécessitent des crédits payants","Canvas incluido; la generación con IA requiere créditos de pago"),
("Explore the AI model catalog (availability varies)","Каталог AI-моделей (доступность может различаться)","Catalogue des modèles IA (selon disponibilité)","Catálogo de modelos IA (disponibilidad variable)"),
("Watermark-free Video Uniquifier exports","Экспорт из Видеоуникализатора без водяных знаков","Exports de vidéos sans filigrane","Exportaciones de vídeo sin marca de agua"),
("One account for your plan, credits and history","Один аккаунт для тарифа, кредитов и истории","Un seul compte pour votre formule, vos crédits et votre historique","Una cuenta para tu plan, tus créditos y tu historial"),
("AI wallet and prepaid packages are separate","AI-кошелёк и пакеты предоплаченных кредитов учитываются отдельно","Le portefeuille IA et les packs prépayés sont distincts","La cartera de IA y los paquetes prepagados son independientes"),
("Monthly subscription; manage in your account","Месячная подписка; управление в аккаунте","Abonnement mensuel ; gestion depuis votre compte","Suscripción mensual; gestión desde tu cuenta"),
("One-time purchase: no monthly plan renewal","Разовая покупка без ежемесячного продления","Achat unique sans renouvellement mensuel","Compra única sin renovación mensual"),
("Plan features","Возможности тарифа","Fonctionnalités de la formule","Funciones del plan"),
("Tool allowance not verified","Лимит инструментов не подтверждён","Quota d'outils non vérifié","Cuota de herramientas sin verificar"),
("Tool allowance unavailable","Лимит инструментов недоступен","Quota d'outils indisponible","Cuota de herramientas no disponible"),
("Included lifetime tools","Инструменты включены навсегда","Outils inclus à vie","Herramientas incluidas de por vida"),
("Proposed introduction","Предварительное предложение","Offre proposée","Oferta propuesta"),
("Credit quantity, duration and checkout still require approval.","Количество кредитов, срок и оплата ещё требуют утверждения.","Le nombre de crédits, la durée et le paiement doivent encore être approuvés.","La cantidad de créditos, la duración y el pago aún requieren aprobación."),
("AI generation is billed separately through the verified AI wallet.","AI-генерации оплачиваются отдельно через подтверждённый AI-кошелёк.","Les générations IA sont facturées séparément via le portefeuille IA vérifié.","Las generaciones con IA se cobran por separado mediante la cartera de IA verificada."),
("$0.99 Trial: price and included credits are NOT active yet.","Пробный тариф $0.99: цена и кредиты пока НЕ активированы.","Essai à 0,99 $ : le prix et les crédits inclus ne sont PAS encore activés.","Prueba de 0,99 $: el precio y los créditos incluidos aún NO están activos."),
("ⓘ Lifetime does not include unlimited paid AI generation; purchase AI credits separately.","ⓘ Тариф «Навсегда» не включает безлимитные платные AI-генерации; кредиты покупаются отдельно.","ⓘ La formule À vie n'inclut pas de générations IA payantes illimitées ; les crédits s'achètent séparément.","ⓘ El plan De por vida no incluye generaciones de IA de pago ilimitadas; compra créditos por separado."),
("The server has not supplied a verified price.","Сервер не предоставил подтверждённую цену.","Le serveur n'a pas fourni de prix vérifié.","El servidor no ha proporcionado un precio verificado."),
("Check Trial availability","Проверить доступность пробного тарифа","Vérifier la disponibilité de l'essai","Comprobar disponibilidad de prueba"),
("Opening secure checkout…","Открываем защищённую оплату…","Ouverture du paiement sécurisé…","Abriendo el pago seguro…"),
("Checkout is not yet available. No payment was taken.","Оплата пока недоступна. Деньги не списаны.","Le paiement n'est pas encore disponible. Aucun montant n'a été débité.","El pago aún no está disponible. No se ha cobrado nada."),
("Yearly plans are a pricing preview only; annual checkout is not available. No payment was taken.","Годовые тарифы показаны для сравнения. Годовая оплата пока недоступна; деньги не списаны.","Les tarifs annuels sont présentés à titre indicatif. Le paiement annuel n'est pas disponible ; aucun montant n'a été débité.","Los planes anuales se muestran solo como referencia. El pago anual no está disponible y no se ha cobrado nada."),
("✨ Bonus credits are fully activated and automatically added to your balance upon payment.","✨ После оплаты бонусные кредиты активируются и автоматически начисляются на баланс.","✨ Après paiement, les crédits bonus sont activés et ajoutés automatiquement à votre solde.","✨ Tras el pago, los créditos de bonificación se activan y se añaden automáticamente a tu saldo."),
("Base","Основные","Base","Base"),
("Bonus","Бонус","Bonus","Bono"),
("Total","Всего","Total","Total"),
("Purchase","Купить","Acheter","Comprar"),
("Check availability","Проверить доступность","Vérifier la disponibilité","Comprobar disponibilidad"),
("Stripe TEST checkout","Тестовая оплата Stripe","Paiement test Stripe","Pago de prueba de Stripe"),
("AI credits are not available for checkout yet. No payment was taken.","AI-кредиты пока нельзя оплатить. Деньги не списаны.","Le paiement de ces crédits IA n'est pas encore disponible. Aucun montant n'a été débité.","La compra de estos créditos IA aún no está disponible. No se ha cobrado nada."),
("Recent activity","Последние операции","Activité récente","Actividad reciente"),
("Your AI credits","Ваши AI-кредиты","Vos crédits IA","Tus créditos IA"),
("Sign in to view balance","Войти и посмотреть баланс","Se connecter pour voir le solde","Iniciar sesión para ver el saldo"),
("View your AI wallet and purchase availability","Посмотреть AI-кошелёк и доступность покупки","Consulter votre portefeuille IA et les options d'achat","Ver tu cartera de IA y la disponibilidad de compra"),
("Your balance and recent activity are private. Sign in to see your AI credits.","Баланс и история операций доступны только вам. Войдите, чтобы увидеть AI-кредиты.","Votre solde et vos opérations récentes sont privés. Connectez-vous pour voir vos crédits IA.","Tu saldo y tus operaciones recientes son privados. Inicia sesión para ver tus créditos IA."),
("These are AI generation credits, separate from the Video & Everyday Tools plan allowance.","Это кредиты для AI-генераций, отдельные от лимита тарифа Video & Everyday Tools.","Ces crédits servent aux générations IA et sont distincts du quota Video & Everyday Tools.","Estos créditos son para generaciones con IA y son independientes de la cuota del plan Video & Everyday Tools."),
("No AI wallet activity yet.","В AI-кошельке пока нет операций.","Aucune activité dans le portefeuille IA pour le moment.","Todavía no hay actividad en la cartera de IA."),
("Available","Доступно","Disponibles","Disponibles"),
("Held","Зарезервировано","Réservés","Retenidos"),
("Debt","Задолженность","Dette","Deuda"),
("AI credits","AI-кредиты","Crédits IA","Créditos IA"),
("Purchased credits","Купленные кредиты","Crédits achetés","Créditos comprados"),
("Welcome credits","Приветственные кредиты","Crédits de bienvenue","Créditos de bienvenida"),
("Reserved for generation","Зарезервировано для генерации","Réservés pour une génération","Reservados para generación"),
("Generation charged","Списание за генерацию","Génération facturée","Generación cobrada"),
("Reservation released","Резерв возвращён","Réservation libérée","Reserva liberada"),
("Refund adjustment","Корректировка возврата","Ajustement de remboursement","Ajuste de reembolso"),
("Owner adjustment","Корректировка администратора","Ajustement administrateur","Ajuste del administrador"),
]
def main():
    files={}
    for lang in ("ru","fr","es"):
        f=root/f"catalog-{lang}.json"
        o=json.loads(f.read_text(encoding="utf8"));assert o["language"]==lang
        files[lang]=(f,o)
    for english,ru,fr,es in rows:
        for lang,target in (("ru",ru),("fr",fr),("es",es)):
            files[lang][1]["entries"][english]=target
    for lang,(p,data) in files.items():
        data["entryCount"]=len(data["entries"])
        p.write_text(json.dumps(data,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf8")
        print("OWNER_REVIEWED_PRICING_TRANSLATIONS",lang,len(rows),data["entryCount"])
if __name__=="__main__":main()
