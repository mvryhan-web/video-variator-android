// Telegram webhook foundation. No video files or payments are processed here.
import {createHash} from 'node:crypto';
import {linkTelegramChat} from './reminders.js';
import {installTelegramVideo} from './telegram-video.js';
import {installTelegramMini} from './telegram-mini.js';
const commands = {
  start: 'Welcome to Video Uniquifier! Open the app using the Menu button or the link below.',
  create: 'To process a video, open the app. Telegram file processing is not available yet.',
  plans: 'View current plans in the app. Telegram Stars payments are not available yet.',
  account: 'Open the app to view your account and remaining credits.',
  help: 'Use the Menu button to open Video Uniquifier and select a tool.',
  support: 'Please use the support contact information in the app.',
  terms: 'Please review the terms on our website.',
  paysupport: 'For payment questions, please contact support through the app.'
};

export function installTelegramBot(app, {appUrl}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || (token ? createHash('sha256').update(token).digest('hex') : '');
  const videoAddon = installTelegramVideo(app, {appUrl,token});
  const mini = installTelegramMini(app,{token});
  if (!token) {
    console.info('[telegram] Webhook disabled until TELEGRAM_BOT_TOKEN is set.');
    return;
  }
  app.post('/api/telegram/webhook', async (req, res) => {
    if (req.get('X-Telegram-Bot-Api-Secret-Token') !== secret) {
      return res.sendStatus(403);
    }
    if (videoAddon) {
      try { if (await videoAddon.handle(req.body)) return res.json({ok:true}); }
      catch(error){console.error('[telegram-video] Update handling failed:',error.message);return res.status(502).json({ok:false});}
    }
    const message = req.body?.message;
    const chatId = message?.chat?.id;
    const text = String(message?.text || '');
    if (!chatId) return res.json({ok:true});
    const command = text.match(/^\/([a-z]+)(?:@[A-Za-z0-9_]+)?(?:\s|$)/i)?.[1]?.toLowerCase();
    // A one-time deep-link connects only the chat that explicitly pressed Start.
    if (command==='start' && /^\/start(?:@[A-Za-z0-9_]+)?\s+r_[0-9a-f]{40}$/i.test(text.trim())) {
      const code=text.trim().split(/\s+/).pop();
      try {
        const ok=await linkTelegramChat(code,chatId);
        const response=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({chat_id:chatId,text:ok?'✅ Reminders connected / Напоминания подключены':'Link expired or invalid / Ссылка устарела. Откройте подключение в Video Uniquifier заново.'}),
          signal:AbortSignal.timeout(10000)
        });
        if(!response.ok)throw Error('Telegram link response failed');
        return res.json({ok:true});
      }catch(e){console.error('[telegram] reminder link:',e.message);return res.status(502).json({ok:false});}
    }
    const reply = commands[command] ||
      (message.video || message.document
        ? 'Thanks! Direct video upload and processing in Telegram are not enabled yet. Please use the app.'
        : 'Open Video Uniquifier using the Menu button to get started.');
    try {
      const response = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          chat_id:chatId,
          text:reply + (['start','create','plans','account','help'].includes(command) ? '\n\n' + appUrl : ''),
          reply_markup:mini && message.chat?.type==='private' && ['start','create'].includes(command)?{inline_keyboard:[[{text:'🎬 Process in Telegram',web_app:{url:appUrl+'/telegram-mini.html'}}],[{text:'🌐 Open full website',url:appUrl}]]}:undefined,
          disable_web_page_preview:true
        }),
        signal:AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error('Telegram API status ' + response.status);
      return res.json({ok:true});
    } catch (error) {
      console.error('[telegram] Reply failed:', error.message);
      return res.status(502).json({ok:false});
    }
  });
  // Register only after the HTTP server is listening, so Telegram can deliver updates.
  return async () => {
    if (mini) { try{await mini.init();}catch(e){console.error('[telegram-mini] Init failed:',e.message);} }
    if (videoAddon) {
      try { await videoAddon.init(); }
      catch(error){console.error('[telegram-video] Storage initialization failed:',error.message);}
    }
    const webhookUrl = new URL('/api/telegram/webhook', appUrl).toString();
    if (!webhookUrl.startsWith('https://')) {
      console.warn('[telegram] Webhook registration requires an HTTPS APP_URL.');
      return;
    }
    try {
      const response = await fetch('https://api.telegram.org/bot' + token + '/setWebhook', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          url:webhookUrl,
          secret_token:secret,
          allowed_updates:videoAddon?['message','callback_query']:['message']
        }),
        signal:AbortSignal.timeout(10000)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error('Telegram rejected webhook registration (HTTP ' + response.status + ')');
      }
      console.info('[telegram] Webhook registration succeeded.');
    } catch (error) {
      console.error('[telegram] Webhook registration failed:', error.message);
    }
  };
}
