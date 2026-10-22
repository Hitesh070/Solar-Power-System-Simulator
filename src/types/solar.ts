export interface LocationData {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  elevationMeters?: number;
}

export interface PVSystemConfig {
  // Panel configuration
  systemCapacityKw: number;       // DC nameplate power in kW
  panelTiltDeg: number;           // Tilt from horizontal (0° flat, 90° vertical)
  panelAzimuthDeg: number;        // Facing angle: 180° = South, 90° = East, 270° = West, 0° = North
  panelEfficiencyPercent: number; // Typical monocrystalline: 20-22%
  tempCoefficientPmax: number;    // %/°C, typically -0.35%
  systemLossesPercent: number;    // Dirt, wiring, mismatch, soiling: typically 14%
  
  // Inverter configuration
  inverterCapacityKw: number;     // AC rated output in kW
  inverterEfficiencyPercent: number; // 96-98%
  
  // Battery Storage System (BESS)
  hasBattery: boolean;
  batteryCapacityKwh: number;     // Usable energy capacity
  batteryMaxPowerKw: number;      // Maximum continuous charge/discharge power
  batteryRoundTripEfficiency: number; // Typically 90% (0.90)
  batteryMinSocPercent: number;   // Min SoC reserve (e.g., 20%)
  
  // Consumption & Economics
  dailyConsumptionKwh: number;    // Household average kWh/day
  loadProfileType: 'residential' | 'commercial' | 'evening-heavy' | 'flat';
  gridElectricityRateUsd: number; // e.g., $0.16 / kWh
  feedInTariffUsd: number;        // e.g., $0.06 / kWh export credit
  systemCostUsd: number;          // Total upfront cost (panels, racking, inverter, battery, labor)
  annualDegradationPercent: number; // Degradation rate per year, typically 0.5%
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
  loadKw: number;              // Household demand in this hour
  directSolarUsedKw: number;   // Solar consumed directly
  batteryChargeKw: number;     // Surplus solar stored into battery
  batteryDischargeKw: number;  // Battery discharging to cover load
  batterySocPercent: number;   // Battery State of Charge at end of hour (0-100%)
  gridExportKw: number;        // Surplus sent to grid
  gridImportKw: number;        // Deficit drawn from grid
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
  annualGridSavingsUsd: number;
  annualFeedInRevenueUsd: number;
  annualTotalSavingsUsd: number;
  selfConsumptionPercent: number; // % of solar generation used directly or via battery
  solarFractionPercent: number;    // % of household load satisfied by solar
  paybackPeriodYears: number;
  twentyFiveYearSavingsUsd: number;
  levelizedCostOfEnergyUsdPerKwh: number; // LCOE
  carbonOffsetTonnesPerYear: number;
  equivalentTreesPlanted: number;
  yearlyCashFlow: number[];       // 25-year cumulative cash flow
}

export interface CompleteSimulationResults {
  hourly: HourlySimulationResult[];
  monthly: MonthlySummary[];
  financials: FinancialMetrics;
  location: LocationData;
  config: PVSystemConfig;
  isSimulatedWeather: boolean;
}
