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