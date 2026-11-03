// Replies describe navigation only, never generation or billing success.
const replies = {
  "ru": {
    "11": "Открываю Студию генерации.",
    "12": "Переходим в раздел тарифов и подписок.",
    "13": "Возвращаемся на главную страницу.",
    "14": "Открываю галерею вдохновения.",
    "15": "Переключаю в каталог повседневных инструментов."
  },
  "en": {
    "11": "Opening the Generation Studio.",
    "12": "Navigating to plans and subscriptions.",
    "13": "Returning to the homepage.",
    "14": "Opening the Inspiration showcase.",
    "15": "Switching to Everyday AI Tools."
  },
  "fr": {
    "11": "Ouverture du Studio de génération.",
    "12": "Direction la page des tarifs et abonnements.",
    "13": "Retour à la page d'accueil.",
    "14": "Ouverture de la galerie d'inspiration.",
    "15": "Bascule vers les outils IA du quotidien."
  },
  "es": {
    "11": "Abriendo el Estudio de generación.",
    "12": "Vamos a la sección de planes y suscripciones.",
    "13": "Volviendo a la página principal.",
    "14": "Abriendo la galería de inspiración.",
    "15": "Cambiando a las herramientas de IA diarias."
  }
};
export function navigationReply(url, language) {
 const done={ru:'Сделано.',en:'Done.',fr:'C’est fait.',es:'Hecho.'};
 try {
  const target=new URL(url,'https://deepsyq.invalid/');
  const path=target.pathname.split('/').pop();
  const id=target.hash==='#inspirationPreview'?'14':
   path==='pricing.html'?'12':path==='free-tools.html'?'15':
   path==='generate-studio.html'?'11':
   ['deepsyq.html',''].includes(path)?'13':null;
  return replies[language]?.[id] || done[language] || done.en;
 } catch {return done[language] || done.en;}
}

