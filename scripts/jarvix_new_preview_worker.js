const OLD_JARVIX_ROUTES = new Set(['/jarvix-chat.html', '/ai-agents.html', '/voice-agent-preview.html']);

function fallbackReply(msg, mode) {
  const m = String(msg || '').toLowerCase();
  if (/привет|здравствуй|салют|добр|hello|hi/i.test(m)) {
    return 'Привет! Я новый JARVIX NEW — твой голосовой ассистент и компьютерный координатор DeepSyQ. Помогу составить творческий промпт или передать задание на твой компьютер!';
  }
  if (/кто ты|что ты умеешь|расскажи/i.test(m)) {
    return 'Я JARVIX NEW. Я объединяю умный диалог, голосовое управление и координацию локальных задач для Image, Video и Audio студий!';
  }
  if (/видео|video|ролик/i.test(m)) {
    return 'Для отличного видео в Video Studio важны ракурс, освещение и динамика. Опиши сюжет, и я сформирую подробный промпт.';
  }
  if (/картинк|изображени|фото|image|photo/i.test(m)) {
    return 'Для генерации изображения в Image Studio укажи стиль, ключевой объект и композицию. Режим Image готов к работе!';
  }
  if (/музык|аудио|звук|трек|песн|music|audio/i.test(m)) {
    return 'В Audio Studio можно сгенерировать музыкальный трек или саундтрек. Назови желаемый жанр и настроение!';
  }
  return 'Запрос принят: "' + String(msg).trim() + '". В режиме ' + String(mode || 'chat').toUpperCase() + ' я готов помочь скоординировать эту задачу на платформе DeepSyQ!';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/jarvix-download.html' || url.pathname === '/jarvix-download') {
      return Response.redirect(new URL('/?download=jarvix', url.origin).href, 302);
    }

    if (OLD_JARVIX_ROUTES.has(url.pathname)) {
      const next = new URL('/jarvix-new.html', url.origin);
      const mode = url.searchParams.get('mode');
      if (['image', 'video', 'audio'].includes(mode)) next.searchParams.set('mode', mode);
      return Response.redirect(next.href, 302);
    }

    if (url.pathname === '/api/jarvix/chat' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const message = typeof body.message === 'string' ? body.message.trim() : '';
        if (!message) {
          return new Response(JSON.stringify({ error: 'EMPTY_MESSAGE' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        const mode = body.mode || 'chat';
        let replyText = '';
        let provider = 'JARVIX NEW Assistant';

        if (env && env.GEMINI_API_KEY) {
          try {
            const sysPrompt = 'Ты JARVIX NEW — умный, доброжелательный AI-ассистент и компьютерный координатор творческой платформы DeepSyQ. Общайся кратко (1-3 предложения), дружелюбно и по делу на русском языке.';
            const gemModels = ['gemini-2.5-flash-lite', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];
            for (const model of gemModels) {
              if (replyText) break;
              try {
                const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    systemInstruction: { parts: [{ text: sysPrompt }] },
                    contents: [{ role: 'user', parts: [{ text: message }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
                  }),
                  signal: AbortSignal.timeout(8000)
                });
                if (res.ok) {
                  const data = await res.json();
                  replyText = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
                  if (replyText) {
                    provider = 'Google Gemini (' + model + ')';
                    break;
                  }
                }
              } catch (_) {}
            }
          } catch (_) {}
        }

        if (!replyText) {
          replyText = fallbackReply(message, mode);
        }

        return new Response(JSON.stringify({
          ok: true,
          reply: replyText,
          provider,
          mode
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store'
          }
        });
      } catch (e) {
        return new Response(JSON.stringify({
          ok: true,
          reply: 'Я на связи! Как могу помочь с генерацией или задачами?',
          provider: 'JARVIX NEW'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    if (url.pathname.startsWith('/api/')) {
      return new Response('JARVIX_NEW_PREVIEW_API_DISABLED', { status: 503, headers: { 'cache-control': 'no-store' } });
    }

    const response = await env.ASSETS.fetch(request);
    if (url.pathname.endsWith('.html') || url.pathname.endsWith('/') || !url.pathname.includes('.')) {
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-store, must-revalidate');
      return new Response(response.body, { status: response.status, headers });
    }
    return response;
  }
};
