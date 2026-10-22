import {
  LocationData,
  PVSystemConfig,
  HourlyWeatherRecord,
  HourlySimulationResult,
  CompleteSimulationResults,
} from '../types/solar';
import {
  calculateSolarAngles,
  calculatePlaneOfArrayIrradiance,
  calculateCellTemperature,
  calculatePowerOutput,
} from './solar-engine';
import {
  getHourlyLoadKw,
  dispatchHourlyEnergy,
  BatteryDispatchState,
} from './battery-engine';
import { computeSimulationMetrics } from './financial-engine';
import { fetchOpenMeteoWeatherData } from './weather-api';

/**
 * Runs the end-to-end solar PV simulation using either fetched Open-Meteo weather data or synthetic data.
 */
export async function runSolarSimulation(
  location: LocationData,
  config: PVSystemConfig,
  weatherRecords?: HourlyWeatherRecord[],
  isRealWeather: boolean = true
): Promise<CompleteSimulationResults> {
  let records = weatherRecords;
  let isSimulatedWeather = !isRealWeather;

  if (!records || records.length === 0) {
    const fetchResult = await fetchOpenMeteoWeatherData(location.latitude, location.longitude);
    records = fetchResult.records;
    isSimulatedWeather = !fetchResult.isReal;
  }

  const hourlyResults: HourlySimulationResult[] = [];

  // Initialize battery state (start with 50% SoC)
  const initialSocKwh = config.hasBattery ? config.batteryCapacityKwh * 0.5 : 0;
  const batteryState: BatteryDispatchState = {
    currentSocKwh: initialSocKwh,
  };

  for (const weather of records) {
    const dt = new Date(weather.datetime);

    // 1. Calculate Sun Position (Zenith, Elevation, Azimuth)
    const solarAngles = calculateSolarAngles(
      location.latitude,
      location.longitude,
      dt
    );

    // 2. Transpose GHI/DNI/DHI onto Tilted Panel (Hay-Davies POA Irradiance)
    const poa = calculatePlaneOfArrayIrradiance(
      weather,
      solarAngles,
      config.panelTiltDeg,
      config.panelAzimuthDeg
    );

    // 3. Cell Operating Temperature
    const cellTempC = calculateCellTemperature(
      poa.poaTotal,
      weather.tempAmbientC,
      weather.windSpeedMs
    );

    // 4. DC Power Generation & Inverter AC Clipping
    const power = calculatePowerOutput(poa.poaTotal, cellTempC, config);

    // 5. Hourly Demand Load
    const loadKw = getHourlyLoadKw(
      weather.hour,
      config.dailyConsumptionKwh,
      config.loadProfileType
    );

    // 6. Battery Storage & Grid Dispatch
    const dispatch = dispatchHourlyEnergy(
      power.acPowerKw,
      loadKw,
      batteryState,
      config
    );

    // Update battery state for next step
    batteryState.currentSocKwh = dispatch.newSocKwh;

    hourlyResults.push({
      datetime: weather.datetime,
      hour: weather.hour,
      month: weather.month,
      solarZenithDeg: Math.round(solarAngles.zenithDeg * 10) / 10,
      solarElevationDeg: Math.round(solarAngles.elevationDeg * 10) / 10,
      solarAzimuthDeg: Math.round(solarAngles.azimuthDeg * 10) / 10,
      poaIrradianceW: Math.round(poa.poaTotal),
      cellTempC: Math.round(cellTempC * 10) / 10,
      solarDcPowerKw: power.dcPowerKw,
      solarAcPowerKw: power.acPowerKw,
      loadKw,
      directSolarUsedKw: dispatch.directSolarUsedKw,
      batteryChargeKw: dispatch.batteryChargeKw,
      batteryDischargeKw: dispatch.batteryDischargeKw,
      batterySocPercent: dispatch.batterySocPercent,
      gridExportKw: dispatch.gridExportKw,
      gridImportKw: dispatch.gridImportKw,
    });
  }

  // Compute 12-month aggregated summaries and 25-year financial metrics
  const { monthly, financials } = computeSimulationMetrics(hourlyResults, config);

  return {
    hourly: hourlyResults,
    monthly,
    financials,
    location,
    config,
    isSimulatedWeather,
  };
}
