const CACHE_NAME = "medicacao-pwa-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./favicon.svg",
  "./apple-touch-icon.svg",
];

// Instala o Service Worker e adiciona os arquivos ao cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
  );
});

// Limpa caches antigos quando uma nova versão do Service Worker é ativada
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }),
  );
});

// Intercepta as requisições e retorna do cache se estiver offline
self.addEventListener("fetch", (event) => {
  // Ignora requisições de API do Firebase (para não bugar a sincronização offline do Firestore)
  if (
    event.request.url.includes("firestore.googleapis.com") ||
    event.request.url.includes("google.com")
  ) {
    return;
  }

  event.respondWith(
    // Tenta buscar na rede primeiro (Network First)
    fetch(event.request)
      .then((fetchResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          if (
            event.request.method === "GET" &&
            event.request.url.startsWith("http") &&
            fetchResponse.status === 200
          ) {
            cache.put(event.request, fetchResponse.clone());
          }
          return fetchResponse;
        });
      })
      .catch(() => {
        // Se falhar (usuário offline), busca no cache
        return caches.match(event.request);
      }),
  );
});
