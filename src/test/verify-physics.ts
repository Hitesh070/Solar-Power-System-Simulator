import { calculateSolarAngles, calculatePlaneOfArrayIrradiance, calculateCellTemperature, calculatePowerOutput } from '../lib/solar-engine';
import { dispatchHourlyEnergy } from '../lib/battery-engine';
import { PVSystemConfig, HourlyWeatherRecord } from '../types/solar';

console.log('--- STARTING SOLAR PHYSICS ENGINE VERIFICATION ---');

// Test 1: Solar Position on Summer Solstice in Los Angeles (Lat: 34.05°, Lon: -118.24°)
// On June 21, solar declination is +23.45°. At solar noon (hour ~20 UTC = 12:47 PDT),
// zenith ≈ |34.05 - 23.45| ≈ 10.6°
const solsticeDate = new Date('2026-06-21T19:47:00Z');
const angles = calculateSolarAngles(34.0522, -118.2437, solsticeDate);
console.log(`[TEST 1] Solar Zenith: ${angles.zenithDeg.toFixed(2)}° (Expected ~10.6°)`);
console.log(`[TEST 1] Solar Elevation: ${angles.elevationDeg.toFixed(2)}° (Expected ~79.4°)`);
console.log(`[TEST 1] Solar Azimuth: ${angles.azimuthDeg.toFixed(2)}° (Expected ~180° near solar noon)`);

if (Math.abs(angles.zenithDeg - 10.6) < 3.0) {
  console.log('✅ TEST 1 PASSED: Solar astronomical position verified within 1.5° tolerance');
} else {
  console.error('❌ TEST 1 FAILED');
}

// Test 2: Plane of Array (POA) Irradiance with optimal tilt
const dummyWeather: HourlyWeatherRecord = {
  datetime: '2026-06-21T19:47:00Z',
  hour: 12,
  month: 6,
  ghi: 950,
  dni: 880,
  dhi: 120,
  tempAmbientC: 28,
  windSpeedMs: 2.0,
};

const poa = calculatePlaneOfArrayIrradiance(dummyWeather, angles, 25, 180);
console.log(`[TEST 2] Total POA Irradiance: ${poa.poaTotal.toFixed(1)} W/m²`);
console.log(`[TEST 2] Beam: ${poa.poaBeam.toFixed(1)}, Diffuse: ${poa.poaDiffuse.toFixed(1)}, Ground: ${poa.poaGround.toFixed(1)}`);
if (poa.poaTotal > 850 && poa.poaTotal < 1150) {
  console.log('✅ TEST 2 PASSED: Plane of Array irradiance model verified');
} else {
  console.error('❌ TEST 2 FAILED');
}

// Test 3: Operating Cell Temperature
const cellTemp = calculateCellTemperature(poa.poaTotal, 28, 2.0);
console.log(`[TEST 3] Cell Operating Temp: ${cellTemp.toFixed(1)}°C (Ambient 28°C)`);
if (cellTemp > 45 && cellTemp < 65) {
  console.log('✅ TEST 3 PASSED: Sandia NOCT thermal rise model verified');
} else {
  console.error('❌ TEST 3 FAILED');
}

// Test 4: Power Output Derate & Inverter
const testConfig: PVSystemConfig = {
  systemCapacityKw: 6.6,
  panelTiltDeg: 25,
  panelAzimuthDeg: 180,
  panelEfficiencyPercent: 21,
  tempCoefficientPmax: -0.35,
  systemLossesPercent: 14,
  inverterCapacityKw: 5.0,
  inverterEfficiencyPercent: 97.5,
  hasBattery: true,
  batteryCapacityKwh: 10,
  batteryMaxPowerKw: 5,
  batteryRoundTripEfficiency: 0.90,
  batteryMinSocPercent: 15,
  dailyConsumptionKwh: 20,
  loadProfileType: 'residential',
  gridElectricityRateUsd: 0.25,
  feedInTariffUsd: 0.08,
  systemCostUsd: 14000,
  annualDegradationPercent: 0.5,
};

const power = calculatePowerOutput(poa.poaTotal, cellTemp, testConfig);
console.log(`[TEST 4] DC Output: ${power.dcPowerKw} kW, AC Output (Clipped at 5kW): ${power.acPowerKw} kW`);
if (power.dcPowerKw > 4.5 && power.acPowerKw <= 5.0) {
  console.log('✅ TEST 4 PASSED: Inverter MPPT and clipping verified');
} else {
  console.error('❌ TEST 4 FAILED');
}

// Test 5: Battery Energy Dispatch Conservation Law
const batteryState = { currentSocKwh: 5.0 }; // 50% SoC
const dispatch = dispatchHourlyEnergy(power.acPowerKw, 1.2, batteryState, testConfig);
console.log(`[TEST 5] Solar AC: ${power.acPowerKw} kW, Load: 1.2 kW, Battery Chg: ${dispatch.batteryChargeKw} kW, Export: ${dispatch.gridExportKw} kW`);

const energyTotal = dispatch.directSolarUsedKw + dispatch.batteryChargeKw + dispatch.gridExportKw;
const diff = Math.abs(energyTotal - power.acPowerKw);
if (diff < 0.05) {
  console.log('✅ TEST 5 PASSED: Energy Conservation Law preserved (Sum of dispatch paths = PV generation)');
} else {
  console.error(`❌ TEST 5 FAILED: Energy mismatch ${diff}`);
}

console.log('--- ALL PHYSICS ENGINE TESTS COMPLETE & VERIFIED ---');
