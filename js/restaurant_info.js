let restaurant, reviews;
var map;
const newReviewButton = document.getElementById('new-review-button');
const submitReviewButton = document.getElementById('review-form-submit');
const cancelReviewButton = document.getElementById('review-form-cancel');

/**
 * Initialize Google map.
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      //self.map = new google.maps.Map(document.getElementById('map'), {
      //  zoom: 16,
      //  center: restaurant.latlng,
      //  scrollwheel: false
      //});
      self.map = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        scrollWheelZoom: false,
        zoom: 16
      });

      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZGVyaWNrZ3Jvc3MiLCJhIjoiY2ptOG9nNDg2MDN5aDNrcjF2czhkdDRncCJ9.XWeJTYYsIPvwVbh-dm3jcw', {
          attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
          maxZoom: 18,
          id: 'mapbox.streets',
          accessToken: 'pk.eyJ1IjoiZGVyaWNrZ3Jvc3MiLCJhIjoiY2ptOG9nNDg2MDN5aDNrcjF2czhkdDRncCJ9.XWeJTYYsIPvwVbh-dm3jcw'
      }).addTo(self.map);

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
  const idString = getParameterByName('id');
  const id = parseInt(idString);

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
      fillRestaurantHTML(restaurant);
      callback(null, restaurant)
    });
  }
}

fetchReviewsFromURL = () => { //pass in callback argument?
  if (self.reviews) { // restaurant already fetched!
    //callback(null, self.reviews)
    return;
  }
  const idString = getParameterByName('id');
  const id = parseInt(idString);

  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchReviewsById(id, (error, reviews) => {
      self.reviews = reviews;
      if (!reviews) {
        console.error(error);
        return;
      }
      fillReviewsHTML(reviews);
      //callback(null, reviews)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const picture = document.getElementById('restaurant-img');

  const source414 = document.createElement('source');
  source414.media = "(max-width: 414px)";
  source414.sizes = "(min-width: 200px) 77vw";
  source414.srcset = `/images/${restaurant.id}-318_small.jpg 1x, /images/${restaurant.id}-318_small.jpg 2x`;
  picture.append(source414);

  const source600 = document.createElement('source');
  source600.media = "(max-width: 600px)";
  source600.sizes = "(min-width: 200px) 77vw";
  source600.srcset = `/images/${restaurant.id}-461_medium.jpg 1x, /images/${restaurant.id}-318_small.jpg 2x`;
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

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews available!';
    noReviews.id = 'no-reviews';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  if (document.getElementById('no-reviews')) {
    document.getElementById('no-reviews').remove();
  }
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
  if (review.createdAt) {
    date.innerHTML = new Date(review.createdAt);
  } else {
    date.innerHTML = new Date(Date.now());
  }
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
    self.map.invalidateSize();
    return;
  }
  map_container.style.display = 'none';
  map_icon_path.style.fill = '#ffffff';
  map_icon_background.style.backgroundColor = '#252831';
  map.invalidateSize();
}

document.addEventListener('keydown', function (e) {
  const mapIcon = document.getElementById('map-icon');

  if (document.activeElement === mapIcon) {
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
  }
});

submitReview = (restaurant = self.restaurant) => {
  const review = {
    restaurant_id: restaurant.id,
    name: document.getElementById('review-name').value,
    rating: document.getElementById('review-rating').value,
    comments: document.getElementById('review-comments').value,
    createdAt: Date.now()
  }
  const reviewURL = 'http://localhost:1337/reviews';
  const reviewMethod = 'POST';

  DBHelper.handleNewRequest(reviewURL, reviewMethod, review);
  document.getElementById('reviews-list').prepend(createReviewHTML(review));
}

validateForm = () => {
  //Front-end form validation: rating selectdd, name not empty, comments meet min character limit, etc.
}

newReviewButton.addEventListener('click', function (e) {
  e.preventDefault();
  document.getElementById('review-form').style.display = 'block';
})

submitReviewButton.addEventListener('click', function (e) {
  e.preventDefault();
  validateForm();
  submitReview();
  document.getElementById('review-form').style.display = 'none';
});

cancelReviewButton.addEventListener('click', function (e) {
  e.preventDefault();
  document.getElementById('review-form').style.display = 'none';
})

initMap();
fetchReviewsFromURL();
DBHelper.attemptPendingRequests();
