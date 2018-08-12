(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.restaurantReviews = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
if (navigator.serviceWorker) {
  navigator.serviceWorker.register('../sw.js')
  .then(function() {
    console.log('Service worker registered.');
  })
  .catch(function() {
    console.log('Registration of service worker failed.');
  });
}

var idb = require('idb');

class DBHelper {

  static get DATABASE_URL() {
    const port = 1337;
    return `http://localhost:${port}/restaurants`;
  }

  static fetchRestaurants() {
    console.log('Fetching restaurants...');

    return fetch(DBHelper.DATABASE_URL, { method: 'GET' })
    .then(function fetchRestaurantsCB(response) {
      if (response.status === 200) {
        return response.json().then(function(restaurants) {
          return restaurants;
        });
      } else {
        console.log('Request status was not "OK": ' + response.status);
      }
    })
    .catch(function fetchRestaurantsErrorCB(error) {
      console.log('Something went wrong: ' + error);
    });
  }

  static fetchRestaurantById(restaurants, id, callback) {
    const restaurant = restaurants.find(r => r.id == id);
    if (restaurant) {
      callback(null, restaurant);
    } else {
      callback('Restaurant does not exist', null);
    }
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
    return (`/img/na.png`);
  }

  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      id: restaurant.id,
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }
}

window.DBHelper = DBHelper;
},{"idb":4}],2:[function(require,module,exports){
let currentRestaurants,
  neighborhoods,
  cuisines
var map
var markers = []

DBHelper.fetchRestaurants()
        .then((restaurants) => {
          setCurrentRestaurants(restaurants);
          fetchNeighborhoods(currentRestaurants);
          fetchCuisines(currentRestaurants);
        });

window.addEventListener('load', (event) => {
  removeMapLinksFromTabindex();
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

window.initMap = () => {
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
}

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
      resetRestaurants(currentRestaurants);
      fillRestaurantsHTML(currentRestaurants);
    }
  })
}

resetRestaurants = (restaurants) => {

  self.restaurants = [];
  const list = document.getElementById('restaurants-list');
  list.innerHTML = '';

  self.markers.forEach(m => m.setMap(null));
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
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = '/#restaurant' + marker.id
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
let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      //fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const picture = document.getElementById('restaurant-img');

  const source414 = document.createElement('source');
  source414.media = "(max-width: 414px)";
  source414.sizes = "(min-width: 200px) 77vw";
  source414.srcset = `/images/${restaurant.id}-318_small.jpg 1x, /images/${restaurant.id}-318_small.jpg 2x`;//img/${restaurant.id}.jpg 2x`;
  //source414.srcset = `/images/${restaurant.id}-318_small.jpg`;
  picture.append(source414);

  const source600 = document.createElement('source');
  source600.media = "(max-width: 600px)";
  source600.sizes = "(min-width: 200px) 77vw";
  source600.srcset = `/images/${restaurant.id}-461_medium.jpg 1x, /images/${restaurant.id}-318_small.jpg 2x`;//img/${restaurant.id}.jpg 2x`;
  //source600.srcset = `/images/${restaurant.id}-461_medium.jpg`;
  picture.append(source600);

  const image = document.createElement('img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = restaurant.name;
  picture.append(image);

  const background = document.getElementById('maincontent');
  background.style.backgroundImage = "url('https://lh3.ggpht.com/p/AF1QipOUtDZm8ZIqqlVmuPS60vOpmbvOCXimzRJplUhZ=w512-h384-n');"

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  /*const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);*/

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const article = document.createElement('article');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  article.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.date;
  article.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  article.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  article.appendChild(comments);

  article.setAttribute('tabindex', '0');

  return article;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
/*fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}*/

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Toggle map view
 */

toggleMap = () => {
  var map_container = document.getElementById('map-container');
  var map_icon_path = document.getElementById('map-icon-path');
  var map_icon_background = document.getElementById('map-icon');

  if (map_container.style.display === 'none') {
    map_container.style.display = 'block';
    map_icon_path.style.fill = '#252831';
    map_icon_background.style.backgroundColor = '#ffffff';
    return;
  }
  map_container.style.display = 'none';
  map_icon_path.style.fill = '#ffffff';
  map_icon_background.style.backgroundColor = '#252831';
}

document.addEventListener('keydown', function (e) {
  var displayedMap = document.getElementById('map-container');
  var focusedElement = document.getElementById('nav-map');
  console.log('Code of key pressed is: ' + e.key);
  if ((e.key === 'Tab') && (displayedMap.style.display === 'block')) {
    e.preventDefault();
    focusedElement.focus();
    console.log('Should have locked focus...');
  } else if (e.key === 'Enter') {
    toggleMap();
  }
});

},{}],4:[function(require,module,exports){
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

},{}]},{},[4,1,2,3])(4)
});
