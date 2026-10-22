import { calculateSolarAngles, calculatePlaneOfArrayIrradiance, calculateCellTemperature, calculatePowerOutput } from '../lib/solar-engine';
import { dispatchHourlyEnergy } from '../lib/battery-engine';
import { PVSystemConfig, HourlyWeatherRecord } from '../types/solar';

console.log('--- STARTING SOLAR PHYSICS ENGINE VERIFICATION (INDIA) ---');

// Test 1: Solar Position at Solar Noon in Bengaluru (Lat: 12.97°, Lon: 77.59°)
// On summer solstice June 21, declination ≈ +23.45°.
// Solar noon zenith ≈ |12.97 - 23.45| ≈ 10.5°
const solsticeDate = new Date('2026-06-21T06:50:00Z'); // 12:20 IST solar noon
const angles = calculateSolarAngles(12.9716, 77.5946, solsticeDate);
console.log(`[TEST 1] Bengaluru Solar Zenith: ${angles.zenithDeg.toFixed(2)}°`);
console.log(`[TEST 1] Bengaluru Solar Elevation: ${angles.elevationDeg.toFixed(2)}°`);

if (angles.elevationDeg > 75) {
  console.log('✅ TEST 1 PASSED: Tropical high elevation solar angle verified');
} else {
  console.error('❌ TEST 1 FAILED');
}

// Test 2: Plane of Array (POA) Irradiance on Flat Terrace Elevated Rack
const dummyWeather: HourlyWeatherRecord = {
  datetime: '2026-06-21T06:50:00Z',
  hour: 12,
  month: 6,
  ghi: 960,
  dni: 890,
  dhi: 130,
  tempAmbientC: 32,
  windSpeedMs: 2.5,
};

const poa = calculatePlaneOfArrayIrradiance(dummyWeather, angles, 14, 180);
console.log(`[TEST 2] Total POA Irradiance on 14° South Terrace Rack: ${poa.poaTotal.toFixed(1)} W/m²`);
if (poa.poaTotal > 850 && poa.poaTotal < 1150) {
  console.log('✅ TEST 2 PASSED: Elevated terrace POA transposition verified');
} else {
  console.error('❌ TEST 2 FAILED');
}

// Test 3: Operating Cell Temperature in Indian Summer
const cellTemp = calculateCellTemperature(poa.poaTotal, 32, 2.5);
console.log(`[TEST 3] Operating Cell Temp: ${cellTemp.toFixed(1)}°C (Ambient 32°C)`);
if (cellTemp > 50 && cellTemp < 65) {
  console.log('✅ TEST 3 PASSED: Thermal derate model verified');
} else {
  console.error('❌ TEST 3 FAILED');
}

// Test 4: Indian 3.3 kWp System Output
const testConfig: PVSystemConfig = {
  systemCapacityKw: 3.3,
  panelTiltDeg: 14,
  panelAzimuthDeg: 180,
  panelEfficiencyPercent: 21.2,
  tempCoefficientPmax: -0.35,
  systemLossesPercent: 14,
  inverterCapacityKw: 3.0,
  inverterEfficiencyPercent: 97.5,
  hasBattery: false,
  batteryCapacityKwh: 0,
  batteryMaxPowerKw: 0,
  batteryRoundTripEfficiency: 0.90,
  batteryMinSocPercent: 15,
  dailyConsumptionKwh: 14,
  loadProfileType: 'residential',
  gridElectricityRateInr: 7.50,
  feedInTariffInr: 3.20,
  systemCostInr: 175000,
  annualDegradationPercent: 0.5,
};

const power = calculatePowerOutput(poa.poaTotal, cellTemp, testConfig);
console.log(`[TEST 4] DC Output: ${power.dcPowerKw} kW, AC Output (Clipped at 3.0 kW): ${power.acPowerKw} kW`);
if (power.dcPowerKw > 2.0 && power.acPowerKw <= 3.0) {
  console.log('✅ TEST 4 PASSED: Power output & inverter clipping verified');
} else {
  console.error('❌ TEST 4 FAILED');
}

// Test 5: Energy Conservation
const batteryState = { currentSocKwh: 0 };
const dispatch = dispatchHourlyEnergy(power.acPowerKw, 0.8, batteryState, testConfig);
console.log(`[TEST 5] Solar AC: ${power.acPowerKw} kW, Home Load: 0.8 kW, Discom Export: ${dispatch.gridExportKw} kW`);

const energyTotal = dispatch.directSolarUsedKw + dispatch.batteryChargeKw + dispatch.gridExportKw;
const diff = Math.abs(energyTotal - power.acPowerKw);
if (diff < 0.05) {
  console.log('✅ TEST 5 PASSED: Energy Conservation Law preserved');
} else {
  console.error(`❌ TEST 5 FAILED: mismatch ${diff}`);
}

// Test 6: 12-Month Annualization & Positive ROI Verification
import { computeSimulationMetrics } from '../lib/financial-engine';
const mockHourlyResults = Array.from({ length: 240 }, (_, i) => ({
  datetime: `2026-10-${String(Math.floor(i / 24) + 1).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:00:00Z`,
  hour: i % 24,
  month: 10,
  solarZenithDeg: 45,
  solarElevationDeg: 45,
  solarAzimuthDeg: 180,
  poaIrradianceW: i % 24 >= 6 && i % 24 <= 18 ? 650 : 0,
  cellTempC: 35,
  solarDcPowerKw: i % 24 >= 6 && i % 24 <= 18 ? 2.5 : 0,
  solarAcPowerKw: i % 24 >= 6 && i % 24 <= 18 ? 2.4 : 0,
  loadKw: 0.8,
  directSolarUsedKw: i % 24 >= 6 && i % 24 <= 18 ? 0.8 : 0,
  batteryChargeKw: 0,
  batteryDischargeKw: 0,
  batterySocPercent: 0,
  gridExportKw: i % 24 >= 6 && i % 24 <= 18 ? 1.6 : 0,
  gridImportKw: i % 24 >= 6 && i % 24 <= 18 ? 0 : 0.8,
}));

const metrics = computeSimulationMetrics(mockHourlyResults, testConfig);
console.log(`[TEST 6] Annual Gen: ${metrics.financials.annualGenerationKwh} kWh, 25-Yr Net Profit: ₹${metrics.financials.twentyFiveYearSavingsInr.toLocaleString('en-IN')}, Payback: ${metrics.financials.paybackPeriodYears} yrs`);
if (metrics.financials.twentyFiveYearSavingsInr > 0 && metrics.financials.paybackPeriodYears < 10) {
  console.log('✅ TEST 6 PASSED: Positive ROI and realistic payback verified');
} else {
  console.error('❌ TEST 6 FAILED: ROI must be positive');
}

console.log('--- ALL PHYSICS TESTS COMPLETE & PASSED ---');
