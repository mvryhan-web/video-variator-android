import {handleJarvixPaid} from './jarvix-new-paid-gateway.js';

/* JARVIX NEW TEST ONLY — static Pages Worker.
 * Never proxy to production, Gemini, Alibaba, or invent AI answers.
 * The visible sphere talks to the user's local Ollama on loopback
 * after the browser requests microphone and local-network permission.
 */
const OLD_JARVIX_ROUTES = new Set([
  '/jarvix-chat.html',
  '/ai-agents.html',
  '/voice-agent-preview.html',
  '/jarvix-new.html',
  '/jarvix-new',
  '/jarvix-connect.html'
]);
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/jarvix-download.html' ||
        url.pathname === '/jarvix-download') {
      return Response.redirect(new URL('/?download=jarvix', url.origin).href, 302);
    }
    if (OLD_JARVIX_ROUTES.has(url.pathname)) {
      // No autoplay mic: browser requires a real click on the sphere.
      return Response.redirect(new URL('/', url.origin).href, 302);
    }
    // Optional server-side paid gateway: disabled unless the owner configures
    // explicit TEST-only flags and private credentials.
    if (url.pathname.startsWith('/api/jarvix-new/paid/')) {
      return await handleJarvixPaid(request, env);
    }
    // Free TEST remains local AI + owner's already approved MP3.
    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({error:'JARVIX_NEW_TEST_ONLY_LOCAL_AI'}), {
        status:503,
        headers:{'content-type':'application/json','cache-control':'no-store'}
      });
    }
    const response = await env.ASSETS.fetch(request);
    // Owner's live voice entry must never be stuck behind an older
    // browser/Cloudflare cache after test-only deployments.
    if (url.pathname.endsWith('.html') || url.pathname.endsWith('/') ||
        !url.pathname.includes('.') ||
        ['/jarvix-new-preview-entry.js', '/jarvix-new-voice.js',
         '/jarvix-new-recorded-dialog.js', '/jarvix-clip-library.js',
         '/jarvix-tour-v3-audio.js', '/jarvix-new-download-menu.js',
         '/jarvix-connect.js'].includes(url.pathname)) {
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-store, must-revalidate');
      return new Response(response.body, {status:response.status,headers});
    }
    return response;
  }
};
