const API = {
  geocode: '/api/geocode.php',
  weather: '/api/weather.php',
};

const state = {
  tempUnit: 'c',
  windUnit: 'kmh',
  favorites: [],
  currentLocation: null,
  lastData: null,
  map: null,
  mapLayer: null,
};

const els = {
  searchInput: document.getElementById('citySearch'),
  searchBtn: document.getElementById('searchBtn'),
  searchResults: document.getElementById('searchResults'),
  statusMessage: document.getElementById('statusMessage'),
  favoritesList: document.getElementById('favoritesList'),
  clearFavorites: document.getElementById('clearFavorites'),
  favoriteToggle: document.getElementById('favoriteToggle'),
  locationName: document.getElementById('locationName'),
  locationMeta: document.getElementById('locationMeta'),
  currentTemp: document.getElementById('currentTemp'),
  currentFeels: document.getElementById('currentFeels'),
  currentCondition: document.getElementById('currentCondition'),
  windArrow: document.getElementById('windArrow'),
  windSpeed: document.getElementById('windSpeed'),
  windDirection: document.getElementById('windDirection'),
  metricHumidity: document.getElementById('metricHumidity'),
  metricPressure: document.getElementById('metricPressure'),
  metricClouds: document.getElementById('metricClouds'),
  metricPrecip: document.getElementById('metricPrecip'),
  metricVisibility: document.getElementById('metricVisibility'),
  hourlyList: document.getElementById('hourlyList'),
  dailyList: document.getElementById('dailyList'),
  mapStatus: document.getElementById('mapStatus'),
};

const WEATHER_CODES = {
  0: 'Bezchmurne niebo',
  1: 'Przewaznie bezchmurnie',
  2: 'Czesciowe zachmurzenie',
  3: 'Pochmurno',
  45: 'Mgla',
  48: 'Mgla z szadza',
  51: 'Lekka mzawka',
  53: 'Mzawka',
  55: 'Gesta mzawka',
  61: 'Lekki deszcz',
  63: 'Deszcz',
  65: 'Ulewny deszcz',
  71: 'Lekki snieg',
  73: 'Snieg',
  75: 'Silny snieg',
  80: 'Przelotny deszcz',
  81: 'Przelotny deszcz',
  82: 'Gwaltowne opady',
  95: 'Burza',
  96: 'Burza z gradem',
  99: 'Burza z gradem',
};

const defaultLocation = {
  name: 'Warszawa',
  country: 'Polska',
  lat: 52.2297,
  lon: 21.0122,
};

document.addEventListener('DOMContentLoaded', () => {
  state.favorites = loadFavorites();
  renderFavorites();
  bindSearch();
  bindQuickCities();
  bindUnitControls();
  bindFavoriteToggle();
  bindClearFavorites();
  initMap();

  const first = state.favorites[0] || defaultLocation;
  loadWeather(first);
});

function bindSearch() {
  const handleSearch = debounce(() => {
    const query = els.searchInput.value.trim();
    if (query.length < 2) {
      els.searchResults.innerHTML = '';
      setStatus('');
      return;
    }
    runSearch(query);
  }, 350);

  els.searchInput.addEventListener('input', handleSearch);
  els.searchBtn.addEventListener('click', () => {
    const query = els.searchInput.value.trim();
    if (query.length < 2) {
      setStatus('Wpisz co najmniej 2 znaki.');
      return;
    }
    runSearch(query);
  });
}

function bindQuickCities() {
  document.querySelectorAll('.chip').forEach((button) => {
    button.addEventListener('click', () => {
      const location = {
        name: button.dataset.name,
        lat: Number(button.dataset.lat),
        lon: Number(button.dataset.lon),
      };
      loadWeather(location);
    });
  });
}

function bindUnitControls() {
  document.querySelectorAll('[data-unit-group]').forEach((group) => {
    group.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-unit]');
      if (!button) {
        return;
      }
      const unit = button.dataset.unit;
      const type = group.dataset.unitGroup;
      if (type === 'temp') {
        state.tempUnit = unit;
      }
      if (type === 'wind') {
        state.windUnit = unit;
      }
      group.querySelectorAll('.unit-btn').forEach((btn) => {
        btn.classList.toggle('is-active', btn === button);
        btn.setAttribute('aria-pressed', btn === button ? 'true' : 'false');
      });
      if (state.lastData) {
        renderAll(state.lastData);
      }
    });
  });
}

function bindFavoriteToggle() {
  els.favoriteToggle.addEventListener('click', () => {
    if (!state.currentLocation) {
      return;
    }
    const id = locationId(state.currentLocation);
    const index = state.favorites.findIndex((fav) => fav.id === id);
    if (index >= 0) {
      state.favorites.splice(index, 1);
    } else {
      state.favorites.unshift({
        ...state.currentLocation,
        id,
      });
    }
    saveFavorites(state.favorites);
    renderFavorites();
    updateFavoriteToggle();
  });
}

function bindClearFavorites() {
  els.clearFavorites.addEventListener('click', () => {
    state.favorites = [];
    saveFavorites(state.favorites);
    renderFavorites();
    updateFavoriteToggle();
  });
}

async function runSearch(query) {
  setStatus('Wyszukiwanie...');
  try {
    const data = await fetchJson(`${API.geocode}?q=${encodeURIComponent(query)}`);
    renderSearchResults(data.results || []);
    if (!data.results || data.results.length === 0) {
      setStatus('Brak wynikow.');
    } else {
      setStatus('');
    }
  } catch (error) {
    setStatus(error.message || 'Wyszukiwanie nie powiodlo sie.');
  }
}

function renderSearchResults(results) {
  els.searchResults.innerHTML = '';
  results.forEach((item) => {
    const location = {
      name: item.name,
      admin1: item.admin1,
      country: item.country,
      lat: Number(item.lat),
      lon: Number(item.lon),
    };
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'result-item';
    const label = document.createElement('span');
    label.textContent = formatLocationLabel(location);
    const meta = document.createElement('span');
    meta.className = 'result-meta';
    meta.textContent = `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`;
    button.appendChild(label);
    button.appendChild(meta);
    button.addEventListener('click', () => {
      els.searchResults.innerHTML = '';
      els.searchInput.value = location.name;
      loadWeather(location);
    });
    els.searchResults.appendChild(button);
  });
}

async function loadWeather(location) {
  state.currentLocation = location;
  updateFavoriteToggle();
  setLoading(true);
  setStatus('Ladowanie pogody...');

  try {
    const data = await fetchJson(
      `${API.weather}?lat=${encodeURIComponent(location.lat)}&lon=${encodeURIComponent(location.lon)}&name=${encodeURIComponent(location.name || 'Lokalizacja')}`
    );
    state.lastData = data;
    renderAll(data);
    setStatus('');
  } catch (error) {
    setStatus(error.message || 'Nie udalo sie pobrac pogody.');
  } finally {
    setLoading(false);
  }
}

function renderAll(data) {
  renderCurrent(data);
  renderHourly(data);
  renderDaily(data);
}

function renderCurrent(data) {
  const current = data.current || {};
  const locationLabel = state.currentLocation ? formatLocationLabel(state.currentLocation) : data.location?.name || 'Wybrana lokalizacja';
  const meta = [];
  if (data.location?.lat && data.location?.lon) {
    meta.push(`${data.location.lat.toFixed(2)}, ${data.location.lon.toFixed(2)}`);
  }
  if (data.timezone) {
    meta.push(data.timezone);
  }
  if (current.time) {
    meta.push(`Aktualizacja ${formatTime(current.time)}`);
  }

  els.locationName.textContent = locationLabel;
  els.locationMeta.textContent = meta.join(' · ');
  els.currentTemp.textContent = formatTemp(current.temperature_2m);
  els.currentFeels.textContent = formatTemp(current.apparent_temperature);
  els.currentCondition.textContent = WEATHER_CODES[current.weather_code] || 'Warunki';

  const windDir = current.wind_direction_10m ?? 0;
  els.windArrow.style.setProperty('--wind-deg', `${windDir}deg`);
  els.windSpeed.textContent = formatSpeed(current.wind_speed_10m);
  els.windDirection.textContent = `${degToCompass(windDir)} (${Math.round(windDir)}°)`;

  els.metricHumidity.textContent = formatPercent(current.relative_humidity_2m);
  els.metricPressure.textContent = formatUnit(current.pressure_msl, 'hPa');
  els.metricClouds.textContent = formatPercent(current.cloud_cover);
  els.metricPrecip.textContent = formatUnit(current.precipitation, 'mm');
  els.metricVisibility.textContent = formatVisibility(current.visibility);
}

function renderHourly(data) {
  const hourly = data.hourly || {};
  const times = hourly.time || [];
  const temps = hourly.temperature_2m || [];
  const precip = hourly.precipitation || [];
  const winds = hourly.wind_speed_10m || [];

  const count = Math.min(24, times.length);
  els.hourlyList.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const card = document.createElement('div');
    card.className = 'hour-card';
    card.innerHTML = `
      <strong>${formatTime(times[i])}</strong>
      <p>${formatTemp(temps[i])}</p>
      <p>Opad: ${formatUnit(precip[i], 'mm')}</p>
      <p>Wiatr: ${formatSpeed(winds[i])}</p>
    `;
    els.hourlyList.appendChild(card);
  }

  if (count === 0) {
    els.hourlyList.innerHTML = '<p class="muted">Brak danych godzinowych.</p>';
  }
}

function renderDaily(data) {
  const daily = data.daily || {};
  const times = daily.time || [];
  const maxTemps = daily.temperature_2m_max || [];
  const minTemps = daily.temperature_2m_min || [];
  const precip = daily.precipitation_sum || [];
  const windMax = daily.wind_speed_10m_max || [];

  const count = Math.min(7, times.length);
  els.dailyList.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const row = document.createElement('div');
    row.className = 'day-row';
    row.innerHTML = `
      <strong>${formatDay(times[i])}</strong>
      <span>${formatTemp(minTemps[i])} / ${formatTemp(maxTemps[i])}</span>
      <span>Opad: ${formatUnit(precip[i], 'mm')}</span>
      <span>Wiatr: ${formatSpeed(windMax[i])}</span>
    `;
    els.dailyList.appendChild(row);
  }

  if (count === 0) {
    els.dailyList.innerHTML = '<p class="muted">Brak danych dziennych.</p>';
  }
}

function renderFavorites() {
  els.favoritesList.innerHTML = '';
  if (state.favorites.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'muted';
    empty.textContent = 'Brak ulubionych.';
    els.favoritesList.appendChild(empty);
    return;
  }

  state.favorites.forEach((fav) => {
    const item = document.createElement('li');
    item.className = 'favorite-item';

    const viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.textContent = formatLocationLabel(fav);
    viewBtn.addEventListener('click', () => loadWeather(fav));

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Usun';
    removeBtn.addEventListener('click', () => {
      state.favorites = state.favorites.filter((item) => item.id !== fav.id);
      saveFavorites(state.favorites);
      renderFavorites();
      updateFavoriteToggle();
    });

    item.appendChild(viewBtn);
    item.appendChild(removeBtn);
    els.favoritesList.appendChild(item);
  });
}

function updateFavoriteToggle() {
  if (!state.currentLocation) {
    return;
  }
  const isFavorite = state.favorites.some((fav) => fav.id === locationId(state.currentLocation));
  els.favoriteToggle.textContent = isFavorite ? '★ Zapisane' : '☆ Zapisz';
  els.favoriteToggle.setAttribute('aria-label', isFavorite ? 'Usun z ulubionych' : 'Dodaj do ulubionych');
}

function setStatus(message) {
  els.statusMessage.textContent = message;
}

function setLoading(isLoading) {
  document.querySelectorAll('[data-loading]').forEach((section) => {
    section.classList.toggle('is-loading', isLoading);
  });
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem('weatherapp:favorites');
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (error) {
    return [];
  }
}

function saveFavorites(favorites) {
  try {
    localStorage.setItem('weatherapp:favorites', JSON.stringify(favorites));
  } catch (error) {
    // ignore
  }
}

function locationId(location) {
  return `${Number(location.lat).toFixed(4)}_${Number(location.lon).toFixed(4)}`;
}

function formatLocationLabel(location) {
  const parts = [location.name, location.admin1, location.country].filter(Boolean);
  return parts.join(', ');
}

function formatTemp(value) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '--';
  }
  const temp = state.tempUnit === 'f' ? value * 1.8 + 32 : value;
  const unit = state.tempUnit === 'f' ? 'F' : 'C';
  return `${Math.round(temp)}°${unit}`;
}

function formatSpeed(value) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '--';
  }
  const speed = state.windUnit === 'ms' ? value / 3.6 : value;
  const unit = state.windUnit === 'ms' ? 'm/s' : 'km/h';
  const precision = state.windUnit === 'ms' ? 1 : 0;
  return `${speed.toFixed(precision)} ${unit}`;
}

function formatUnit(value, unit) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '--';
  }
  return `${Math.round(value)} ${unit}`;
}

function formatPercent(value) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '--';
  }
  return `${Math.round(value)}%`;
}

function formatVisibility(value) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '--';
  }
  const km = value / 1000;
  return `${km.toFixed(1)} km`;
}

function formatTime(timeString) {
  if (!timeString) {
    return '--';
  }
  const parts = timeString.split('T');
  if (parts.length > 1) {
    return parts[1].slice(0, 5);
  }
  return timeString;
}

function formatDay(dateString) {
  if (!dateString) {
    return '--';
  }
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('pl-PL', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function degToCompass(deg) {
  if (deg === undefined || deg === null || Number.isNaN(deg)) {
    return '--';
  }
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round((deg % 360) / 45) % 8;
  return directions[index];
}

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || 'Zapytanie nie powiodlo sie.');
  }
  return payload.data;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function initMap() {
  if (!window.L) {
    return;
  }
  const map = L.map('windMap', {
    zoomControl: true,
    scrollWheelZoom: false,
  }).setView([20, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; Wspoltworcy OpenStreetMap',
  }).addTo(map);

  const layer = L.layerGroup().addTo(map);

  map.on('click', async (event) => {
    const { lat, lng } = event.latlng;
    setMapStatus('Ladowanie probki wiatru...');
    try {
      const data = await fetchJson(`${API.weather}?lat=${lat}&lon=${lng}&name=Punkt%20na%20mapie`);
      renderWindLayer(layer, { lat, lng }, data.current || {});
      setMapStatus('Warstwa wiatru (prototyp)');
    } catch (error) {
      setMapStatus(error.message || 'Nie udalo sie pobrac probki wiatru.');
    }
  });

  state.map = map;
  state.mapLayer = layer;
}

function renderWindLayer(layer, center, current) {
  layer.clearLayers();
  const baseDir = Number(current.wind_direction_10m || 0);
  const baseSpeed = Number(current.wind_speed_10m || 0);

  const offsets = [
    [0, 0],
    [0.2, 0.15],
    [-0.2, 0.1],
    [0.15, -0.2],
    [-0.15, -0.25],
  ];

  offsets.forEach((offset, index) => {
    const lat = center.lat + offset[0];
    const lng = center.lng + offset[1];
    const direction = (baseDir + (index - 2) * 12 + 360) % 360;
    const speed = Math.max(0, baseSpeed + (index - 2) * 1.4);
    const marker = createWindMarker(lat, lng, direction, speed);
    marker.addTo(layer);
  });

  L.circleMarker([center.lat, center.lng], {
    radius: 6,
    color: '#ff7a3d',
    fillColor: '#ff7a3d',
    fillOpacity: 0.8,
  }).addTo(layer);
}

function createWindMarker(lat, lon, direction, speed) {
  const icon = L.divIcon({
    className: 'wind-marker',
    html: `
      <div class="wind-arrow" style="--wind-deg:${direction}deg"></div>
      <div class="wind-speed">${formatSpeed(speed)}</div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
  return L.marker([lat, lon], { icon });
}

function setMapStatus(message) {
  if (!els.mapStatus) {
    return;
  }
  els.mapStatus.textContent = message;
}
