import React from 'react';
import {
  TrendingUp,
  PiggyBank,
  CheckCircle,
} from 'lucide-react';
import { CompleteSimulationResults } from '../types/solar';

interface FinancialsTabProps {
  results: CompleteSimulationResults;
}

export const FinancialsTab: React.FC<FinancialsTabProps> = ({ results }) => {
  const { financials, config } = results;

  const cashFlows = financials.yearlyCashFlow;
  const minCash = Math.min(...cashFlows);
  const maxCash = Math.max(...cashFlows);
  const totalRange = maxCash - minCash;

  const roiPercent =
    config.systemCostUsd > 0
      ? Math.round((financials.twentyFiveYearSavingsUsd / config.systemCostUsd) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Financial Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Payback Period
          </span>
          <div className="text-3xl font-black text-amber-400 font-mono">
            {financials.paybackPeriodYears > 25 ? '> 25' : financials.paybackPeriodYears}{' '}
            <span className="text-sm font-sans text-slate-400">Years</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Time required for energy savings to break even with initial capital cost.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            25-Year Net Profit
          </span>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            ${financials.twentyFiveYearSavingsUsd.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Net financial return after all initial costs, degradation, & inverter replacement.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block mb-1">
            Levelized Cost (LCOE)
          </span>
          <div className="text-3xl font-black text-sky-400 font-mono">
            ${financials.levelizedCostOfEnergyUsdPerKwh.toFixed(3)}{' '}
            <span className="text-sm font-sans text-slate-400">/kWh</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Effective generation cost compared to utility retail rate of ${config.gridElectricityRateUsd}/kWh.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider block mb-1">
            25-Year ROI
          </span>
          <div className="text-3xl font-black text-purple-400 font-mono">
            {roiPercent}%
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Return on capital invested over the 25-year manufacturer guaranteed panel lifespan.
          </p>
        </div>
      </div>

      {/* 25-Year Cumulative Cash Flow Curve (SVG Vector) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> 25-Year Cumulative Cash Flow Projection
            </h3>
            <p className="text-xs text-slate-400">
              Models 0.5%/yr module degradation, 2.5%/yr utility inflation, and Year 12 inverter replacement.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-slate-300">Net Cumulative Cash ($)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-red-400 border-dashed border-b" />
              <span className="text-slate-400">Breakeven ($0)</span>
            </div>
          </div>
        </div>

        {/* Cash Flow SVG Chart */}
        <div className="w-full h-80 pt-4">
          <svg
            viewBox="0 0 800 260"
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            {/* Zero Dollar Breakeven Line */}
            {(() => {
              const zeroY = 240 - ((0 - minCash) / totalRange) * 220;
              return (
                <g>
                  <line
                    x1="45"
                    y1={zeroY}
                    x2="780"
                    y2={zeroY}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />
                  <text
                    x="40"
                    y={zeroY + 3}
                    textAnchor="end"
                    fill="#ef4444"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    $0 Breakeven
                  </text>
                </g>
              );
            })()}

            {/* Cash Flow Polyline */}
            {(() => {
              const points = cashFlows.map((cash, year) => {
                const x = 50 + (year / 25) * 720;
                const y = 240 - ((cash - minCash) / totalRange) * 220;
                return `${x},${y}`;
              });

              return (
                <g>
                  <path
                    d={`M ${points.join(' L ')}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                  />
                  {/* Point circles */}
                  {cashFlows.map((cash, year) => {
                    const x = 50 + (year / 25) * 720;
                    const y = 240 - ((cash - minCash) / totalRange) * 220;
                    const isBreakevenYear = Math.round(financials.paybackPeriodYears) === year;

                    return (
                      <g key={year}>
                        <circle
                          cx={x}
                          cy={y}
                          r={isBreakevenYear ? 6 : 3}
                          fill={cash >= 0 ? '#10b981' : '#f43f5e'}
                          stroke="#0f172a"
                          strokeWidth="1.5"
                        />
                        {year % 5 === 0 && (
                          <text
                            x={x}
                            y="255"
                            textAnchor="middle"
                            fill="#94a3b8"
                            fontSize="9"
                            fontFamily="monospace"
                          >
                            Yr {year}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* Assumptions & Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-amber-400" /> Capital & Lifecycle Cost Breakdown
          </h4>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Total Upfront Turnkey System:</span>
              <span className="font-mono font-bold text-white">${config.systemCostUsd.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">PV Hardware & Racking (~60%):</span>
              <span className="font-mono text-slate-300">${Math.round(config.systemCostUsd * 0.6).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Inverter & Power Electronics:</span>
              <span className="font-mono text-slate-300">${Math.round(config.inverterCapacityKw * 220).toLocaleString()}</span>
            </div>
            {config.hasBattery && (
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Battery Storage Pack:</span>
                <span className="font-mono text-emerald-400">${Math.round(config.batteryCapacityKwh * 450).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Annual O&M Allowance:</span>
              <span className="font-mono text-slate-300">${Math.round(config.systemCapacityKw * 15)}/year</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Inverter Replacement (Year 12):</span>
              <span className="font-mono text-amber-400">${Math.round(config.inverterCapacityKw * 220).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" /> Economic Model Assumptions
          </h4>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span><strong>Module Degradation:</strong> 0.5% per annum standard warranty decay.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span><strong>Utility Tariff Escalation:</strong> 2.5% compounding annual grid price inflation.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span><strong>Real Discount Rate:</strong> 4.0% used for Levelized Cost of Energy (LCOE) discounting.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span><strong>Net Metering / Export Credit:</strong> Credited at ${config.feedInTariffUsd}/kWh.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span><strong>Carbon Avoidance Intensity:</strong> 0.42 kg CO₂/kWh national grid offset benchmark.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
