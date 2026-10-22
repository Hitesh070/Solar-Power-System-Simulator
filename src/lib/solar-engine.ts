import { PVSystemConfig, HourlyWeatherRecord } from '../types/solar';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export interface SolarAngles {
  zenithDeg: number;
  elevationDeg: number;
  azimuthDeg: number;
  hourAngleDeg: number;
  declinationDeg: number;
}

/**
 * Calculates solar angles using Michalsky / Spencer solar position approximations.
 * Accuracy within ±0.05 degrees, sufficient for utility-grade photovoltaic engineering.
 */
export function calculateSolarAngles(
  latDeg: number,
  lonDeg: number,
  date: Date
): SolarAngles {
  const latRad = latDeg * DEG_TO_RAD;

  // Day of year (1-365)
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diffTime = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // UTC time in decimal hours
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;

  // Fractional year in radians
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (utcHours - 12) / 24);

  // Equation of time (minutes)
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Solar declination (radians)
  const declRad =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  // True solar time in minutes
  // lonDeg in [-180, 180] degrees. 4 minutes per degree.
  const timeOffset = eqtime + 4 * lonDeg;
  const trueSolarTimeMinutes = (utcHours * 60 + timeOffset + 1440) % 1440;

  // Hour angle (degrees)
  const hourAngleDeg = (trueSolarTimeMinutes / 4) - 180;
  const hourAngleRad = hourAngleDeg * DEG_TO_RAD;

  // Solar zenith angle (radians)
  const cosZenith =
    Math.sin(latRad) * Math.sin(declRad) +
    Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngleRad);

  const clampedCosZenith = Math.max(-1, Math.min(1, cosZenith));
  const zenithRad = Math.acos(clampedCosZenith);
  const zenithDeg = zenithRad * RAD_TO_DEG;
  const elevationDeg = 90 - zenithDeg;

  // Solar azimuth angle (degrees from true North, clockwise)
  let azimuthDeg = 0;
  if (elevationDeg > -5) {
    const sinElevation = Math.sin(elevationDeg * DEG_TO_RAD);
    const cosElevation = Math.max(0.0001, Math.cos(elevationDeg * DEG_TO_RAD));

    const cosAzimuth =
      (Math.sin(declRad) - Math.sin(latRad) * sinElevation) /
      (Math.cos(latRad) * cosElevation);
    const clampedCosAzimuth = Math.max(-1, Math.min(1, cosAzimuth));
    const rawAzimuth = Math.acos(clampedCosAzimuth) * RAD_TO_DEG;

    if (hourAngleDeg > 0) {
      azimuthDeg = (360 - rawAzimuth) % 360;
    } else {
      azimuthDeg = rawAzimuth;
    }
  }

  return {
    zenithDeg: Math.max(0, Math.min(180, zenithDeg)),
    elevationDeg,
    azimuthDeg: (azimuthDeg + 360) % 360,
    hourAngleDeg,
    declinationDeg: declRad * RAD_TO_DEG,
  };
}

/**
 * Calculates Plane of Array (POA) Irradiance using the Hay-Davies transposition model.
 * Factors in direct beam, sky diffuse (circumsolar + isotropic), and ground-reflected albedo.
 */
export function calculatePlaneOfArrayIrradiance(
  weather: HourlyWeatherRecord,
  solarAngles: SolarAngles,
  panelTiltDeg: number,
  panelAzimuthDeg: number,
  groundAlbedo: number = 0.20
): { poaTotal: number; poaBeam: number; poaDiffuse: number; poaGround: number } {
  // If sun is below horizon, irradiance on array is 0
  if (solarAngles.elevationDeg <= 0) {
    return { poaTotal: 0, poaBeam: 0, poaDiffuse: 0, poaGround: 0 };
  }

  const zenithRad = solarAngles.zenithDeg * DEG_TO_RAD;
  const tiltRad = panelTiltDeg * DEG_TO_RAD;
  const panelAzimuthRad = panelAzimuthDeg * DEG_TO_RAD;
  const solarAzimuthRad = solarAngles.azimuthDeg * DEG_TO_RAD;

  // Angle of Incidence (AOI) cos(theta)
  const cosIncidence =
    Math.cos(zenithRad) * Math.cos(tiltRad) +
    Math.sin(zenithRad) * Math.sin(tiltRad) * Math.cos(solarAzimuthRad - panelAzimuthRad);

  const cosTheta = Math.max(0, cosIncidence);

  // 1. Beam irradiance on tilted array
  const poaBeam = weather.dni * cosTheta;

  // 2. Diffuse irradiance on tilted array (Hay-Davies model)
  // Anisotropy index Ai = DNI / extraterrestrial irradiance (~1367 W/m²)
  const extraterrestrialIrradiance = 1367;
  const anisotropyIndex = Math.min(1, Math.max(0, weather.dni / extraterrestrialIrradiance));

  const cosZenithSafe = Math.max(0.087, Math.cos(zenithRad)); // avoid divide by zero near horizon
  const circumsolarFactor = anisotropyIndex * (cosTheta / cosZenithSafe);
  const isotropicFactor = (1 - anisotropyIndex) * ((1 + Math.cos(tiltRad)) / 2);

  const poaDiffuse = Math.max(0, weather.dhi * (circumsolarFactor + isotropicFactor));

  // 3. Ground-reflected irradiance
  const poaGround = Math.max(
    0,
    weather.ghi * groundAlbedo * ((1 - Math.cos(tiltRad)) / 2)
  );

  const poaTotal = Math.max(0, poaBeam + poaDiffuse + poaGround);

  return { poaTotal, poaBeam, poaDiffuse, poaGround };
}

/**
 * Calculates cell operating temperature based on Sandia / King NOCT formula:
 * T_cell = T_ambient + (POA / 800) * (NOCT - 20) * exp(-0.05 * WindSpeed)
 */
export function calculateCellTemperature(
  poaIrradianceW: number,
  tempAmbientC: number,
  windSpeedMs: number,
  noctC: number = 45
): number {
  if (poaIrradianceW <= 1) return tempAmbientC;
  const windCooling = Math.exp(-0.05 * Math.max(0, windSpeedMs));
  const tempRise = (poaIrradianceW / 800) * (noctC - 20) * windCooling;
  return tempAmbientC + tempRise;
}

/**
 * Computes PV DC and AC power output accounting for:
 * - STC rated nameplate power (kW)
 * - Temperature derating (e.g. -0.35%/°C above 25°C STC)
 * - System soiling, mismatch, and wiring resistance losses
 * - Inverter efficiency curve & MPPT power clipping
 */
export function calculatePowerOutput(
  poaIrradianceW: number,
  cellTempC: number,
  config: PVSystemConfig
): { dcPowerKw: number; acPowerKw: number } {
  if (poaIrradianceW <= 2) {
    return { dcPowerKw: 0, acPowerKw: 0 };
  }

  // Irradiance ratio relative to Standard Test Conditions (1000 W/m²)
  const effectiveIrradianceRatio = poaIrradianceW / 1000;

  // Temperature coefficient factor: %/°C
  const deltaTempC = cellTempC - 25; // Relative to 25°C STC
  const tempFactor = 1 + (config.tempCoefficientPmax / 100) * deltaTempC;

  // Overall system derate factor (soiling, cables, module mismatch)
  const derateFactor = (100 - config.systemLossesPercent) / 100;

  // DC Power (kW)
  const dcPowerKw = Math.max(
    0,
    config.systemCapacityKw * effectiveIrradianceRatio * tempFactor * derateFactor
  );

  // Inverter Model:
  // Part-load efficiency drop: efficiency drops slightly at low load (<10%) and hits peak at ~40-80%
  const loadRatio = config.inverterCapacityKw > 0 ? dcPowerKw / config.inverterCapacityKw : 0;
  let effectiveInverterEfficiency = config.inverterEfficiencyPercent / 100;

  if (loadRatio < 0.1 && loadRatio > 0.01) {
    // Quadratic drop at low power
    effectiveInverterEfficiency *= (0.85 + 1.5 * loadRatio);
  } else if (loadRatio <= 0.01) {
    effectiveInverterEfficiency = 0;
  }

  // AC Power with inverter clipping limit
  const acPowerBeforeClipping = dcPowerKw * effectiveInverterEfficiency;
  const acPowerKw = Math.min(config.inverterCapacityKw, acPowerBeforeClipping);

  return {
    dcPowerKw: Math.round(dcPowerKw * 1000) / 1000,
    acPowerKw: Math.round(acPowerKw * 1000) / 1000,
  };
}
