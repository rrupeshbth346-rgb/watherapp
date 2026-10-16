
const $ = (id) => document.getElementById(id);

const form = $("searchForm");
const cityInput = $("cityInput");
const searchBtn = $("searchBtn");
const locationBtn = $("locationBtn");
const panel = $("weatherPanel");
const message = $("message");

const weatherTypes = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Foggy", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"],
  57: ["Heavy freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"],
  63: ["Moderate rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"],
  67: ["Heavy freezing rain", "🌧️"],
  71: ["Light snowfall", "🌨️"],
  73: ["Moderate snowfall", "🌨️"],
  75: ["Heavy snowfall", "❄️"],
  77: ["Snow grains", "❄️"],
  80: ["Rain showers", "🌦️"],
  81: ["Moderate showers", "🌧️"],
  82: ["Heavy showers", "⛈️"],
  85: ["Snow showers", "🌨️"],
  86: ["Heavy snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm with hail", "⛈️"],
  99: ["Severe thunderstorm with hail", "⛈️"]
};

function getWeather(code) {
  return weatherTypes[code] || ["Unknown conditions", "🌡️"];
}

function formatTemp(value) {
  return `${Math.round(value)}°C`;
}

function formatDate(dateString, options) {
  return new Date(dateString + "T12:00:00").toLocaleDateString(
    "en-IN",
    options
  );
}

async function getJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Weather service is unavailable. Try again.");
  }

  return response.json();
}

async function searchCity(city) {
  const url = new URL(
    "https://geocoding-api.open-meteo.com/v1/search"
  );

  url.search = new URLSearchParams({
    name: city,
    count: "10",
    language: "en",
    format: "json"
  });

  const data = await getJSON(url);

  if (!data.results || data.results.length === 0) {
    throw new Error("City not found. Please check the spelling.");
  }

  // Prefer an exact city-name match when available.
  const match = data.results.find(
    place => place.name.toLowerCase() === city.toLowerCase()
  ) || data.results[0];

  const placeName = [
    match.name,
    match.admin1,
    match.country
  ].filter((value, index, array) =>
    value && array.indexOf(value) === index
  ).join(", ");

  await loadWeather(
    match.latitude,
    match.longitude,
    placeName,
    match.timezone
  );
}

async function loadWeather(lat, lon, placeName, timezone) {
  message.textContent = "Fetching the latest weather...";
  panel.hidden = true;

  const url = new URL("https://api.open-meteo.com/v1/forecast");

  url.search = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "cloud_cover",
      "wind_speed_10m"
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min"
    ].join(","),
    forecast_days: "5",
    timezone: timezone || "auto",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh"
  });

  const data = await getJSON(url);

  if (!data.current || !data.daily) {
    throw new Error("Weather data is incomplete. Please try again.");
  }

  displayWeather(data, placeName);
}

function displayWeather(data, placeName) {
  const current = data.current;
  const daily = data.daily;
  const [condition, icon] = getWeather(current.weather_code);

  $("cityName").textContent = placeName;
  $("dateText").textContent = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC"
  }).format(new Date(current.time + ":00Z"));

  $("weatherIcon").textContent =
    current.is_day === 0 && current.weather_code === 0
      ? "🌙"
      : icon;

  $("temperature").textContent =
    Math.round(current.temperature_2m);

  $("condition").textContent = condition;
  $("feelsLike").textContent = formatTemp(current.apparent_temperature);
  $("feelsStat").textContent = formatTemp(current.apparent_temperature);
  $("humidity").textContent = `${current.relative_humidity_2m}%`;
  $("wind").textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  $("clouds").textContent = `${current.cloud_cover}%`;

  $("highTemp").textContent = formatTemp(daily.temperature_2m_max[0]);
  $("lowTemp").textContent = formatTemp(daily.temperature_2m_min[0]);

  $("daySummary").textContent =
    `${condition} in ${placeName}. The temperature is ` +
    `${formatTemp(current.temperature_2m)}, with ` +
    `${current.relative_humidity_2m}% humidity and winds at ` +
    `${Math.round(current.wind_speed_10m)} km/h.`;

  renderForecast(daily);

  $("updatedText").textContent =
    `Weather observation: ${current.time.replace("T", " ")} · ` +
    `Times shown in ${data.timezone || "local timezone"}`;

  panel.hidden = false;
  message.textContent = "";
}

function renderForecast(daily) {
  $("forecastList").innerHTML = daily.time.map((date, index) => {
    const [condition, icon] = getWeather(daily.weather_code[index]);

    const day = index === 0
      ? "Today"
      : formatDate(date, { weekday: "short" });

    return `
      <article class="forecast-day">
        <p class="day-name">${day}</p>
        <span class="day-icon">${icon}</span>
        <p class="day-condition">${condition}</p>
        <p class="day-temp">
          ${Math.round(daily.temperature_2m_max[index])}°
          <span class="day-low">
            ${Math.round(daily.temperature_2m_min[index])}°
          </span>
        </p>
      </article>
    `;
  }).join("");
}

async function runSearch(city) {
  const query = city.trim();

  if (!query) {
    message.textContent = "Please enter a city name.";
    return;
  }

  searchBtn.disabled = true;
  searchBtn.textContent = "Loading...";
  message.textContent = "";
  panel.hidden = true;

  try {
    await searchCity(query);
  } catch (error) {
    message.textContent =
      error.message || "Something went wrong. Please try again.";
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = "Search";
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  runSearch(cityInput.value);
});

locationBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    message.textContent = "Location is not supported by this browser.";
    return;
  }

  locationBtn.disabled = true;
  message.textContent = "Requesting your location...";

  navigator.geolocation.getCurrentPosition(
    async position => {
      try {
        await loadWeather(
          position.coords.latitude,
          position.coords.longitude,
          "Your current location",
          "auto"
        );
      } catch (error) {
        message.textContent =
          error.message || "Unable to load local weather.";
      } finally {
        locationBtn.disabled = false;
      }
    },
    error => {
      const errors = {
        1: "Location permission denied. Allow location access to continue.",
        2: "Your location is currently unavailable.",
        3: "Location request timed out. Please try again."
      };

      message.textContent = errors[error.code] || "Unable to get location.";
      locationBtn.disabled = false;
    },
    {
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 300000
    }
  );
});

// Show a default city when the app opens.
runSearch("Patna");
