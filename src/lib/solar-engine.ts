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
 * Calculates solar angles using Spencer / NOAA solar position equations with atmospheric refraction.
 * Computes solar zenith, elevation, and true azimuth relative to True North.
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
  let elevationDeg = 90 - zenithDeg;

  // Atmospheric refraction correction for true apparent elevation
  if (elevationDeg > -0.85) {
    const rArcmin = 1.02 / Math.tan((elevationDeg + 10.3 / (elevationDeg + 5.11)) * DEG_TO_RAD);
    elevationDeg += rArcmin / 60;
  }

  // Solar azimuth angle (degrees from true North, clockwise: 0° N, 90° E, 180° S, 270° W)
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
    zenithDeg: Math.max(0, Math.min(180, 90 - elevationDeg)),
    elevationDeg,
    azimuthDeg: (azimuthDeg + 360) % 360,
    hourAngleDeg,
    declinationDeg: declRad * RAD_TO_DEG,
  };
}

/**
 * Calculates Plane of Array (POA) Irradiance using the Hay-Davies transposition model
 * with ASHRAE physical Incidence Angle Modifier (IAM).
 * Factors in direct beam, sky diffuse (circumsolar + isotropic), and ground-reflected albedo.
 */
export function calculatePlaneOfArrayIrradiance(
  weather: HourlyWeatherRecord,
  solarAngles: SolarAngles,
  panelTiltDeg: number,
  panelAzimuthDeg: number,
  groundAlbedo: number = 0.20
): { poaTotal: number; poaBeam: number; poaDiffuse: number; poaGround: number; iam: number } {
  // If sun is below horizon, irradiance on array is 0
  if (solarAngles.elevationDeg <= 0) {
    return { poaTotal: 0, poaBeam: 0, poaDiffuse: 0, poaGround: 0, iam: 0 };
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
  const aoiDeg = Math.acos(Math.min(1, cosTheta)) * RAD_TO_DEG;

  // Physical Incidence Angle Modifier (IAM) - ASHRAE Standard Model (b0 = 0.05)
  // Accounts for front glass reflection losses at oblique incidence angles
  let iam = 1.0;
  if (aoiDeg < 80) {
    iam = Math.max(0, 1 - 0.05 * (1 / Math.max(0.01, cosTheta) - 1));
  } else if (aoiDeg < 90) {
    const iam80 = Math.max(0, 1 - 0.05 * (1 / Math.cos(80 * DEG_TO_RAD) - 1));
    iam = Math.max(0, iam80 * (90 - aoiDeg) / 10);
  } else {
    iam = 0;
  }

  // 1. Beam irradiance on tilted array with IAM transmission factor
  const poaBeam = weather.dni * cosTheta * iam;

  // 2. Diffuse irradiance on tilted array (Hay-Davies model)
  // Eccentricity-corrected extraterrestrial irradiance I0 = 1361 * (1 + 0.033 * cos(2pi * n / 365))
  const dt = new Date(weather.datetime);
  const dayOfYear = Math.floor((dt.getTime() - new Date(Date.UTC(dt.getUTCFullYear(), 0, 1)).getTime()) / 86400000) + 1;
  const e0 = 1 + 0.033 * Math.cos((2 * Math.PI * dayOfYear) / 365);
  const extraterrestrialIrradiance = 1361 * e0;
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

  return { poaTotal, poaBeam, poaDiffuse, poaGround, iam };
}

/**
 * Calculates cell operating temperature based on the Faiman model (IEC 61853 / PVsyst standard):
 * T_cell = T_amb + POA / (U0 + U1 * v_roof)
 * Standard open-rack / elevated terrace parameters: U0 = 25.0 W/m²K, U1 = 6.84 W/m²K/(m/s).
 * Height corrected: v_roof ≈ v_10m * 0.76.
 */
export function calculateCellTemperature(
  poaIrradianceW: number,
  tempAmbientC: number,
  windSpeedMs: number,
  u0: number = 25.0,
  u1: number = 6.84
): number {
  if (poaIrradianceW <= 1) return tempAmbientC;

  const vRoof = Math.max(0.2, windSpeedMs * 0.76);
  const heatLossFactor = u0 + u1 * vRoof;
  const tempRise = poaIrradianceW / heatLossFactor;

  return tempAmbientC + tempRise;
}

/**
 * Computes PV DC and AC power output accounting for:
 * - STC rated nameplate power (kW)
 * - Temperature derating (e.g. -0.35%/°C above 25°C STC)
 * - System soiling, mismatch, and wiring resistance losses
 * - Smooth part-load inverter efficiency curve & MPPT power clipping
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
  // Smooth CEC/Euro-style part-load efficiency curve:
  // Zero power below 0.5% threshold; rapidly scales to ~95% by 10% load, peaks at ~98% near 50-70% load.
  const loadRatio = config.inverterCapacityKw > 0 ? dcPowerKw / config.inverterCapacityKw : 0;
  const maxEff = config.inverterEfficiencyPercent / 100;
  let effectiveInverterEfficiency = 0;

  if (loadRatio > 0.005) {
    const partLoadFactor = (1 - Math.exp(-22 * loadRatio)) * (1 - 0.015 * Math.max(0, loadRatio - 0.5));
    effectiveInverterEfficiency = maxEff * Math.max(0, Math.min(1.0, partLoadFactor));
  }

  // AC Power with inverter clipping limit
  const acPowerBeforeClipping = dcPowerKw * effectiveInverterEfficiency;
  const acPowerKw = Math.min(config.inverterCapacityKw, acPowerBeforeClipping);

  return {
    dcPowerKw: Math.round(dcPowerKw * 1000) / 1000,
    acPowerKw: Math.round(acPowerKw * 1000) / 1000,
  };
}
