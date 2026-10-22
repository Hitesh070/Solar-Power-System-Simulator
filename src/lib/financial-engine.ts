import { PVSystemConfig, FinancialMetrics, HourlySimulationResult, MonthlySummary } from '../types/solar';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Computes monthly summaries and 25-year financial ROI metrics based on hourly simulation outputs.
 */
export function computeSimulationMetrics(
  hourly: HourlySimulationResult[],
  config: PVSystemConfig
): { monthly: MonthlySummary[]; financials: FinancialMetrics } {
  // Aggregate hourly data into monthly buckets
  const monthlyMap = new Map<number, {
    solarYieldKwh: number;
    loadKwh: number;
    gridImportKwh: number;
    gridExportKwh: number;
    selfConsumptionKwh: number;
    poaSum: number;
    hoursCount: number;
  }>();

  for (let m = 1; m <= 12; m++) {
    monthlyMap.set(m, {
      solarYieldKwh: 0,
      loadKwh: 0,
      gridImportKwh: 0,
      gridExportKwh: 0,
      selfConsumptionKwh: 0,
      poaSum: 0,
      hoursCount: 0,
    });
  }

  // Determine scaling factor if simulation is less than a full year (e.g. 10 days vs 365 days)
  const totalHours = hourly.length;
  const isFullYear = totalHours >= 8760;
  const yearScalingFactor = isFullYear ? 1 : (8760 / Math.max(1, totalHours));

  hourly.forEach((rec) => {
    const bucket = monthlyMap.get(rec.month);
    if (bucket) {
      bucket.solarYieldKwh += rec.solarAcPowerKw; // 1 hr step: kW * 1h = kWh
      bucket.loadKwh += rec.loadKw;
      bucket.gridImportKwh += rec.gridImportKw;
      bucket.gridExportKwh += rec.gridExportKw;
      bucket.selfConsumptionKwh += (rec.directSolarUsedKw + rec.batteryDischargeKw);
      bucket.poaSum += rec.poaIrradianceW;
      bucket.hoursCount += 1;
    }
  });

  const monthly: MonthlySummary[] = [];

  for (let m = 1; m <= 12; m++) {
    const b = monthlyMap.get(m)!;
    // If not full year, estimate realistic month distribution based on sun geometry
    const monthWeight = [0.06, 0.07, 0.08, 0.09, 0.11, 0.12, 0.12, 0.11, 0.09, 0.07, 0.05, 0.03][m - 1];
    
    const solarYield = isFullYear
      ? b.solarYieldKwh
      : (b.solarYieldKwh > 0 ? b.solarYieldKwh * yearScalingFactor * monthWeight : 0);
    const load = isFullYear
      ? b.loadKwh
      : (config.dailyConsumptionKwh * 30.4);
    const gridImport = isFullYear
      ? b.gridImportKwh
      : Math.max(0, load - solarYield * 0.7);
    const gridExport = isFullYear
      ? b.gridExportKwh
      : Math.max(0, solarYield * 0.3);
    const selfConsumption = isFullYear
      ? b.selfConsumptionKwh
      : Math.min(solarYield, load);

    monthly.push({
      month: m,
      monthName: MONTH_NAMES[m - 1],
      solarYieldKwh: Math.round(solarYield),
      loadKwh: Math.round(load),
      gridImportKwh: Math.round(gridImport),
      gridExportKwh: Math.round(gridExport),
      selfConsumptionKwh: Math.round(selfConsumption),
      averagePoaW: b.hoursCount > 0 ? Math.round(b.poaSum / b.hoursCount) : 0,
    });
  }

  // Calculate annual totals
  const annualGenerationKwh = Math.round(
    monthly.reduce((sum, item) => sum + item.solarYieldKwh, 0)
  );
  const annualLoadKwh = Math.round(
    monthly.reduce((sum, item) => sum + item.loadKwh, 0)
  );
  const annualSelfConsumptionKwh = Math.round(
    monthly.reduce((sum, item) => sum + item.selfConsumptionKwh, 0)
  );
  const annualGridExportKwh = Math.round(
    monthly.reduce((sum, item) => sum + item.gridExportKwh, 0)
  );

  // Financial calculations
  // Self-consumed solar offsets utility grid purchase at retail electricity rate ($/kWh)
  const annualGridSavingsUsd = Math.round(annualSelfConsumptionKwh * config.gridElectricityRateUsd);
  
  // Surplus exported to grid credited at feed-in tariff
  const annualFeedInRevenueUsd = Math.round(annualGridExportKwh * config.feedInTariffUsd);

  const annualTotalSavingsUsd = annualGridSavingsUsd + annualFeedInRevenueUsd;

  const selfConsumptionPercent = annualGenerationKwh > 0
    ? Math.min(100, Math.round((annualSelfConsumptionKwh / annualGenerationKwh) * 100))
    : 0;

  const solarFractionPercent = annualLoadKwh > 0
    ? Math.min(100, Math.round((annualSelfConsumptionKwh / annualLoadKwh) * 100))
    : 0;

  // 25-Year Cumulative Cash Flow Model
  const discountRate = 0.04; // 4% real discount rate
  const utilityEscalationRate = 0.025; // 2.5% annual utility rate inflation
  const degradationRate = config.annualDegradationPercent / 100; // typically 0.5%
  const inverterReplacementYear = 12; // inverter replacement at year 12
  const inverterCostUsd = Math.round(config.inverterCapacityKw * 220); // ~$220/kW
  const omCostPerYear = Math.round(config.systemCapacityKw * 15); // $15/kW/yr maintenance

  const yearlyCashFlow: number[] = [-config.systemCostUsd];
  let cumulativeCash = -config.systemCostUsd;
  let discountedEnergySum = 0;
  let discountedCostSum = config.systemCostUsd;
  let paybackPeriodYears = 99;

  for (let year = 1; year <= 25; year++) {
    // PV degradation
    const degradationFactor = Math.pow(1 - degradationRate, year - 1);
    const yearSolarKwh = annualGenerationKwh * degradationFactor;
    const yearSelfConsumptionKwh = annualSelfConsumptionKwh * degradationFactor;
    const yearExportKwh = annualGridExportKwh * degradationFactor;

    // Tariff escalation
    const tariffFactor = Math.pow(1 + utilityEscalationRate, year - 1);
    const currentRate = config.gridElectricityRateUsd * tariffFactor;
    const currentExportRate = config.feedInTariffUsd * tariffFactor;

    let yearSavings = (yearSelfConsumptionKwh * currentRate) + (yearExportKwh * currentExportRate);
    
    // Expenses in this year
    let yearExpenses = omCostPerYear;
    if (year === inverterReplacementYear) {
      yearExpenses += inverterCostUsd;
    }

    const netYearCash = yearSavings - yearExpenses;
    cumulativeCash += netYearCash;
    yearlyCashFlow.push(Math.round(cumulativeCash));

    if (cumulativeCash >= 0 && paybackPeriodYears === 99) {
      // Linear interpolation for exact payback year
      const prevCash = yearlyCashFlow[year - 1];
      const fraction = Math.abs(prevCash) / (cumulativeCash - prevCash);
      paybackPeriodYears = Math.round((year - 1 + fraction) * 10) / 10;
    }

    // LCOE calculation factors
    const discountFactor = Math.pow(1 + discountRate, year);
    discountedEnergySum += yearSolarKwh / discountFactor;
    discountedCostSum += yearExpenses / discountFactor;
  }

  if (paybackPeriodYears === 99) {
    paybackPeriodYears = config.systemCostUsd > 0 && annualTotalSavingsUsd > 0
      ? Math.round((config.systemCostUsd / annualTotalSavingsUsd) * 10) / 10
      : 25;
  }

  // Levelized Cost of Energy ($/kWh)
  const lcoe = discountedEnergySum > 0
    ? Math.round((discountedCostSum / discountedEnergySum) * 1000) / 1000
    : 0.08;

  // Environmental Metrics
  // National average ~0.42 kg CO2 per kWh grid electricity
  const carbonOffsetTonnesPerYear = Math.round((annualGenerationKwh * 0.42) / 100) / 10;
  // 1 tree absorbs ~22 kg CO2 per year
  const equivalentTreesPlanted = Math.round((carbonOffsetTonnesPerYear * 1000) / 22);

  return {
    monthly,
    financials: {
      annualGenerationKwh,
      annualLoadKwh,
      annualGridSavingsUsd,
      annualFeedInRevenueUsd,
      annualTotalSavingsUsd,
      selfConsumptionPercent,
      solarFractionPercent,
      paybackPeriodYears,
      twentyFiveYearSavingsUsd: Math.round(yearlyCashFlow[25]),
      levelizedCostOfEnergyUsdPerKwh: lcoe,
      carbonOffsetTonnesPerYear,
      equivalentTreesPlanted,
      yearlyCashFlow,
    },
  };
}
