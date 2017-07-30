
/**
 * returns a promise of the resolved location ID to a location object
 */
function resolveLocationId(locationId) {
  return fetch("https://geocoder.cit.api.here.com/6.2/geocode.json?locationid=" + locationId
    + "&app_id=" + HERE_APP_ID + "&app_code=" + HERE_APP_CODE + "&gen=9")
    .then(r => r.json());
}

/**
 * returns a promise of the long & lat of a location ID
 */
function getLongLat(locationId) {
  return resolveLocationId(locationId)
  .then(r => r.Response.View[0].Result[0].Location.DisplayPosition);
}

function getRoute(StartX, StartY, GoalX, GoalY, mode, arrival) {
  return fetch("https://route.cit.api.here.com/routing/7.2/calculateroute.json?app_id=" + HERE_APP_ID +
    "&app_code=" + HERE_APP_CODE +
    "&waypoint0=geo!" + StartX + "," + StartY +
    "&waypoint1=geo!" + GoalX + "," + GoalY +
    "&mode=fastest;" + mode + ";traffic:enabled" +
    "&departure=" + arrival )
    .then(r => r.json());
}

function weather(name) {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = "https://weather.cit.api.here.com/weather/1.0/report.json?app_id=" + WEATHER_APP_ID +
"&app_code=" + WEATHER_APP_CODE + "&product=observation&name=" + name
   + "&jsoncallback=weatherCallBack";

  var body = document.getElementById('weather_api');
  body.appendChild(script);
}

function weatherCallBack(data) {
  CURRENT_WEATHER = data;
}

weather("Wellington City");

function getTrafficIncidents(lat, long) {
  var prox = 7152;

  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = "https://traffic.cit.api.here.com/traffic/6.0/incidents.json?prox=" +
    lat + "," + long + "," + prox +
    "&app_id=" + HERE_APP_ID + "&app_code=" + HERE_APP_CODE
   + "&jsoncallback=trafficCallBack";

  var body = document.getElementById('weather_api');
  body.appendChild(script);
}

function trafficCallBack(data) {
  console.log(data);
}

function LatLongToMat(lat, long, zoom) {
  var latRad = lat * Math.PI / 180;
  var n = Math.pow(2, z);
  var xTile = n * ((lon + 180) / 360);
  var yTile = n * (1-(Math.log(Math.tan(latRad) + 1/Math.cos(latRad)) /Math.PI)) / 2;

  return {column: xTile, row: yTile, zoom: zoom};
}


function getAutoCompleteFor(search) {

  return fetch("http://autocomplete.geocoder.cit.api.here.com/6.2/suggest.json?app_id=" +
    HERE_APP_ID + "&app_code=" + HERE_APP_CODE + "&query=" + search + "&country=NZL"  )
    .then(r => r.json());
}

function updateAutoCompleteFor(event) {
  var input = event.target;

  var value = input.value;
  console.log(value);

  getAutoCompleteFor(value)
    .then(r => {
      var listId = input.getAttribute('list');
      var datalist = document.getElementById(listId);

      var newData = datalist.cloneNode(false);

      if (r.suggestions) {
        r.suggestions.forEach(item => {
          console.log(item);

          var node = document.createElement('option');
          node.setAttribute('value', item.label);
          node.setAttribute('location', item.locationId);

          newData.appendChild(node);
        });
      }

      // insert into the DOM
      datalist.parentNode.replaceChild(newData ,datalist);
    });

}

var Route_Found = null;

function handleGetThere(event) {
  document.getElementById('result-container').style.display = 'block';
  console.log(event);
  Route_Found = null;
  getRoutes().then(routes => {
    Route_Found = routes;
    buildOptions('options-container'); 
  });
}

function getRoutes() {
  var aLocation = document.getElementById("point-a-input");
  var bLocation = document.getElementById("point-b-input");

  console.log(aLocation.value);
  console.log(bLocation.value);

  var aLocId = getLocationIdFromDataList(aLocation.value, aLocation.getAttribute('list'))
  var bLocId = getLocationIdFromDataList(bLocation.value, bLocation.getAttribute('list'))

  var arrivalOption = document.getElementById('arrival-options');

  console.log(arrivalOption.value);

  var arrival = new Date();
  arrival.setHours(parseInt(arrivalOption.value));
  arrival.setMinutes(0);

  console.log(arrival);
  
  return Promise.all([getLongLat(aLocId), getLongLat(bLocId)])
    .then(pos => {
        
      console.log(pos);

      var aLatLong = pos[0];
      var bLatLong = pos[1];


      var modes = ["car", "publicTransport", "bicycle", "pedestrian"];

      var routeReqs = modes.map(mode =>
        getRoute(aLatLong.Latitude, aLatLong.Longitude, bLatLong.Latitude, bLatLong.Longitude, mode, arrival.toISOString())); 

      return Promise.all(routeReqs)
        .then(data => {

          return data.map((item, elem) => {
            console.log(elem);
            console.log(item);

            return constructRouteInfo(item, modes[elem]);
          });
        });
    });
}

function constructRouteInfo(route, mode) {
  var info = {};

  var summary = route.response.route[0].summary;
  info.mode = mode;
  info.distance = summary.distance;
  info.time = summary.travelTime;

  if (mode === "car") {
    info.emissions = parseInt((info.distance * 0.150).toFixed(2));
  } else if (mode === "publicTransport") {
    info.emissions = parseInt((info.distance * 0.098).toFixed(2));
  } else if (mode === "bicycle") {
    // https://bikeportland.org/2011/12/12/new-study-compares-bicyclings-co2-emissions-to-other-modes-63536 
    info.emissions = parseInt((info.distance * 0.017).toFixed(2));
  } else {
    // https://www.globe.gov/explore-science/scientists-blog/archived-posts/sciblog/index.html_p=186.html
    info.emissions = parseInt((info.distance * 0.039).toFixed(2));
  }

  // if (mode === "pedestrian") {
  //   info.caloriesBurned = parseInt((info.time *  3 ).toFixed(2));
  // } else if (mode === "bicycle") {
  //   info.caloriesBurned = parseInt((info.time * 12.9 ).toFixed(2));
  // } else if (mode == "publicTransport") {
  //   info.caloriesBurned = parseInt((info.time * 1.13 ).toFixed(2));
  // } else if (mode == "car") {
  //   info.caloriesBurned = parseInt((info.time * 2.83 ).toFixed(2));
  // }
 
  if (mode === "pedestrian") {
    info.image = "/walk.png";
  } else if (mode === "bicycle") {
    info.image = "/bike.png";
  } else if (mode == "publicTransport") {
    info.image = "/bus.png";
  } else if (mode == "car") {
    info.image = "/car.png";
  }

  console.log(info);
  return info;
}


function getLocationIdFromDataList(location, id) {
  var datalist = document.getElementById(id);
  
  // var selected = datalist.childNodes.find(node => {
  //   return node.value === location;
  // });
  var selected = datalist.firstElementChild;

  return selected.getAttribute('location');
}


function buildOptions(containerId) {
  var containerOld = document.getElementById(containerId);
  var container = containerOld.cloneNode(false); 

  // sort via order
  var orderOption = document.getElementById('filter-order');
  var sortBy = orderOption.value;

  if (Route_Found === null) {
    return;
  }

  var routes = Route_Found.sort((left, right) => {
    return left[sortBy] >= right[sortBy];
  });

  routes.forEach(route => {
    var result = document.createElement('div');
    result.setAttribute('class', 'result-list');

    var leftContainer = document.createElement('div');
    leftContainer.setAttribute('class', 'left-container');

    var transportImg = document.createElement('img');
    transportImg.setAttribute('src', route.image);
    transportImg.setAttribute('width', '150px');
    transportImg.setAttribute('height', '150px');

    leftContainer.appendChild(transportImg);
    result.appendChild(leftContainer);

    var rightContainer = document.createElement('div');
    rightContainer.setAttribute('class', 'right-container');

    if (route.mode === 'bicycle') {
      console.log(CURRENT_WEATHER);
      var obs = CURRENT_WEATHER.observations.location[0].observation[0];

      var flavour = document.createElement('p');
      var text = "Wind: " +  obs.windDescShort + " " + obs.windSpeed + "km/h";
      flavour.appendChild(document.createTextNode(text));
      rightContainer.appendChild(flavour);
    }
    if (route.mode === 'pedestrian') {
      console.log(CURRENT_WEATHER);
      var obs = CURRENT_WEATHER.observations.location[0].observation[0];

      var flavour = document.createElement('p');
      var text = "Weather: " + obs.skyDescription +  ", " +  obs.temperature + "℃" ;
      flavour.appendChild(document.createTextNode(text));
      rightContainer.appendChild(flavour);
    }


    ["time", "distance", "emissions"].forEach(data => {
      if (route[data]) {
        var info = document.createElement('p');

        var text = "PUT TEXT IN ME PLZ";
        if (data === "time") {
          text = "Time: " +  (route[data] / 3600).toFixed(2) + "hr";
        } else if (data === "distance"){
          text = "Distance: " + (route[data] / 1000).toFixed(2) + "Km";
        } else if (data === "emissions") {
          text = "Emissions: " + (route[data]).toFixed(2) + " grams of CO₂";
        }

        console.log(route[data] + " => " + text);
        info.appendChild(document.createTextNode(text));
        rightContainer.appendChild(info);
      }
    });

    result.appendChild(rightContainer);

    // <div class = "result-list">
    //     <div class = "left-container">
    //         <img src="bike.png" width ="150px" height ="150px">
    //     </div>
    //     <div class = "right-container">
    //         <p>Information 1</p>
    //         <p>Information 2</p>
    //     </div>
    // </div>
    container.appendChild(result);
  });

  containerOld.parentNode.replaceChild(container, containerOld);
}

function handleFilter(event) {
  console.log(event.target.value);

  buildOptions('options-container'); 
}
