// User-facing generation status only. All states and credit amounts must come from
// a server response; this module never quotes, reserves, charges, or retries a job.
const stages={
 en:{
  submitting:['Submitting request','Keep this page open until the server confirms that the job was accepted.'],
  queued:['Queued','Your accepted job is waiting. You can return to History later.'],
  processing:['Generating','The server is processing this accepted job. You can close this page and check History later.'],
  finalizing:['Finalizing','Saving the result and completing billing. Check History again later if you leave.'],
  ready:['Ready','Your creation is saved. Preview or download it, or find it again in History.'],
  failed:['Failed','The server reported a failure. Check History and your wallet before creating a new job. No retry was started.'],
  unknown:['Status uncertain','Do not resubmit automatically. Check History and your wallet; credit settlement may need review.'],
  unconfirmed:['Not confirmed','The submission was not confirmed. Check History before retrying to avoid duplicate paid jobs.']
 },
 ru:{
  submitting:['Отправляем запрос','Не закрывайте страницу, пока сервер не подтвердит принятие задачи.'],
  queued:['В очереди','Задача принята и ожидает запуска. Позже можно вернуться к ней через Историю.'],
  processing:['Генерация','Сервер обрабатывает принятую задачу. Страницу можно закрыть и позже проверить результат в Истории.'],
  finalizing:['Сохранение результата','Результат сохраняется и завершаются расчёты. Позже проверьте Историю.'],
  ready:['Готово','Результат сохранён. Его можно посмотреть, скачать или открыть из Истории.'],
  failed:['Ошибка','Сервер сообщил об ошибке. Проверьте Историю и кошелёк перед новой задачей. Автоповтор не запускался.'],
  unknown:['Статус неизвестен','Не отправляйте повтор автоматически. Проверьте Историю и кошелёк: состояние кредитов может требовать проверки.'],
  unconfirmed:['Не подтверждено','Сервер не подтвердил отправку. Перед повтором проверьте Историю, чтобы избежать двойной оплаты.']
 }
};
export function progressView(status,{creditsReserved=null,creditsCharged=null,locale='en'}={}){
 const lang=String(locale).toLowerCase().startsWith('ru')?'ru':'en';
 const normalized=Object.hasOwn(stages.en,status)?status:'unknown';
 const [heading,hint]=stages[lang][normalized];
 const valid=n=>Number.isSafeInteger(n)&&n>0;
 let credits='';
 if(normalized!=='submitting'&&normalized!=='unconfirmed'){
  if(normalized==='ready'&&valid(creditsCharged))credits=lang==='ru'?creditsCharged+' AI-кредитов списано (подтверждено сервером).':creditsCharged+' AI credits charged (server confirmed).';
  else if(valid(creditsReserved)){
   // A hold is NOT a charge, particularly for unknown/failed/finalizing jobs.
   credits=lang==='ru'?creditsReserved+' AI-кредитов в резерве по данным сервера; это не подтверждённое списание.':creditsReserved+' AI credits reserved per server; this is not a confirmed charge.';
  }else credits=lang==='ru'?'Сервер не сообщил подтверждённую сумму резерва. Проверьте кошелёк.':'No confirmed reservation amount was reported. Check your wallet.';
 }
 return {status:normalized,heading,hint,credits};
}
