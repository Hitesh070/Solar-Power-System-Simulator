import {
  HourlySimulationResult,
  MonthlySummary,
  FinancialMetrics,
  PVSystemConfig,
} from '../types/solar';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Computes 12-month aggregated summaries and 25-year financial metrics.
 * Evaluates real 8,760-hour simulations directly, or applies rigorous normalized seasonal insolation weighting.
 */
export function computeSimulationMetrics(
  hourly: HourlySimulationResult[],
  config: PVSystemConfig
): { monthly: MonthlySummary[]; financials: FinancialMetrics } {
  const monthlyMap = new Map<number, {
    solarYieldKwh: number;
    loadKwh: number;
    gridImportKwh: number;
    gridExportKwh: number;
    selfConsumptionKwh: number;
    poaSum: number;
    hoursCount: number;
    unmetLoadKwh: number;
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
      unmetLoadKwh: 0,
    });
  }

  const totalHours = hourly.length;
  // Consider full-year if we have near 8,760 hours (at least 8,000 hours)
  const isFullYear = totalHours >= 8000;

  hourly.forEach((rec) => {
    const bucket = monthlyMap.get(rec.month);
    if (bucket) {
      bucket.solarYieldKwh += rec.solarAcPowerKw;
      bucket.loadKwh += rec.loadKw;
      bucket.gridImportKwh += rec.gridImportKw;
      bucket.gridExportKwh += rec.gridExportKw;
      bucket.selfConsumptionKwh += (rec.directSolarUsedKw + rec.batteryDischargeKw);
      bucket.poaSum += rec.poaIrradianceW;
      bucket.hoursCount += 1;
      bucket.unmetLoadKwh += rec.unmetLoadKw || 0;
    }
  });

  const isOffGrid = config.gridElectricityRateInr === 0 || config.feedInTariffInr === 0;

  // Normalized monthly insolation distribution for India (strictly sums to 1.000)
  // Summer peak in April/May (~11%), monsoon cloud cover dip in July/August (~6.5%), winter clarity in Nov/Feb (~8%)
  const rawMonthWeights = [0.075, 0.085, 0.105, 0.115, 0.110, 0.080, 0.065, 0.065, 0.080, 0.085, 0.075, 0.070];
  const weightSum = rawMonthWeights.reduce((a, b) => a + b, 0);
  const monthWeights = rawMonthWeights.map((w) => w / weightSum);
  const daysInMonths = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // If sample period, extract empirical yield & dispatch efficiency
  const sampleDays = Math.max(1, totalHours / 24);
  const totalSampleSolarKwh = hourly.reduce((sum, rec) => sum + rec.solarAcPowerKw, 0);
  const totalSampleDirectUsedKwh = hourly.reduce((sum, rec) => sum + rec.directSolarUsedKw, 0);
  const totalSampleBatteryDischargeKwh = hourly.reduce((sum, rec) => sum + rec.batteryDischargeKw, 0);
  const avgSamplePoa = totalHours > 0 ? hourly.reduce((sum, rec) => sum + rec.poaIrradianceW, 0) / totalHours : 0;

  const avgDailySolarKwh = totalSampleSolarKwh / sampleDays;
  const annualBaseSolarKwh = avgDailySolarKwh * 365.25;
  const sampleSelfConsumptionKwh = totalSampleDirectUsedKwh + totalSampleBatteryDischargeKwh;
  const selfConsumptionRatio = totalSampleSolarKwh > 0
    ? Math.min(1.0, Math.max(0.2, sampleSelfConsumptionKwh / totalSampleSolarKwh))
    : 0.8;

  const monthly: MonthlySummary[] = [];

  for (let m = 1; m <= 12; m++) {
    const b = monthlyMap.get(m)!;
    const monthWeight = monthWeights[m - 1];
    const monthDays = daysInMonths[m - 1];

    const solarYield = isFullYear
      ? b.solarYieldKwh
      : (annualBaseSolarKwh * monthWeight);

    const load = isFullYear
      ? b.loadKwh
      : (config.dailyConsumptionKwh * monthDays);

    const selfConsumption = isFullYear
      ? b.selfConsumptionKwh
      : Math.min(load, solarYield * selfConsumptionRatio);

    const gridExport = isFullYear
      ? b.gridExportKwh
      : (isOffGrid ? 0 : Math.max(0, solarYield - selfConsumption));

    const gridImport = isFullYear
      ? b.gridImportKwh
      : (isOffGrid ? 0 : Math.max(0, load - selfConsumption));

    const avgPoa = isFullYear && b.hoursCount > 0
      ? Math.round(b.poaSum / b.hoursCount)
      : Math.round(avgSamplePoa * (monthWeight / (1 / 12)));

    monthly.push({
      month: m,
      monthName: MONTH_NAMES[m - 1],
      solarYieldKwh: Math.round(solarYield),
      loadKwh: Math.round(load),
      gridImportKwh: Math.round(gridImport),
      gridExportKwh: Math.round(gridExport),
      selfConsumptionKwh: Math.round(selfConsumption),
      averagePoaW: Math.round(avgPoa),
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

  // Financial calculations in INR
  // Self-consumed solar offsets DISCOM retail power bill (or avoided diesel @ ₹22/kWh for off-grid)
  const effectiveRetailRate = isOffGrid ? 22.0 : config.gridElectricityRateInr;
  const annualGridSavingsInr = Math.round(annualSelfConsumptionKwh * effectiveRetailRate);
  
  // Surplus units exported to grid credited at feed-in rate (0 for off-grid)
  const annualFeedInRevenueInr = isOffGrid ? 0 : Math.round(annualGridExportKwh * config.feedInTariffInr);

  const annualTotalSavingsInr = annualGridSavingsInr + annualFeedInRevenueInr;

  const selfConsumptionPercent = annualGenerationKwh > 0
    ? Math.min(100, Math.round((annualSelfConsumptionKwh / annualGenerationKwh) * 100))
    : 0;

  const solarFractionPercent = annualLoadKwh > 0
    ? Math.min(100, Math.round((annualSelfConsumptionKwh / annualLoadKwh) * 100))
    : 0;

  // 25-Year Cumulative Cash Flow Model for India
  // Standard financial parameters: 6% real discount rate, 3.5% tariff escalation
  const discountRate = 0.06;
  const utilityEscalationRate = isOffGrid ? 0.04 : 0.035;
  const degradationRate = config.annualDegradationPercent / 100; // 0.5%/yr
  
  // Hardware lifecycle replacements:
  const inverterReplacementYear = 12;
  const inverterCostInr = Math.round(config.inverterCapacityKw * 10000); // ~₹10,000/kW
  
  // Battery replacement at Year 10 (LFP ~10-year / 6,000 cycle lifespan)
  const batteryReplacementYear = 10;
  const batteryReplacementCostInr = config.hasBattery
    ? Math.round(config.batteryCapacityKwh * 18000) // ~₹18,000/kWh replacement cost in Year 10
    : 0;

  const omCostPerYearBase = Math.round(config.systemCapacityKw * 500); // ₹500/kW/yr maintenance

  const yearlyCashFlow: number[] = [-config.systemCostInr];
  let cumulativeCash = -config.systemCostInr;
  let discountedEnergySum = 0;
  let discountedCostSum = config.systemCostInr;
  let paybackPeriodYears = 99;

  for (let year = 1; year <= 25; year++) {
    const degradationFactor = Math.pow(1 - degradationRate, year - 1);
    const yearSolarKwh = annualGenerationKwh * degradationFactor;
    const yearSelfConsumptionKwh = annualSelfConsumptionKwh * degradationFactor;
    const yearExportKwh = annualGridExportKwh * degradationFactor;

    const tariffFactor = Math.pow(1 + utilityEscalationRate, year - 1);
    const currentRate = effectiveRetailRate * tariffFactor;
    const currentExportRate = config.feedInTariffInr; // Feed-in tariffs are typically flat contracted

    const yearSavings = (yearSelfConsumptionKwh * currentRate) + (yearExportKwh * currentExportRate);
    
    // O&M with mild 3% inflation
    let yearExpenses = Math.round(omCostPerYearBase * Math.pow(1.03, year - 1));
    
    if (year === inverterReplacementYear) {
      yearExpenses += inverterCostInr;
    }
    if (year === batteryReplacementYear && config.hasBattery) {
      yearExpenses += batteryReplacementCostInr;
    }

    const netYearCash = yearSavings - yearExpenses;
    cumulativeCash += netYearCash;
    yearlyCashFlow.push(Math.round(cumulativeCash));

    if (cumulativeCash >= 0 && paybackPeriodYears === 99) {
      const prevCash = yearlyCashFlow[year - 1];
      const fraction = Math.abs(prevCash) / (cumulativeCash - prevCash);
      paybackPeriodYears = Math.round((year - 1 + fraction) * 10) / 10;
    }

    const discountFactor = Math.pow(1 + discountRate, year);
    discountedEnergySum += yearSolarKwh / discountFactor;
    discountedCostSum += yearExpenses / discountFactor;
  }

  if (paybackPeriodYears === 99) {
    paybackPeriodYears = config.systemCostInr > 0 && annualTotalSavingsInr > 0
      ? Math.round((config.systemCostInr / annualTotalSavingsInr) * 10) / 10
      : 25;
  }

  // Levelized Cost of Energy (₹/kWh)
  // For solar generation: LCOE = (Capex_PV + PV_expenses) / PV_generation
  const lcoe = discountedEnergySum > 0
    ? Math.round((discountedCostSum / discountedEnergySum) * 100) / 100
    : 2.80;

  // Environmental Metrics for India (CEA grid emissions factor: ~0.71 kg CO2/kWh in India)
  const carbonOffsetTonnesPerYear = Math.round((annualGenerationKwh * 0.71) / 100) / 10;
  const equivalentTreesPlanted = Math.round(carbonOffsetTonnesPerYear * 45);

  return {
    monthly,
    financials: {
      annualGenerationKwh,
      annualLoadKwh,
      annualGridSavingsInr,
      annualFeedInRevenueInr,
      annualTotalSavingsInr,
      selfConsumptionPercent,
      solarFractionPercent,
      paybackPeriodYears: Math.min(25, paybackPeriodYears),
      twentyFiveYearSavingsInr: Math.round(cumulativeCash),
      levelizedCostOfEnergyInrPerKwh: lcoe,
      carbonOffsetTonnesPerYear,
      equivalentTreesPlanted,
      yearlyCashFlow,
    },
  };
}

export function formatINR(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2)} Lakh`;
  }
  return `${sign}₹${abs.toLocaleString('en-IN')}`;
}
