export type GeoSource = "saved" | "browser" | "ip" | "default";

export interface GeoLocation {
  latitude: number;
  longitude: number;
  name: string; // city/neighborhood name for display
  source: GeoSource;
}

export interface SearchResult {
  name: string;
  country: string;
  admin1: string;
  latitude: number;
  longitude: number;
}

const BROOKLYN_DEFAULT: GeoLocation = {
  latitude: 40.69,
  longitude: -73.99,
  name: "Brooklyn, NY",
  source: "default",
};

const LS_LOCATION = "runcast-location";

export function saveLocation(location: GeoLocation): void {
  localStorage.setItem(LS_LOCATION, JSON.stringify(location));
}

export function loadSavedLocation(): GeoLocation | null {
  try {
    const s = localStorage.getItem(LS_LOCATION);
    if (s) {
      const loc = JSON.parse(s) as GeoLocation;
      loc.source = "saved";
      return loc;
    }
  } catch { /* ignore */ }
  return null;
}

export function clearSavedLocation(): void {
  localStorage.removeItem(LS_LOCATION);
}

export async function searchLocations(query: string): Promise<SearchResult[]> {
  if (query.length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  if (!data.results) return [];
  return data.results.map((r: Record<string, unknown>) => ({
    name: r.name as string,
    country: (r.country as string) ?? "",
    admin1: (r.admin1 as string) ?? "",
    latitude: r.latitude as number,
    longitude: r.longitude as number,
  }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const response = await fetch(url);
    if (!response.ok) {
      return "Your Location";
    }
    const data = await response.json();
    const city: string = data.city ?? "";
    const subdivisionCode: string = data.principalSubdivisionCode ?? "";
    // principalSubdivisionCode is like "US-NY"; extract the state abbreviation after the dash
    const stateAbbrev = subdivisionCode.includes("-")
      ? subdivisionCode.split("-")[1]
      : subdivisionCode;
    if (city && stateAbbrev) {
      return `${city}, ${stateAbbrev}`;
    }
    if (city) {
      return city;
    }
    return "Your Location";
  } catch {
    return "Your Location";
  }
}

function getBrowserLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Geolocation timed out"));
    }, 10_000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        resolve(position);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

async function getLocationFromIP(): Promise<GeoLocation> {
  const response = await fetch("https://ipapi.co/json/");
  if (!response.ok) {
    throw new Error("IP geolocation request failed");
  }
  const data = await response.json();
  const latitude: number = data.latitude;
  const longitude: number = data.longitude;
  const city: string = data.city ?? "Your Location";
  return { latitude, longitude, name: city, source: "ip" };
}

export async function getUserLocation(): Promise<GeoLocation> {
  // Check for saved location first
  const saved = loadSavedLocation();
  if (saved) return saved;

  // Try browser Geolocation API first
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    try {
      const position = await getBrowserLocation();
      const { latitude, longitude } = position.coords;
      const name = await reverseGeocode(latitude, longitude);
      return { latitude, longitude, name, source: "browser" };
    } catch {
      // Fall through to IP-based geolocation
    }
  }

  // Fall back to IP-based geolocation
  try {
    return await getLocationFromIP();
  } catch {
    // Fall through to hardcoded default
  }

  // Final fallback: Brooklyn defaults
  return BROOKLYN_DEFAULT;
}
