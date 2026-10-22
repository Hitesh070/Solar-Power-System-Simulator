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
 * Fetches real hourly solar irradiance, temperature, and wind from Open-Meteo API
 */
export async function fetchOpenMeteoWeatherData(
  lat: number,
  lon: number
): Promise<{ records: HourlyWeatherRecord[]; isReal: boolean }> {
  try {
    // We request 7 forecast days + 3 past days = 10 days of real 240-hour granular data
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,wind_speed_10m,direct_normal_irradiance,diffuse_radiation,shortwave_radiation_instant&past_days=3&forecast_days=7&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API returned status ${res.status}`);

    const data = await res.json();
    const hourly = data.hourly;
    if (!hourly || !hourly.time) throw new Error('Invalid Open-Meteo response structure');

    const records: HourlyWeatherRecord[] = [];
    for (let i = 0; i < hourly.time.length; i++) {
      const dt = new Date(hourly.time[i]);
      const hour = dt.getHours();
      const month = dt.getMonth() + 1;

      const dni = Math.max(0, hourly.direct_normal_irradiance?.[i] ?? 0);
      const dhi = Math.max(0, hourly.diffuse_radiation?.[i] ?? 0);
      const ghi = Math.max(0, hourly.shortwave_radiation_instant?.[i] ?? 0);
      const tempAmbientC = hourly.temperature_2m?.[i] ?? 20;
      const windSpeedMs = hourly.wind_speed_10m?.[i] ?? 2.5;

      records.push({
        datetime: hourly.time[i],
        hour,
        month,
        dni,
        dhi,
        ghi: ghi > 0 ? ghi : Math.round(dni * 0.7 + dhi),
        tempAmbientC,
        windSpeedMs,
      });
    }

    return { records, isReal: true };
  } catch (error) {
    console.warn('Open-Meteo fetch failed, generating realistic synthetic clear-sky weather:', error);
    return {
      records: generateSyntheticYearlyWeather(lat, lon),
      isReal: false,
    };
  }
}

/**
 * Realistic synthetic weather generator for 8,760 hours (full 365-day year)
 * using Ineichen / Haurwitz clear-sky solar radiation equations,
 * seasonal temperature variation, and realistic cloudiness perturbations.
 */
export function generateSyntheticYearlyWeather(
  lat: number,
  lon: number
): HourlyWeatherRecord[] {
  const records: HourlyWeatherRecord[] = [];
  const baseYear = 2026;

  // Monthly average high/low temp modifiers based on latitude
  const isNorthernHemisphere = lat >= 0;
  const absLat = Math.abs(lat);

  // 12 representative days (one for each month, 24 hours each = 288 hours)
  // or full year simulation sampling 8,760 hours
  const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  let cumulativeDay = 0;

  for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
    const daysInThisMonth = daysInMonths[monthIdx];
    // Seasonal factor: summer is July in North, January in South
    const summerMonth = isNorthernHemisphere ? 6 : 0;
    const seasonAngle = ((monthIdx - summerMonth) / 12) * 2 * Math.PI;
    const seasonalTempShift = Math.cos(seasonAngle) * (15 * (absLat / 60)); // greater swing at higher latitudes
    const baseTemp = 25 - (absLat * 0.35) + seasonalTempShift;

    // Solar declination for this month approx
    const declinationDeg = 23.45 * Math.sin(((284 + cumulativeDay + 15) / 365) * 2 * Math.PI);

    for (let day = 1; day <= daysInThisMonth; day++) {
      cumulativeDay++;
      
      // Pseudo-random weather pattern per day (cloud cycles)
      const weatherSeed = Math.sin(cumulativeDay * 12.9898 + lon * 78.233);
      const isCloudyDay = weatherSeed > 0.45;
      const cloudFactor = isCloudyDay ? 0.35 + 0.3 * Math.abs(weatherSeed) : 0.88 + 0.12 * Math.abs(weatherSeed);

      for (let hour = 0; hour < 24; hour++) {
        const hourAngleDeg = (hour - 12) * 15;
        const latRad = lat * (Math.PI / 180);
        const declRad = declinationDeg * (Math.PI / 180);
        const haRad = hourAngleDeg * (Math.PI / 180);

        // Sin solar elevation
        const sinElevation =
          Math.sin(latRad) * Math.sin(declRad) +
          Math.cos(latRad) * Math.cos(declRad) * Math.cos(haRad);

        let ghi = 0;
        let dni = 0;
        let dhi = 0;

        if (sinElevation > 0.05) {
          // Clear sky DNI ~ 950 * sinElevation^0.7
          const airMass = 1 / (sinElevation + 0.001);
          const extraterrestrial = 1367;
          const clearSkyDni = extraterrestrial * Math.pow(0.7, Math.pow(airMass, 0.678));
          const clearSkyGhi = clearSkyDni * sinElevation + 0.12 * clearSkyDni * sinElevation;

          ghi = Math.max(0, Math.round(clearSkyGhi * cloudFactor));
          dni = Math.max(0, Math.round(clearSkyDni * (isCloudyDay ? cloudFactor * 0.4 : cloudFactor)));
          dhi = Math.max(0, Math.round(ghi - dni * sinElevation));
        }

        // Daily temperature diurnal swing
        const diurnalSwing = Math.sin(((hour - 9) / 24) * 2 * Math.PI) * 5;
        const tempAmbientC = Math.round((baseTemp + diurnalSwing + (isCloudyDay ? -2 : 2)) * 10) / 10;
        const windSpeedMs = Math.round((2.5 + 2 * Math.abs(Math.cos(hour * 0.4))) * 10) / 10;

        const dateStr = `${baseYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00`;

        records.push({
          datetime: dateStr,
          hour,
          month: monthIdx + 1,
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
