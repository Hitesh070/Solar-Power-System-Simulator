import { PVSystemConfig } from '../types/solar';

// Diurnal hourly weight distributions
export const RAW_LOAD_PROFILE_FACTORS: Record<string, number[]> = {
  residential: [
    0.45, 0.40, 0.38, 0.36, 0.42, 0.65, 1.15, 1.45, 1.30, 0.95, 0.85, 0.80,
    0.85, 0.82, 0.85, 0.95, 1.25, 1.70, 2.10, 2.25, 1.95, 1.50, 0.95, 0.60
  ],
  commercial: [
    0.25, 0.22, 0.20, 0.20, 0.35, 0.65, 1.20, 1.85, 2.30, 2.45, 2.40, 2.25,
    2.15, 2.35, 2.20, 1.90, 1.50, 0.95, 0.55, 0.40, 0.35, 0.30, 0.28, 0.25
  ],
  'evening-heavy': [
    0.40, 0.35, 0.35, 0.35, 0.40, 0.55, 0.85, 1.05, 0.80, 0.70, 0.70, 0.75,
    0.75, 0.70, 0.75, 0.90, 1.20, 1.80, 2.50, 2.80, 2.60, 2.00, 1.30, 0.65
  ],
  flat: [
    1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0
  ]
};

// Runtime strict normalization ensuring sum over 24 hours == 24.000
export const LOAD_PROFILE_FACTORS: Record<string, number[]> = Object.fromEntries(
  Object.entries(RAW_LOAD_PROFILE_FACTORS).map(([key, weights]) => {
    const sum = weights.reduce((a, b) => a + b, 0);
    const normalized = weights.map((w) => (w / sum) * 24);
    return [key, normalized];
  })
);

/**
 * Returns instantaneous load (kW) for a given hour based on chosen load profile.
 * Strictly guarantees that 24 hours sum to exactly dailyConsumptionKwh.
 */
export function getHourlyLoadKw(
  hour: number,
  dailyConsumptionKwh: number,
  profileType: PVSystemConfig['loadProfileType']
): number {
  const profile = LOAD_PROFILE_FACTORS[profileType] || LOAD_PROFILE_FACTORS.residential;
  const hourWeight = profile[hour % 24];
  const baseHourlyAverage = dailyConsumptionKwh / 24;
  return Math.max(0, Math.round(baseHourlyAverage * hourWeight * 1000) / 1000);
}

export interface BatteryDispatchState {
  currentSocKwh: number;
}

export interface BatteryDispatchResult {
  directSolarUsedKw: number;
  batteryChargeKw: number;
  batteryDischargeKw: number;
  batterySocPercent: number;
  newSocKwh: number;
  gridExportKw: number;
  gridImportKw: number;
  unmetLoadKw: number;
}

/**
 * Simulates 1 hour of energy dispatch between Solar PV, Household Load, Battery Storage, and the Electrical Grid.
 * Preserves strict physical energy conservation and models off-grid microgrid constraints.
 */
export function dispatchHourlyEnergy(
  solarAcPowerKw: number,
  loadKw: number,
  batteryState: BatteryDispatchState,
  config: PVSystemConfig
): BatteryDispatchResult {
  let directSolarUsedKw = 0;
  let batteryChargeKw = 0;
  let batteryDischargeKw = 0;
  let gridExportKw = 0;
  let gridImportKw = 0;
  let unmetLoadKw = 0;

  const isOffGrid = config.gridElectricityRateInr === 0 || config.feedInTariffInr === 0;

  let currentSocKwh = batteryState.currentSocKwh;
  const usableCapacityKwh = config.hasBattery ? config.batteryCapacityKwh : 0;
  const minSocKwh = usableCapacityKwh * (config.batteryMinSocPercent / 100);
  const maxChargeKw = config.hasBattery ? config.batteryMaxPowerKw : 0;
  const maxDischargeKw = config.hasBattery ? config.batteryMaxPowerKw : 0;
  const chargeEfficiency = config.hasBattery ? Math.sqrt(config.batteryRoundTripEfficiency) : 1;
  const dischargeEfficiency = config.hasBattery ? Math.sqrt(config.batteryRoundTripEfficiency) : 1;

  if (solarAcPowerKw >= loadKw) {
    // 1. Solar satisfies entire household load
    directSolarUsedKw = loadKw;
    const surplusSolarKw = solarAcPowerKw - loadKw;

    // 2. Surplus charges battery up to max power & room in pack
    if (config.hasBattery && usableCapacityKwh > 0 && surplusSolarKw > 0) {
      const roomInBatteryKwh = Math.max(0, usableCapacityKwh - currentSocKwh);
      const maxPossibleInputEnergy = roomInBatteryKwh / chargeEfficiency;
      
      const targetChargeKw = Math.min(surplusSolarKw, maxChargeKw, maxPossibleInputEnergy);
      batteryChargeKw = targetChargeKw;
      
      const energyStored = targetChargeKw * chargeEfficiency;
      currentSocKwh = Math.min(usableCapacityKwh, currentSocKwh + energyStored);

      // Remaining surplus goes to grid (or curtailed if off-grid)
      const remainingSurplus = surplusSolarKw - targetChargeKw;
      gridExportKw = isOffGrid ? 0 : Math.max(0, remainingSurplus);
    } else {
      gridExportKw = isOffGrid ? 0 : surplusSolarKw;
    }
  } else {
    // Solar is less than load
    directSolarUsedKw = solarAcPowerKw;
    const deficitKw = loadKw - solarAcPowerKw;

    // 3. Battery discharges to cover deficit down to reserve limit
    if (config.hasBattery && usableCapacityKwh > 0 && currentSocKwh > minSocKwh) {
      const availableEnergyKwh = Math.max(0, currentSocKwh - minSocKwh);
      const maxDeliverablePower = availableEnergyKwh * dischargeEfficiency;

      const targetDischargeKw = Math.min(deficitKw, maxDischargeKw, maxDeliverablePower);
      batteryDischargeKw = targetDischargeKw;

      const energyDrawnFromBattery = targetDischargeKw / dischargeEfficiency;
      currentSocKwh = Math.max(minSocKwh, currentSocKwh - energyDrawnFromBattery);

      // Remaining deficit: imported from grid if grid-tied, or recorded as unmet load if off-grid
      const remainingDeficit = deficitKw - targetDischargeKw;
      if (isOffGrid) {
        unmetLoadKw = remainingDeficit;
        gridImportKw = 0;
      } else {
        gridImportKw = remainingDeficit;
      }
    } else {
      if (isOffGrid) {
        unmetLoadKw = deficitKw;
        gridImportKw = 0;
      } else {
        gridImportKw = deficitKw;
      }
    }
  }

  const batterySocPercent = usableCapacityKwh > 0
    ? Math.round((currentSocKwh / usableCapacityKwh) * 100)
    : 0;

  return {
    directSolarUsedKw: Math.round(directSolarUsedKw * 1000) / 1000,
    batteryChargeKw: Math.round(batteryChargeKw * 1000) / 1000,
    batteryDischargeKw: Math.round(batteryDischargeKw * 1000) / 1000,
    batterySocPercent,
    newSocKwh: Math.round(currentSocKwh * 1000) / 1000,
    gridExportKw: Math.round(gridExportKw * 1000) / 1000,
    gridImportKw: Math.round(gridImportKw * 1000) / 1000,
    unmetLoadKw: Math.round(unmetLoadKw * 1000) / 1000,
  };
}
