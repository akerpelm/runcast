export interface WeatherData {
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather; // today's entry (backward compat)
  dailyAll: DailyWeather[]; // all days from API
}

export interface CurrentWeather {
  temperature: number; // °F
  humidity: number; // %
  windSpeed: number; // mph
  precipitation: number; // inches
  cloudCover: number; // 0-100
}

export interface HourlyWeather {
  time: string; // ISO datetime (local timezone from API)
  temperature: number;
  humidity: number;
  dewPoint: number;
  apparentTemperature: number;
  precipProbability: number;
  precipitation: number;
  rain: number;
  snowfall: number;
  cloudCover: number;
  windSpeed: number;
  windGusts: number;
  windDirection: number;
  uvIndex: number;
  visibility: number;
  weatherCode: number; // WMO weather interpretation code
}

export interface DailyWeather {
  date: string; // YYYY-MM-DD
  sunrise: string; // ISO datetime
  sunset: string;
  tempMax: number;
  tempMin: number;
  precipSum: number;
  windSpeedMax: number;
}

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

interface OpenMeteoCurrentResponse {
  temperature_2m: number;
  relative_humidity_2m: number;
  wind_speed_10m: number;
  precipitation: number;
  cloud_cover: number;
}

interface OpenMeteoHourlyResponse {
  time: string[];
  temperature_2m: number[];
  relative_humidity_2m: number[];
  dew_point_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  precipitation: number[];
  rain: number[];
  snowfall: number[];
  cloud_cover: number[];
  wind_speed_10m: number[];
  wind_gusts_10m: number[];
  wind_direction_10m: number[];
  uv_index: number[];
  visibility: number[];
  weather_code: number[];
}

interface OpenMeteoDailyResponse {
  time: string[];
  sunrise: string[];
  sunset: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  wind_speed_10m_max: number[];
}

interface OpenMeteoResponse {
  current: OpenMeteoCurrentResponse;
  hourly: OpenMeteoHourlyResponse;
  daily: OpenMeteoDailyResponse;
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "dew_point_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "rain",
      "snowfall",
      "cloud_cover",
      "wind_speed_10m",
      "wind_gusts_10m",
      "wind_direction_10m",
      "uv_index",
      "visibility",
      "weather_code",
    ].join(","),
    daily: [
      "sunrise",
      "sunset",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "wind_speed_10m_max",
    ].join(","),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "wind_speed_10m",
      "precipitation",
      "cloud_cover",
    ].join(","),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "auto",
    past_days: "1",
    forecast_days: "7",
  });

  const url = `${BASE_URL}?${params.toString()}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error(
      `Weather fetch failed: network error - ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Weather fetch failed: HTTP ${response.status} ${response.statusText}`
    );
  }

  let raw: OpenMeteoResponse;
  try {
    raw = (await response.json()) as OpenMeteoResponse;
  } catch {
    throw new Error("Weather fetch failed: response body is not valid JSON");
  }

  if (!raw.current || !raw.hourly || !raw.daily) {
    throw new Error(
      "Weather fetch failed: response is missing expected fields (current, hourly, daily)"
    );
  }

  // --- current ---
  const c = raw.current;
  const current: CurrentWeather = {
    temperature: c.temperature_2m,
    humidity: c.relative_humidity_2m,
    windSpeed: c.wind_speed_10m,
    precipitation: c.precipitation,
    cloudCover: c.cloud_cover,
  };

  // --- hourly ---
  const h = raw.hourly;
  if (!Array.isArray(h.time) || h.time.length === 0) {
    throw new Error("Weather fetch failed: hourly.time is missing or empty");
  }

  const hourly: HourlyWeather[] = h.time.map((time, i) => ({
    time,
    temperature: h.temperature_2m[i],
    humidity: h.relative_humidity_2m[i],
    dewPoint: h.dew_point_2m[i],
    apparentTemperature: h.apparent_temperature[i],
    precipProbability: h.precipitation_probability[i],
    precipitation: h.precipitation[i],
    rain: h.rain[i],
    snowfall: h.snowfall[i],
    cloudCover: h.cloud_cover[i],
    windSpeed: h.wind_speed_10m[i],
    windGusts: h.wind_gusts_10m[i],
    windDirection: h.wind_direction_10m[i],
    uvIndex: h.uv_index[i],
    visibility: h.visibility[i],
    weatherCode: h.weather_code[i],
  }));

  // --- daily (all days) ---
  const d = raw.daily;
  if (!Array.isArray(d.time) || d.time.length === 0) {
    throw new Error("Weather fetch failed: daily.time is missing or empty");
  }

  const dailyAll: DailyWeather[] = d.time.map((date, i) => ({
    date,
    sunrise: d.sunrise[i],
    sunset: d.sunset[i],
    tempMax: d.temperature_2m_max[i],
    tempMin: d.temperature_2m_min[i],
    precipSum: d.precipitation_sum[i],
    windSpeedMax: d.wind_speed_10m_max[i],
  }));

  // Today's entry for backward compat
  const todayDate = new Date().toISOString().slice(0, 10);
  let todayIndex = d.time.findIndex((t) => t === todayDate);
  if (todayIndex === -1) todayIndex = Math.max(0, dailyAll.length - 1);
  const daily = dailyAll[todayIndex];

  return { current, hourly, daily, dailyAll };
}
