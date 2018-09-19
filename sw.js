self.importScripts('/node_modules/idb/lib/idb.js');

var staticCacheName = 'restaurants-cache-v24';
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
  '/img/1.jpg',
  '/img/2.jpg',
  '/img/3.jpg',
  '/img/4.jpg',
  '/img/5.jpg',
  '/img/6.jpg',
  '/img/7.jpg',
  '/img/8.jpg',
  '/img/9.jpg',
  '/img/10.jpg',
  //'/img/na.png',
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
  let reviewsResponse;
  let cacheURL;
  const allRestaurantsSearchMatch = (cacheRequest.url === 'http://localhost:1337/restaurants');
  const restaurantSearchMatch = (cacheRequest.url.indexOf('http://localhost:1337/restaurants/') > -1) && (cacheRequest.url.length > 'http://localhost:1337/restaurants/'.length);
  const reviewsSearchMatch = (cacheRequest.url.indexOf('http://localhost:1337/reviews/') > -1) && (cacheRequest.url.length > 'http://localhost:1337/reviews/'.length);

  if (event.request.url.includes('maps.googleapis.com')) {
    fetch(event.request)
    .then(function mapsHandling(response) {
      if (response.status === 200) {
        console.log('Google Maps request worked.');
      } else {
        console.log('Google Maps is not working properly.');
      }
    })
    .catch(function mapsErrorCB(error) {
      console.log('Google Maps is acting up: ' + error);
    })
    return;
  }

  if (allRestaurantsSearchMatch) {
    dbPromise.then(function getAllRestaurantsAfterDbPromiseCB(db) {
      var tx = db.transaction('allRestaurants', 'readonly');
      var store = tx.objectStore('allRestaurants');
      return store.getAll()
      .then(function getAllRestaurantsCB(restaurants) {
        if (!!restaurants) {
          restaurantResponse = restaurants;
        }
      });
    })
  }
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
  if (reviewsSearchMatch) {
    const id = parseInt(cacheRequest.url.split('restaurant_id=')[1]);
    let reviews = [];

    dbPromise.then(function getReviewsByIdAfterDbPromiseCB(db) {
      var tx = db.transaction('reviews', 'readonly');
      var store = tx.objectStore('reviews');
      var index = store.index('reviews');
      return index.openCursor(id);
      //return store.getAll(id)
      //.then(function getReviewsCB(reviews) {
      //  if (!!reviews) {
      //    reviewsResponse = reviews;
      //  }
      //});
    })
    .then(function gatherReviewsCB(cursor) {
      if (cursor) {
        reviews.push(cursor.value);
        cursor.continue().then(gatherReviewsCB);
      }
    })
    .then(function setReviewsResponse() {
      reviewsResponse = reviews;
    })
    .catch(function reviewsResponseErrorCB(error) {
      console.log('Something went wrong with reviewsResponse: ' + error);
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
      return response || restaurantResponse || reviewsResponse ||
        fetch(event.request)
        .then(function fetchResponseCB(response) {
          if (response.status >= 500 && ['POST', 'PUT'].includes(event.request.method)) {
            dbPromise.then(function openDbCB(db) {
              var tx = db.transaction('requests', 'readwrite');
              var store = tx.objectStore('requests');
              store.put(event.request, new Date(Date.now()));
            })
            .then(function storedRequestCB() {
              console.log('Network or server was unavailable, so request was stored for later.');
            })
            .catch(function storeRequestFailedCB(error) {
              console.log('Network or server was unavailable, and there was an error storing the request for later: ' + error);
            })
          }

          return caches.open(staticCacheName)
          .then(function openCacheCB(cache) {
            if (!['POST', 'PUT'].includes(event.request.method)) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(function openCacheErrorCB(error) {
            console.log('There was an error while storing a clone of the reponse: ' + error);
          });
        })
        .catch(function fetchErrorCB(error) {
          //if (cacheRequest.url.indexOf('.jpg') > -1) {
          //  return caches.match('/img/na.png');
          //}
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