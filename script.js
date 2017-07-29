
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

function getRoute(StartX, StartY, GoalX, GoalY, mode) {

  return fetch("https://route.cit.api.here.com/routing/7.2/calculateroute.json?app_id=" + HERE_APP_ID + 
    "&app_code=" + HERE_APP_CODE +
    "&waypoint0=geo!" + StartX + "," + StartY +
    "&waypoint1=geo!" + GoalX + "," + GoalY +
    "&mode=fastest;" + mode + ";traffic:enabled")
    .then(r => r.json())
    .then(r => console.log(r));
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
  console.log(data);
}

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
    HERE_APP_ID + "&app_code=" + HERE_APP_CODE + "&query=" + search)
    .then(r => r.json());
}

function updateAutoCompleteFor(event) {
  var input = event.target;

  var value = input.value;
  console.log(value);

  getAutoCompleteFor('New Zealand, ' + value)
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
