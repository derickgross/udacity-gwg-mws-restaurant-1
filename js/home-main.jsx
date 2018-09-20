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