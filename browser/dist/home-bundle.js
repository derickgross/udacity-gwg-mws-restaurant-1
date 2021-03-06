(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.restaurantReviews = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var idb = require('idb');
var dbPromise = idb.open('restaurants-db', 1, function idbOpenCB(upgradeDb) {
  switch (upgradeDb.oldVersion) {
    case 0:
      var allRestaurantsStore, restaurantStore, reviewStore, requestStore;

      requestStore = upgradeDb.createObjectStore('requests');
      requestStore.createIndex('requests', 'createdAt', {unique: true});

      allRestaurantsStore = upgradeDb.createObjectStore('allRestaurants');

      restaurantStore = upgradeDb.createObjectStore('restaurants');
      restaurantStore.createIndex('name', 'name', {unique: true});

      reviewStore = upgradeDb.createObjectStore('reviews');
      reviewStore.createIndex('reviews', 'restaurant_id', {unique: false});

      console.log('IndexedDb stores created.');
  }
})

if (navigator.serviceWorker) {
  navigator.serviceWorker.register('../sw.js')
  .then(function() {
    console.log('Service worker installed.');
  })
  .catch(function(error) {
    console.log('An error occurred during setup phase: ' + error);
  })
}

class DBHelper {

  static get DATABASE_RESTAURANTS_URL() {
    const port = 1337;
    return `http://localhost:${port}/restaurants`;
  }

  static get DATABASE_REVIEWS_URL() {
    const port = 1337;
    return `http://localhost:${port}/reviews`;
  }

  static setUpIndexedDb() {
    return dbPromise.then(function fetchAllRestaurantsCB(db) {
      return fetch(DBHelper.DATABASE_RESTAURANTS_URL, { method: 'GET' })
      .then(function fetchRestaurantsCB(response) {
        if (response.status === 200) {
          return response.json()
            .then(function(restaurants) {
              var tx = db.transaction('allRestaurants', 'readwrite');
              var store = tx.objectStore('allRestaurants');
              store.put(restaurants, 'all');

              var tx2 = db.transaction('restaurants', 'readwrite');
              var store2 = tx2.objectStore('restaurants');
              restaurants.forEach(function addRestaurantsCB(restaurant, index) {
                store2.put(restaurant, index + 1);
              })
            })
            .catch(function idbAddRestaurantsErrorCB(error) {
              console.log('An error occurred while adding restaurants to IndexedDb: ' + error);
            });
        } else {
          console.log('Request status was not "OK": ' + response.status);
        }
      })
    })
  }

  static fetchReviewsById(id, callback) {
    console.log("This is the reviews id:", id);
    const reviewsURL = `${DBHelper.DATABASE_REVIEWS_URL}/?restaurant_id=${id}`

    return dbPromise.then(function openDatabaseCB(db) {
      return fetch(reviewsURL, { method: 'GET' })
      .then(function getReviewsCB(response) {
        if (response.status === 200) {
          return response.json()
            .then(function storeReviewsCB(reviews) {
              var tx = db.transaction('reviews', 'readwrite');
              var store = tx.objectStore('reviews');
              reviews.forEach(function addReviewsCB(review) {
                store.put(review, review.id);
              })

              return reviews;
            })
            .then(function fetchReviewsCB(reviews) {
              callback(null, reviews);
            });
        }
      })
    })
    .catch(function getReviewsByIdAfterDbPromiseErrorCB(error) {
      console.log('Something went wrong while retrieving or storing reviews: ' + error);
    })
  }

  static fetchRestaurants() {
    console.log('Fetching restaurants...');

    return dbPromise.then(function getRestaurantsAfterDbPromiseCB(db) {
      var tx = db.transaction('allRestaurants', 'readonly');
      var store = tx.objectStore('allRestaurants');
      return store.get('all').then(function getAllRestaurantsCB(restaurants) {
        return restaurants;
      });
    })
    .catch(function getRestaurantsAfterDbPromiseErrorCB(error) {
      console.log('Something went wrong while retrieving all restaurants from IndexedDb: ' + error);
    })
  }

  static fetchRestaurantById(id, callback) {
    console.log("This is the id:", id);
    return dbPromise.then(function getRestaurantByIdAfterDbPromiseCB(db) {
      var tx = db.transaction('restaurants', 'readonly');
      var store = tx.objectStore('restaurants');
      return store.get(parseInt(id)).then(function getRestaurantCB(restaurant) {
        return restaurant;
      });;
    })
    .then(function getRestaurantCB(restaurant) {
      callback(null, restaurant);
    })
    .catch(function getRestaurantsByIdAfterDbPromiseErrorCB(error) {
      console.log('Something went wrong while retrieving a single restaurant from IndexedDb: ' + error);
    })
  }

  static returnRestaurant(id) {
    return dbPromise.then(function getRestaurantByIdAfterDbPromiseCB(db) {
      var tx = db.transaction('restaurants', 'readonly');
      var store = tx.objectStore('restaurants');
      return store.get(parseInt(id)).then(function getRestaurantCB(restaurant) {
        return restaurant;
      });;
    })
  }

  static fetchRestaurantByCuisine(restaurants, cuisine, callback) {
    const results = restaurants.filter(r => r.cuisine_type == cuisine);
    callback(null, results);
  }

  static fetchRestaurantByNeighborhood(restaurants, neighborhood, callback) {
    const results = restaurants.filter(r => r.neighborhood == neighborhood);
    callback(null, results);
  }

  static fetchRestaurantByCuisineAndNeighborhood(restaurants, cuisine, neighborhood, callback) {
    console.log('Fetching restaurants by neighborhood AND cuisines...');
    let results = restaurants;
    if (cuisine != 'all') {
      results = results.filter(r => r.cuisine_type == cuisine);
    }
    if (neighborhood != 'all') {
      results = results.filter(r => r.neighborhood == neighborhood);
    }
    callback(null, results);
  }

  static fetchNeighborhoods(restaurants, callback) {
    const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);

    const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
    callback(null, uniqueNeighborhoods);
  }

  static fetchCuisines(restaurants, callback) {
    const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)

    const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
    callback(null, uniqueCuisines);
  }

  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  static imageUrlForRestaurant(restaurant) {
    if (restaurant.photograph) { return (`/img/${restaurant.photograph}.jpg`); }
    return (`/img/${restaurant.id}.jpg`);
  }

  static mapMarkerForRestaurant(restaurant, map) {
    //const marker = new google.maps.Marker({
    //  position: restaurant.latlng,
    //  title: restaurant.name,
    //  url: DBHelper.urlForRestaurant(restaurant),
    //  id: restaurant.id,
    //  map: map,
    //  animation: google.maps.Animation.DROP}
    //);
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      });
    marker.addTo(map);

    return marker;
  }

  static drawFavoriteHeart(element) {
    if (element.getContext) {
      var context = element.getContext('2d');

      context.beginPath();
      context.lineWidth = 15;
      context.strokeStyle = '#e05a21';
      context.moveTo(75, 43);
      context.bezierCurveTo(75, 37, 70, 25, 50, 25);
      context.bezierCurveTo(20, 25, 20, 62.5, 20, 62.5);
      context.bezierCurveTo(20, 80, 43, 102, 75, 120);
      context.bezierCurveTo(110, 102, 130, 80, 130, 62.5);
      context.bezierCurveTo(130, 62.5, 130, 25, 100, 25);
      context.bezierCurveTo(85, 25, 75, 37, 75, 43);
      context.stroke();
      //context.fill();
    }
  }

  static fillFavoriteHeart(color) {
    if (this.getContext) {
      var context = this.getContext('2d');
      context.strokeStyle = '#e05a21';
      context.fillStyle = color; //'#e05a21';

      context.fill();
      context.stroke();
    }
  }

  static updateIndexedDbRestaurantFavorite(restaurant, newFavoriteStatus) {
    DBHelper.fetchRestaurantById(restaurant.id, function(error, res) {
      res.is_favorite = newFavoriteStatus;
      dbPromise.then(function saveResToIndexedDb(db) {
        var tx = db.transaction('restaurants', 'readwrite');
        var store = tx.objectStore('restaurants');
        store.put(res, restaurant.id).then(function() {
          console.log('Restaurant favorite should have been updated in IndexedDb...');
        });

        var tx2 = db.transaction('allRestaurants', 'readwrite');
        var store2 = tx2.objectStore('allRestaurants');
        restaurants[restaurant.id - 1].is_favorite = newFavoriteStatus;
        store2.get('all')
          .then(function changeFavorite(restaurants) {
            restaurants[restaurant.id - 1].is_favorite = newFavoriteStatus;
            store2.put(restaurants, 'all')
              .then(function() {
                console.log(`allRestaurants updated with new ${restaurant.name} favorite status.`);
            });
          });
      })
      .catch(function(error) {
        console.log('Error updating restaurant favorite status: ' + error);
      })
    })
  }

  static updateRestaurantFavorite(error, restaurant) {
    let newFavoriteStatus;
    console.log('The updateRestaurantFavorite restaurant is: ' + restaurant);
    console.log('The updateRestaurantFavorite favorite status is: ' +restaurant.is_favorite);

    if (String(restaurant.is_favorite) === 'true') {
      newFavoriteStatus = 'false';
    } else {
      newFavoriteStatus = 'true';
    }

    const favoriteURL = `http://localhost:1337/restaurants/${restaurant.id}/?is_favorite=${newFavoriteStatus}`;
    const favoriteMethod = 'PUT';
    //const favoriteRequest = new Request(`http://localhost:1337/restaurants/${restaurant.id}/?is_favorite=${newFavoriteStatus}`, { method: 'PUT' });

    //fetch(`http://localhost:1337/restaurants/${restaurant.id}/?is_favorite=${newFavoriteStatus}`, { method: 'PUT' })
    //.then(function updateRestaurantFavoriteCB(response) {
    //  if (response.status != 200) {
    //    console.log('Could not update favorite status!');
    //  } else {
    //    console.log('Favorite status is up-to-date!');
    //  }
    //})
    //.catch(function(error) {
    //  console.log('Something went wrong while updating favorite status: ' + error);
    //})

    DBHelper.handleNewRequest(favoriteURL, favoriteMethod, null);
    DBHelper.updateIndexedDbRestaurantFavorite(restaurant, newFavoriteStatus);

    //http://localhost:1337/restaurants/<restaurant_id>/?is_favorite=false
  }

  static toggleFavorite() {
    //console.log('The restaurant id is: ' + this.id.split('-')[1]);
    const restaurantId = this.id.split('-')[1];
    DBHelper.fetchRestaurantById(restaurantId, DBHelper.updateRestaurantFavorite);
    const canvas = document.getElementById(`canvas-${restaurantId}`);
    DBHelper.returnRestaurant(restaurantId)
    .then(function updateFavoriteIconCB(restaurant) {
      if (String(restaurant.is_favorite) != 'true') {
        DBHelper.fillFavoriteHeart.call(canvas, '#e05a21');
      } else {
        DBHelper.fillFavoriteHeart.call(canvas, '#fff');
      }
    });
  }

  static handleNewRequest(url, method, body) {
    const requestParts = {
      method: method,
      url: url,
      body: body
    };

    dbPromise.then(function newRequestCB(db) {
      var tx = db.transaction('requests', 'readwrite');
      var store = tx.objectStore('requests');
      store.put(requestParts, new Date(Date.now())) //break down request into {method, url, body} before putting in database
      .then(DBHelper.attemptPendingRequests)
    })
  }

  static attemptPendingRequests() {
    dbPromise.then(function openDbForAttemptRequestCB(db) {
      var tx = db.transaction('requests', 'readonly');
      var store = tx.objectStore('requests');
      store.openCursor()
      .then(function attemptRequestCB(cursor) {
        if (cursor) {
          let options = { method: cursor.value.method };
          if (!!cursor.value.body) {
            options = { method: cursor.value.method, body: JSON.stringify(cursor.value.body) }
          }
          fetch(cursor.value.url, options)
          .then(function cursorFetchCB(response) {
            if ((cursor.value.method === 'PUT' && response.status === 200) ||
              (cursor.value.method === 'POST' && response.status === 201)) {
              debugger;
              var deleteTx = db.transaction('requests', 'readwrite');
              var deleteStore = deleteTx.objectStore('requests');
              deleteStore.openCursor()
              .then(function deleteCursorCB(deleteCursor) {
                deleteCursor.delete()
                .then(function nextCursorCB() {
                  DBHelper.attemptPendingRequests();
                })
              })
            }
          })
          cursor.continue();
        } else {
          console.log('All pending requests have been attempted.');
        }
      })
    })
  }
}

window.DBHelper = DBHelper;
},{"idb":3}],2:[function(require,module,exports){
let currentRestaurants,
  neighborhoods,
  cuisines
var map
var markers = []

/*DBHelper.setUpIndexedDb()
        .then(() => {
          DBHelper.attemptPendingRequests();
          DBHelper.fetchRestaurants()
          .then(function(restaurants) {
            currentRestaurants = restaurants;
            console.log(currentRestaurants);
          })
          .then(() => {
            fetchNeighborhoods(currentRestaurants);
            fetchCuisines(currentRestaurants);
          })
          .then(() => {
            initMap();
          })
        })
        .catch((error) => {
          'Something went wrong ... somewhere: ' + error;
        })*/

window.addEventListener('load', (event) => {
  removeMapLinksFromTabindex();
  DBHelper.setUpIndexedDb()
          .then(() => {
            DBHelper.attemptPendingRequests();
            DBHelper.fetchRestaurants()
            .then(function(restaurants) {
              currentRestaurants = restaurants;
              console.log(currentRestaurants);
            })
            .then(() => {
              fetchNeighborhoods(currentRestaurants);
              fetchCuisines(currentRestaurants);
            })
            .then(() => {
              initMap();
            })
          })
          .catch((error) => {
            'Something went wrong ... somewhere: ' + error;
          })
});

fetchNeighborhoods = (theRestaurants) => {
  DBHelper.fetchNeighborhoods(theRestaurants, (error, neighborhoods) => {
    if (error) {
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML(neighborhoods);
    }
  });
}

fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

fetchCuisines = (restaurants) => {
  DBHelper.fetchCuisines(restaurants, (error, cuisines) => {
    if (error) {
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML(cuisines);
    }
  });
}

fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/*initMap = () => {
  return new Promise (function(resolve, reject) {
    let loc = {
      lat: 40.722216,
      lng: -73.987501
    };
    self.map = new google.maps.Map(document.getElementById('map'), {
      zoom: 12,
      center: loc,
      scrollwheel: false
    });

    if (self.map.zoom === 12) {
      resolve();
    } else {
      reject(status);
    }
  }).then(function() {
    updateRestaurants();
  }).catch( (error) => { console.log('Something went wrong: ' + error); });
}*/

initMap = () => {
  self.map = L.map('map', {
    center: [40.722216, -73.987501],
    scrollWheelZoom: false,
    zoom: 12
  });

  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZGVyaWNrZ3Jvc3MiLCJhIjoiY2ptOG9nNDg2MDN5aDNrcjF2czhkdDRncCJ9.XWeJTYYsIPvwVbh-dm3jcw', {
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
      id: 'mapbox.streets',
      accessToken: 'pk.eyJ1IjoiZGVyaWNrZ3Jvc3MiLCJhIjoiY2ptOG9nNDg2MDN5aDNrcjF2czhkdDRncCJ9.XWeJTYYsIPvwVbh-dm3jcw'
  }).addTo(self.map);

  updateRestaurants();
}

/**
Mapbox access token:
pk.eyJ1IjoiZGVyaWNrZ3Jvc3MiLCJhIjoiY2ptOG9nNDg2MDN5aDNrcjF2czhkdDRncCJ9.XWeJTYYsIPvwVbh-dm3jcw
*/

updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(currentRestaurants, cuisine, neighborhood, (error, restaurants) => {
    if (error) {
      console.error(error);
    } else {
      if (!self.markers) {
        self.markers = [];
        addMarkersToMap();
      }
      resetRestaurants(currentRestaurants);
      fillRestaurantsHTML(currentRestaurants);
    }
  })
}

resetRestaurants = (restaurants) => {

  self.restaurants = [];
  const list = document.getElementById('restaurants-list');
  list.innerHTML = '';

  self.markers.forEach(m => self.map.removeLayer(m));
  self.markers = [];
  self.restaurants = restaurants;
}

fillRestaurantsHTML = () => {
  const ul = document.getElementById('restaurants-list');
  currentRestaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

createRestaurantHTML = (restaurant) => {
  const article = document.createElement('article');
  article.setAttribute('id', 'restaurant' + restaurant.id);

  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  article.append(name);

  const favoriteCanvas = document.createElement('canvas')
  favoriteCanvas.id = `canvas-${restaurant.id}`;
  favoriteCanvas.width = '150';
  favoriteCanvas.height = '150';
  DBHelper.drawFavoriteHeart(favoriteCanvas);
  favoriteCanvas.addEventListener('click', DBHelper.toggleFavorite);
  if (String(restaurant.is_favorite) === 'true') {
    DBHelper.fillFavoriteHeart.call(favoriteCanvas, '#e05a21');
  }
  article.append(favoriteCanvas);

  const picture = document.createElement('picture');

  const source414 = document.createElement('source');
  source414.media = "(max-width: 414px)";
  source414.sizes = "(min-width: 200px) 77vw";
  source414.srcset = `/images/${restaurant.id}-318_small.jpg 1x, img/${restaurant.id}.jpg 2x`;
  //source414.srcset = `/images/${restaurant.id}-318_small.jpg`;
  picture.append(source414);

  const source600 = document.createElement('source');
  source600.media = "(max-width: 600px)";
  source600.sizes = "(min-width: 200px) 77vw";
  source600.srcset = `/images/${restaurant.id}-461_medium.jpg 1x, img/${restaurant.id}.jpg 2x`;
  //source600.srcset = `/images/${restaurant.id}-461_medium.jpg`;
  picture.append(source600);

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = restaurant.name;
  picture.append(image);

  article.append(picture);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  article.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  article.append(address);

  const more = document.createElement('button');
  more.innerHTML = 'View Details';
  more.type = 'button';

  more.onclick = () => {
    const href = DBHelper.urlForRestaurant(restaurant);

    window.location = href;
  }

  article.append(more);

  return article
}

addMarkersToMap = () => {
  currentRestaurants.forEach(restaurant => {
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);

    marker.addEventListener('click', () => {
      window.location.href = '/#restaurant' + restaurant.id;
    });
    self.markers.push(marker);
  });
}

removeMapLinksFromTabindex = () => {
  const mapLinks = document.getElementById('map').querySelectorAll('a');

  mapLinks.forEach(function(link) {
    link.setAttribute('tabindex', '-1');
    console.log('Setting tabindex!');
  });
}

setCurrentRestaurants = (restaurants) => {
  currentRestaurants = restaurants;
}
},{}],3:[function(require,module,exports){
'use strict';

(function() {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function(resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function(value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function(prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function() {
          return this[targetProp][prop];
        },
        set: function(val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function() {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function() {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function(value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function() {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function() {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getKey',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function(resolve, reject) {
      idbTransaction.oncomplete = function() {
        resolve();
      };
      idbTransaction.onerror = function() {
        reject(idbTransaction.error);
      };
      idbTransaction.onabort = function() {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function() {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function() {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function() {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function(funcName) {
    [ObjectStore, Index].forEach(function(Constructor) {
      // Don't create iterateKeyCursor if openKeyCursor doesn't exist.
      if (!(funcName in Constructor.prototype)) return;

      Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
        request.onsuccess = function() {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function(Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function(query, count) {
      var instance = this;
      var items = [];

      return new Promise(function(resolve) {
        instance.iterateCursor(query, function(cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function(name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      if (request) {
        request.onupgradeneeded = function(event) {
          if (upgradeCallback) {
            upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
          }
        };
      }

      return p.then(function(db) {
        return new DB(db);
      });
    },
    delete: function(name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
    module.exports.default = module.exports;
    console.log('idb loaded 1!');
  }
  else {
    self.idb = exp;
    console.log('idb loaded 2!');
  }
}());

},{}]},{},[3,1,2])(3)
});
