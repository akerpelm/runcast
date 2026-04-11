/**
 * Clothing recommendation logic for RunCast
 * Provides temperature-based clothing suggestions with weather modifiers
 */

export interface ClothingRec {
  bottom: string;
  bottomAlts: string[];
  top: string;
  topAlts: string[];
  accessories: string[];
}

export interface ClothingModifiers {
  windMph: number;
  precipitating: boolean;
  precipProbability: number; // 0–100
  coldAndPrecip: boolean; // precip + temp < 35
  uvIndex: number;
  visibilityMeters: number; // visibility in meters
}

/**
 * Applies the classic "dress 15-20 degrees warmer" rule for runners
 */
export function getRunnerFeelsLike(apparentTempF: number): number {
  return apparentTempF + 15;
}

/**
 * Gets clothing recommendations based on feels-like temperature and weather conditions
 */
export function getClothingRec(
  feelsLikeF: number,
  modifiers: ClothingModifiers
): ClothingRec {
  const baseRec = getBaseRecommendation(feelsLikeF);
  const accessories = applyModifiers(baseRec.accessories, modifiers);

  return {
    bottom: baseRec.bottom,
    bottomAlts: baseRec.bottomAlts,
    top: baseRec.top,
    topAlts: baseRec.topAlts,
    accessories,
  };
}

function getBaseRecommendation(feelsLikeF: number): ClothingRec {
  if (feelsLikeF > 75) {
    return {
      bottom: "Split shorts",
      bottomAlts: ["Racing shorts", "Lined shorts"],
      top: "Singlet or sports bra",
      topAlts: ["Crop top", "Mesh tank"],
      accessories: [],
    };
  }

  if (feelsLikeF >= 65) {
    return {
      bottom: "Shorts",
      bottomAlts: ["Half tights", "Lined shorts"],
      top: "T-shirt or singlet",
      topAlts: ["Sleeveless tee", "Tank top"],
      accessories: [],
    };
  }

  if (feelsLikeF >= 55) {
    return {
      bottom: "Shorts",
      bottomAlts: ["Half tights", "Capris"],
      top: "T-shirt or light long sleeve",
      topAlts: ["Thin hoodie", "Quarter-zip"],
      accessories: ["Arm sleeves (optional)"],
    };
  }

  if (feelsLikeF >= 45) {
    return {
      bottom: "Shorts or half tights",
      bottomAlts: ["Capris", "Joggers"],
      top: "Long-sleeve tech tee",
      topAlts: ["Lightweight half-zip", "Thin hoodie"],
      accessories: ["Lightweight gloves (optional)", "Headband"],
    };
  }

  if (feelsLikeF >= 35) {
    return {
      bottom: "Running tights",
      bottomAlts: ["Joggers", "Fleece-lined leggings"],
      top: "Long-sleeve base layer + half-zip",
      topAlts: ["Midweight hoodie", "Vest + long sleeve"],
      accessories: ["Gloves", "Headband or ear cover"],
    };
  }

  if (feelsLikeF >= 25) {
    return {
      bottom: "Running tights",
      bottomAlts: ["Fleece-lined tights", "Joggers + wind pants"],
      top: "Base layer + midweight jacket",
      topAlts: ["Fleece + wind shell"],
      accessories: ["Warm gloves", "Beanie", "Neck gaiter"],
    };
  }

  if (feelsLikeF >= 15) {
    return {
      bottom: "Insulated tights",
      bottomAlts: ["Fleece tights + wind pants"],
      top: "Thermal base layer + insulated jacket",
      topAlts: ["Down vest + fleece + base"],
      accessories: ["Insulated gloves", "Balaclava", "Neck gaiter"],
    };
  }

  // feelsLikeF < 15
  return {
    bottom: "Insulated tights + wind pants",
    bottomAlts: [],
    top: "Base + mid + wind shell",
    topAlts: [],
    accessories: [
      "Full coverage - minimize exposed skin",
      "Insulated gloves",
      "Balaclava",
      "Face coverage / balaclava",
    ],
  };
}

function applyModifiers(
  baseAccessories: string[],
  modifiers: ClothingModifiers
): string[] {
  const accessories = new Set(baseAccessories);

  if (modifiers.windMph > 15) {
    accessories.add("Wind-resistant layer");
  }

  if (modifiers.precipitating) {
    accessories.add("Water-resistant layer");
  } else if (modifiers.precipProbability >= 50) {
    accessories.add(`Light rain shell (${modifiers.precipProbability}% chance of rain)`);
  }

  if (modifiers.coldAndPrecip) {
    accessories.add("Waterproof gloves");
    accessories.add("Brimmed cap");
  }

  if (modifiers.uvIndex >= 3) {
    accessories.add("Sunglasses");
  }
  if (modifiers.uvIndex >= 6) {
    accessories.add("Lightweight cap");
    accessories.add("Sunscreen");
  }

  // Low visibility: high-vis gear for safety
  const visMiles = modifiers.visibilityMeters / 1609;
  if (visMiles < 1) {
    accessories.add("High-vis vest");
    accessories.add("Headlamp");
  } else if (visMiles < 3) {
    accessories.add("High-vis vest");
  }

  return Array.from(accessories);
}
