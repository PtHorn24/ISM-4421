/* Owl Weather: FAU-themed weather app powered by Open-Meteo (no API key needed). */
(function () {
  "use strict";

  const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
  const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

  const FAU_BOCA = {
    name: "FAU Boca Raton",
    region: "Boca Raton, Florida",
    latitude: 26.3727,
    longitude: -80.1019,
  };

  const STORAGE_KEYS = { unit: "owlweather.unit", place: "owlweather.place" };

  // WMO weather interpretation codes: https://open-meteo.com/en/docs
  const WEATHER_CODES = {
    0: ["Clear sky", "☀️", "🌙"],
    1: ["Mainly clear", "🌤️", "🌙"],
    2: ["Partly cloudy", "⛅", "☁️"],
    3: ["Overcast", "☁️", "☁️"],
    45: ["Fog", "🌫️"],
    48: ["Depositing rime fog", "🌫️"],
    51: ["Light drizzle", "🌦️", "🌧️"],
    53: ["Drizzle", "🌦️", "🌧️"],
    55: ["Dense drizzle", "🌧️"],
    56: ["Light freezing drizzle", "🌧️"],
    57: ["Freezing drizzle", "🌧️"],
    61: ["Light rain", "🌦️", "🌧️"],
    63: ["Rain", "🌧️"],
    65: ["Heavy rain", "🌧️"],
    66: ["Light freezing rain", "🌧️"],
    67: ["Freezing rain", "🌧️"],
    71: ["Light snow", "🌨️"],
    73: ["Snow", "🌨️"],
    75: ["Heavy snow", "❄️"],
    77: ["Snow grains", "🌨️"],
    80: ["Light showers", "🌦️", "🌧️"],
    81: ["Showers", "🌧️"],
    82: ["Violent showers", "⛈️"],
    85: ["Light snow showers", "🌨️"],
    86: ["Snow showers", "🌨️"],
    95: ["Thunderstorm", "⛈️"],
    96: ["Thunderstorm with hail", "⛈️"],
    99: ["Severe thunderstorm with hail", "⛈️"],
  };

  const $ = (id) => document.getElementById(id);

  const state = {
    unit: load(STORAGE_KEYS.unit) === "celsius" ? "celsius" : "fahrenheit",
    place: loadPlace() || FAU_BOCA,
    requestId: 0,
  };

  // ---------- storage (best effort; may be unavailable in private mode) ----------
  function load(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (_) { /* ignore */ }
  }
  function loadPlace() {
    try {
      const p = JSON.parse(load(STORAGE_KEYS.place));
      if (p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && p.name) return p;
    } catch (_) { /* ignore */ }
    return null;
  }

  // ---------- helpers ----------
  function describe(code, isDay) {
    const entry = WEATHER_CODES[code] || ["Unknown", "🌡️"];
    const icon = isDay === 0 && entry[2] ? entry[2] : entry[1];
    return { text: entry[0], icon };
  }

  function unitSymbol() { return state.unit === "celsius" ? "°C" : "°F"; }
  function windUnit() { return state.unit === "celsius" ? "km/h" : "mph"; }
  function deg(v) { return Number.isFinite(v) ? Math.round(v) + "°" : "--"; }

  function compass(degrees) {
    if (!Number.isFinite(degrees)) return "";
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(degrees / 45) % 8];
  }

  // Open-Meteo returns local times like "2026-09-28T14:00" (with timezone=auto).
  // Parse the string directly so the display matches the location, not the viewer's clock.
  function formatClock(iso) {
    if (!iso) return "--";
    const [h, m] = iso.slice(11, 16).split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
  }

  function formatDay(isoDate, index) {
    if (index === 0) return "Today";
    const [y, mo, d] = isoDate.split("-").map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString("en-US", { weekday: "short" });
  }

  function setStatus(message, isError) {
    const el = $("status");
    el.textContent = message || "";
    el.classList.toggle("error", Boolean(isError));
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) {
      let reason = "";
      try { reason = (await res.json()).reason || ""; } catch (_) { /* ignore */ }
      throw new Error(`Request failed (${res.status})${reason ? ": " + reason : ""}`);
    }
    return res.json();
  }

  // ---------- data ----------
  function forecastUrl(place) {
    const params = new URLSearchParams({
      latitude: place.latitude,
      longitude: place.longitude,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m",
      hourly: "temperature_2m,precipitation_probability,weather_code,is_day",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max",
      temperature_unit: state.unit,
      wind_speed_unit: state.unit === "celsius" ? "kmh" : "mph",
      timezone: "auto",
      forecast_days: "7",
    });
    return `${FORECAST_URL}?${params}`;
  }

  async function loadWeather(place) {
    const requestId = ++state.requestId;
    state.place = place;
    save(STORAGE_KEYS.place, JSON.stringify(place));
    setStatus(`Loading weather for ${place.name}…`);
    try {
      const data = await getJSON(forecastUrl(place));
      if (requestId !== state.requestId) return; // a newer request superseded this one
      render(place, data);
      setStatus("");
    } catch (err) {
      if (requestId !== state.requestId) return;
      console.error(err);
      setStatus(`Couldn't load the weather. ${err.message}. Check your connection and try again.`, true);
    }
  }

  // ---------- rendering ----------
  function render(place, data) {
    const c = data.current;
    const d = data.daily;
    const cur = describe(c.weather_code, c.is_day);

    $("place-name").textContent = place.name;
    $("updated").textContent = `${place.region ? place.region + " · " : ""}Updated ${formatClock(c.time)} local time`;
    $("current-icon").textContent = cur.icon;
    $("current-temp").textContent = deg(c.temperature_2m) + unitSymbol().slice(1);
    $("current-desc").textContent = cur.text;

    $("stat-feels").textContent = deg(c.apparent_temperature);
    $("stat-hilo").textContent = `${deg(d.temperature_2m_max[0])} / ${deg(d.temperature_2m_min[0])}`;
    $("stat-humidity").textContent = Number.isFinite(c.relative_humidity_2m) ? `${c.relative_humidity_2m}%` : "--";
    $("stat-wind").textContent = `${Math.round(c.wind_speed_10m)} ${windUnit()} ${compass(c.wind_direction_10m)}`.trim();
    $("stat-precip").textContent = d.precipitation_probability_max[0] != null ? `${d.precipitation_probability_max[0]}%` : "--";
    $("stat-uv").textContent = d.uv_index_max[0] != null ? String(Math.round(d.uv_index_max[0])) : "--";
    $("stat-sunrise").textContent = formatClock(d.sunrise[0]);
    $("stat-sunset").textContent = formatClock(d.sunset[0]);

    renderHourly(data);
    renderDaily(d);

    $("current").hidden = false;
    $("hourly-section").hidden = false;
    $("daily-section").hidden = false;
    document.title = `${deg(c.temperature_2m)} ${place.name} | Owl Weather`;
  }

  function renderHourly(data) {
    const h = data.hourly;
    const hourKey = data.current.time.slice(0, 13);
    let start = h.time.findIndex((t) => t.slice(0, 13) === hourKey);
    if (start < 0) start = 0;

    const list = $("hourly");
    list.replaceChildren();
    for (let i = start; i < Math.min(start + 24, h.time.length); i++) {
      const wx = describe(h.weather_code[i], h.is_day[i]);
      const li = el("li", i === start ? "now" : "");
      li.title = wx.text;
      li.append(
        el("div", "h-time", i === start ? "Now" : formatClock(h.time[i])),
        el("div", "wx-icon", wx.icon),
        el("div", "h-temp", deg(h.temperature_2m[i])),
        el("div", "h-pop", h.precipitation_probability[i] ? `💧${h.precipitation_probability[i]}%` : " ")
      );
      list.append(li);
    }
  }

  function renderDaily(d) {
    const lows = d.temperature_2m_min;
    const highs = d.temperature_2m_max;
    const weekMin = Math.min(...lows);
    const weekMax = Math.max(...highs);
    const span = weekMax - weekMin || 1;

    const list = $("daily");
    list.replaceChildren();
    d.time.forEach((day, i) => {
      const wx = describe(d.weather_code[i], 1);
      const li = el("li");

      const range = el("div", "d-range");
      const bar = el("div", "d-bar");
      const fill = el("span");
      fill.style.left = `${((lows[i] - weekMin) / span) * 100}%`;
      fill.style.right = `${((weekMax - highs[i]) / span) * 100}%`;
      bar.append(fill);
      range.append(el("span", "lo", deg(lows[i])), bar, el("span", "hi", deg(highs[i])));

      const icon = el("div", "wx-icon", wx.icon);
      icon.title = wx.text;

      const pop = d.precipitation_probability_max[i];
      li.append(
        el("div", "d-day", formatDay(day, i)),
        icon,
        el("div", "d-desc", wx.text),
        el("div", "d-pop", pop ? `💧${pop}%` : ""),
        range
      );
      list.append(li);
    });
  }

  // ---------- search ----------
  async function searchCities(query) {
    const [name, ...rest] = query.split(",").map((s) => s.trim());
    const qualifier = rest.join(" ").toLowerCase();
    const params = new URLSearchParams({ name, count: "10", language: "en", format: "json" });
    const data = await getJSON(`${GEOCODE_URL}?${params}`);
    let results = data.results || [];
    if (qualifier) {
      const filtered = results.filter((r) =>
        [r.admin1, r.country, r.country_code].some((v) => v && v.toLowerCase().includes(qualifier))
      );
      if (filtered.length) results = filtered;
    }
    return results.slice(0, 6);
  }

  function showResults(results) {
    const list = $("search-results");
    list.replaceChildren();
    if (!results.length) {
      list.hidden = true;
      return;
    }
    results.forEach((r) => {
      const region = [r.admin1, r.country].filter(Boolean).join(", ");
      const li = el("li");
      li.setAttribute("role", "option");
      li.tabIndex = 0;
      li.append(el("div", "", r.name), el("div", "muted", region));
      const choose = () => {
        hideResults();
        $("search-input").value = "";
        loadWeather({ name: r.name, region, latitude: r.latitude, longitude: r.longitude });
      };
      li.addEventListener("click", choose);
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(); }
      });
      list.append(li);
    });
    list.hidden = false;
  }

  function hideResults() {
    $("search-results").hidden = true;
  }

  async function onSearch(e) {
    e.preventDefault();
    const query = $("search-input").value.trim();
    if (query.length < 2) {
      setStatus("Type at least 2 letters of a city name.", true);
      return;
    }
    setStatus(`Searching for "${query}"…`);
    try {
      const results = await searchCities(query);
      if (!results.length) {
        hideResults();
        setStatus(`No places found for "${query}". Try just the city name.`, true);
        return;
      }
      setStatus("");
      if (results.length === 1) {
        const r = results[0];
        $("search-input").value = "";
        loadWeather({ name: r.name, region: [r.admin1, r.country].filter(Boolean).join(", "), latitude: r.latitude, longitude: r.longitude });
      } else {
        showResults(results);
        $("search-results").querySelector("li").focus();
      }
    } catch (err) {
      console.error(err);
      setStatus(`Search failed. ${err.message}.`, true);
    }
  }

  // ---------- geolocation ----------
  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setStatus("Your browser doesn't support location access.", true);
      return;
    }
    setStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        loadWeather({
          name: "Your location",
          region: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
          latitude,
          longitude,
        });
      },
      (err) => {
        const msg = err.code === err.PERMISSION_DENIED
          ? "Location permission was denied. Search for a city instead."
          : "Couldn't get your location. Search for a city instead.";
        setStatus(msg, true);
      },
      { timeout: 10000, maximumAge: 600000 }
    );
  }

  // ---------- units ----------
  function setUnit(unit) {
    state.unit = unit;
    save(STORAGE_KEYS.unit, unit);
    document.querySelectorAll(".unit-toggle button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.unit === unit));
    });
  }

  // ---------- logo ----------
  // The official FAU logo is served from Wikimedia Commons; fall back to a local wordmark if it can't load.
  function setupLogoFallback() {
    const logo = document.querySelector(".brand-logo");
    if (!logo) return;
    const fallback = () => {
      if (!logo.src.endsWith("assets/fau-wordmark.svg")) logo.src = "assets/fau-wordmark.svg";
    };
    logo.addEventListener("error", fallback, { once: true });
    if (logo.complete && logo.naturalWidth === 0) fallback();
  }

  // ---------- init ----------
  function init() {
    setupLogoFallback();
    setUnit(state.unit);

    $("search-form").addEventListener("submit", onSearch);
    $("btn-fau").addEventListener("click", () => { hideResults(); loadWeather(FAU_BOCA); });
    $("btn-geo").addEventListener("click", () => { hideResults(); useMyLocation(); });

    document.querySelectorAll(".unit-toggle button").forEach((b) => {
      b.addEventListener("click", () => {
        if (b.dataset.unit === state.unit) return;
        setUnit(b.dataset.unit);
        loadWeather(state.place);
      });
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-bar")) hideResults();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideResults();
    });

    loadWeather(state.place);
  }

  init();
})();
