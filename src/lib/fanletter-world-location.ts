import type {
  CreatorCharacterPersona,
  CreatorCharacterWorldLocation,
} from "@/lib/content";
import { normalizeCreatorCharacterWorldLocation } from "@/lib/fanletter-realism-policy";

export const DEFAULT_FANLETTER_WORLD_LOCATION = {
  countryCode: "KR",
  label: "Seoul, South Korea",
  latitude: 37.5665,
  longitude: 126.978,
  timezone: "Asia/Seoul",
} satisfies CreatorCharacterWorldLocation;

export const FANLETTER_WORLD_LOCATION_PRESETS = [
  {
    key: "seoul",
    labelEn: "Seoul",
    labelKo: "서울",
    value: DEFAULT_FANLETTER_WORLD_LOCATION,
  },
  {
    key: "tokyo",
    labelEn: "Tokyo",
    labelKo: "도쿄",
    value: {
      countryCode: "JP",
      label: "Tokyo, Japan",
      latitude: 35.6762,
      longitude: 139.6503,
      timezone: "Asia/Tokyo",
    },
  },
  {
    key: "new-york",
    labelEn: "New York",
    labelKo: "뉴욕",
    value: {
      countryCode: "US",
      label: "New York, United States",
      latitude: 40.7128,
      longitude: -74.006,
      timezone: "America/New_York",
    },
  },
  {
    key: "london",
    labelEn: "London",
    labelKo: "런던",
    value: {
      countryCode: "GB",
      label: "London, United Kingdom",
      latitude: 51.5074,
      longitude: -0.1278,
      timezone: "Europe/London",
    },
  },
] satisfies Array<{
  key: string;
  labelEn: string;
  labelKo: string;
  value: CreatorCharacterWorldLocation;
}>;

export type FanletterWorldLocationPresetKey =
  (typeof FANLETTER_WORLD_LOCATION_PRESETS)[number]["key"];

export type FanletterWorldLocationSelection =
  | "current"
  | FanletterWorldLocationPresetKey;

export function getFanletterWorldLocationPreset(
  key: FanletterWorldLocationPresetKey,
) {
  return (
    FANLETTER_WORLD_LOCATION_PRESETS.find((preset) => preset.key === key) ??
    FANLETTER_WORLD_LOCATION_PRESETS[0]
  );
}

export function getCreatorCurrentWorldLocation(
  persona: CreatorCharacterPersona | null | undefined,
) {
  return normalizeCreatorCharacterWorldLocation(
    persona?.realismProfile?.worldLocation,
  );
}

export function resolveFanletterWorldLocationSelection({
  persona,
  selection,
}: {
  persona: CreatorCharacterPersona | null | undefined;
  selection: FanletterWorldLocationSelection;
}) {
  const currentLocation = getCreatorCurrentWorldLocation(persona);

  if (selection === "current") {
    return currentLocation ?? DEFAULT_FANLETTER_WORLD_LOCATION;
  }

  return getFanletterWorldLocationPreset(selection).value;
}
