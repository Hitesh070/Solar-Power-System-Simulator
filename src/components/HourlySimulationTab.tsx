import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { CompleteSimulationResults, HourlySimulationResult } from '../types/solar';

interface HourlySimulationTabProps {
  results: CompleteSimulationResults;
}

export const HourlySimulationTab: React.FC<HourlySimulationTabProps> = ({ results }) => {
  const { hourly, config } = results;
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  const totalDays = Math.max(1, Math.floor(hourly.length / 24));
  const currentDayHours: HourlySimulationResult[] = hourly.slice(
    selectedDayIndex * 24,
    (selectedDayIndex + 1) * 24
  );

  const activeHourData =
    hoveredHour !== null && currentDayHours[hoveredHour]
      ? currentDayHours[hoveredHour]
      : currentDayHours[12] || currentDayHours[0];

  const maxSolarPower = Math.max(1, ...currentDayHours.map((h) => h.solarAcPowerKw));
  const maxLoad = Math.max(1, ...currentDayHours.map((h) => h.loadKw));
  const maxChartPower = Math.max(maxSolarPower, maxLoad) * 1.15;

  return (
    <div className="flex flex-col gap-5">
      {/* Day Selector Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 text-slate-900 rounded-xl border border-slate-200">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">24-Hour Diurnal Power Profile</h3>
            <p className="text-xs text-slate-500">
              Interactive hourly energy balance between solar PV array, battery, household load, and grid.
            </p>
          </div>
        </div>

        {/* Day Slider */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            Day {selectedDayIndex + 1} of {totalDays}:
          </span>
          <input
            type="range"
            min="0"
            max={totalDays - 1}
            value={selectedDayIndex}
            onChange={(e) => setSelectedDayIndex(parseInt(e.target.value))}
            className="w-32 accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded"
          />
          <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            {currentDayHours[0]?.datetime.split('T')[0] || `Day ${selectedDayIndex + 1}`}
          </span>
        </div>
      </div>

      {/* Main Hourly Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              <span className="text-slate-700">Solar AC (kW)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span className="text-slate-700">Demand Load (kW)</span>
            </div>
            {config.hasBattery && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-700">Battery SoC (%)</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span className="text-slate-700">Export (kW)</span>
            </div>
          </div>

          {activeHourData && (
            <div className="text-xs bg-slate-50 px-3 py-1 rounded-xl border border-slate-200 flex items-center gap-2">
              <span className="text-slate-500">Hour {activeHourData.hour}:00</span>
              <span className="text-slate-900 font-mono font-bold">
                PV: {activeHourData.solarAcPowerKw} kW
              </span>
              <span className="text-purple-700 font-mono font-bold">
                Load: {activeHourData.loadKw} kW
              </span>
              {config.hasBattery && (
                <span className="text-emerald-700 font-mono font-bold">
                  SoC: {activeHourData.batterySocPercent}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* SVG Curve Chart */}
        <div className="relative w-full h-72">
          <svg
            viewBox="0 0 800 240"
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
              const y = 220 - ratio * 190;
              const kwVal = (maxChartPower * ratio).toFixed(1);
              return (
                <g key={idx}>
                  <line
                    x1="40"
                    y1={y}
                    x2="780"
                    y2={y}
                    stroke="#f1f5f9"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x="32"
                    y={y + 3}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {kwVal}kW
                  </text>
                </g>
              );
            })}

            {/* Solar PV Generation Filled Curve */}
            {(() => {
              const points = currentDayHours.map((h, i) => {
                const x = 50 + (i / 23) * 720;
                const y = 220 - (h.solarAcPowerKw / maxChartPower) * 190;
                return `${x},${y}`;
              });
              const areaPath = `M 50,220 L ${points.join(' L ')} L 770,220 Z`;
              const linePath = `M ${points.join(' L ')}`;

              return (
                <g>
                  <defs>
                    <linearGradient id="solarGradientLight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f172a" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#solarGradientLight)" />
                  <path d={linePath} fill="none" stroke="#0f172a" strokeWidth="2.5" />
                </g>
              );
            })()}

            {/* Demand Load Curve */}
            {(() => {
              const points = currentDayHours.map((h, i) => {
                const x = 50 + (i / 23) * 720;
                const y = 220 - (h.loadKw / maxChartPower) * 190;
                return `${x},${y}`;
              });
              return (
                <path
                  d={`M ${points.join(' L ')}`}
                  fill="none"
                  stroke="#9333ea"
                  strokeWidth="2"
                  strokeDasharray="5 3"
                />
              );
            })()}

            {/* Battery SoC Curve */}
            {config.hasBattery &&
              (() => {
                const points = currentDayHours.map((h, i) => {
                  const x = 50 + (i / 23) * 720;
                  const y = 220 - (h.batterySocPercent / 100) * 190;
                  return `${x},${y}`;
                });
                return (
                  <path
                    d={`M ${points.join(' L ')}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                );
              })()}

            {/* Hover bar indicator */}
            {hoveredHour !== null && (
              <line
                x1={50 + (hoveredHour / 23) * 720}
                y1="30"
                x2={50 + (hoveredHour / 23) * 720}
                y2="220"
                stroke="#0f172a"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
            )}

            {/* X-axis Hour markers */}
            {currentDayHours.map((h, i) => {
              const x = 50 + (i / 23) * 720;
              return (
                <g key={i}>
                  {i % 3 === 0 && (
                    <>
                      <line x1={x} y1="220" x2={x} y2="225" stroke="#cbd5e1" strokeWidth="1" />
                      <text
                        x={x}
                        y="237"
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        {h.hour}:00
                      </text>
                    </>
                  )}
                  <rect
                    x={x - 15}
                    y="20"
                    width="30"
                    height="200"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredHour(i)}
                    onMouseLeave={() => setHoveredHour(null)}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Hourly Detail Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 mb-1">POA Irradiance:</div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {activeHourData.poaIrradianceW} W/m²
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Cell Temp: {activeHourData.cellTempC}°C
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Direct Solar Used:</div>
          <div className="text-xl font-bold font-mono text-emerald-600">
            {activeHourData.directSolarUsedKw} kW
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            AC Output: {activeHourData.solarAcPowerKw} kW
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Battery Storage:</div>
          <div className="text-xl font-bold font-mono text-sky-600">
            {activeHourData.batteryChargeKw > 0
              ? `+${activeHourData.batteryChargeKw} kW (Chg)`
              : activeHourData.batteryDischargeKw > 0
              ? `-${activeHourData.batteryDischargeKw} kW (Dis)`
              : 'Idle'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            SoC: {activeHourData.batterySocPercent}%
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Grid Interaction:</div>
          <div className="text-xl font-bold font-mono text-purple-600">
            {activeHourData.gridExportKw > 0
              ? `+${activeHourData.gridExportKw} kW Export`
              : activeHourData.gridImportKw > 0
              ? `-${activeHourData.gridImportKw} kW Import`
              : 'Zero Net'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Demand: {activeHourData.loadKw} kW
          </div>
        </div>
      </div>
    </div>
  );
};
