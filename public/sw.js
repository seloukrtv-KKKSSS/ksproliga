const STATIC_CACHE = "ksliga-static-v3"
const PAGE_CACHE = "ksliga-pages-v3"
const APP_SHELL = ["/", "/manifest.json", "/images/ks-logo.png", "/favicon.ico"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => ![STATIC_CACHE, PAGE_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            void caches.open(PAGE_CACHE).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/"))),
    )
    return
  }

  if (["style", "script", "image", "font"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fresh = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone()
              void caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone))
            }
            return response
          })
          .catch(() => cached)
        return cached || fresh
      }),
    )
  }
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = event.notification.data?.url || "/"
  event.waitUntil(self.clients.openWindow(target))
})
