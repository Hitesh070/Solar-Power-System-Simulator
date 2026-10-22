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
  const yearScalingFactor = isFullYear ? 1 : (8760 / Math.max(1, totalHours));

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
    // Typical Indian insolation distribution across 12 months:
    // March-May is peak summer, July-August is monsoon dip, Nov-Feb is crisp winter sun
    const monthWeight = [0.075, 0.085, 0.105, 0.115, 0.11, 0.08, 0.065, 0.065, 0.08, 0.09, 0.085, 0.08][m - 1];
    
    const solarYield = isFullYear
      ? b.solarYieldKwh
      : (b.solarYieldKwh > 0 ? b.solarYieldKwh * yearScalingFactor * monthWeight : 0);
    const load = isFullYear
      ? b.loadKwh
      : (config.dailyConsumptionKwh * 30.4);
    const gridImport = isFullYear
      ? b.gridImportKwh
      : Math.max(0, load - solarYield * 0.75);
    const gridExport = isFullYear
      ? b.gridExportKwh
      : Math.max(0, solarYield * 0.25);
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
