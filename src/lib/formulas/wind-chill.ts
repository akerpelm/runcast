/**
 * Calculates wind chill temperature in Fahrenheit using the NWS formula.
 * Only applies when temp <= 50°F and wind > 3 mph, otherwise returns air temperature.
 */
export function windChillF(tempF: number, windMph: number): number {
  if (tempF > 50 || windMph <= 3) {
    return tempF;
  }

  const windPower = Math.pow(windMph, 0.16);
  return 35.74 + 0.6215 * tempF - 35.75 * windPower + 0.4275 * tempF * windPower;
}
