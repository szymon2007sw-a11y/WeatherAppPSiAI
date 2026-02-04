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
  rainSystem: null,
  snowSystem: null,
  updateTimer: null,
  lastUpdatedIso: null,
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
  dataSourceBadge: document.getElementById('dataSourceBadge'),
  geoBtn: document.getElementById('geoBtn'),
  lastUpdated: document.getElementById('lastUpdated'),
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
  const settings = loadSettings();
  if (settings.tempUnit) {
    state.tempUnit = settings.tempUnit;
  }
  if (settings.windUnit) {
    state.windUnit = settings.windUnit;
  }

  state.favorites = loadFavorites();
  renderFavorites();
  bindSearch();
  bindQuickCities();
  bindUnitControls();
  syncUnitButtons();
  bindFavoriteToggle();
  bindClearFavorites();
  bindGeolocation();
  initMap();
  state.rainSystem = initRainSystem();
  state.snowSystem = initSnowSystem();

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
      saveSettings();
      syncUnitButtons();
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

function bindGeolocation() {
  if (!els.geoBtn) {
    return;
  }
  if (!navigator.geolocation) {
    els.geoBtn.style.display = 'none';
    return;
  }
  els.geoBtn.addEventListener('click', () => {
    setStatus('Pobieram Twoja lokalizacje...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = {
          name: 'Twoja lokalizacja',
          country: '',
          lat: latitude,
          lon: longitude,
        };
        loadWeather(location);
      },
      (error) => {
        const messages = {
          1: 'Brak uprawnien do lokalizacji.',
          2: 'Nie mozna ustalic pozycji.',
          3: 'Przekroczono czas oczekiwania na lokalizacje.',
        };
        setStatus(messages[error.code] || 'Nie udalo sie pobrac lokalizacji.');
      },
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

async function runSearch(query) {
  setStatus('Wyszukiwanie...');
  setSearchLoading(true);
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
  } finally {
    setSearchLoading(false);
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
  updateActiveQuickCity();
  updateDataSourceBadge(null);
  setLoading(true);
  setStatus('Ladowanie pogody...');

  try {
    const data = await fetchJson(
      `${API.weather}?lat=${encodeURIComponent(location.lat)}&lon=${encodeURIComponent(location.lon)}&name=${encodeURIComponent(location.name || 'Lokalizacja')}`
    );
    state.lastData = data;
    renderAll(data);
    updateDataSourceBadge(data);
    setStatus('');
  } catch (error) {
    setStatus(error.message || 'Nie udalo sie pobrac pogody.');
    updateDataSourceBadge(null);
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
  applyWeatherTheme(current.weather_code, current.cloud_cover, current.temperature_2m);

  const windDir = current.wind_direction_10m ?? 0;
  els.windArrow.style.setProperty('--wind-deg', `${windDir}deg`);
  els.windSpeed.textContent = formatSpeed(current.wind_speed_10m);
  els.windDirection.textContent = `${degToCompass(windDir)} (${Math.round(windDir)}°)`;

  els.metricHumidity.textContent = formatPercent(current.relative_humidity_2m);
  els.metricPressure.textContent = formatUnit(current.pressure_msl, 'hPa');
  els.metricClouds.textContent = formatPercent(current.cloud_cover);
  els.metricPrecip.textContent = formatUnit(current.precipitation, 'mm');
  els.metricVisibility.textContent = formatVisibility(current.visibility);
  startUpdateTicker(current.time);
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

function applyWeatherTheme(code, cloudCover, temperature) {
  document.body.classList.remove('theme-good', 'theme-bad', 'is-cloudy', 'is-cloudy-heavy');
  document.body.style.removeProperty('--cloud-opacity');
  if (code === undefined || code === null || Number.isNaN(code)) {
    if (state.rainSystem) {
      state.rainSystem.setActive(false);
    }
    if (state.snowSystem) {
      state.snowSystem.setActive(false);
    }
    document.body.classList.remove('is-rainy', 'is-snowy', 'is-cold');
    return;
  }
  const numericCode = Number(code);
  const isGood = [0, 1, 2].includes(numericCode);
  document.body.classList.add(isGood ? 'theme-good' : 'theme-bad');
  applyCloudLayer(numericCode, cloudCover);
  const isSnowy = isSnowCode(numericCode);
  const isRainy = !isSnowy && isRainCode(numericCode);
  document.body.classList.toggle('is-rainy', isRainy);
  document.body.classList.toggle('is-snowy', isSnowy);
  if (state.rainSystem) {
    state.rainSystem.setActive(isRainy);
  }
  if (state.snowSystem) {
    state.snowSystem.setActive(isSnowy);
  }
  const isCold = typeof temperature === 'number' && !Number.isNaN(temperature) && temperature < 0;
  document.body.classList.toggle('is-cold', isCold);
}

function applyCloudLayer(code, cloudCover) {
  const lightCloudCodes = [2];
  const heavyCloudCodes = [3, 45, 48, 51, 53, 55, 61, 63, 65, 71, 73, 75, 80, 81, 82, 95, 96, 99];
  const isCloudy = lightCloudCodes.includes(code) || heavyCloudCodes.includes(code);
  if (!isCloudy) {
    return;
  }
  const isHeavy = heavyCloudCodes.includes(code);
  document.body.classList.add('is-cloudy');
  if (isHeavy) {
    document.body.classList.add('is-cloudy-heavy');
  }
  if (typeof cloudCover === 'number' && !Number.isNaN(cloudCover)) {
    const clamped = Math.min(100, Math.max(0, cloudCover));
    const opacity = 0.35 + (clamped / 100) * 0.55;
    document.body.style.setProperty('--cloud-opacity', opacity.toFixed(2));
  }
}

function isRainCode(code) {
  const rainyCodes = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99];
  return rainyCodes.includes(code);
}

function isSnowCode(code) {
  const snowCodes = [71, 73, 75, 77, 85, 86];
  return snowCodes.includes(code);
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

function loadSettings() {
  try {
    const raw = localStorage.getItem('weatherapp:settings');
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function saveSettings() {
  const settings = {
    tempUnit: state.tempUnit,
    windUnit: state.windUnit,
  };
  try {
    localStorage.setItem('weatherapp:settings', JSON.stringify(settings));
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

function syncUnitButtons() {
  document.querySelectorAll('[data-unit-group]').forEach((group) => {
    const type = group.dataset.unitGroup;
    const target = type === 'temp' ? state.tempUnit : state.windUnit;
    group.querySelectorAll('.unit-btn').forEach((btn) => {
      const isActive = btn.dataset.unit === target;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  });
}

function updateActiveQuickCity() {
  const currentId = state.currentLocation ? locationId(state.currentLocation) : null;
  document.querySelectorAll('.chip').forEach((chip) => {
    const chipId = `${Number(chip.dataset.lat).toFixed(4)}_${Number(chip.dataset.lon).toFixed(4)}`;
    chip.classList.toggle('is-active', chipId === currentId);
  });
}

function updateDataSourceBadge(data) {
  if (!els.dataSourceBadge) {
    return;
  }
  if (data && data._cached) {
    els.dataSourceBadge.textContent = 'Z cache';
    els.dataSourceBadge.classList.add('is-cache');
    els.dataSourceBadge.classList.remove('is-live');
  } else if (data) {
    els.dataSourceBadge.textContent = 'Świeże dane';
    els.dataSourceBadge.classList.add('is-live');
    els.dataSourceBadge.classList.remove('is-cache');
  } else {
    els.dataSourceBadge.textContent = '--';
    els.dataSourceBadge.classList.remove('is-live', 'is-cache');
  }
}

function setSearchLoading(isLoading) {
  if (!els.searchBtn) {
    return;
  }
  const button = els.searchBtn;
  if (!button.dataset.label) {
    button.dataset.label = button.textContent.trim() || 'Szukaj';
  }
  button.disabled = isLoading;
  button.classList.toggle('loading', isLoading);
  button.textContent = isLoading ? 'Szukam...' : button.dataset.label;
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
  const data = payload.data;
  if (payload.cached && data && typeof data === 'object') {
    data._cached = true;
  }
  return data;
}

function startUpdateTicker(isoString) {
  if (!els.lastUpdated) {
    return;
  }
  if (state.updateTimer) {
    clearInterval(state.updateTimer);
    state.updateTimer = null;
  }
  state.lastUpdatedIso = isoString || null;
  updateLastUpdatedLabel();
  if (state.lastUpdatedIso) {
    state.updateTimer = setInterval(updateLastUpdatedLabel, 30000);
  }
}

function updateLastUpdatedLabel() {
  if (!els.lastUpdated) {
    return;
  }
  const iso = state.lastUpdatedIso;
  if (!iso) {
    els.lastUpdated.textContent = '';
    return;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    els.lastUpdated.textContent = '';
    return;
  }
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  let label = '';
  if (diffMin < 1) {
    label = 'Zaktualizowano przed chwila';
  } else if (diffMin === 1) {
    label = 'Zaktualizowano 1 minute temu';
  } else if (diffMin < 60) {
    label = `Zaktualizowano ${diffMin} min temu`;
  } else {
    const hours = Math.floor(diffMin / 60);
    if (hours === 1) {
      label = 'Zaktualizowano 1 godz. temu';
    } else if (hours < 6) {
      label = `Zaktualizowano ${hours} godz. temu`;
    } else {
      label = `Zaktualizowano ${date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
    }
  }
  els.lastUpdated.textContent = label;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function initRainSystem() {
  const canvas = document.getElementById('rainCanvas');
  if (!canvas || !canvas.getContext) {
    return null;
  }

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let drops = [];
  let splashes = [];
  let active = false;
  let lastTime = 0;
  let animationId = null;

  const settings = {
    maxDrops: 480,
    minDrops: 140,
    wind: -0.7,
  };

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    buildDrops();
  }

  function buildDrops() {
    const target = Math.min(
      settings.maxDrops,
      Math.max(settings.minDrops, Math.round((width * height) / 4500))
    );
    drops = Array.from({ length: target }, () => createDrop(true));
    splashes = [];
  }

  function createDrop(randomY) {
    const depth = Math.random();
    const drop = {
      x: Math.random() * width,
      y: randomY ? Math.random() * height : -Math.random() * height,
      length: lerp(10, 28, depth),
      speed: lerp(6, 18, depth),
      thickness: lerp(0.6, 1.6, depth),
      opacity: lerp(0.15, 0.55, depth),
      drift: lerp(-0.4, -1.2, depth),
    };
    return drop;
  }

  function update(delta) {
    const step = delta / 16;
    drops.forEach((drop) => {
      drop.y += drop.speed * step;
      drop.x += (settings.wind + drop.drift) * step;
      if (drop.y > height + drop.length) {
        if (Math.random() > 0.55) {
          splashes.push({
            x: drop.x,
            y: height - 6,
            life: 0,
            ttl: lerp(260, 420, Math.random()),
            radius: 0,
          });
        }
        drop.x = Math.random() * width;
        drop.y = -Math.random() * height * 0.4;
      }
      if (drop.x < -50 || drop.x > width + 50) {
        drop.x = Math.random() * width;
      }
    });

    splashes.forEach((splash) => {
      splash.life += delta;
      splash.radius += delta * 0.05;
    });
    splashes = splashes.filter((splash) => splash.life < splash.ttl);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    const haze = ctx.createLinearGradient(0, height * 0.6, 0, height);
    haze.addColorStop(0, 'rgba(255,255,255,0)');
    haze.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, height * 0.6, width, height * 0.4);

    ctx.lineCap = 'round';
    drops.forEach((drop) => {
      ctx.strokeStyle = `rgba(200, 220, 255, ${drop.opacity})`;
      ctx.lineWidth = drop.thickness;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + settings.wind * 8, drop.y + drop.length);
      ctx.stroke();
    });

    splashes.forEach((splash) => {
      const progress = splash.life / splash.ttl;
      ctx.strokeStyle = `rgba(180, 210, 240, ${0.45 * (1 - progress)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(splash.x, splash.y, splash.radius, splash.radius * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  function loop(timestamp) {
    if (!active) {
      animationId = null;
      return;
    }
    const delta = Math.min(34, timestamp - lastTime);
    lastTime = timestamp;
    update(delta);
    draw();
    animationId = requestAnimationFrame(loop);
  }

  function setActive(next) {
    if (active === next) {
      return;
    }
    active = next;
    if (active) {
      lastTime = performance.now();
      if (!animationId) {
        animationId = requestAnimationFrame(loop);
      }
    } else {
      ctx.clearRect(0, 0, width, height);
    }
  }

  resize();
  window.addEventListener('resize', debounce(resize, 120));

  return { setActive };
}

function initSnowSystem() {
  const canvas = document.getElementById('snowCanvas');
  if (!canvas || !canvas.getContext) {
    return null;
  }

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let flakes = [];
  let active = false;
  let lastTime = 0;
  let animationId = null;

  const settings = {
    maxFlakes: 360,
    minFlakes: 160,
    wind: 0.25,
  };

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    buildFlakes();
  }

  function buildFlakes() {
    const target = Math.min(
      settings.maxFlakes,
      Math.max(settings.minFlakes, Math.round((width * height) / 7000))
    );
    flakes = Array.from({ length: target }, () => createFlake(true));
  }

  function createFlake(randomY) {
    const depth = Math.random();
    return {
      x: Math.random() * width,
      y: randomY ? Math.random() * height : -Math.random() * height,
      radius: lerp(1.2, 3.8, depth),
      speed: lerp(0.6, 2.1, depth),
      opacity: lerp(0.35, 0.9, depth),
      drift: lerp(-0.45, 0.7, depth),
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: lerp(0.002, 0.01, Math.random()),
    };
  }

  function update(delta) {
    const step = delta / 16;
    flakes.forEach((flake) => {
      flake.wobble += flake.wobbleSpeed * delta;
      flake.y += flake.speed * step;
      flake.x += (settings.wind + flake.drift) * step + Math.sin(flake.wobble) * 0.4;

      if (flake.y > height + flake.radius) {
        flake.x = Math.random() * width;
        flake.y = -Math.random() * height * 0.3;
      }
      if (flake.x < -50 || flake.x > width + 50) {
        flake.x = Math.random() * width;
      }
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    const haze = ctx.createLinearGradient(0, 0, 0, height);
    haze.addColorStop(0, 'rgba(255,255,255,0.02)');
    haze.addColorStop(1, 'rgba(210,235,255,0.08)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, width, height);

    flakes.forEach((flake) => {
      ctx.fillStyle = `rgba(240, 248, 255, ${flake.opacity})`;
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function loop(timestamp) {
    if (!active) {
      animationId = null;
      return;
    }
    const delta = Math.min(34, timestamp - lastTime);
    lastTime = timestamp;
    update(delta);
    draw();
    animationId = requestAnimationFrame(loop);
  }

  function setActive(next) {
    if (active === next) {
      return;
    }
    active = next;
    if (active) {
      lastTime = performance.now();
      if (!animationId) {
        animationId = requestAnimationFrame(loop);
      }
    } else {
      ctx.clearRect(0, 0, width, height);
    }
  }

  resize();
  window.addEventListener('resize', debounce(resize, 120));

  return { setActive };
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
