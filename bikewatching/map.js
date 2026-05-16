import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const BOSTON_BIKE_LANES_URL =
  'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson';
const CAMBRIDGE_BIKE_LANES_URL =
  'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson';
const STATIONS_URL = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
const TRIPS_URL = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';
const ALL_DAY = -1;
const TIME_WINDOW = 60;
const MINUTES_IN_DAY = 24 * 60;

const cartoStyle = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: 'carto-light',
      type: 'raster',
      source: 'carto',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

const map = new mapboxgl.Map({
  container: 'map',
  style: cartoStyle,
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 10,
  maxZoom: 18,
});

map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

const mapContainer = document.getElementById('map');
const timeSlider = document.getElementById('time-slider');
const selectedTime = document.getElementById('selected-time');
const anyTime = document.getElementById('any-time');
const loadingMessage = document.createElement('div');
loadingMessage.className = 'loading-message';
loadingMessage.textContent = 'Loading Bluebikes data...';
mapContainer.append(loadingMessage);

let stations = [];
let departuresByMinute = Array.from({ length: MINUTES_IN_DAY }, () => []);
let arrivalsByMinute = Array.from({ length: MINUTES_IN_DAY }, () => []);
let allDepartures = new Map();
let allArrivals = new Map();
let circleSelection;
let radiusScale = d3.scaleSqrt().range([0, 25]);

const svg = d3
  .select(map.getCanvasContainer())
  .append('svg')
  .attr('class', 'station-overlay')
  .attr('aria-hidden', 'true');

const flowColor = d3
  .scaleQuantize()
  .domain([0, 1])
  .range(['#d96f2a', '#79886c', '#2466d8']);
const flowRatio = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);

map.on('load', async () => {
  try {
    addBikeLaneLayers();
    await loadStationTraffic();
    updateVisualization(ALL_DAY);
    loadingMessage.remove();
  } catch (error) {
    loadingMessage.className = 'error-message';
    loadingMessage.textContent = 'Could not load the Bikewatching data.';
    console.error(error);
  }
});

map.on('move', updateCirclePositions);
map.on('zoom', updateCirclePositions);
map.on('resize', updateCirclePositions);

timeSlider.addEventListener('input', (event) => {
  const minute = Number(event.target.value);
  updateTimeReadout(minute);
  updateVisualization(minute);
});

function addBikeLaneLayers() {
  addLineLayer('boston-bike-lanes', BOSTON_BIKE_LANES_URL, '#0f8f73');
  addLineLayer('cambridge-bike-lanes', CAMBRIDGE_BIKE_LANES_URL, '#41a85f');
}

function addLineLayer(id, data, color) {
  map.addSource(id, {
    type: 'geojson',
    data,
  });

  map.addLayer({
    id,
    type: 'line',
    source: id,
    paint: {
      'line-color': color,
      'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.2, 15, 3.8],
      'line-opacity': 0.68,
    },
  });
}

async function loadStationTraffic() {
  const [stationData, trips] = await Promise.all([
    d3.json(STATIONS_URL),
    d3.csv(TRIPS_URL, parseTrip),
  ]);

  stations = stationData.data.stations.map((station) => ({
    ...station,
    id: station.short_name || station.station_id,
    lat: Number(station.lat),
    lon: Number(station.lon),
  }));

  departuresByMinute = Array.from({ length: MINUTES_IN_DAY }, () => []);
  arrivalsByMinute = Array.from({ length: MINUTES_IN_DAY }, () => []);

  for (const trip of trips) {
    if (trip.startMinute >= 0) {
      departuresByMinute[trip.startMinute].push(trip);
    }

    if (trip.endMinute >= 0) {
      arrivalsByMinute[trip.endMinute].push(trip);
    }
  }

  allDepartures = d3.rollup(
    trips,
    (group) => group.length,
    (trip) => trip.start_station_id,
  );
  allArrivals = d3.rollup(
    trips,
    (group) => group.length,
    (trip) => trip.end_station_id,
  );
}

function parseTrip(trip) {
  const startedAt = new Date(trip.started_at);
  const endedAt = new Date(trip.ended_at);

  return {
    ...trip,
    startedAt,
    endedAt,
    startMinute: getMinuteOfDay(startedAt),
    endMinute: getMinuteOfDay(endedAt),
  };
}

function getMinuteOfDay(date) {
  if (Number.isNaN(date.getTime())) {
    return -1;
  }

  return date.getHours() * 60 + date.getMinutes();
}

function updateVisualization(minute) {
  const stationsWithTraffic = computeStationTraffic(minute);
  const maxTraffic = d3.max(stationsWithTraffic, (station) => station.totalTraffic) || 1;

  radiusScale = d3
    .scaleSqrt()
    .domain([0, maxTraffic])
    .range(minute === ALL_DAY ? [0, 25] : [2, 48]);

  circleSelection = svg
    .selectAll('circle')
    .data(stationsWithTraffic, (station) => station.id)
    .join((enter) =>
      enter
        .append('circle')
        .attr('class', 'station')
        .attr('tabindex', 0)
        .call((selection) => selection.append('title')),
    )
    .attr('r', (station) => radiusScale(station.totalTraffic))
    .attr('fill', (station) => flowColor(getDepartureRatio(station)))
    .style('--departure-ratio', (station) => quantizeDepartureRatio(station))
    .attr('aria-label', (station) => getTooltipText(station));

  circleSelection.select('title').text(getTooltipText);
  updateCirclePositions();
}

function computeStationTraffic(minute) {
  const departureCounts =
    minute === ALL_DAY
      ? allDepartures
      : countTripsByStation(getTripsWithinTime(departuresByMinute, minute), 'start_station_id');
  const arrivalCounts =
    minute === ALL_DAY
      ? allArrivals
      : countTripsByStation(getTripsWithinTime(arrivalsByMinute, minute), 'end_station_id');

  return stations.map((station) => {
    const departures = departureCounts.get(station.id) || 0;
    const arrivals = arrivalCounts.get(station.id) || 0;

    return {
      ...station,
      departures,
      arrivals,
      totalTraffic: departures + arrivals,
    };
  });
}

function getTripsWithinTime(bucket, minute) {
  const trips = [];

  for (let offset = -TIME_WINDOW; offset <= TIME_WINDOW; offset += 1) {
    const index = (minute + offset + MINUTES_IN_DAY) % MINUTES_IN_DAY;
    trips.push(...bucket[index]);
  }

  return trips;
}

function countTripsByStation(trips, stationField) {
  return d3.rollup(
    trips,
    (group) => group.length,
    (trip) => trip[stationField],
  );
}

function updateCirclePositions() {
  if (!circleSelection) {
    return;
  }

  circleSelection
    .attr('cx', (station) => projectStation(station).x)
    .attr('cy', (station) => projectStation(station).y);
}

function projectStation(station) {
  return map.project([station.lon, station.lat]);
}

function getDepartureRatio(station) {
  if (!station.totalTraffic) {
    return 0.5;
  }

  return station.departures / station.totalTraffic;
}

function quantizeDepartureRatio(station) {
  return flowRatio(getDepartureRatio(station));
}

function getTooltipText(station) {
  const trips = d3.format(',')(station.totalTraffic);
  const departures = d3.format(',')(station.departures);
  const arrivals = d3.format(',')(station.arrivals);

  return `${station.name}
${trips} total trips
${departures} departures
${arrivals} arrivals`;
}

function updateTimeReadout(minute) {
  if (minute === ALL_DAY) {
    selectedTime.textContent = 'Any time';
    anyTime.textContent = 'Showing all March trips';
    return;
  }

  selectedTime.textContent = formatMinute(minute);
  anyTime.textContent = `Showing trips from ${formatMinute(minute - TIME_WINDOW)} to ${formatMinute(
    minute + TIME_WINDOW,
  )}`;
}

function formatMinute(minute) {
  const wrappedMinute = (minute + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const hours24 = Math.floor(wrappedMinute / 60);
  const minutes = wrappedMinute % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}
