// Service worker do Sorteie: rede primeiro, cache como reserva.
// Sempre tenta a rede (então uma nova versão publicada aparece na hora) e só usa o cache
// quando estiver offline. Não há lista fixa de arquivos: o que o app carrega vai para o cache.

const CACHE = 'sorteie-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Só GET do próprio site; o resto (fontes do Google, WhatsApp, extensões) segue direto
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return res;
      })
      .catch(async () => {
        const emCache = await caches.match(req);
        if (emCache) return emCache;
        // Navegação offline para uma página nunca vista: entrega o app
        if (req.mode === 'navigate') {
          const raiz = await caches.match('/');
          if (raiz) return raiz;
        }
        return Response.error();
      })
  );
});
