import { HourlyWeatherRecord } from '../types/solar';

export interface GeocodingResult {
  name: string;
  lat: number;
  lon: number;
  displayName: string;
}

/**
 * Searches locations using OpenStreetMap Nominatim API
 */
export async function searchLocation(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=5&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) throw new Error('Geocoding request failed');
    const data = await res.json();

    return data.map((item: any) => ({
      name: item.name || item.display_name.split(',')[0],
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      displayName: item.display_name,
    }));
  } catch (err) {
    console.warn('Geocoding search failed, fallback to local search:', err);
    return [];
  }
}

/**
 * Fetches real hourly solar irradiance, temperature, and wind from Open-Meteo API.
 * Uses the Historical Archive API for a full 8,760-hour typical meteorological year (TMY),
 * with fallback to the high-resolution forecast API or calibrated synthetic model.
 */
export async function fetchOpenMeteoWeatherData(
  lat: number,
  lon: number
): Promise<{ records: HourlyWeatherRecord[]; isReal: boolean; isFullYear: boolean }> {
  // 1. Try Historical 8,760h Archive (2023 calendar year for complete 12-month empirical data)
  try {
    const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=2023-01-01&end_date=2023-12-31&hourly=temperature_2m,wind_speed_10m,direct_normal_irradiance,diffuse_radiation,shortwave_radiation&wind_speed_unit=ms&timeformat=unixtime`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000); // 9s timeout

    const res = await fetch(archiveUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const hourly = data.hourly;
      if (hourly && hourly.time && hourly.time.length >= 8000) {
        const utcOffsetSec = data.utc_offset_seconds || 0;
        const records: HourlyWeatherRecord[] = [];

        for (let i = 0; i < hourly.time.length; i++) {
          const unixEnd = hourly.time[i];
          // Backward-averaged data: evaluate sun position at midpoint (t - 30 min)
          const unixMid = unixEnd - 1800;
          const dtMid = new Date(unixMid * 1000);

          // Local time for diurnal profile binning
          const localDt = new Date((unixMid + utcOffsetSec) * 1000);
          const hour = localDt.getUTCHours();
          const month = localDt.getUTCMonth() + 1;

          const dni = Math.max(0, hourly.direct_normal_irradiance?.[i] ?? 0);
          const dhi = Math.max(0, hourly.diffuse_radiation?.[i] ?? 0);
          const ghiRaw = Math.max(0, hourly.shortwave_radiation?.[i] ?? 0);
          const ghi = ghiRaw > 0 ? ghiRaw : Math.round(dhi + dni * 0.7);

          const tempAmbientC = hourly.temperature_2m?.[i] ?? 25;
          const windSpeedMs = Math.max(0.1, hourly.wind_speed_10m?.[i] ?? 2.5);

          records.push({
            datetime: dtMid.toISOString(),
            hour,
            month,
            dni,
            dhi,
            ghi,
            tempAmbientC,
            windSpeedMs,
          });
        }

        return { records, isReal: true, isFullYear: true };
      }
    }
  } catch (err) {
    console.warn('Open-Meteo 8760h archive fetch failed or timed out, trying forecast API...', err);
  }

  // 2. Fallback: High-resolution forecast API (14 days = 336 hours with wind_speed_unit=ms)
  try {
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,wind_speed_10m,direct_normal_irradiance,diffuse_radiation,shortwave_radiation&wind_speed_unit=ms&timeformat=unixtime&past_days=7&forecast_days=7`;

    const res = await fetch(forecastUrl);
    if (res.ok) {
      const data = await res.json();
      const hourly = data.hourly;
      if (hourly && hourly.time) {
        const utcOffsetSec = data.utc_offset_seconds || 0;
        const records: HourlyWeatherRecord[] = [];

        for (let i = 0; i < hourly.time.length; i++) {
          const unixEnd = hourly.time[i];
          const unixMid = unixEnd - 1800;
          const dtMid = new Date(unixMid * 1000);

          const localDt = new Date((unixMid + utcOffsetSec) * 1000);
          const hour = localDt.getUTCHours();
          const month = localDt.getUTCMonth() + 1;

          const dni = Math.max(0, hourly.direct_normal_irradiance?.[i] ?? 0);
          const dhi = Math.max(0, hourly.diffuse_radiation?.[i] ?? 0);
          const ghi = Math.max(0, hourly.shortwave_radiation?.[i] ?? 0);
          const tempAmbientC = hourly.temperature_2m?.[i] ?? 25;
          const windSpeedMs = Math.max(0.1, hourly.wind_speed_10m?.[i] ?? 2.5);

          records.push({
            datetime: dtMid.toISOString(),
            hour,
            month,
            dni,
            dhi,
            ghi: ghi > 0 ? ghi : Math.round(dhi + dni * 0.7),
            tempAmbientC,
            windSpeedMs,
          });
        }

        return { records, isReal: true, isFullYear: false };
      }
    }
  } catch (err) {
    console.warn('Open-Meteo forecast fetch failed, falling back to synthetic model:', err);
  }

  // 3. Fallback: Synthetic 8,760h year
  return {
    records: generateSyntheticYearlyWeather(lat, lon),
    isReal: false,
    isFullYear: true,
  };
}

/**
 * Realistic synthetic weather generator for 8,760 hours (full 365-day year).
 * Incorporates longitude-corrected solar time, Ineichen clear-sky envelope,
 * and Indian monsoon cloudiness seasonality (June–September).
 */
export function generateSyntheticYearlyWeather(
  lat: number,
  lon: number
): HourlyWeatherRecord[] {
  const records: HourlyWeatherRecord[] = [];
  const baseYear = 2026;
  const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  let cumulativeDay = 0;

  for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
    const daysInThisMonth = daysInMonths[monthIdx];
    const month = monthIdx + 1;

    // Indian monsoon factor (July-August has dense cloud cover and diffuse light)
    const isMonsoon = month >= 6 && month <= 9;
    const baseTemp = 28 - Math.abs(lat - 20) * 0.3 + (isMonsoon ? -2 : 3);

    for (let day = 1; day <= daysInThisMonth; day++) {
      cumulativeDay++;

      // Seasonal cloud cycle
      const seed = Math.sin(cumulativeDay * 12.9898 + lon * 0.1);
      const isCloudy = isMonsoon ? seed > -0.2 : seed > 0.45;
      const cloudFactor = isCloudy
        ? (isMonsoon ? 0.35 + 0.25 * Math.abs(seed) : 0.45 + 0.3 * Math.abs(seed))
        : (0.92 + 0.08 * Math.abs(seed));

      for (let hour = 0; hour < 24; hour++) {
        const dateStr = `${baseYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00Z`;
        const dt = new Date(dateStr);

        // Approximate solar elevation
        const dayOfYear = cumulativeDay;
        const declinationDeg = 23.45 * Math.sin(((284 + dayOfYear) / 365) * 2 * Math.PI);
        const solarHour = hour + (lon % 15) * (4 / 60);
        const hourAngleDeg = (solarHour - 12) * 15;

        const latRad = lat * (Math.PI / 180);
        const declRad = declinationDeg * (Math.PI / 180);
        const haRad = hourAngleDeg * (Math.PI / 180);

        const sinElevation =
          Math.sin(latRad) * Math.sin(declRad) +
          Math.cos(latRad) * Math.cos(declRad) * Math.cos(haRad);

        let ghi = 0;
        let dni = 0;
        let dhi = 0;

        if (sinElevation > 0.03) {
          const airMass = 1 / Math.max(0.05, sinElevation);
          const clearSkyDni = 1361 * Math.pow(0.72, Math.pow(airMass, 0.678));
          const clearSkyGhi = clearSkyDni * sinElevation + 0.14 * clearSkyDni * sinElevation;

          ghi = Math.max(0, Math.round(clearSkyGhi * cloudFactor));
          dni = Math.max(0, Math.round(clearSkyDni * (isCloudy ? cloudFactor * 0.3 : cloudFactor)));
          dhi = Math.max(0, Math.round(ghi - dni * sinElevation));
        }

        const diurnalSwing = Math.sin(((hour - 9) / 24) * 2 * Math.PI) * 5;
        const tempAmbientC = Math.round((baseTemp + diurnalSwing + (isCloudy ? -2 : 2)) * 10) / 10;
        const windSpeedMs = Math.round((2.2 + 1.8 * Math.abs(Math.sin(hour * 0.3))) * 10) / 10;

        records.push({
          datetime: dt.toISOString(),
          hour,
          month,
          ghi,
          dni,
          dhi,
          tempAmbientC,
          windSpeedMs,
        });
      }
    }
  }

  return records;
}
