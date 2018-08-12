self.importScripts('/node_modules/idb/lib/idb.js');

var staticCacheName = 'restaurants-cache-v21';
var urlsToCache = [
  '/',
  '/index.html',
  '/restaurant.html',
  '/css/home-styles.css',
  '/css/restaurant-styles.css',
  '/js/dbhelper.js',
  '/browser/dist/home-bundle.js',
  '/browser/dist/restaurant-bundle.js',
  '/img/map-icon-white.svg',
  '/img/na.png',
  '/favicon.ico',
  '/sw.js'//,
  //'/https://maps.googleapis.com/maps/api/js?libraries=places',
  //'/node_modules/idb/lib/idb.js'
];
var dbPromise = idb.open('restaurants-db', 1, function idbOpenCB(upgradeDb) {});

self.addEventListener('install', function installListenerCB(event) {
  event.waitUntil(
    caches.open(staticCacheName)
    .catch(function cacheOpenErrorCB(error) {
      console.log('Could not open the cache: ' + error);
    })
    .then(function cacheOpenThenCB(cache) {
      return cache.addAll(urlsToCache);
    })
    .catch(function cacheAddAllErrorCB(error) {
      console.log('Could not add URLs to cache: ' + error);
    })
  );
});

self.addEventListener('fetch', function fetchListenerCB(event) {
  let cacheRequest = event.request;
  let cacheURLObject = new URL(event.request.url);
  let restaurantResponse;
  let cacheURL;
  const restaurantSearchMatch = (cacheRequest.url.indexOf('http://localhost:1337/restaurants/') > -1) && (cacheRequest.url.length > 'http://localhost:1337/restaurants/'.length);

  if (restaurantSearchMatch) {
    const id = parseInt(cacheRequest.url.split('/restaurants/')[1]);

    dbPromise.then(function getRestaurantByIdAfterDbPromiseCB(db) {
      var tx = db.transaction('restaurants', 'readonly');
      var store = tx.objectStore('restaurants');
      return store.get(id)
      .then(function getRestaurantCB(restaurant) {
        if (!!restaurant) {
          restaurantResponse = restaurant;
        }
      });
    })
    .catch(function restaurantResponseErrorCB(error) {
      console.log('Something went wrong with restaurantResponse: ' + error);
    });
  }
  if (cacheRequest.url.indexOf('restaurant.html') > -1) {
    cacheURL = 'restaurant.html';
    cacheRequest = new Request(cacheURL);
  }
  if (cacheURLObject.hostname !== 'localhost') {
    event.request.mode = "no-cors";
  }

  event.respondWith(
    caches.match(cacheRequest).then(function fetchMatchCB(response) {
      return response || restaurantResponse ||
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
          return new Response('Could not find the server.  Please check your internet connection.', {
            statusText: 'Could not find the server.  Please check your internet connection.',
            status: 404
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