// Telegram webhook foundation. No video files or payments are processed here.
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
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret) {
    console.info('[telegram] Webhook disabled until TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET are set.');
    return;
  }
  app.post('/api/telegram/webhook', async (req, res) => {
    if (req.get('X-Telegram-Bot-Api-Secret-Token') !== secret) {
      return res.sendStatus(403);
    }
    const message = req.body?.message;
    const chatId = message?.chat?.id;
    const text = String(message?.text || '');
    if (!chatId) return res.json({ok:true});
    const command = text.match(/^\/([a-z]+)(?:@[A-Za-z0-9_]+)?(?:\s|$)/i)?.[1]?.toLowerCase();
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
}
