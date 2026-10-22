import React from 'react';
import {
  Sun,
  Zap,
  BatteryCharging,
  TrendingUp,
  Leaf,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import { CompleteSimulationResults } from '../types/solar';

interface OverviewTabProps {
  results: CompleteSimulationResults;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ results }) => {
  const { financials, config, location, isSimulatedWeather } = results;

  const specificYield =
    config.systemCapacityKw > 0
      ? Math.round(financials.annualGenerationKwh / config.systemCapacityKw)
      : 0;

  const netAnnualBillBeforeSolar = Math.round(
    financials.annualLoadKwh * config.gridElectricityRateUsd
  );
  const netAnnualBillAfterSolar = Math.max(
    0,
    netAnnualBillBeforeSolar - financials.annualTotalSavingsUsd
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Weather Source Notification Banner */}
      <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-sky-400" />
          <span className="text-slate-300">
            Simulated for <strong className="text-white">{location.name}</strong>
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">
            {isSimulatedWeather
              ? 'Clear-Sky Atmospheric Model'
              : 'Direct Open-Meteo High-Resolution Solar Radiation Dataset'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Physics Verified</span>
        </div>
      </div>

      {/* KPI Highlight Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Annual Yield */}
        <div className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 transition shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Annual Yield</span>
            <div className="p-1.5 bg-amber-400/10 text-amber-400 rounded-lg">
              <Sun className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              {financials.annualGenerationKwh.toLocaleString()}
              <span className="text-xs font-normal text-slate-400 ml-1">kWh</span>
            </div>
            <div className="text-[11px] text-amber-400/90 font-mono mt-1">
              {specificYield} kWh/kWp
            </div>
          </div>
        </div>

        {/* Card 2: Self-Consumption */}
        <div className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 transition shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Self-Consumed</span>
            <div className="p-1.5 bg-emerald-400/10 text-emerald-400 rounded-lg">
              <BatteryCharging className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              {financials.selfConsumptionPercent}%
            </div>
            <div className="text-[11px] text-emerald-400 font-mono mt-1">
              Solar Fraction: {financials.solarFractionPercent}%
            </div>
          </div>
        </div>

        {/* Card 3: Annual Savings */}
        <div className="bg-slate-900/80 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-4 transition shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Annual Savings</span>
            <div className="p-1.5 bg-sky-400/10 text-sky-400 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              ${financials.annualTotalSavingsUsd.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Save ${Math.round(financials.annualTotalSavingsUsd / 12)}/mo
            </div>
          </div>
        </div>

        {/* Card 4: Payback Period */}
        <div className="bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-4 transition shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Payback Time</span>
            <div className="p-1.5 bg-purple-400/10 text-purple-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              {financials.paybackPeriodYears > 25 ? '> 25' : financials.paybackPeriodYears}
              <span className="text-xs font-normal text-slate-400 ml-1">yrs</span>
            </div>
            <div className="text-[11px] text-purple-400 font-mono mt-1">
              LCOE: ${financials.levelizedCostOfEnergyUsdPerKwh.toFixed(3)}/kWh
            </div>
          </div>
        </div>

        {/* Card 5: 25-Year Net Profit */}
        <div className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 transition shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">25-Yr Net Profit</span>
            <div className="p-1.5 bg-amber-400/10 text-amber-400 rounded-lg">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              ${financials.twentyFiveYearSavingsUsd.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-400 font-mono mt-1">
              ROI: {config.systemCostUsd > 0 ? `${Math.round((financials.twentyFiveYearSavingsUsd / config.systemCostUsd) * 100)}%` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Card 6: Carbon Offset */}
        <div className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 transition shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">CO₂ Avoided</span>
            <div className="p-1.5 bg-emerald-400/10 text-emerald-400 rounded-lg">
              <Leaf className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              {financials.carbonOffsetTonnesPerYear}
              <span className="text-xs font-normal text-slate-400 ml-1">t/yr</span>
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              🌲 {financials.equivalentTreesPlanted} trees planted
            </div>
          </div>
        </div>
      </div>

      {/* Energy Flow & Balance Sankey-Style Diagram */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Energy Flow & Dispatch Architecture
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Generation Block */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                1. Solar PV Generation
              </span>
              <Sun className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {financials.annualGenerationKwh.toLocaleString()}
              <span className="text-xs text-slate-400 font-sans ml-1">kWh/yr</span>
            </div>
            <p className="text-xs text-slate-400">
              Generated by {config.systemCapacityKw} kWp array tilted at {config.panelTiltDeg}° oriented {config.panelAzimuthDeg}°.
            </p>
          </div>

          {/* Central Energy Dispatch Hub */}
          <div className="flex flex-col gap-3 text-center">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <span className="text-xs font-bold text-amber-400 block mb-1">
                Direct Self-Consumption
              </span>
              <span className="text-xl font-bold text-white font-mono">
                {financials.selfConsumptionPercent}%
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                Satisfies household load instantaneously
              </p>
            </div>

            {config.hasBattery && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <span className="text-xs font-bold text-emerald-400 block mb-1">
                  Battery Buffering ({config.batteryCapacityKwh} kWh)
                </span>
                <span className="text-xs text-emerald-200">
                  Stores daytime surplus for evening peak load
                </span>
              </div>
            )}
          </div>

          {/* Consumption & Grid Block */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                2. Facility Consumption & Grid
              </span>
              <Zap className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {financials.annualLoadKwh.toLocaleString()}
              <span className="text-xs text-slate-400 font-sans ml-1">kWh/yr Demand</span>
            </div>
            <div className="text-xs text-slate-400 flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Solar Coverage:</span>
                <span className="text-emerald-400 font-semibold">{financials.solarFractionPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining Grid Reliance:</span>
                <span className="text-slate-300 font-semibold">{Math.max(0, 100 - financials.solarFractionPercent)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bill Comparison Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" /> Electricity Bill Comparison
        </h3>

        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 w-full flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Without Solar (Utility Grid):</span>
              <span className="font-mono font-bold text-slate-300">${netAnnualBillBeforeSolar}/year</span>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-500/80 w-full" />
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-600 hidden md:block" />

          <div className="flex-1 w-full flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-emerald-400 font-medium">With Solar PV + Battery:</span>
              <span className="font-mono font-bold text-emerald-400">${netAnnualBillAfterSolar}/year</span>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-1000"
                style={{
                  width: `${netAnnualBillBeforeSolar > 0 ? Math.min(100, Math.max(5, (netAnnualBillAfterSolar / netAnnualBillBeforeSolar) * 100)) : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
