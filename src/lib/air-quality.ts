export interface AirQualityData {
  currentAQI: number; // US AQI value
  pm25: number;
  pm10: number;
  category: AQICategory;
  runningGuidance: string;
}

export type AQICategory =
  | "Good"
  | "Moderate"
  | "Unhealthy for Sensitive Groups"
  | "Unhealthy"
  | "Very Unhealthy"
  | "Hazardous";

interface AQICategoryInfo {
  category: AQICategory;
  runningGuidance: string;
}

interface OpenMeteoAirQualityResponse {
  hourly: {
    time: string[];
    us_aqi: (number | null)[];
    pm10: (number | null)[];
    pm2_5: (number | null)[];
  };
  timezone: string;
}

/**
 * Determines the AQI category and running guidance for a given AQI value.
 * If AQI is null or undefined, defaults to "Good" with unavailability message.
 */
export function getAQICategory(aqi: number | null | undefined): AQICategoryInfo {
  if (aqi === null || aqi === undefined) {
    return {
      category: "Good",
      runningGuidance: "AQI data unavailable",
    };
  }

  if (aqi <= 50) {
    return {
      category: "Good",
      runningGuidance: "No restrictions",
    };
  } else if (aqi <= 100) {
    return {
      category: "Moderate",
      runningGuidance:
        "Sensitive individuals may notice — consider reducing intensity",
    };
  } else if (aqi <= 150) {
    return {
      category: "Unhealthy for Sensitive Groups",
      runningGuidance:
        "Reduce prolonged outdoor effort — consider indoors",
    };
  } else if (aqi <= 200) {
    return {
      category: "Unhealthy",
      runningGuidance: "Avoid outdoor running — go indoors",
    };
  } else if (aqi <= 300) {
    return {
      category: "Very Unhealthy",
      runningGuidance: "Do not exercise outdoors",
    };
  } else {
    return {
      category: "Hazardous",
      runningGuidance: "Do not exercise outdoors",
    };
  }
}

/**
 * Finds the current hour's index in the hourly data array.
 * Returns the index of the hour closest to the current time.
 */
function getCurrentHourIndex(times: string[]): number {
  const now = new Date();
  let closestIndex = 0;
  let minDiff = Infinity;

  for (let i = 0; i < times.length; i++) {
    const hourTime = new Date(times[i]);
    const diff = Math.abs(now.getTime() - hourTime.getTime());

    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }

  return closestIndex;
}

/**
 * Fetches air quality data for the given coordinates.
 * Queries the Open-Meteo air quality API and returns the current hour's data.
 */
export async function fetchAirQuality(
  lat: number,
  lng: number
): Promise<AirQualityData> {
  const url = new URL(
    "https://air-quality-api.open-meteo.com/v1/air-quality"
  );
  url.searchParams.append("latitude", lat.toString());
  url.searchParams.append("longitude", lng.toString());
  url.searchParams.append("hourly", "us_aqi,pm10,pm2_5");
  url.searchParams.append("timezone", "auto");

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(
      `Failed to fetch air quality data: ${response.status} ${response.statusText}`
    );
  }

  const data: OpenMeteoAirQualityResponse = await response.json();

  const currentHourIndex = getCurrentHourIndex(data.hourly.time);

  const currentAQI = data.hourly.us_aqi[currentHourIndex] ?? null;
  const pm25 = data.hourly.pm2_5[currentHourIndex] ?? 0;
  const pm10 = data.hourly.pm10[currentHourIndex] ?? 0;

  const { category, runningGuidance } = getAQICategory(currentAQI);

  return {
    currentAQI: currentAQI ?? 0,
    pm25,
    pm10,
    category,
    runningGuidance,
  };
}
