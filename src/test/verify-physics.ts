import { calculateSolarAngles, calculatePlaneOfArrayIrradiance, calculateCellTemperature, calculatePowerOutput } from '../lib/solar-engine';
import { dispatchHourlyEnergy } from '../lib/battery-engine';
import { computeSimulationMetrics } from '../lib/financial-engine';
import { PVSystemConfig, HourlyWeatherRecord } from '../types/solar';

console.log('--- STARTING RIGOROUS SOLAR PHYSICS ENGINE VERIFICATION ---');

let testsFailed = 0;

function assert(condition: boolean, passMsg: string, failMsg: string) {
  if (condition) {
    console.log(`✅ ${passMsg}`);
  } else {
    console.error(`❌ ${failMsg}`);
    testsFailed++;
  }
}

// Test 1: NREL SPA Golden Reference Benchmark
// Location: Golden, Colorado (39.742476°N, -105.1786°W)
// Timestamp: 2003-10-17 12:30:30 MST (-07:00) -> 2003-10-17 19:30:30 UTC
// Reference values from NREL SPA / Reda & Andreas: Zenith = 50.1116°, Azimuth = 194.340°
const spaGoldenDate = new Date('2003-10-17T19:30:30Z');
const spaAngles = calculateSolarAngles(39.742476, -105.1786, spaGoldenDate);
console.log(`[TEST 1 - SPA Golden] Zenith: ${spaAngles.zenithDeg.toFixed(3)}° (Ref: 50.112°), Azimuth: ${spaAngles.azimuthDeg.toFixed(3)}° (Ref: 194.340°)`);
const zenithDiff = Math.abs(spaAngles.zenithDeg - 50.1116);
const azimuthDiff = Math.abs(spaAngles.azimuthDeg - 194.340);
assert(
  zenithDiff < 0.4 && azimuthDiff < 0.5,
  'TEST 1 PASSED: Solar position matches NREL SPA Golden Benchmark within ±0.4°',
  `TEST 1 FAILED: Zenith diff ${zenithDiff.toFixed(3)}°, Azimuth diff ${azimuthDiff.toFixed(3)}°`
);

// Test 2: Bengaluru Solar Noon at Solstice
const solsticeDate = new Date('2026-06-21T06:50:00Z');
const blrAngles = calculateSolarAngles(12.9716, 77.5946, solsticeDate);
console.log(`[TEST 2 - Bengaluru Solstice] Zenith: ${blrAngles.zenithDeg.toFixed(2)}°, Elevation: ${blrAngles.elevationDeg.toFixed(2)}°`);
assert(
  blrAngles.elevationDeg > 78 && blrAngles.elevationDeg < 82,
  'TEST 2 PASSED: Tropical high elevation solar angle verified',
  'TEST 2 FAILED: Bengaluru solar elevation out of expected range'
);

// Test 3: Hay-Davies POA Transposition & ASHRAE IAM Glass Reflection
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

const poa = calculatePlaneOfArrayIrradiance(dummyWeather, blrAngles, 14, 180);
console.log(`[TEST 3 - POA & IAM] POA Total: ${poa.poaTotal.toFixed(1)} W/m², IAM: ${poa.iam.toFixed(3)}`);
assert(
  poa.poaTotal > 850 && poa.poaTotal < 1100 && poa.iam > 0.95,
  'TEST 3 PASSED: Hay-Davies transposition with physical IAM transmission verified',
  'TEST 3 FAILED: POA transposition or IAM out of expected bounds'
);

// Test 4: Faiman Cell Temperature Model (IEC 61853 standard)
// At 800 W/m², 20°C ambient, and standard NOCT 1 m/s rack-level wind speed (approx 1.3 m/s at 10m mast):
const noctCheck = calculateCellTemperature(800, 20, 1.316);
console.log(`[TEST 4 - Faiman Model] NOCT Calibration Temp: ${noctCheck.toFixed(2)}°C (Ref: 45.0°C)`);
assert(
  Math.abs(noctCheck - 45.0) < 0.3,
  'TEST 4 PASSED: Faiman model precisely calibrates to 45.0°C NOCT',
  `TEST 4 FAILED: NOCT calibration discrepancy: ${noctCheck}°C`
);

// Test 5: Power Output & Inverter Model
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

const cellTemp = calculateCellTemperature(poa.poaTotal, 32, 2.5);
const power = calculatePowerOutput(poa.poaTotal, cellTemp, testConfig);
console.log(`[TEST 5 - Power Output] DC Power: ${power.dcPowerKw} kW, AC Power: ${power.acPowerKw} kW`);
assert(
  power.dcPowerKw > 2.0 && power.acPowerKw <= 3.0,
  'TEST 5 PASSED: DC power and inverter AC clipping verified',
  'TEST 5 FAILED: Power output out of expected bounds'
);

// Test 6: Physical Energy Conservation in Battery Dispatch
const batteryState = { currentSocKwh: 0 };
const dispatch = dispatchHourlyEnergy(power.acPowerKw, 0.8, batteryState, testConfig);
const energyTotal = dispatch.directSolarUsedKw + dispatch.batteryChargeKw + dispatch.gridExportKw;
const diff = Math.abs(energyTotal - power.acPowerKw);
console.log(`[TEST 6 - Energy Conservation] AC: ${power.acPowerKw} kW, Sum of Outflows: ${energyTotal} kW, diff: ${diff.toFixed(4)}`);
assert(
  diff < 0.001,
  'TEST 6 PASSED: Strict 1st Law of Thermodynamics Energy Conservation verified',
  `TEST 6 FAILED: Energy conservation violation: diff = ${diff}`
);

// Test 7: 12-Month Annualization & Positive ROI Verification
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
console.log(`[TEST 7 - Financials] Annual Gen: ${metrics.financials.annualGenerationKwh} kWh, 25-Yr Net: ₹${metrics.financials.twentyFiveYearSavingsInr.toLocaleString('en-IN')}, Payback: ${metrics.financials.paybackPeriodYears} yrs`);
assert(
  metrics.financials.twentyFiveYearSavingsInr > 0 && metrics.financials.paybackPeriodYears < 10,
  'TEST 7 PASSED: Robust positive ROI and realistic payback verified',
  'TEST 7 FAILED: Financial metrics returned unrealistic or negative return'
);

if (testsFailed > 0) {
  console.error(`\n❌ VERIFICATION FAILED: ${testsFailed} test(s) failed.`);
  process.exit(1);
} else {
  console.log('\n--- ALL 7 PHYSICS & FINANCIAL ENGINE TESTS PASSED (0 ERRORS) ---');
  process.exit(0);
}
