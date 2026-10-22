import React from 'react';
import {
  Sun,
  Zap,
  BatteryCharging,
  TrendingUp,
  Leaf,
  ArrowRight,
  CheckCircle2,
  Globe,
  IndianRupee,
} from 'lucide-react';
import { CompleteSimulationResults } from '../types/solar';
import { formatINR } from '../lib/financial-engine';

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
    financials.annualLoadKwh * config.gridElectricityRateInr
  );
  const netAnnualBillAfterSolar = Math.max(
    0,
    netAnnualBillBeforeSolar - financials.annualTotalSavingsInr
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Location & Dataset Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#0f1422] border border-[#1e2638] rounded-xl px-4 py-3 text-xs gap-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="text-slate-300">
            Rooftop in <strong className="text-white">{location.name}</strong>
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400 hidden sm:inline">
            {isSimulatedWeather
              ? 'Clear-Sky Atmospheric Model'
              : 'Direct Open-Meteo High-Resolution Solar Radiation Dataset'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px] self-end sm:self-auto">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Physics Verified</span>
        </div>
      </div>

      {/* KPI Highlight Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Annual Generation */}
        <div className="bg-[#0f1422] border border-[#1e2638] hover:border-slate-700 rounded-xl p-4 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Annual Yield</span>
            <Sun className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {financials.annualGenerationKwh.toLocaleString('en-IN')}
              <span className="text-xs font-normal text-slate-400 font-sans ml-1">kWh</span>
            </div>
            <div className="text-[11px] text-amber-400 font-mono mt-0.5">
              {specificYield} units/kWp/yr
            </div>
          </div>
        </div>

        {/* Card 2: Self-Consumption */}
        <div className="bg-[#0f1422] border border-[#1e2638] hover:border-slate-700 rounded-xl p-4 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Self-Consumed</span>
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {financials.selfConsumptionPercent}%
            </div>
            <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
              Solar Fraction: {financials.solarFractionPercent}%
            </div>
          </div>
        </div>

        {/* Card 3: Annual Savings (INR) */}
        <div className="bg-[#0f1422] border border-[#1e2638] hover:border-slate-700 rounded-xl p-4 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Annual Savings</span>
            <IndianRupee className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {formatINR(financials.annualTotalSavingsInr)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Save {formatINR(Math.round(financials.annualTotalSavingsInr / 12))}/mo
            </div>
          </div>
        </div>

        {/* Card 4: Payback Period */}
        <div className="bg-[#0f1422] border border-[#1e2638] hover:border-slate-700 rounded-xl p-4 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Payback Time</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {financials.paybackPeriodYears > 25 ? '> 25' : financials.paybackPeriodYears}
              <span className="text-xs font-normal text-slate-400 font-sans ml-1">yrs</span>
            </div>
            <div className="text-[11px] text-purple-400 font-mono mt-0.5">
              LCOE: ₹{financials.levelizedCostOfEnergyInrPerKwh.toFixed(2)}/unit
            </div>
          </div>
        </div>

        {/* Card 5: 25-Year Net Profit */}
        <div className="bg-[#0f1422] border border-[#1e2638] hover:border-slate-700 rounded-xl p-4 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">25-Yr Net Return</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {formatINR(financials.twentyFiveYearSavingsInr)}
            </div>
            <div className="text-[11px] text-amber-400 font-mono mt-0.5">
              ROI: {config.systemCostInr > 0 ? `${Math.round((financials.twentyFiveYearSavingsInr / config.systemCostInr) * 100)}%` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Card 6: Carbon Offset (India Grid Benchmark) */}
        <div className="bg-[#0f1422] border border-[#1e2638] hover:border-slate-700 rounded-xl p-4 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">CO₂ Offset</span>
            <Leaf className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {financials.carbonOffsetTonnesPerYear}
              <span className="text-xs font-normal text-slate-400 font-sans ml-1">t/yr</span>
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5">
              🌲 {financials.equivalentTreesPlanted} trees / yr
            </div>
          </div>
        </div>
      </div>

      {/* Energy Flow & Dispatch Balance */}
      <div className="bg-[#0f1422] border border-[#1e2638] rounded-2xl p-6 shadow-xl">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Energy Generation & Dispatch Architecture
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
          {/* Generation Block */}
          <div className="bg-[#080c14] border border-[#1e2638] rounded-xl p-5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-amber-400">
                1. Solar PV Generation
              </span>
              <Sun className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {financials.annualGenerationKwh.toLocaleString('en-IN')}
              <span className="text-xs text-slate-400 font-sans ml-1">Units (kWh) / yr</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mt-1">
              Generated by {config.systemCapacityKw} kWp elevated array on flat terrace tilted at {config.panelTiltDeg}° facing South.
            </p>
          </div>

          {/* Central Energy Dispatch Hub */}
          <div className="flex flex-col gap-2.5 text-center">
            <div className="bg-[#121826] border border-[#1e2638] rounded-xl p-4">
              <span className="text-xs font-semibold text-slate-400 block mb-1">
                Direct Self-Consumption
              </span>
              <span className="text-2xl font-bold text-white font-mono">
                {financials.selfConsumptionPercent}%
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Powering appliances directly without grid draw
              </p>
            </div>

            {config.hasBattery && (
              <div className="bg-[#121826] border border-[#1e2638] rounded-xl p-3">
                <span className="text-xs font-semibold text-emerald-400 block mb-0.5">
                  Battery Buffering ({config.batteryCapacityKwh} kWh)
                </span>
                <span className="text-[11px] text-slate-400">
                  Discharges during night power cuts & peak load
                </span>
              </div>
            )}
          </div>

          {/* Consumption & Grid Block */}
          <div className="bg-[#080c14] border border-[#1e2638] rounded-xl p-5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-sky-400">
                2. Consumption & Discom Grid
              </span>
              <Zap className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {financials.annualLoadKwh.toLocaleString('en-IN')}
              <span className="text-xs text-slate-400 font-sans ml-1">Units Demand / yr</span>
            </div>
            <div className="text-xs text-slate-400 flex flex-col gap-1 mt-1">
              <div className="flex justify-between">
                <span>Solar Coverage:</span>
                <span className="text-emerald-400 font-semibold">{financials.solarFractionPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span>Discom Grid Reliance:</span>
                <span className="text-slate-300 font-semibold">{Math.max(0, 100 - financials.solarFractionPercent)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Electricity Bill Comparison Bar */}
      <div className="bg-[#0f1422] border border-[#1e2638] rounded-2xl p-6 shadow-xl">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-emerald-400" /> Discom Electricity Bill Impact
        </h3>

        <div className="flex flex-col md:flex-row items-center gap-5">
          <div className="flex-1 w-full flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Without Solar (100% Discom Grid):</span>
              <span className="font-mono font-bold text-slate-300">{formatINR(netAnnualBillBeforeSolar)}/year</span>
            </div>
            <div className="h-3 bg-[#080c14] rounded-full overflow-hidden border border-[#1e2638]">
              <div className="h-full bg-rose-500/80 w-full" />
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-600 hidden md:block" />

          <div className="flex-1 w-full flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-emerald-400 font-medium">With Rooftop Solar Net Metering:</span>
              <span className="font-mono font-bold text-emerald-400">{formatINR(netAnnualBillAfterSolar)}/year</span>
            </div>
            <div className="h-3 bg-[#080c14] rounded-full overflow-hidden border border-[#1e2638]">
              <div
                className="h-full bg-emerald-500 transition-all duration-700"
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
