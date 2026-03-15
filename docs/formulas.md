# RunReady — Formula & Logic Reference

*Every calculation, threshold, and decision tree the app needs to run.*

---

## 1. Pace Adjustment — Heat (Summer)

### Primary Method: Temp + Dew Point (Coach Hadley Method)

This is the most widely used and cited formula in the running community. Dew point is more useful than relative humidity because it directly measures how much moisture is in the air, regardless of temperature.

```
combined = air_temp_F + dew_point_F
```

| Combined Value | Pace Adjustment | What It Feels Like |
|---------------|----------------|---------------------|
| ≤ 100 | 0% | Ideal conditions |
| 101–110 | 0–0.5% | Barely noticeable |
| 111–120 | 0.5–1.0% | Slightly warm |
| 121–130 | 1.0–2.0% | Noticeably warm |
| 131–140 | 2.0–3.0% | Hot — back off |
| 141–150 | 3.0–4.5% | Very hot — adjust significantly |
| 151–160 | 4.5–6.0% | Brutal — slow way down |
| 161–170 | 6.0–8.0% | Dangerous — easy effort only |
| 171–180 | 8.0–10.0% | Extreme — consider indoors |
| > 180 | Hard running NOT recommended | Treadmill day |

**Example:** 85°F + 68°F dew point = 153 → 4.5–6% slower. An 8:00/mi easy pace becomes ~8:24–8:29/mi.

**Implementation:**
```javascript
function getHeatPaceAdjustment(tempF, dewPointF) {
  const combined = tempF + dewPointF;
  if (combined <= 100) return { min: 0, max: 0 };
  if (combined <= 110) return { min: 0, max: 0.5 };
  if (combined <= 120) return { min: 0.5, max: 1.0 };
  if (combined <= 130) return { min: 1.0, max: 2.0 };
  if (combined <= 140) return { min: 2.0, max: 3.0 };
  if (combined <= 150) return { min: 3.0, max: 4.5 };
  if (combined <= 160) return { min: 4.5, max: 6.0 };
  if (combined <= 170) return { min: 6.0, max: 8.0 };
  if (combined <= 180) return { min: 8.0, max: 10.0 };
  return { min: 10.0, max: null, warning: "Hard running not recommended" };
}
```

### Secondary Method: Simple Temperature-Based (brenoamelo/Runners Connect)

Useful as a simpler fallback or for display purposes:
```
+0.4% pace increase per degree F above 60°F
+0.2% pace increase per 1% humidity above 60%
```

**Example:** 80°F, 75% humidity → (80-60)×0.4 + (75-60)×0.2 = 8% + 3% = 11% slower

### Academic Method: Running Writings Heat-Adjusted Pace

Based on a statistical model fit to 3,891 marathon runners across 754 races (Mantzios et al., 2022 dataset). More accurate than the Hadley chart but requires more complex implementation. Uses temp + dew point or temp + relative humidity as inputs. The model was originally fit for marathon performance but is a reasonable estimate for any sustained effort.

**Note:** This model has limited reliability below freezing — the dataset has very few sub-32°F races.

### Which to use?

Use the **Hadley temp+dew point method** as primary. It's simple, well-understood, widely cited in the running community, and easy for users to verify. Show the range (e.g., "3–4.5% slower") and let the user's feedback loop calibrate over time.

---

## 2. Pace Adjustment — Cold (Winter)

Cold weather pace adjustment is less well-studied than heat. There's no equivalent of the Hadley chart for cold. Here's what we know:

### Key Facts
- **Optimal marathon temperature is ~40–45°F** (cited by exercise physiologists including Dr. Carda)
- Below 40°F, performance degrades due to: increased energy expenditure for thermoregulation, heavier clothing, restricted range of motion, increased carb burn rate, footing concerns
- Wind chill is the dominant factor in cold — a 35°F day with 20mph wind feels like 24°F
- Cold air is dry, increasing respiratory moisture loss

### Approach: Wind Chill as the Primary Cold Metric

**NWS Wind Chill Formula** (defined for temps ≤ 50°F and wind > 3 mph):
```
wind_chill_F = 35.74 + 0.6215 * T - 35.75 * (V ^ 0.16) + 0.4275 * T * (V ^ 0.16)

Where:
  T = air temperature (°F)
  V = wind speed (mph)
```

**Implementation:**
```javascript
function windChillF(tempF, windMph) {
  if (tempF > 50 || windMph <= 3) return tempF; // formula not defined
  return 35.74 + 0.6215 * tempF
    - 35.75 * Math.pow(windMph, 0.16)
    + 0.4275 * tempF * Math.pow(windMph, 0.16);
}
```

### Cold Pace Adjustment (Conservative Estimates)

Since there's no published standard, we build a reasonable tiered model based on wind chill:

| Wind Chill (°F) | Adjustment | Guidance |
|-----------------|-----------|----------|
| 40–50 | 0% | Near-ideal — no adjustment needed |
| 30–40 | 0–2% | Slight — extra layers add drag |
| 20–30 | 2–4% | Moderate — footing, clothing weight |
| 10–20 | 4–6% | Significant — limit hard efforts |
| 0–10 | 6–8% | Tough — easy/moderate effort only |
| Below 0 | 8%+ | Extreme — consider treadmill |

**Important:** These are estimates to be refined by the feedback loop. Cold pace adjustment is highly individual (body composition, acclimation, clothing quality). This is exactly where user feedback data becomes valuable — nobody has good data on this.

### Runner-Specific Wind Impact

A headwind of 10 mph can slow pace by ~8–15 seconds/mile (cited across multiple coaching sources). Tailwinds help less than headwinds hurt — roughly 50% recovery. For wind impact display:

```javascript
function windImpactSeconds(windMph, isHeadwind) {
  const basePenalty = windMph * 1.2; // ~12 sec/mi per 10mph headwind
  return isHeadwind ? basePenalty : -(basePenalty * 0.5);
}
```

---

## 3. Heat Safety Thresholds (Summer Red Flags)

### Heat Index (NWS) — For General Display

Heat Index is calculated from temperature and relative humidity. The full NWS formula is a regression equation:

```javascript
function heatIndexF(tempF, rh) {
  // NWS simplified formula (valid for T >= 80°F)
  if (tempF < 80) return tempF;

  let hi = -42.379
    + 2.04901523 * tempF
    + 10.14333127 * rh
    - 0.22475541 * tempF * rh
    - 0.00683783 * tempF * tempF
    - 0.05481717 * rh * rh
    + 0.00122874 * tempF * tempF * rh
    + 0.00085282 * tempF * rh * rh
    - 0.00000199 * tempF * tempF * rh * rh;

  // Adjustments for low/high humidity
  if (rh < 13 && tempF >= 80 && tempF <= 112) {
    hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(tempF - 95)) / 17);
  }
  if (rh > 85 && tempF >= 80 && tempF <= 87) {
    hi += ((rh - 85) / 10) * ((87 - tempF) / 5);
  }
  return hi;
}
```

### ACSM Running Safety Tiers (via WBGT)

The American College of Sports Medicine originally developed these guidelines for running events. Since we can't directly measure WBGT (it requires a black globe thermometer), we use the published approximation:

```
Estimated WBGT (°C) ≈ 0.45 × Adjusted_Temp(°F) - 16
Where Adjusted_Temp = 0.5 × (air_temp + dew_point) approximately
```

Or from Heat Index:
```
WBGT (°C) ≈ -0.0034 × HI² + 0.96 × HI - 34
(where HI is in °F)
```

**ACSM WBGT Tiers for Continuous Running:**

| WBGT (°F) | Risk Level | Guidance |
|-----------|-----------|----------|
| < 65 | Low | Normal running |
| 65–72 | Moderate | Increased monitoring |
| 73–82 | High | Reduce intensity, frequent water |
| 82–90 | Very High | Easy effort only, shade, hydrate aggressively |
| > 90 | Extreme | Cancel outdoor running |

### What RunReady Displays (Summer)

A simple traffic light combining Hadley pace adjustment + heat index:

- **Green**: Combined ≤ 130 AND heat index < 90°F → "Good conditions for any workout"
- **Yellow**: Combined 131–160 OR heat index 90–104°F → "Adjust pace, bring water, avoid peak sun"
- **Orange**: Combined 161–180 OR heat index 105–124°F → "Easy effort only — consider treadmill"
- **Red**: Combined > 180 OR heat index ≥ 125°F → "Hard running not recommended — go indoors"

---

## 4. Ice & Surface Condition Detection (Winter)

### The Core Problem

We can't directly measure sidewalk/road surface temperature. But we can infer ice risk from weather data using multiple signals.

### Ice Risk Decision Tree

```javascript
function iceRiskLevel(current, history) {
  // Inputs needed:
  //   current.tempF          - current air temperature
  //   current.dewPointF      - current dew point
  //   current.windMph        - wind speed
  //   current.cloudCover     - 0-100%
  //   current.precip         - current precipitation (mm)
  //   current.precipType     - rain/snow/sleet/freezing_rain
  //   history.precip24h      - precipitation in last 24h (mm)
  //   history.tempMin24h     - lowest temp in last 24h
  //   history.tempMax24h     - highest temp in last 24h
  //   history.precipHours    - hours since last precipitation

  let risk = "NONE"; // NONE, LOW, MODERATE, HIGH
  let reasons = [];

  // === SCENARIO 1: Active freezing precipitation ===
  if (current.precip > 0 && current.tempF <= 34) {
    if (current.precipType === "freezing_rain" || current.precipType === "sleet") {
      risk = "HIGH";
      reasons.push("Active freezing precipitation — extremely slippery surfaces");
    } else if (current.precipType === "snow") {
      risk = "MODERATE";
      reasons.push("Active snowfall — reduced traction, watch for hidden ice beneath");
    }
  }

  // === SCENARIO 2: Black ice — recent rain/melt + freeze ===
  // Most dangerous: temp was above 32 recently (wet surfaces), now dropping below
  if (history.tempMax24h > 34 && current.tempF <= 32) {
    if (history.precip24h > 0) {
      risk = Math.max(risk, "HIGH");
      reasons.push(
        "Recent precipitation when warmer + current freezing = high black ice risk, especially bridges and shaded areas"
      );
    } else if (history.tempMax24h > 40) {
      // Snowmelt scenario — warm enough to melt, now refreezing
      risk = upgradeRisk(risk, "MODERATE");
      reasons.push("Freeze/thaw cycle — melted snow or puddles likely refreezing");
    }
  }

  // === SCENARIO 3: Frost formation ===
  // Clear sky + light wind + temp dropping toward mid-30s + dew point near air temp
  if (current.tempF <= 38
      && current.tempF >= 28
      && current.cloudCover < 40
      && current.windMph < 10
      && (current.tempF - current.dewPointF) < 5) {
    risk = upgradeRisk(risk, "LOW");
    reasons.push("Frost likely on surfaces — sidewalks and bridges may be slippery");
  }

  // === SCENARIO 4: Fog + freezing ===
  // Fog forms when temp ≈ dew point; if both below 32, rapid severe icing
  if (current.tempF <= 33
      && Math.abs(current.tempF - current.dewPointF) <= 2
      && current.windMph < 8) {
    risk = upgradeRisk(risk, "HIGH");
    reasons.push("Freezing fog conditions — rapid ice formation possible on all surfaces");
  }

  // === SCENARIO 5: Bridge/overpass warning ===
  // Bridges freeze before roads because air circulates above AND below
  if (current.tempF <= 36 && current.tempF >= 30) {
    reasons.push("Bridges and overpasses may be icy even if roads are clear");
  }

  // === SCENARIO 6: Morning ice after clear cold night ===
  // Radiative cooling: clear skies at night → surfaces cool below air temp
  // Surface temp can be 5-10°F below air temp on clear, calm nights
  if (isEarlyMorning() && current.tempF <= 40 && current.cloudCover < 30) {
    risk = upgradeRisk(risk, "LOW");
    reasons.push(
      "Early morning after clear night — ground surfaces may be colder than air temp, watch for ice patches"
    );
  }

  return { risk, reasons };
}
```

### Key Insight for RunReady's UX

We are NOT trying to be a road weather system. We're giving runners a heads-up. The messaging should be:

- **NONE**: No surface warning displayed
- **LOW**: "Watch your footing — frost possible on bridges and shaded paths"
- **MODERATE**: "Icy patches likely — consider an easy run on well-traveled roads"
- **HIGH**: "Hazardous footing — strong ice risk. Good day for treadmill or very cautious easy run"

---

## 5. Best Running Window Algorithm

This is the "killer feature" — scan the hourly forecast and find the optimal window. Works for BOTH summer (find the coolest) and winter (find the warmest/calmest).

### Scoring Function

For each hour, compute a composite score. Lower = better.

```javascript
function hourlyRunScore(hour) {
  let score = 0;
  const tempF = hour.temperature;
  const dewPointF = hour.dewPoint;
  const windMph = hour.windSpeed;
  const precipProb = hour.precipProbability; // 0-100
  const cloudCover = hour.cloudCover;        // 0-100
  const uvIndex = hour.uvIndex;

  // === Temperature penalty (distance from ideal 45-55°F range) ===
  const idealLow = 45;
  const idealHigh = 55;
  if (tempF < idealLow) {
    score += (idealLow - tempF) * 1.5; // cold penalty
  } else if (tempF > idealHigh) {
    score += (tempF - idealHigh) * 2.0; // heat penalty (worse than cold)
  }

  // === Humidity/dew point penalty (summer-specific) ===
  if (tempF > 60) {
    const combined = tempF + dewPointF;
    if (combined > 100) {
      score += (combined - 100) * 0.5;
    }
  }

  // === Wind penalty ===
  if (windMph > 10) {
    score += (windMph - 10) * 1.0;
  }
  // Gusts compound the issue
  if (hour.windGust && hour.windGust > 25) {
    score += (hour.windGust - 25) * 0.5;
  }

  // === Precipitation penalty (heavily weighted — nobody wants to get soaked) ===
  score += precipProb * 0.8; // 0-80 points possible

  // === UV penalty (for midday summer runs) ===
  if (uvIndex > 6) {
    score += (uvIndex - 6) * 3;
  }

  // === Daylight bonus (prefer daylight hours) ===
  if (!isDaylight(hour.time)) {
    score += 15; // penalty for darkness
  }

  // === Ice risk penalty ===
  const iceRisk = getIceRiskForHour(hour);
  if (iceRisk === "HIGH") score += 40;
  if (iceRisk === "MODERATE") score += 20;
  if (iceRisk === "LOW") score += 5;

  return score;
}

function findBestWindow(hourlyForecast, runDurationMinutes = 60) {
  const hoursNeeded = Math.ceil(runDurationMinutes / 60);
  let bestStart = 0;
  let bestScore = Infinity;

  for (let i = 0; i <= hourlyForecast.length - hoursNeeded; i++) {
    let windowScore = 0;
    for (let j = 0; j < hoursNeeded; j++) {
      windowScore += hourlyRunScore(hourlyForecast[i + j]);
    }
    const avgScore = windowScore / hoursNeeded;
    if (avgScore < bestScore) {
      bestScore = avgScore;
      bestStart = i;
    }
  }
  return {
    startHour: hourlyForecast[bestStart].time,
    endHour: hourlyForecast[bestStart + hoursNeeded - 1].time,
    score: bestScore,
    conditions: summarizeWindow(hourlyForecast, bestStart, hoursNeeded)
  };
}
```

### Summer vs Winter Behavior

This scoring function naturally handles both seasons:

**Summer (Brooklyn, July):**
- 6 AM: 78°F, dew point 68, calm → score ~30 (best)
- 12 PM: 92°F, dew point 72, UV 9 → score ~95 (terrible)
- 8 PM: 85°F, dew point 70, no sun → score ~55 (ok but humid)
- **Output**: "Best window: 5–6 AM (78°F, light breeze, AQI good)"

**Winter (Brooklyn, January):**
- 6 AM: 18°F, wind 15mph, dark → score ~70 (cold + dark)
- 12 PM: 32°F, wind 8mph, sunny → score ~25 (best)
- 6 PM: 26°F, wind 12mph, dark → score ~55 (cold + dark)
- **Output**: "Best window: 12–1 PM (32°F, light wind, full daylight)"

---

## 6. Run Type Suggestion Logic

Based on conditions, suggest what *kind* of run to do:

```javascript
function suggestRunType(conditions) {
  const { tempF, dewPointF, windMph, windGust, precipProb, iceRisk } = conditions;
  const combined = tempF + dewPointF;
  const windChill = windChillF(tempF, windMph);

  // === Hard No's ===
  if (combined > 180) return {
    type: "TREADMILL",
    reason: "Dangerously hot and humid — take it indoors"
  };
  if (iceRisk === "HIGH") return {
    type: "TREADMILL_OR_EASY",
    reason: "High ice risk — treadmill or very cautious easy run on treated roads"
  };
  if (windChill < 0) return {
    type: "TREADMILL_OR_EASY",
    reason: "Extreme cold — treadmill or short easy run with full coverage"
  };
  if (precipProb > 80 && tempF < 35) return {
    type: "TREADMILL",
    reason: "Freezing precipitation expected — stay inside"
  };

  // === Degraded conditions (easy day) ===
  if (combined > 160) return {
    type: "EASY",
    reason: "Very hot — keep it easy, stay hydrated"
  };
  if (windGust > 30) return {
    type: "EASY",
    reason: "Strong gusts — not a day for speed work"
  };
  if (windChill < 15) return {
    type: "EASY",
    reason: "Very cold — keep effort moderate, shorten if needed"
  };
  if (iceRisk === "MODERATE") return {
    type: "EASY",
    reason: "Watch footing — easy pace on well-traveled routes"
  };
  if (precipProb > 60) return {
    type: "EASY",
    reason: "Rain likely — easy run, watch for slick surfaces"
  };

  // === Suboptimal but workable ===
  if (combined > 140 || windMph > 15 || windChill < 25) return {
    type: "MODERATE",
    reason: "Conditions are manageable but not ideal for hard efforts"
  };

  // === Good conditions ===
  if (combined <= 130 && windMph <= 12 && precipProb < 30
      && tempF >= 35 && tempF <= 65) {
    return {
      type: "ANY",
      reason: "Great conditions — tempo, intervals, long run, whatever's on the schedule"
    };
  }

  return {
    type: "MODERATE_TO_HARD",
    reason: "Decent conditions — listen to your body on harder efforts"
  };
}
```

---

## 7. Sunrise / Sunset + Run Duration Math

### Solar Calculation

Standard solar position algorithm (simplified for sunrise/sunset):
- Use the well-known NOAA solar calculator formulas
- Or simply: Open-Meteo provides `sunrise` and `sunset` fields in their daily forecast

### Run Duration Estimate

```javascript
function daylightCheck(startTime, runDurationMin, sunset) {
  const endTime = new Date(startTime.getTime() + runDurationMin * 60000);
  const minutesBeforeSunset = (sunset - endTime) / 60000;

  if (minutesBeforeSunset > 30) {
    return { safe: true, message: null };
  } else if (minutesBeforeSunset > 0) {
    return {
      safe: true,
      message: `You'll finish ${Math.round(minutesBeforeSunset)} min before sunset — bring reflective gear just in case`
    };
  } else {
    const darkMinutes = Math.abs(Math.round(minutesBeforeSunset));
    return {
      safe: false,
      message: `You'll be running ${darkMinutes} min after sunset — wear reflective gear and a headlamp`
    };
  }
}
```

For morning runs, same logic with sunrise:
```
"Sunrise at 6:42 AM — if you leave at 5:45, you'll have 57 min of darkness. Wear reflective gear."
```

---

## 8. AQI Integration

### Source: AirNow API (US) or Open-Meteo Air Quality API

Open-Meteo provides a free Air Quality API with European and US AQI values.

### Running-Specific AQI Thresholds

Standard EPA AQI applies, but runners breathe 10–20x more air per minute than sedentary people. So thresholds are more conservative:

| AQI | EPA Category | Running Guidance |
|-----|-------------|-----------------|
| 0–50 | Good | No restrictions |
| 51–100 | Moderate | Sensitive individuals may notice — consider reducing intensity |
| 101–150 | Unhealthy (Sensitive) | Reduce prolonged outdoor effort — consider indoors |
| 151–200 | Unhealthy | Avoid outdoor running — go indoors |
| 201+ | Very Unhealthy | Do not exercise outdoors |

---

## 9. Open-Meteo API — Fields We Need

Single API call to `/v1/forecast`:

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=40.69
  &longitude=-73.99
  &hourly=temperature_2m,relative_humidity_2m,dew_point_2m,
          apparent_temperature,precipitation_probability,
          precipitation,rain,snowfall,cloud_cover,
          wind_speed_10m,wind_gusts_10m,wind_direction_10m,
          uv_index,visibility
  &daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,
         precipitation_sum,wind_speed_10m_max
  &current=temperature_2m,relative_humidity_2m,wind_speed_10m,
           precipitation,cloud_cover
  &temperature_unit=fahrenheit
  &wind_speed_unit=mph
  &precipitation_unit=inch
  &timezone=America/New_York
  &past_days=1
  &forecast_days=7
```

**Key:** `past_days=1` gives us the previous 24h of precipitation and temperature data — critical for the ice risk algorithm. All of this is in a single free API call.

For AQI, separate call to Open-Meteo Air Quality:
```
GET https://air-quality-api.open-meteo.com/v1/air-quality
  ?latitude=40.69
  &longitude=-73.99
  &hourly=us_aqi,pm10,pm2_5
  &timezone=America/New_York
```

---

## 10. Clothing Recommendation Logic

### Temperature-Based Tiers (with wind chill for cold)

Use **"feels like" temperature for runners** — which accounts for the fact that running generates significant body heat (~10–15°F perceived warmth above a sedentary person):

```
runner_feels_like = apparent_temperature + running_heat_offset

running_heat_offset at easy pace ≈ +10–15°F
running_heat_offset at tempo pace ≈ +15–20°F
```

This means a runner should dress for roughly 15°F warmer than the "feels like" temperature — the classic "dress for 15–20 degrees warmer" rule of thumb.

### Clothing Tiers

| Runner Feels Like (°F) | Bottom | Top | Accessories |
|------------------------|--------|-----|-------------|
| > 75 | Short shorts | Singlet/sports bra | Sunglasses, sunscreen, hat for sun |
| 65–75 | Shorts | T-shirt or singlet | Sunglasses |
| 55–65 | Shorts | T-shirt or light long sleeve | Optional arm sleeves |
| 45–55 | Shorts or capris | Long sleeve tech | Light gloves (optional), headband |
| 35–45 | Tights or pants | Long sleeve + light jacket/vest | Gloves, headband or light hat |
| 25–35 | Tights | Base layer + midweight jacket | Warm gloves, beanie, buff/neck gaiter |
| 15–25 | Insulated tights | Base layer + heavy jacket | Heavy gloves, balaclava, buff |
| < 15 | Insulated tights + wind pants | Base + mid + wind shell | Full coverage — minimize exposed skin |

**Modifiers:**
- Wind > 15mph: add wind-resistant outer layer one tier colder
- Rain/snow: add waterproof/water-resistant layer
- Precip + cold: waterproof gloves, hat that sheds water
- High UV (>6): hat, sunglasses, sunscreen regardless of temp

---

## 11. Dew Point Calculation (if API only provides relative humidity)

Open-Meteo provides dew_point_2m directly, but if needed:

```javascript
// Magnus formula approximation
function dewPointFromRH(tempC, rh) {
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * tempC) / (b + tempC) + Math.log(rh / 100);
  return (b * alpha) / (a - alpha); // returns °C
}
```

---

## 12. Summary: What Data Drives What Feature

| Feature | Inputs Needed | Source |
|---------|--------------|--------|
| Heat pace adjustment | temp, dew point | Open-Meteo hourly |
| Cold pace adjustment | temp, wind speed (→ wind chill) | Open-Meteo hourly |
| Wind impact on pace | wind speed, wind direction | Open-Meteo hourly |
| Ice risk | temp (current + 24h history), dew point, precipitation (current + 24h), cloud cover, wind | Open-Meteo hourly + past_days=1 |
| Best running window | all hourly fields + sunrise/sunset | Open-Meteo hourly + daily |
| Run type suggestion | temp, dew point, wind, precip, ice risk | Computed from above |
| Clothing recs | apparent temperature, wind, precip, UV | Open-Meteo hourly |
| Daylight check | sunrise, sunset, user's planned run time + duration | Open-Meteo daily |
| AQI | us_aqi, pm2.5, pm10 | Open-Meteo Air Quality |
| Sunset/sunrise run math | sunrise/sunset times, pace, distance | Open-Meteo daily + user input |

**Total API calls needed: 2** (one weather forecast, one air quality). Both free.

---

## 13. What We Don't Know Yet (Feedback Loop Targets)

These are the questions the user feedback data will answer over time:

1. **How much does cold actually slow runners down?** The cold pace adjustment tiers above are estimates. Real feedback from thousands of cold-weather runs will produce much better data.

2. **What do people actually wear at each temperature?** The clothing tiers are standard advice, but runners are highly individual. Aggregate feedback will show that, say, 60% of Brooklyn runners wear shorts down to 40°F.

3. **How accurate are the ice warnings?** If 500 runners report "it was icy" on a day our algorithm said "LOW risk," we need to adjust thresholds.

4. **Does the best-window algorithm actually pick the right hour?** Users reporting satisfaction with their run timing will validate or improve the scoring weights.

5. **What's the real heat-adjusted pace drop for recreational runners?** The Hadley chart and academic models are based on race data. Everyday training runs may behave differently. Feedback will tell us.

This feedback dataset is the long-term moat. Nobody else is collecting it.