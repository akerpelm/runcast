export interface DaylightCheck {
  safe: boolean;
  message: string | null;
}

/**
 * Checks if a run will finish before sunset
 * @param startTime - The time the run starts
 * @param runDurationMin - Duration of the run in minutes
 * @param sunset - The sunset time
 * @returns DaylightCheck indicating safety and any warning message
 */
export function checkDaylightAtEnd(
  startTime: Date,
  runDurationMin: number,
  sunset: Date
): DaylightCheck {
  const endTime = new Date(startTime.getTime() + runDurationMin * 60000);
  const minutesBeforeSunset = Math.round((sunset.getTime() - endTime.getTime()) / 60000);

  if (minutesBeforeSunset > 30) {
    return { safe: true, message: null };
  }

  if (minutesBeforeSunset > 0) {
    return {
      safe: true,
      message: `You'll finish ${minutesBeforeSunset} min before sunset — bring reflective gear just in case`,
    };
  }

  return {
    safe: false,
    message: `You'll be running ${Math.abs(minutesBeforeSunset)} min after sunset — wear reflective gear and a headlamp`,
  };
}

/**
 * Checks if a run will start before sunrise
 * @param startTime - The time the run starts
 * @param sunrise - The sunrise time
 * @returns DaylightCheck indicating safety and any warning message
 */
export function checkDaylightAtStart(
  startTime: Date,
  sunrise: Date
): DaylightCheck {
  const minutesBeforeSunrise = Math.round((sunrise.getTime() - startTime.getTime()) / 60000);

  if (minutesBeforeSunrise <= 0) {
    return { safe: true, message: null };
  }

  const formattedSunrise = formatTime(sunrise);
  return {
    safe: false,
    message: `Sunrise at ${formattedSunrise} — you'll have ${minutesBeforeSunrise} min of darkness. Wear reflective gear.`,
  };
}

/**
 * Formats a date as H:MM AM/PM (12-hour format, no leading zero on hour)
 * @param date - The date to format
 * @returns Formatted time string
 */
export function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();

  // Convert to 12-hour format
  const displayHours = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';

  // Format minutes with leading zero
  const displayMinutes = minutes.toString().padStart(2, '0');

  return `${displayHours}:${displayMinutes} ${ampm}`;
}
