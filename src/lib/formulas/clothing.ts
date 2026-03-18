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
  uvIndex: number;
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
      bottom: "Split shorts",
      top: "Singlet or sports bra",
      accessories: [],
    };
  }

  if (feelsLikeF >= 65) {
    return {
      bottom: "Shorts",
      top: "T-shirt or singlet",
      accessories: [],
    };
  }

  if (feelsLikeF >= 55) {
    return {
      bottom: "Shorts",
      top: "T-shirt or light long sleeve",
      accessories: ["Arm sleeves (optional)"],
    };
  }

  if (feelsLikeF >= 45) {
    return {
      bottom: "Shorts or half tights",
      top: "Long-sleeve tech tee",
      accessories: ["Lightweight gloves (optional)", "Headband"],
    };
  }

  if (feelsLikeF >= 35) {
    return {
      bottom: "Running tights",
      top: "Long-sleeve base layer + half-zip or vest",
      accessories: ["Gloves", "Headband or ear cover"],
    };
  }

  if (feelsLikeF >= 25) {
    return {
      bottom: "Running tights",
      top: "Base layer + midweight jacket",
      accessories: ["Warm gloves", "Beanie", "Neck gaiter"],
    };
  }

  if (feelsLikeF >= 15) {
    return {
      bottom: "Insulated tights",
      top: "Thermal base layer + insulated jacket",
      accessories: ["Insulated gloves", "Balaclava", "Neck gaiter"],
    };
  }

  // feelsLikeF < 15
  return {
    bottom: "Insulated tights + wind pants",
    top: "Base + mid + wind shell",
    accessories: [
      "Full coverage - minimize exposed skin",
      "Insulated gloves",
      "Balaclava",
      "Face coverage / balaclava",
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
    accessories.add("Wind-resistant layer");
  }

  // Precipitating: add water-resistant layer
  if (modifiers.precipitating) {
    accessories.add("Water-resistant layer");
  }

  // Cold and precip: add waterproof gloves and brimmed cap
  if (modifiers.coldAndPrecip) {
    accessories.add("Waterproof gloves");
    accessories.add("Brimmed cap");
  }

  // UV-based sun protection — sunglasses at UV 3+, full sun kit at UV 6+
  if (modifiers.uvIndex >= 3) {
    accessories.add("Sunglasses");
  }
  if (modifiers.uvIndex >= 6) {
    accessories.add("Lightweight cap");
    accessories.add("Sunscreen");
  }

  return Array.from(accessories);
}
