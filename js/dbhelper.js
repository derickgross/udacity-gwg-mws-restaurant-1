var idb = require('idb');
var dbPromise = idb.open('restaurants-db', 1, function idbOpenCB(upgradeDb) {
  switch (upgradeDb.oldVersion) {
    case 0:
      var allRestaurantsStore = upgradeDb.createObjectStore('allRestaurants');
      var restaurantStore = upgradeDb.createObjectStore('restaurants');
      restaurantStore.createIndex('name', 'name', {unique: true});
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

  static get DATABASE_URL() {
    const port = 1337;
    return `http://localhost:${port}/restaurants`;
  }

  static setUpIndexedDb() {
    return dbPromise.then(function fetchAllRestaurantsCB(db) {
      return fetch(DBHelper.DATABASE_URL, { method: 'GET' })
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
    dbPromise.then(function getRestaurantByIdAfterDbPromiseCB(db) {
      var tx = db.transaction('restaurants', 'readonly');
      var store = tx.objectStore('restaurants');
      return store.get(id);
    })
    .then(function getRestaurantCB(restaurant) {
      callback(null, restaurant);
    })
    .catch(function getRestaurantsByIdAfterDbPromiseErrorCB(error) {
      console.log('Something went wrong while retrieving a single restaurant from IndexedDb: ' + error);
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