/**
 * WeatherPulse Meteorological Station
 * Consumes Open-Meteo REST API (Public, Zero API Key)
 */

(function () {
  "use strict";

  const STORAGE_CACHE_KEY = "weatherpulse_last_cache";
  const DEFAULT_CITY = {
    name: "London",
    country: "United Kingdom",
    lat: 51.5074,
    lon: -0.1278
  };

  // WMO Meteorological Codes
  const WMO_MAP = {
    0: { desc: "Clear Sky", dayIcon: "☀️", nightIcon: "🌙" },
    1: { desc: "Mainly Clear", dayIcon: "🌤️", nightIcon: "🌤️" },
    2: { desc: "Partly Cloudy", dayIcon: "⛅", nightIcon: "⛅" },
    3: { desc: "Overcast", dayIcon: "☁️", nightIcon: "☁️" },
    45: { desc: "Foggy", dayIcon: "🌫️", nightIcon: "🌫️" },
    48: { desc: "Depositing Rime Fog", dayIcon: "🌫️", nightIcon: "🌫️" },
    51: { desc: "Light Drizzle", dayIcon: "🌦️", nightIcon: "🌦️" },
    53: { desc: "Moderate Drizzle", dayIcon: "🌦️", nightIcon: "🌦️" },
    55: { desc: "Dense Drizzle", dayIcon: "🌧️", nightIcon: "🌧️" },
    61: { desc: "Slight Rain", dayIcon: "🌦️", nightIcon: "🌧️" },
    63: { desc: "Moderate Rain", dayIcon: "🌧️", nightIcon: "🌧️" },
    65: { desc: "Heavy Rain", dayIcon: "🌧️", nightIcon: "🌧️" },
    71: { desc: "Slight Snow Fall", dayIcon: "🌨️", nightIcon: "🌨️" },
    73: { desc: "Moderate Snow Fall", dayIcon: "🌨️", nightIcon: "🌨️" },
    75: { desc: "Heavy Snow Fall", dayIcon: "❄️", nightIcon: "❄️" },
    77: { desc: "Snow Grains", dayIcon: "❄️", nightIcon: "❄️" },
    80: { desc: "Slight Rain Showers", dayIcon: "🌦️", nightIcon: "🌧️" },
    81: { desc: "Moderate Rain Showers", dayIcon: "🌧️", nightIcon: "🌧️" },
    82: { desc: "Violent Rain Showers", dayIcon: "⛈️", nightIcon: "⛈️" },
    85: { desc: "Slight Snow Showers", dayIcon: "🌨️", nightIcon: "🌨️" },
    86: { desc: "Heavy Snow Showers", dayIcon: "❄️", nightIcon: "❄️" },
    95: { desc: "Thunderstorm", dayIcon: "⛈️", nightIcon: "⛈️" },
    96: { desc: "Thunderstorm with Slight Hail", dayIcon: "⛈️", nightIcon: "⛈️" },
    99: { desc: "Thunderstorm with Heavy Hail", dayIcon: "⛈️", nightIcon: "⛈️" }
  };

  // State
  let currentUnit = "C"; // "C" or "F"
  let activeLocation = { ...DEFAULT_CITY };
  let currentData = null;

  // DOM Elements
  const searchForm = document.getElementById("searchForm");
  const cityInput = document.getElementById("cityInput");
  const suggestionsDropdown = document.getElementById("citySuggestions");
  const geoBtn = document.getElementById("geoBtn");
  const unitCBtn = document.getElementById("unitC");
  const unitFBtn = document.getElementById("unitF");
  const cityPills = document.querySelectorAll(".city-pill");

  const loadingState = document.getElementById("loadingState");
  const errorState = document.getElementById("errorState");
  const weatherContent = document.getElementById("weatherContent");
  const errorMessage = document.getElementById("errorMessage");
  const retryBtn = document.getElementById("retryBtn");

  const locationNameEl = document.getElementById("locationName");
  const cacheIndicatorEl = document.getElementById("cacheIndicator");
  const currentTempEl = document.getElementById("currentTemp");
  const weatherDescEl = document.getElementById("weatherDesc");
  const tempMaxEl = document.getElementById("tempMax");
  const tempMinEl = document.getElementById("tempMin");
  const feelsLikeEl = document.getElementById("feelsLike");
  const weatherIconLargeEl = document.getElementById("weatherIconLarge");

  const windSpeedEl = document.getElementById("windSpeed");
  const windDescEl = document.getElementById("windDesc");
  const humidityEl = document.getElementById("humidity");
  const uvIndexEl = document.getElementById("uvIndex");
  const uvDescEl = document.getElementById("uvDesc");
  const pressureEl = document.getElementById("pressure");
  const precipitationEl = document.getElementById("precipitation");
  const sunriseTimeEl = document.getElementById("sunriseTime");
  const sunsetTimeEl = document.getElementById("sunsetTime");

  const hourlyTimelineEl = document.getElementById("hourlyTimeline");
  const dailyForecastEl = document.getElementById("dailyForecast");

  // ==========================================
  // METEOROLOGICAL API SERVICE
  // ==========================================

  async function fetchWeatherData(lat, lon, locationInfo) {
    showLoading();
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,surface_pressure&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Meteorological station returned HTTP ${response.status}`);
      }

      const data = await response.json();
      currentData = { ...data, location: locationInfo };

      // Save to local cache
      try {
        localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(currentData));
      } catch (e) {
        console.warn("Storage write failed");
      }

      renderWeather(currentData, false);
    } catch (err) {
      console.error("Fetch weather failed:", err);

      // Attempt offline cache recovery
      const cached = localStorage.getItem(STORAGE_CACHE_KEY);
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          renderWeather(cachedData, true);
          return;
        } catch (e) {
          // Fall through to error state
        }
      }

      showError(err.message || "Failed to establish contact with the weather satellites.");
    }
  }

  async function searchCities(query) {
    if (!query || query.length < 2) {
      suggestionsDropdown.style.display = "none";
      return;
    }

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        renderSuggestions(data.results);
      } else {
        suggestionsDropdown.style.display = "none";
      }
    } catch (e) {
      console.warn("Geocoding failed:", e);
    }
  }

  // ==========================================
  // RENDER CONTROLLERS
  // ==========================================

  function renderWeather(data, isCached = false) {
    hideAllStates();
    weatherContent.style.display = "block";

    const current = data.current;
    const daily = data.daily;
    const hourly = data.hourly;
    const loc = data.location || activeLocation;

    // Location & Cache Tag
    locationNameEl.textContent = `${loc.name}, ${loc.country || ""}`;
    cacheIndicatorEl.style.display = isCached ? "inline-block" : "none";

    // Primary Temperature
    currentTempEl.textContent = formatTemp(current.temperature_2m);
    feelsLikeEl.innerHTML = `${formatTemp(current.apparent_temperature)}&deg;`;
    tempMaxEl.innerHTML = `${formatTemp(daily.temperature_2m_max[0])}&deg;`;
    tempMinEl.innerHTML = `${formatTemp(daily.temperature_2m_min[0])}&deg;`;

    // Weather condition & icons
    const wmo = WMO_MAP[current.weather_code] || { desc: "Moderate", dayIcon: "🌤️", nightIcon: "🌤️" };
    weatherDescEl.textContent = wmo.desc;
    weatherIconLargeEl.textContent = current.is_day ? wmo.dayIcon : wmo.nightIcon;

    // Metrics Bento
    windSpeedEl.textContent = Math.round(current.wind_speed_10m);
    windDescEl.textContent = getWindClassification(current.wind_speed_10m);
    humidityEl.textContent = Math.round(current.relative_humidity_2m);

    const uv = daily.uv_index_max ? daily.uv_index_max[0] : 0;
    uvIndexEl.textContent = uv.toFixed(1);
    uvDescEl.textContent = getUvClassification(uv);

    pressureEl.textContent = Math.round(current.surface_pressure);
    precipitationEl.textContent = current.precipitation.toFixed(1);

    sunriseTimeEl.textContent = formatTimeOnly(daily.sunrise[0]);
    sunsetTimeEl.textContent = formatTimeOnly(daily.sunset[0]);

    // Hourly Timeline (Next 24 Hours)
    renderHourly(hourly);

    // 7-Day Outlook
    renderDaily(daily);
  }

  function renderHourly(hourly) {
    hourlyTimelineEl.innerHTML = "";
    const nowIndex = getNearestHourIndex(hourly.time);
    const count = Math.min(24, hourly.time.length - nowIndex);

    for (let i = nowIndex; i < nowIndex + count; i++) {
      const timeStr = formatHourOnly(hourly.time[i]);
      const temp = formatTemp(hourly.temperature_2m[i]);
      const code = hourly.weather_code[i];
      const wmo = WMO_MAP[code] || { dayIcon: "🌤️" };

      const card = document.createElement("div");
      card.className = `hourly-card ${i === nowIndex ? 'active' : ''}`;
      card.innerHTML = `
        <span class="hourly-time">${i === nowIndex ? 'Now' : timeStr}</span>
        <span class="hourly-icon">${wmo.dayIcon}</span>
        <span class="hourly-temp">${temp}&deg;</span>
      `;
      hourlyTimelineEl.appendChild(card);
    }
  }

  function renderDaily(daily) {
    dailyForecastEl.innerHTML = "";
    const count = Math.min(7, daily.time.length);

    for (let i = 0; i < count; i++) {
      const date = new Date(daily.time[i]);
      const dayName = i === 0 ? "Today" : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      const max = formatTemp(daily.temperature_2m_max[i]);
      const min = formatTemp(daily.temperature_2m_min[i]);
      const code = daily.weather_code[i];
      const wmo = WMO_MAP[code] || { desc: "Clear", dayIcon: "🌤️" };

      const row = document.createElement("div");
      row.className = "daily-row";
      row.innerHTML = `
        <span class="daily-day">${dayName}</span>
        <div class="daily-condition">
          <span class="daily-icon">${wmo.dayIcon}</span>
          <span>${wmo.desc}</span>
        </div>
        <div class="daily-temps">
          <span style="color: var(--text-muted); font-size: 0.85rem;">${min}&deg;</span>
          <div class="temp-bar-container">
            <div class="temp-bar-fill" style="width: ${Math.min(100, Math.max(10, (max - min) * 6))}%;"></div>
          </div>
          <span style="font-weight: 700;">${max}&deg;</span>
        </div>
      `;
      dailyForecastEl.appendChild(row);
    }
  }

  function renderSuggestions(results) {
    suggestionsDropdown.innerHTML = "";
    results.forEach(res => {
      const item = document.createElement("div");
      item.className = "suggestion-item";
      const region = res.admin1 ? `${res.admin1}, ` : "";
      item.textContent = `${res.name}, ${region}${res.country || ""}`;

      item.addEventListener("click", () => {
        activeLocation = {
          name: res.name,
          country: res.country,
          lat: res.latitude,
          lon: res.longitude
        };
        cityInput.value = `${res.name}, ${res.country || ""}`;
        suggestionsDropdown.style.display = "none";
        fetchWeatherData(res.latitude, res.longitude, activeLocation);
      });

      suggestionsDropdown.appendChild(item);
    });
    suggestionsDropdown.style.display = "block";
  }

  // ==========================================
  // HELPERS & UNITS
  // ==========================================

  function formatTemp(celsius) {
    if (celsius === undefined || celsius === null) return "--";
    if (currentUnit === "F") {
      return Math.round((celsius * 9) / 5 + 32);
    }
    return Math.round(celsius);
  }

  function getWindClassification(kmh) {
    if (kmh < 5) return "Calm";
    if (kmh < 19) return "Light breeze";
    if (kmh < 38) return "Moderate wind";
    if (kmh < 61) return "Strong breeze";
    return "High wind / gale";
  }

  function getUvClassification(uv) {
    if (uv <= 2) return "Low risk";
    if (uv <= 5) return "Moderate exposure";
    if (uv <= 7) return "High protection needed";
    if (uv <= 10) return "Very high";
    return "Extreme";
  }

  function formatTimeOnly(isoString) {
    if (!isoString) return "--:--";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  function formatHourOnly(isoString) {
    if (!isoString) return "--";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "numeric", hour12: true });
  }

  function getNearestHourIndex(isoTimeArray) {
    const now = new Date();
    for (let i = 0; i < isoTimeArray.length; i++) {
      const itemTime = new Date(isoTimeArray[i]);
      if (itemTime >= now) return Math.max(0, i - 1);
    }
    return 0;
  }

  // ==========================================
  // STATE SWITCHING
  // ==========================================

  function showLoading() {
    hideAllStates();
    loadingState.style.display = "flex";
  }

  function showError(msg) {
    hideAllStates();
    errorState.style.display = "block";
    errorMessage.textContent = msg;
  }

  function hideAllStates() {
    loadingState.style.display = "none";
    errorState.style.display = "none";
    weatherContent.style.display = "none";
  }

  // ==========================================
  // GEOLOCATION
  // ==========================================

  function requestUserLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    showLoading();
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        activeLocation = {
          name: "Current GPS Location",
          country: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
          lat,
          lon
        };
        fetchWeatherData(lat, lon, activeLocation);
      },
      (err) => {
        console.warn("Geolocation denied/failed:", err);
        // Fallback to default
        fetchWeatherData(DEFAULT_CITY.lat, DEFAULT_CITY.lon, DEFAULT_CITY);
      },
      { timeout: 8000 }
    );
  }

  // ==========================================
  // EVENT LISTENERS & BOOTSTRAP
  // ==========================================

  function init() {
    // Search form submission
    searchForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const val = cityInput.value.trim();
      if (!val) return;
      suggestionsDropdown.style.display = "none";

      try {
        showLoading();
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=1&language=en&format=json`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const first = data.results[0];
          activeLocation = {
            name: first.name,
            country: first.country,
            lat: first.latitude,
            lon: first.longitude
          };
          fetchWeatherData(first.latitude, first.longitude, activeLocation);
        } else {
          showError(`No geographical matches found for "${val}".`);
        }
      } catch (err) {
        showError("Failed to lookup city location.");
      }
    });

    // Dynamic autocomplete debounce
    let debounceTimer = null;
    cityInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      const query = e.target.value.trim();
      debounceTimer = setTimeout(() => searchCities(query), 300);
    });

    // Close suggestions on outside click
    document.addEventListener("click", (e) => {
      if (!searchForm.contains(e.target)) {
        suggestionsDropdown.style.display = "none";
      }
    });

    // Geolocation button
    geoBtn.addEventListener("click", requestUserLocation);

    // Quick pills
    cityPills.forEach(pill => {
      pill.addEventListener("click", () => {
        activeLocation = {
          name: pill.dataset.city,
          country: pill.dataset.country,
          lat: parseFloat(pill.dataset.lat),
          lon: parseFloat(pill.dataset.lon)
        };
        cityInput.value = activeLocation.name;
        fetchWeatherData(activeLocation.lat, activeLocation.lon, activeLocation);
      });
    });

    // Unit toggle buttons
    unitCBtn.addEventListener("click", () => {
      if (currentUnit !== "C") {
        currentUnit = "C";
        unitCBtn.classList.add("active");
        unitFBtn.classList.remove("active");
        if (currentData) renderWeather(currentData);
      }
    });

    unitFBtn.addEventListener("click", () => {
      if (currentUnit !== "F") {
        currentUnit = "F";
        unitFBtn.classList.add("active");
        unitCBtn.classList.remove("active");
        if (currentData) renderWeather(currentData);
      }
    });

    // Retry button
    retryBtn.addEventListener("click", () => {
      fetchWeatherData(activeLocation.lat, activeLocation.lon, activeLocation);
    });

    // Initial load with default city
    fetchWeatherData(DEFAULT_CITY.lat, DEFAULT_CITY.lon, DEFAULT_CITY);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
