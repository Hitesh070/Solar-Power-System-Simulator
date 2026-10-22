import React from 'react';
import { BarChart3, TrendingUp, ArrowDown, ArrowUp } from 'lucide-react';
import { CompleteSimulationResults } from '../types/solar';
import { formatINR } from '../lib/financial-engine';

interface MonthlyYieldTabProps {
  results: CompleteSimulationResults;
}

export const MonthlyYieldTab: React.FC<MonthlyYieldTabProps> = ({ results }) => {
  const { monthly, config } = results;

  const maxMonthlyYield = Math.max(1, ...monthly.map((m) => m.solarYieldKwh));
  const maxMonthlyLoad = Math.max(1, ...monthly.map((m) => m.loadKwh));
  const maxBarValue = Math.max(maxMonthlyYield, maxMonthlyLoad) * 1.1;

  const sortedByYield = [...monthly].sort((a, b) => b.solarYieldKwh - a.solarYieldKwh);
  const bestMonth = sortedByYield[0];
  const lowestMonth = sortedByYield[sortedByYield.length - 1];

  return (
    <div className="flex flex-col gap-5">
      {/* Month Highlights Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-500 font-medium">Peak Solar Month</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5 font-mono">
              {bestMonth.monthName} ({bestMonth.solarYieldKwh.toLocaleString('en-IN')} units)
            </div>
            <span className="text-[11px] text-slate-400">Highest daily solar insolation</span>
          </div>
          <div className="p-2.5 bg-slate-100 text-slate-900 rounded-xl border border-slate-200">
            <ArrowUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-500 font-medium">Lowest Solar Month</span>
            <div className="text-xl font-bold text-sky-600 mt-0.5 font-mono">
              {lowestMonth.monthName} ({lowestMonth.solarYieldKwh.toLocaleString('en-IN')} units)
            </div>
            <span className="text-[11px] text-slate-400">Monsoon cloud cover / winter dip</span>
          </div>
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl border border-sky-200">
            <ArrowDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-500 font-medium">Seasonal Variance</span>
            <div className="text-xl font-bold text-purple-600 mt-0.5 font-mono">
              {lowestMonth.solarYieldKwh > 0
                ? `${(bestMonth.solarYieldKwh / lowestMonth.solarYieldKwh).toFixed(1)}x`
                : 'N/A'}
            </div>
            <span className="text-[11px] text-slate-400">Summer to monsoon yield spread</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-200">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Monthly Yield & Load Comparison Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-900" /> 12-Month Generation vs Consumption
            </h3>
            <p className="text-xs text-slate-500">
              Evaluates seasonal surplus and deficit months across the calendar year.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-900" />
              <span className="text-slate-700">Solar Yield (kWh)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
              <span className="text-slate-700">Demand (kWh)</span>
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
                  <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none mb-2 text-center">
                    <span className="text-[10px] font-mono text-slate-900 block font-bold">
                      {m.solarYieldKwh}
                    </span>
                    <span className="text-[10px] font-mono text-purple-600 block">
                      {m.loadKwh}
                    </span>
                  </div>

                  <div className="w-full flex items-end justify-center gap-1 h-44">
                    <div
                      style={{ height: `${solarHeightPct}%` }}
                      className="w-1/2 max-w-[20px] bg-slate-900 rounded-t transition-all duration-500 hover:bg-black"
                    />
                    <div
                      style={{ height: `${loadHeightPct}%` }}
                      className="w-1/2 max-w-[20px] bg-purple-500/70 hover:bg-purple-600 rounded-t transition-all duration-500"
                    />
                  </div>

                  <div className="mt-2 text-center w-full">
                    <span className="text-xs font-semibold text-slate-700 block">{m.monthName}</span>
                    <span
                      className={`text-[9px] font-bold block mt-0.5 rounded px-1 ${
                        isSurplus
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-slate-400'
                      }`}
                    >
                      {isSurplus ? '+Export' : '-Grid'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Monthly Energy Accounting Table</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3 text-right">Solar Yield (kWh)</th>
                <th className="px-4 py-3 text-right">Demand (kWh)</th>
                <th className="px-4 py-3 text-right">Self-Consumed (kWh)</th>
                <th className="px-4 py-3 text-right">Grid Export (kWh)</th>
                <th className="px-4 py-3 text-right">Grid Import (kWh)</th>
                <th className="px-4 py-3 text-right">Bill Savings (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {monthly.map((m) => {
                const savings = Math.round(
                  m.selfConsumptionKwh * config.gridElectricityRateInr +
                  m.gridExportKwh * config.feedInTariffInr
                );
                return (
                  <tr key={m.month} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-sans font-semibold text-slate-900">{m.monthName}</td>
                    <td className="px-4 py-3 text-right text-slate-900 font-bold">
                      {m.solarYieldKwh.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-purple-700">
                      {m.loadKwh.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700">
                      {m.selfConsumptionKwh.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-sky-700">
                      {m.gridExportKwh.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {m.gridImportKwh.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-bold">
                      {formatINR(savings)}
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
