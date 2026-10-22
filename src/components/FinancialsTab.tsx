import React from 'react';
import {
  TrendingUp,
  PiggyBank,
  CheckCircle,
} from 'lucide-react';
import { CompleteSimulationResults } from '../types/solar';
import { formatINR } from '../lib/financial-engine';

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
    config.systemCostInr > 0
      ? Math.round((financials.twentyFiveYearSavingsInr / config.systemCostInr) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Financial Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Payback Period
          </span>
          <div className="text-3xl font-bold text-amber-600 font-mono">
            {financials.paybackPeriodYears > 25 ? '> 25' : financials.paybackPeriodYears}{' '}
            <span className="text-sm font-sans text-slate-500 font-normal">Years</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Time required for energy savings to break even with initial capital cost.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            25-Year Net Profit
          </span>
          <div className="text-3xl font-bold text-emerald-600 font-mono">
            {formatINR(financials.twentyFiveYearSavingsInr)}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Net cumulative return over 25 years after maintenance & inverter replacement.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-[11px] font-semibold text-sky-600 uppercase tracking-wider block mb-1">
            Levelized Cost (LCOE)
          </span>
          <div className="text-3xl font-bold text-sky-600 font-mono">
            ₹{financials.levelizedCostOfEnergyInrPerKwh.toFixed(2)}{' '}
            <span className="text-sm font-sans text-slate-500 font-normal">/unit</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Your generation cost vs utility grid retail rate of ₹{config.gridElectricityRateInr}/unit.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider block mb-1">
            25-Year ROI
          </span>
          <div className="text-3xl font-bold text-purple-600 font-mono">
            {roiPercent}%
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Return on capital invested over module performance warranty lifespan.
          </p>
        </div>
      </div>

      {/* 25-Year Cumulative Cash Flow Curve */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> 25-Year Cumulative Cash Flow Projection
            </h3>
            <p className="text-xs text-slate-500">
              Accounts for 0.5%/yr degradation, 3.5%/yr tariff inflation, and Year 12 inverter replacement.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-700">Net Cumulative Cash (₹)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-rose-500 border-dashed border-b" />
              <span className="text-slate-500">Breakeven (₹0)</span>
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
                    x1="55"
                    y1={zeroY}
                    x2="780"
                    y2={zeroY}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    strokeWidth="1.2"
                  />
                  <text
                    x="50"
                    y={zeroY + 3}
                    textAnchor="end"
                    fill="#e11d48"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    ₹0 Breakeven
                  </text>
                </g>
              );
            })()}

            {/* Cash Flow Polyline */}
            {(() => {
              const points = cashFlows.map((cash, year) => {
                const x = 60 + (year / 25) * 710;
                const y = 240 - ((cash - minCash) / totalRange) * 220;
                return `${x},${y}`;
              });

              return (
                <g>
                  <path
                    d={`M ${points.join(' L ')}`}
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2.5"
                  />
                  {cashFlows.map((cash, year) => {
                    const x = 60 + (year / 25) * 710;
                    const y = 240 - ((cash - minCash) / totalRange) * 220;
                    const isBreakevenYear = Math.round(financials.paybackPeriodYears) === year;

                    return (
                      <g key={year}>
                        <circle
                          cx={x}
                          cy={y}
                          r={isBreakevenYear ? 5 : 2.5}
                          fill={cash >= 0 ? '#059669' : '#e11d48'}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        {year % 5 === 0 && (
                          <text
                            x={x}
                            y="255"
                            textAnchor="middle"
                            fill="#64748b"
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h4 className="text-xs font-bold text-slate-900 mb-4 uppercase tracking-wider flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-amber-500" /> Capital & Lifecycle Cost Breakdown
          </h4>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Total Upfront System Capex:</span>
              <span className="font-mono font-bold text-slate-900">{formatINR(config.systemCostInr)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">PV Modules & Racking (~60%):</span>
              <span className="font-mono text-slate-700">{formatINR(Math.round(config.systemCostInr * 0.6))}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Inverter & Power Electronics:</span>
              <span className="font-mono text-slate-700">{formatINR(Math.round(config.inverterCapacityKw * 10000))}</span>
            </div>
            {config.hasBattery && (
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Battery Storage Pack:</span>
                <span className="font-mono text-emerald-700 font-semibold">{formatINR(Math.round(config.batteryCapacityKwh * 25000))}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Annual Maintenance Allowance:</span>
              <span className="font-mono text-slate-700">₹{Math.round(config.systemCapacityKw * 500)}/yr</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-600">Inverter Replacement (Year 12):</span>
              <span className="font-mono text-amber-700 font-semibold">{formatINR(Math.round(config.inverterCapacityKw * 10000))}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h4 className="text-xs font-bold text-slate-900 mb-4 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" /> Economic Model Assumptions
          </h4>
          <ul className="space-y-2.5 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span><strong>Module Degradation:</strong> 0.5% per annum standard warranty performance decay.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span><strong>Utility Tariff Escalation:</strong> 3.5% compounding annual grid price inflation.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span><strong>Discount Rate:</strong> 6.0% real rate for Levelized Cost of Energy (LCOE) discounting.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span><strong>Net Metering / Export Credit:</strong> Credited at ₹{config.feedInTariffInr.toFixed(2)}/unit.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span><strong>Carbon Avoidance:</strong> 0.71 kg CO₂/kWh grid intensity factor.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
