export interface LocationData {
  name: string;
  latitude: number;
  longitude: number;
  state?: string;
  country?: string;
  elevationMeters?: number;
}

export interface PVSystemConfig {
  // Panel configuration
  systemCapacityKw: number;       // DC nameplate power in kW
  panelTiltDeg: number;           // Tilt from horizontal (typically 12°-28° for India depending on latitude)
  panelAzimuthDeg: number;        // 180° = True South (optimal for India)
  panelEfficiencyPercent: number; // 21-22% Monocrystalline PERC / TopCon
  tempCoefficientPmax: number;    // %/°C, typically -0.35%
  systemLossesPercent: number;    // Dust/soiling, cable, inverter losses: 14%
  
  // Inverter configuration
  inverterCapacityKw: number;     // AC rated output in kW
  inverterEfficiencyPercent: number; // 97-98%
  
  // Battery Storage System (BESS)
  hasBattery: boolean;
  batteryCapacityKwh: number;     // Usable energy capacity
  batteryMaxPowerKw: number;      // Maximum continuous power
  batteryRoundTripEfficiency: number; // 90% (0.90)
  batteryMinSocPercent: number;   // Min reserve (typically 15-20%)
  
  // Consumption & Indian DISCOM Economics
  dailyConsumptionKwh: number;    // Average daily consumption in units (kWh)
  loadProfileType: 'residential' | 'commercial' | 'evening-heavy' | 'flat';
  gridElectricityRateInr: number; // Discom retail unit rate (e.g. ₹7.50 / kWh)
  feedInTariffInr: number;        // Discom solar export credit (e.g. ₹3.00 / kWh)
  systemCostInr: number;          // Total turnkey capex in ₹ (e.g. ₹1,80,000 for 3kW)
  annualDegradationPercent: number; // Typically 0.5%/year
}

export interface HourlyWeatherRecord {
  datetime: string;
  hour: number;          // 0 - 23
  month: number;         // 1 - 12
  ghi: number;           // Global Horizontal Irradiance (W/m²)
  dni: number;           // Direct Normal Irradiance (W/m²)
  dhi: number;           // Diffuse Horizontal Irradiance (W/m²)
  tempAmbientC: number;  // Ambient Temperature (°C)
  windSpeedMs: number;   // Wind speed (m/s)
}

export interface HourlySimulationResult {
  datetime: string;
  hour: number;
  month: number;
  solarZenithDeg: number;
  solarElevationDeg: number;
  solarAzimuthDeg: number;
  poaIrradianceW: number;      // Total Plane of Array Irradiance (W/m²)
  cellTempC: number;
  solarDcPowerKw: number;
  solarAcPowerKw: number;      // Power after inverter & clipping
  loadKw: number;              // Instantaneous demand (kW)
  directSolarUsedKw: number;   // Solar consumed directly
  batteryChargeKw: number;     // Surplus stored into battery
  batteryDischargeKw: number;  // Battery discharging to load
  batterySocPercent: number;   // Battery SoC at end of hour (0-100%)
  gridExportKw: number;        // Surplus sent to grid (units)
  gridImportKw: number;        // Units drawn from Discom grid
}

export interface MonthlySummary {
  month: number;
  monthName: string;
  solarYieldKwh: number;
  loadKwh: number;
  gridImportKwh: number;
  gridExportKwh: number;
  selfConsumptionKwh: number;
  averagePoaW: number;
}

export interface FinancialMetrics {
  annualGenerationKwh: number;
  annualLoadKwh: number;
  annualGridSavingsInr: number;
  annualFeedInRevenueInr: number;
  annualTotalSavingsInr: number;
  selfConsumptionPercent: number;
  solarFractionPercent: number;
  paybackPeriodYears: number;
  twentyFiveYearSavingsInr: number;
  levelizedCostOfEnergyInrPerKwh: number; // LCOE in ₹/kWh
  carbonOffsetTonnesPerYear: number;
  equivalentTreesPlanted: number;
  yearlyCashFlow: number[];       // 25-year cumulative cash flow in ₹
}

export interface CompleteSimulationResults {
  hourly: HourlySimulationResult[];
  monthly: MonthlySummary[];
  financials: FinancialMetrics;
  location: LocationData;
  config: PVSystemConfig;
  isSimulatedWeather: boolean;
}
