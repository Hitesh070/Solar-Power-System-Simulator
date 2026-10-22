import { PVSystemConfig, FinancialMetrics, HourlySimulationResult, MonthlySummary } from '../types/solar';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Format currency in Indian numbering system (Lakhs / Crores / Thousands)
 */
export function formatINR(value: number): string {
  if (isNaN(value)) return '₹0';
  const absVal = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absVal >= 10000000) {
    return `${sign}₹${(absVal / 10000000).toFixed(2)} Cr`;
  } else if (absVal >= 100000) {
    return `${sign}₹${(absVal / 100000).toFixed(2)} L`;
  } else {
    return `${sign}₹${absVal.toLocaleString('en-IN')}`;
  }
}

/**
 * Computes monthly summaries and 25-year financial ROI metrics based on hourly simulation outputs.
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

  const totalHours = hourly.length;
  const isFullYear = totalHours >= 8760;

  // Track sample statistics
  const sampleDays = Math.max(1, totalHours / 24);
  const totalSampleSolarKwh = hourly.reduce((sum, rec) => sum + rec.solarAcPowerKw, 0);
  const totalSampleDirectUsedKwh = hourly.reduce((sum, rec) => sum + rec.directSolarUsedKw, 0);
  const totalSampleBatteryDischargeKwh = hourly.reduce((sum, rec) => sum + rec.batteryDischargeKw, 0);
  const avgSamplePoa = totalHours > 0 ? hourly.reduce((sum, rec) => sum + rec.poaIrradianceW, 0) / totalHours : 0;

  const avgDailySolarKwh = totalSampleSolarKwh / sampleDays;
  const sampleSelfConsumptionKwh = totalSampleDirectUsedKwh + totalSampleBatteryDischargeKwh;
  const selfConsumptionRatio = totalSampleSolarKwh > 0
    ? Math.min(1.0, Math.max(0.2, sampleSelfConsumptionKwh / totalSampleSolarKwh))
    : 0.8;

  // Annualized base solar generation for Indian climate (approx 365.25 days)
  const annualBaseSolarKwh = avgDailySolarKwh * 365.25;

  // Typical Indian insolation distribution across 12 calendar months:
  // March-May is peak summer (10.5-11.5%), July-August is monsoon cloud cover dip (6.5%), Nov-Feb is crisp clear winter sun (7.5-8.5%)
  const monthWeights = [0.075, 0.085, 0.105, 0.115, 0.11, 0.08, 0.065, 0.065, 0.08, 0.09, 0.085, 0.08];
  const daysInMonths = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

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
    }
  });

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
      : Math.max(0, solarYield - selfConsumption);

    const gridImport = isFullYear
      ? b.gridImportKwh
      : Math.max(0, load - selfConsumption);

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
  // Self-consumed solar offsets DISCOM retail power bill
  const annualGridSavingsInr = Math.round(annualSelfConsumptionKwh * config.gridElectricityRateInr);
  
  // Surplus units exported to grid credited at feed-in rate
  const annualFeedInRevenueInr = Math.round(annualGridExportKwh * config.feedInTariffInr);

  const annualTotalSavingsInr = annualGridSavingsInr + annualFeedInRevenueInr;

  const selfConsumptionPercent = annualGenerationKwh > 0
    ? Math.min(100, Math.round((annualSelfConsumptionKwh / annualGenerationKwh) * 100))
    : 0;

  const solarFractionPercent = annualLoadKwh > 0
    ? Math.min(100, Math.round((annualSelfConsumptionKwh / annualLoadKwh) * 100))
    : 0;

  // 25-Year Cumulative Cash Flow Model for India
  const discountRate = 0.06; // 6% real discount rate in India
  const utilityEscalationRate = 0.035; // 3.5% annual DISCOM tariff increase
  const degradationRate = config.annualDegradationPercent / 100; // 0.5%
  const inverterReplacementYear = 12;
  const inverterCostInr = Math.round(config.inverterCapacityKw * 10000); // ~₹10,000/kW in India
  const omCostPerYear = Math.round(config.systemCapacityKw * 500); // ₹500/kW/yr maintenance

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
    const currentRate = config.gridElectricityRateInr * tariffFactor;
    const currentExportRate = config.feedInTariffInr * tariffFactor;

    const yearSavings = (yearSelfConsumptionKwh * currentRate) + (yearExportKwh * currentExportRate);
    
    let yearExpenses = omCostPerYear;
    if (year === inverterReplacementYear) {
      yearExpenses += inverterCostInr;
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
  const lcoe = discountedEnergySum > 0
    ? Math.round((discountedCostSum / discountedEnergySum) * 100) / 100
    : 2.80;

  // Environmental Metrics for India (CEA grid emissions factor: ~0.71 kg CO2/kWh in India)
  const carbonOffsetTonnesPerYear = Math.round((annualGenerationKwh * 0.71) / 100) / 10;
  const equivalentTreesPlanted = Math.round((carbonOffsetTonnesPerYear * 1000) / 22);

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
      paybackPeriodYears,
      twentyFiveYearSavingsInr: Math.round(yearlyCashFlow[25]),
      levelizedCostOfEnergyInrPerKwh: lcoe,
      carbonOffsetTonnesPerYear,
      equivalentTreesPlanted,
      yearlyCashFlow,
    },
  };
}
