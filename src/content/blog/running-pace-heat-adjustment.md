---
title: "How Heat Affects Running Pace: The Science of Pace Adjustment"
description: "Why you slow down in the heat, how much to adjust, and the formulas behind weather-based pace calculations for runners."
publishDate: 2026-04-03
author: Should I Run Team
tags: ["pace", "heat", "science"]
draft: false
---

Every runner knows the feeling: a pace that felt easy last week now feels like a tempo run. The temperature went up 15 degrees and suddenly your legs are concrete. This isn't a fitness problem — it's physics.

## Why Heat Slows You Down

When you run in heat, your body faces competing demands:

1. **Muscles need blood** to deliver oxygen and fuel
2. **Skin needs blood** to dissipate heat through sweating and radiation

These systems share the same blood supply. In cool weather, most blood goes to muscles. In heat, your body redirects a significant portion to the skin for cooling. The result: less oxygen reaches your muscles, and the same pace requires more cardiac output.

This is why your heart rate spikes in summer even at the same pace — your cardiovascular system is working double duty.

## The Hadley Method: Temp + Dew Point

The most practical heat assessment for runners uses a simple formula credited to Coach Jeff Hadley: add the air temperature (°F) and the dew point (°F). Dew point matters more than relative humidity because it directly measures the moisture content in the air — the thing that prevents your sweat from evaporating.

| Combined Value | Pace Slowdown | Running Conditions |
|---|---|---|
| ≤ 100 | 0% | Ideal — no adjustment needed |
| 101–110 | 0–0.5% | Barely noticeable |
| 111–120 | 0.5–1% | Slightly warm |
| 121–130 | 1–2% | Noticeably warm |
| 131–140 | 2–3% | Hot — back off |
| 141–150 | 3–4.5% | Very hot — adjust significantly |
| 151–160 | 4.5–6% | Brutal — slow way down |
| 161–170 | 6–8% | Dangerous — easy only |
| 171–180 | 8–10% | Extreme — consider indoors |
| > 180 | 10%+ | Hard running not recommended |

### What This Looks Like in Practice

Say your easy pace is **8:00/mile** and the combined value is 145 (a classic July morning in the Northeast):

- **3–4.5% adjustment** means running 8:14–8:22/mile
- That 14–22 second difference is significant — it's the difference between feeling controlled and feeling like you're fighting

If you try to hold 8:00 pace, your heart rate will be 10–15 bpm higher, you'll burn through glycogen faster, and your recovery will take longer. **Slowing down is faster** because you recover better and can train consistently.

## Cold Weather Pace: The Other Side

Cold affects pace too, though it's less studied. Below 40°F, wind chill becomes the key metric:

| Wind Chill | Adjustment | Why |
|---|---|---|
| 30–40°F | 0–2% | Extra layers add slight drag |
| 20–30°F | 2–4% | Footing, clothing weight, thermoregulation |
| 10–20°F | 4–6% | Significant — limit hard efforts |
| 0–10°F | 6–8% | Easy effort only |
| Below 0°F | 8%+ | Consider treadmill |

Wind chill is calculated using the NWS formula from air temperature and wind speed. A 35°F day with 20 mph wind feels like 24°F — that's a 2–4% adjustment, not the 0% you'd expect from the thermometer alone.

## Wind: The Hidden Pace Tax

Headwinds directly slow you down independent of temperature:

- **~1.2 seconds per mile per mph of headwind**
- A 15 mph headwind costs you roughly 18 seconds per mile
- Tailwinds help, but only about half as much (aerodynamic drag isn't symmetric)

If you're running an out-and-back in wind, the headwind half will hurt more than the tailwind half helps. Plan accordingly.

## How Should I Run Calculates Your Adjusted Pace

[Should I Run](/) automates all of this:

1. Fetches current temperature, dew point, wind speed, and wind chill for your location
2. Determines whether heat or cold adjustment applies (threshold: 55°F)
3. Calculates the adjustment percentage using the Hadley method (heat) or wind chill tiers (cold)
4. Applies the adjustment to your saved paces across all effort levels
5. Shows you both base and adjusted pace side by side

You enter your paces once. Should I Run adjusts them daily based on actual conditions.
