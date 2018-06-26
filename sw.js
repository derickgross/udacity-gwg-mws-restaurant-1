var staticCacheName = 'restaurants-cache-v9';
var urlsToCache = [
  '/',
  '/index.html',
  '/restaurant.html',
  '/css/home-styles.css',
  '/css/restaurant-styles.css',
  '/js/home-main.js',
  '/js/restaurant_info.js',
  '/js/dbhelper.js',
  '/data/restaurants.json',
  '/img/mag-icon-white.svg',
  '/img/na.png'
];

function fromCache(request) {
  return caches.open(staticCacheName).then(function fromCacheOpenCB(cache) {
    return cache.match(request).then(function fromCacheMatchCB(matching) {
      return matching || fetch(request);
    });
  });
}

self.addEventListener('install', function installListenerCB(event) {
  event.waitUntil(
    caches.open(staticCacheName)
    .then(function cacheOpenThenCB(cache) {
      return cache.addAll(urlsToCache);
    })
    .catch(function cacheOpenErrorCB(error) {
      console.log('Failed to open cache: ' + error);
    })
  );
});

self.addEventListener('fetch', function fetchListenerCB(event) {
  let cacheRequest = event.request;
  let cacheURLObject = new URL(event.request.url);

  if (cacheRequest.url.indexOf('restaurant.html') > -1) {
    const cacheURL = 'restaurant.html';
    cacheRequest = new Request(cacheURL);
  }
  if (cacheURLObject.hostname !== 'localhost') {
    event.request.mode = "no-cors";
  }

  event.respondWith(
    caches.match(cacheRequest).then(function fetchMatchCB(response) {
      return response ||
        fetch(event.request)
        .then(function fetchResponseCB(fetchResponse) {
          return caches.open(staticCacheName)
          .then(function openCacheCB(cache) {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        })
        .catch(function fetchErrorCB(error) {
          if (cacheRequest.url.indexOf('.jpg') > -1) {
            return caches.match('/img/na.png');
          }
          return new Response('Application is not connected to the internet', {
            status: 404,
            statusText: 'Application is not connected to the internet'
          });
        })
    })
  );
});

self.addEventListener('activate', function activateListenerCB(event) {
  event.waitUntil(
    caches.keys().then(function keysThenCB(cacheNames) {
      return Promise.all(
        cacheNames.filter(function cacheNamesFilterCB(cacheName) {
          return cacheName.startsWith('restaurants-') &&
                  cacheName != staticCacheName;
        }).map(function cacheNamesMapCB(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});