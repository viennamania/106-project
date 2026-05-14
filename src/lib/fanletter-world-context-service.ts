import "server-only";

import type {
  CreatorCharacterPersona,
  CreatorCharacterWorldLocation,
} from "@/lib/content";
import {
  normalizeCreatorCharacterWorldLocation,
} from "@/lib/fanletter-realism-policy";

const DEFAULT_TIMEOUT_MS = 4_000;
const SEOUL_WORLD_LOCATION: CreatorCharacterWorldLocation = {
  countryCode: "KR",
  label: "Seoul, South Korea",
  latitude: 37.5665,
  longitude: 126.978,
  timezone: "Asia/Seoul",
};

type OpenMeteoForecastResponse = {
  current?: {
    apparent_temperature?: number;
    cloud_cover?: number;
    is_day?: number;
    precipitation?: number;
    rain?: number;
    showers?: number;
    snowfall?: number;
    temperature_2m?: number;
    time?: string;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  timezone?: string;
};

type NagerHoliday = {
  date?: string;
  localName?: string;
  name?: string;
};

type LocalDateParts = {
  day: string;
  hour: number;
  isoDate: string;
  month: number;
  year: number;
};

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value?.trim());

  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCountryCode(value: string | undefined, fallback: string) {
  const normalized = value?.trim().toUpperCase().replace(/[^A-Z]/g, "") ?? "";

  return normalized.length === 2 ? normalized : fallback;
}

function getConfiguredWorldLocation(): CreatorCharacterWorldLocation {
  return {
    countryCode: normalizeCountryCode(
      process.env.FANLETTER_WORLD_CONTEXT_COUNTRY_CODE,
      SEOUL_WORLD_LOCATION.countryCode,
    ),
    label:
      process.env.FANLETTER_WORLD_CONTEXT_LABEL?.trim().slice(0, 120) ||
      SEOUL_WORLD_LOCATION.label,
    latitude: parseNumber(
      process.env.FANLETTER_WORLD_CONTEXT_LATITUDE,
      SEOUL_WORLD_LOCATION.latitude,
    ),
    longitude: parseNumber(
      process.env.FANLETTER_WORLD_CONTEXT_LONGITUDE,
      SEOUL_WORLD_LOCATION.longitude,
    ),
    timezone:
      process.env.FANLETTER_WORLD_CONTEXT_TIMEZONE?.trim().slice(0, 80) ||
      SEOUL_WORLD_LOCATION.timezone,
  };
}

function resolveWorldLocation(
  persona: CreatorCharacterPersona | null | undefined,
) {
  return (
    normalizeCreatorCharacterWorldLocation(
      persona?.realismProfile?.worldLocation,
    ) ?? normalizeCreatorCharacterWorldLocation(getConfiguredWorldLocation()) ??
    SEOUL_WORLD_LOCATION
  );
}

function getFetchTimeoutMs() {
  const parsed = Number.parseInt(
    process.env.FANLETTER_WORLD_CONTEXT_TIMEOUT_MS?.trim() ?? "",
    10,
  );

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

async function fetchJsonWithTimeout<T>(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getFetchTimeoutMs());

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`World context request failed with ${response.status}.`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getLocalDateParts(timezone: string, now = new Date()): LocalDateParts {
  let parts: Record<string, string>;

  try {
    parts = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    })
      .formatToParts(now)
      .reduce<Record<string, string>>((accumulator, part) => {
        accumulator[part.type] = part.value;
        return accumulator;
      }, {});
  } catch {
    return getLocalDateParts(SEOUL_WORLD_LOCATION.timezone, now);
  }

  const year = Number(parts.year);
  const month = Number(parts.month);
  const hour = Number(parts.hour === "24" ? "0" : parts.hour);
  const day = parts.day ?? "01";
  const normalizedMonth = Number.isFinite(month) ? month : 1;
  const normalizedYear = Number.isFinite(year) ? year : now.getUTCFullYear();

  return {
    day,
    hour: Number.isFinite(hour) ? hour : 12,
    isoDate: `${normalizedYear}-${String(normalizedMonth).padStart(2, "0")}-${day}`,
    month: normalizedMonth,
    year: normalizedYear,
  };
}

function getDayPeriod(hour: number) {
  if (hour >= 5 && hour < 11) {
    return "morning";
  }

  if (hour >= 11 && hour < 17) {
    return "afternoon";
  }

  if (hour >= 17 && hour < 21) {
    return "evening";
  }

  return "night";
}

function getSeason(month: number, latitude: number) {
  const northernSeason =
    month >= 3 && month <= 5
      ? "spring"
      : month >= 6 && month <= 8
        ? "summer"
        : month >= 9 && month <= 11
          ? "autumn"
          : "winter";

  if (latitude >= 0) {
    return northernSeason;
  }

  return northernSeason === "spring"
    ? "autumn"
    : northernSeason === "summer"
      ? "winter"
      : northernSeason === "autumn"
        ? "spring"
        : "summer";
}

function getWeatherDescription(weatherCode: number | undefined) {
  if (weatherCode === 0) {
    return "clear sky";
  }

  if (weatherCode === 1 || weatherCode === 2) {
    return "mostly clear";
  }

  if (weatherCode === 3) {
    return "overcast";
  }

  if (weatherCode === 45 || weatherCode === 48) {
    return "foggy";
  }

  if (weatherCode && weatherCode >= 51 && weatherCode <= 67) {
    return "rainy";
  }

  if (weatherCode && weatherCode >= 71 && weatherCode <= 77) {
    return "snowy";
  }

  if (weatherCode && weatherCode >= 80 && weatherCode <= 82) {
    return "showery";
  }

  if (weatherCode && weatherCode >= 95) {
    return "stormy";
  }

  return "ordinary weather";
}

function formatNumber(value: number | undefined, suffix: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return `${Math.round(value)}${suffix}`;
}

function formatWeatherPrompt(weather: OpenMeteoForecastResponse | null) {
  const current = weather?.current;

  if (!current) {
    return "Weather API unavailable; use the configured city, season, and daypart as soft context.";
  }

  const details = [
    getWeatherDescription(current.weather_code),
    formatNumber(current.temperature_2m, "C"),
    formatNumber(current.apparent_temperature, "C apparent"),
    formatNumber(current.precipitation, "mm precipitation"),
    formatNumber(current.cloud_cover, "% cloud cover"),
    formatNumber(current.wind_speed_10m, " km/h wind"),
    current.is_day === 0 ? "nighttime" : current.is_day === 1 ? "daylight" : null,
  ].filter(Boolean);

  return details.join(", ");
}

async function getWeatherContext(location: CreatorCharacterWorldLocation) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "apparent_temperature",
      "precipitation",
      "rain",
      "showers",
      "snowfall",
      "weather_code",
      "cloud_cover",
      "wind_speed_10m",
      "is_day",
    ].join(","),
  );
  url.searchParams.set("timezone", "auto");

  return fetchJsonWithTimeout<OpenMeteoForecastResponse>(url.toString()).catch(
    () => null,
  );
}

async function getHolidayContext(
  location: CreatorCharacterWorldLocation,
  localDate: LocalDateParts,
) {
  const countryCode = normalizeCountryCode(location.countryCode, "");

  if (!countryCode) {
    return [];
  }

  const url = `https://date.nager.at/api/v3/PublicHolidays/${localDate.year}/${countryCode}`;
  const holidays = await fetchJsonWithTimeout<NagerHoliday[]>(url).catch(
    () => [],
  );

  return holidays
    .filter((holiday) => holiday.date === localDate.isoDate)
    .map((holiday) => holiday.localName || holiday.name)
    .filter((name): name is string => Boolean(name?.trim()))
    .slice(0, 3);
}

export async function createFanletterWorldContextPrompt(
  persona: CreatorCharacterPersona | null | undefined,
) {
  if (process.env.FANLETTER_WORLD_CONTEXT_ENABLED?.trim() === "false") {
    return null;
  }

  const location = resolveWorldLocation(persona);
  const localDate = getLocalDateParts(location.timezone);
  const [weather, holidays] = await Promise.all([
    getWeatherContext(location),
    getHolidayContext(location, localDate),
  ]);
  const weatherTimezone = weather?.timezone?.trim() || location.timezone;
  const effectiveDate = getLocalDateParts(weatherTimezone);
  const holidayText =
    holidays.length > 0
      ? `Public holiday context today: ${holidays.join(", ")}.`
      : "Public holiday context today: none detected.";

  return [
    "World context snapshot: Use this only as city-level fictional grounding, not as proof of exact real-time whereabouts.",
    `Character base city: ${location.label}; country ${location.countryCode}; timezone ${weatherTimezone}.`,
    `Local context: ${effectiveDate.isoDate}, ${getDayPeriod(
      effectiveDate.hour,
    )}, ${getSeason(effectiveDate.month, location.latitude)}.`,
    `Weather context: ${formatWeatherPrompt(weather)}.`,
    holidayText,
    "Scene adaptation rule: If the user request conflicts with weather, daylight, season, public-holiday mood, or ordinary local conditions, adapt it into a plausible public or fictionalized setting while preserving the user's safe intent.",
  ].join("\n");
}
