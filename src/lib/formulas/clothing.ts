/**
 * Clothing recommendation logic for RunCast
 * Provides temperature-based clothing suggestions with weather modifiers
 */

export interface ClothingRec {
  bottom: string;
  top: string;
  accessories: string[];
}

export interface ClothingModifiers {
  windMph: number;
  precipitating: boolean;
  coldAndPrecip: boolean; // precip + temp < 35
  highUV: boolean; // UV > 6
}

/**
 * Applies the classic "dress 15-20 degrees warmer" rule for runners
 * Runner metabolic heat warms them up, so apparent temperature should be adjusted
 * @param apparentTempF - The actual apparent/feels-like temperature in Fahrenheit
 * @returns The adjusted temperature for clothing recommendation purposes
 */
export function getRunnerFeelsLike(apparentTempF: number): number {
  return apparentTempF + 15;
}

/**
 * Gets clothing recommendations based on feels-like temperature and weather conditions
 * The feels-like temperature should already account for the runner heat offset (+15°F)
 * @param feelsLikeF - The adjusted feels-like temperature (already includes +15°F runner offset)
 * @param modifiers - Weather modifiers that influence accessory recommendations
 * @returns Clothing recommendation with bottom, top, and accessories
 */
export function getClothingRec(
  feelsLikeF: number,
  modifiers: ClothingModifiers
): ClothingRec {
  // Get base recommendations based on temperature tier
  const baseRec = getBaseRecommendation(feelsLikeF);

  // Apply modifiers to accessories
  const accessories = applyModifiers(baseRec.accessories, modifiers);

  return {
    bottom: baseRec.bottom,
    top: baseRec.top,
    accessories,
  };
}

/**
 * Gets base clothing recommendation for a given feels-like temperature
 * @param feelsLikeF - The feels-like temperature in Fahrenheit
 * @returns Base clothing recommendation without modifier-based accessories
 */
function getBaseRecommendation(feelsLikeF: number): ClothingRec {
  if (feelsLikeF > 75) {
    return {
      bottom: "Short shorts",
      top: "Singlet/sports bra",
      accessories: ["Sunglasses", "Sunscreen", "Hat for sun"],
    };
  }

  if (feelsLikeF >= 65) {
    return {
      bottom: "Shorts",
      top: "T-shirt or singlet",
      accessories: ["Sunglasses"],
    };
  }

  if (feelsLikeF >= 55) {
    return {
      bottom: "Shorts",
      top: "T-shirt or light long sleeve",
      accessories: ["Optional arm sleeves"],
    };
  }

  if (feelsLikeF >= 45) {
    return {
      bottom: "Shorts or capris",
      top: "Long sleeve tech",
      accessories: ["Light gloves (optional)", "Headband"],
    };
  }

  if (feelsLikeF >= 35) {
    return {
      bottom: "Tights or pants",
      top: "Long sleeve + light jacket/vest",
      accessories: ["Gloves", "Headband or light hat"],
    };
  }

  if (feelsLikeF >= 25) {
    return {
      bottom: "Tights",
      top: "Base layer + midweight jacket",
      accessories: ["Warm gloves", "Beanie", "Buff/neck gaiter"],
    };
  }

  if (feelsLikeF >= 15) {
    return {
      bottom: "Insulated tights",
      top: "Base layer + heavy jacket",
      accessories: ["Heavy gloves", "Balaclava", "Buff"],
    };
  }

  // feelsLikeF < 15
  return {
    bottom: "Insulated tights + wind pants",
    top: "Base + mid + wind shell",
    accessories: [
      "Full coverage — minimize exposed skin",
      "Heavy gloves",
      "Balaclava",
      "Face mask/neck protection",
    ],
  };
}

/**
 * Applies weather modifiers to the accessory list
 * @param baseAccessories - The base accessories from temperature tier
 * @param modifiers - Weather conditions that affect accessory needs
 * @returns Updated accessory list with modifier-based additions
 */
function applyModifiers(
  baseAccessories: string[],
  modifiers: ClothingModifiers
): string[] {
  // Start with a deduped set of base accessories
  const accessories = new Set(baseAccessories);

  // Wind > 15mph: add wind-resistant outer layer
  if (modifiers.windMph > 15) {
    accessories.add("Wind-resistant outer layer");
  }

  // Precipitating: add water-resistant layer
  if (modifiers.precipitating) {
    accessories.add("Water-resistant layer");
  }

  // Cold and precip: add waterproof gloves and water-shedding hat
  if (modifiers.coldAndPrecip) {
    accessories.add("Waterproof gloves");
    accessories.add("Water-shedding hat");
  }

  // High UV: add sun protection (deduplicated if already present)
  if (modifiers.highUV) {
    accessories.add("Hat");
    accessories.add("Sunglasses");
    accessories.add("Sunscreen");
  }

  return Array.from(accessories);
}
