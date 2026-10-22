import React from 'react';
import { BarChart3, TrendingUp, ArrowDown, ArrowUp } from 'lucide-react';
import { CompleteSimulationResults } from '../types/solar';

interface MonthlyYieldTabProps {
  results: CompleteSimulationResults;
}

export const MonthlyYieldTab: React.FC<MonthlyYieldTabProps> = ({ results }) => {
  const { monthly, config } = results;

  const maxMonthlyYield = Math.max(1, ...monthly.map((m) => m.solarYieldKwh));
  const maxMonthlyLoad = Math.max(1, ...monthly.map((m) => m.loadKwh));
  const maxBarValue = Math.max(maxMonthlyYield, maxMonthlyLoad) * 1.1;

  // Best & Worst solar production months
  const sortedByYield = [...monthly].sort((a, b) => b.solarYieldKwh - a.solarYieldKwh);
  const bestMonth = sortedByYield[0];
  const lowestMonth = sortedByYield[sortedByYield.length - 1];

  return (
    <div className="flex flex-col gap-6">
      {/* Month Highlights Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Peak Solar Month</span>
            <div className="text-xl font-bold text-amber-400 mt-0.5">
              {bestMonth.monthName} ({bestMonth.solarYieldKwh.toLocaleString()} kWh)
            </div>
            <span className="text-[11px] text-slate-500">Highest daily solar insolation</span>
          </div>
          <div className="p-2.5 bg-amber-400/10 text-amber-400 rounded-xl">
            <ArrowUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Lowest Solar Month</span>
            <div className="text-xl font-bold text-sky-400 mt-0.5">
              {lowestMonth.monthName} ({lowestMonth.solarYieldKwh.toLocaleString()} kWh)
            </div>
            <span className="text-[11px] text-slate-500">Winter low solar angle</span>
          </div>
          <div className="p-2.5 bg-sky-400/10 text-sky-400 rounded-xl">
            <ArrowDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Seasonal Ratio</span>
            <div className="text-xl font-bold text-purple-400 mt-0.5">
              {lowestMonth.solarYieldKwh > 0
                ? `${(bestMonth.solarYieldKwh / lowestMonth.solarYieldKwh).toFixed(1)}x`
                : 'N/A'}
            </div>
            <span className="text-[11px] text-slate-500">Summer to winter production spread</span>
          </div>
          <div className="p-2.5 bg-purple-400/10 text-purple-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Monthly Yield & Load Comparison Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" /> 12-Month Production vs Consumption
            </h3>
            <p className="text-xs text-slate-400">
              Evaluates seasonal surplus and deficit months across the calendar year.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-400" />
              <span className="text-slate-300">Solar Generation (kWh)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-purple-400" />
              <span className="text-slate-300">Facility Load (kWh)</span>
            </div>
          </div>
        </div>

        {/* 12-Month Bar Chart */}
        <div className="w-full h-72 pt-4">
          <div className="w-full h-full flex items-end justify-between gap-2 sm:gap-4 px-2">
            {monthly.map((m) => {
              const solarHeightPct = Math.min(100, (m.solarYieldKwh / maxBarValue) * 100);
              const loadHeightPct = Math.min(100, (m.loadKwh / maxBarValue) * 100);
              const isSurplus = m.solarYieldKwh >= m.loadKwh;

              return (
                <div key={m.month} className="flex-1 flex flex-col items-center h-full justify-end group">
                  {/* Floating tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none mb-2 text-center">
                    <span className="text-[10px] font-mono text-amber-400 block font-bold">
                      {m.solarYieldKwh} kWh
                    </span>
                    <span className="text-[10px] font-mono text-purple-400 block">
                      {m.loadKwh} kWh
                    </span>
                  </div>

                  {/* Dual Bar Container */}
                  <div className="w-full flex items-end justify-center gap-1 h-44">
                    {/* Solar Bar */}
                    <div
                      style={{ height: `${solarHeightPct}%` }}
                      className="w-1/2 max-w-[20px] bg-gradient-to-t from-amber-500 to-amber-300 rounded-t-md transition-all duration-500 hover:brightness-110"
                    />
                    {/* Load Bar */}
                    <div
                      style={{ height: `${loadHeightPct}%` }}
                      className="w-1/2 max-w-[20px] bg-purple-500/70 hover:bg-purple-500 rounded-t-md transition-all duration-500"
                    />
                  </div>

                  {/* Month Label & Surplus Pill */}
                  <div className="mt-2 text-center w-full">
                    <span className="text-xs font-bold text-slate-300 block">{m.monthName}</span>
                    <span
                      className={`text-[9px] font-bold block mt-0.5 rounded px-1 ${
                        isSurplus
                          ? 'text-emerald-400 bg-emerald-400/10'
                          : 'text-slate-500'
                      }`}
                    >
                      {isSurplus ? '+Surplus' : '-Grid'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">Monthly Energy Accounting Table</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3 text-right">Solar Yield (kWh)</th>
                <th className="px-4 py-3 text-right">Demand Load (kWh)</th>
                <th className="px-4 py-3 text-right">Self-Consumed (kWh)</th>
                <th className="px-4 py-3 text-right">Grid Export (kWh)</th>
                <th className="px-4 py-3 text-right">Grid Import (kWh)</th>
                <th className="px-4 py-3 text-right">Net Bill Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {monthly.map((m) => {
                const savings = Math.round(
                  m.selfConsumptionKwh * config.gridElectricityRateUsd +
                  m.gridExportKwh * config.feedInTariffUsd
                );
                return (
                  <tr key={m.month} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-sans font-bold text-white">{m.monthName}</td>
                    <td className="px-4 py-3 text-right text-amber-400 font-bold">
                      {m.solarYieldKwh.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-purple-300">
                      {m.loadKwh.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400">
                      {m.selfConsumptionKwh.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sky-400">
                      {m.gridExportKwh.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">
                      {m.gridImportKwh.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                      ${savings.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
