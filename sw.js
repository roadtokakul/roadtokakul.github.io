/* Road to Kakul — offline support. The app is one page; keep it cached and refresh it in the background.
   2.9: the phone can wake it while the app is closed - a push from the Road to Kakul team (sent by the studio) or
   Chrome's periodic refresh for installed apps. It then looks for what is new (a team message or new messages in the
   Community chat, a new answer from the team, news), shows one notification, and a tap opens that place. */
const CACHE = 'rtk-3.6.0-mwziybae';
const META = 'rtk-meta';                 // what the app last showed: kept across versions
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'privacy.html', 'fonts/inter.woff2', 'fonts/barlowc-600.woff2', 'fonts/barlowc-700.woff2'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== META).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // the question pack and payments go straight to the network
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});

/* ---------- notifications (2.9) ---------- */
async function meta() {
  try { const r = await (await caches.open(META)).match('meta.json'); return r ? await r.json() : {}; } catch (e) { return {}; }
}
async function saveMeta(m) {
  try { await (await caches.open(META)).put('meta.json', new Response(JSON.stringify(m), { headers: { 'content-type': 'application/json' } })); } catch (e) { }
}
// What to tell the aspirant, most important first: a team message, a new answer, news, new chat messages. null: nothing new.
function decide(m, chat, pack) {
  const since = Math.max(m.seen || 0, m.told || 0), mine = m.mine || [];
  const msgs = ((chat && chat.ok && chat.msgs) || []).filter(x => x && x.m && x.t > since && !mine.includes(x.c) && !(m.hidden || []).includes(x.t));
  const team = msgs.filter(x => x.u === 'team').pop();
  if (team) return { title: 'Road to Kakul team', body: String(team.m).slice(0, 180), go: 'chat', tag: 'rtk-team', told: team.t };
  const qa = ((pack && pack.qa) || []).filter(x => x && x.q && x.a);
  if (qa.length && m.qa !== undefined && qa[0].q !== m.qa) return { title: 'New answer from the team', body: String(qa[0].q).slice(0, 160), go: 'ask', tag: 'rtk-qa', qa: qa[0].q };
  const course = m.course || '';         // the same news the app shows: for everyone, or for this aspirant's course
  const news = ((pack && pack.news) || []).filter(x => x && x.t && (!x.c || !x.c.length || x.c.includes('all') || x.c.includes(course)));
  if (news.length && m.news !== undefined && news[0].t !== m.news) return { title: 'Road to Kakul news', body: String(news[0].t).slice(0, 160), go: 'news', tag: 'rtk-news', news: news[0].t };
  if (msgs.length) {
    const last = msgs[msgs.length - 1];
    return { title: 'Community chat', body: (msgs.length === 1 ? '' : msgs.length + ' new messages · ') + (last.n || 'Aspirant') + ': ' + String(last.m).slice(0, 110), go: 'chat', tag: 'rtk-chat', told: last.t };
  }
  return null;
}
async function check(push) {
  const m = await meta();
  if (!m.on) return null;
  const since = Math.max(m.seen || 0, m.told || 0);
  let chat = null, pack = null;
  try { if (m.chat) chat = await (await fetch(m.chat + '?chat=general&since=' + since, { cache: 'no-store' })).json(); } catch (e) { }
  try { if (m.pack) pack = await (await fetch(m.pack + '?t=' + Math.floor(Date.now() / 60e3), { cache: 'no-store' })).json(); } catch (e) { }
  const n = decide(m, chat, pack);
  if (!n) {
    if (!push) return null;
    // Chrome wants every push to show something - unless the app is open in front of the aspirant
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }).catch(() => []);
    if (open.some(c => c.visibilityState === 'visible')) return null;
    // the aspirant has already seen it (or wrote it): a quiet, true note - no sound, nothing made up
    const busy = ((chat && chat.ok && chat.msgs) || []).some(x => x && x.t > Date.now() - 864e5);
    return self.registration.showNotification('Road to Kakul', { body: busy ? 'The Community chat is active. Tap to join in.' : 'You’re all caught up. Tap to open the app.', icon: 'icon-192.png', badge: 'icon-192.png', tag: 'rtk', silent: true, data: { go: busy ? 'chat' : 'home' } });
  }
  if (n.told) m.told = Math.max(m.told || 0, n.told);
  if (n.qa) m.qa = n.qa;
  if (n.news) m.news = n.news;
  await saveMeta(m);                     // told once: never the same thing twice
  return self.registration.showNotification(n.title, { body: n.body, icon: 'icon-192.png', badge: 'icon-192.png', tag: n.tag, renotify: true, data: { go: n.go } });
}
// a push also brings the newest version of the app, ready for the next open
self.addEventListener('push', e => { e.waitUntil(Promise.all([self.registration.update().catch(() => { }), check(true)])); });
self.addEventListener('periodicsync', e => {
  if (e.tag === 'rtk-refresh') e.waitUntil(Promise.all([self.registration.update().catch(() => { }), check(false)]));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const go = (e.notification.data && e.notification.data.go) || 'home';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => 'focus' in x);
    if (c) { c.postMessage({ rtkGo: go }); return c.focus(); }
    return self.clients.openWindow('./#' + go);
  }));
});
