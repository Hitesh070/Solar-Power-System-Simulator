import React from 'react';
import { Layers, Cpu, Battery, Wrench, CheckCircle2, AlertTriangle } from 'lucide-react';
import { CompleteSimulationResults } from '../types/solar';
import { formatINR } from '../lib/financial-engine';

interface SystemSpecsTabProps {
  results: CompleteSimulationResults;
}

export const SystemSpecsTab: React.FC<SystemSpecsTabProps> = ({ results }) => {
  const { config } = results;

  const panelWattage = 540;
  const panelCount = Math.max(1, Math.round((config.systemCapacityKw * 1000) / panelWattage));
  const totalModuleAreaSqM = Math.round(panelCount * 2.58 * 10) / 10;
  const totalModuleAreaSqFt = Math.round(totalModuleAreaSqM * 10.764);
  const totalWeightKg = Math.round(panelCount * 28.5);

  const dcAcRatio =
    config.inverterCapacityKw > 0
      ? Math.round((config.systemCapacityKw / config.inverterCapacityKw) * 100) / 100
      : 1.0;

  const hourlyBaseLoad = config.dailyConsumptionKwh / 24;
  const batteryAutonomyHours =
    config.hasBattery && hourlyBaseLoad > 0
      ? Math.round((config.batteryCapacityKwh / hourlyBaseLoad) * 10) / 10
      : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Engineering Design Checks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">DC:AC Inverter Ratio</span>
              <Cpu className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900 font-mono">{dcAcRatio}</div>
          </div>
          <div className="mt-3">
            {dcAcRatio >= 1.15 && dcAcRatio <= 1.35 ? (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Optimal Sizing (1.15 - 1.35)
              </span>
            ) : dcAcRatio < 1.15 ? (
              <span className="text-xs font-semibold text-sky-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-sky-600" /> Conservative / Zero Clipping
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> High DC Overdrive (Peak Clipping)
              </span>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Terrace Area Required</span>
              <Layers className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900 font-mono">
              {totalModuleAreaSqFt} <span className="text-sm font-sans text-slate-500 font-normal">sq ft</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500 font-mono">
            {totalModuleAreaSqM} m² • ~{totalWeightKg} kg array deadload
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Backup Autonomy</span>
              <Battery className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900 font-mono">
              {config.hasBattery ? (
                <>
                  {batteryAutonomyHours} <span className="text-sm font-sans text-slate-500 font-normal">Hours</span>
                </>
              ) : (
                <span className="text-base text-slate-400 font-sans font-normal">Grid-Tied (No Battery)</span>
              )}
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            {config.hasBattery
              ? `Powers facility during power cuts for ~${batteryAutonomyHours}h`
              : 'Add hybrid battery for power cut backup'}
          </div>
        </div>
      </div>

      {/* Bill of Materials (BOM) Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-500" /> Bill of Materials (BOM) & Equipment Schedule
            </h3>
            <p className="text-xs text-slate-500">
              Procurement specifications and electrical ratings based on certified equipment standards.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
            {panelCount} Modules Total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-5 py-3">Equipment / Component</th>
                <th className="px-5 py-3">Specification / Technology</th>
                <th className="px-5 py-3 text-center">Quantity</th>
                <th className="px-5 py-3">Warranty</th>
                <th className="px-5 py-3 text-right">Est. Unit Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50/80 transition">
                <td className="px-5 py-3.5 font-semibold text-slate-900">
                  Mono PERC Half-Cut PV Modules
                </td>
                <td className="px-5 py-3.5 text-slate-500">
                  {panelWattage}W Half-Cut Bi-Facial / Mono PERC, {config.panelEfficiencyPercent}% efficiency
                </td>
                <td className="px-5 py-3.5 text-center font-mono font-bold text-amber-600">
                  {panelCount} units
                </td>
                <td className="px-5 py-3.5 text-slate-500">25-Year Performance</td>
                <td className="px-5 py-3.5 text-right font-mono text-slate-900">
                  ₹{Math.round(panelWattage * 22).toLocaleString('en-IN')}/ea
                </td>
              </tr>

              <tr className="hover:bg-slate-50/80 transition">
                <td className="px-5 py-3.5 font-semibold text-slate-900">
                  Smart MPPT String Inverter
                </td>
                <td className="px-5 py-3.5 text-slate-500">
                  {config.inverterCapacityKw} kW AC, {config.inverterEfficiencyPercent}% efficiency, IP65 with Wi-Fi dongle
                </td>
                <td className="px-5 py-3.5 text-center font-mono font-bold text-sky-600">
                  1 unit
                </td>
                <td className="px-5 py-3.5 text-slate-500">10-12 Years</td>
                <td className="px-5 py-3.5 text-right font-mono text-slate-900">
                  {formatINR(Math.round(config.inverterCapacityKw * 10000))}
                </td>
              </tr>

              {config.hasBattery && (
                <tr className="hover:bg-slate-50/80 transition">
                  <td className="px-5 py-3.5 font-semibold text-slate-900">
                    Lithium Iron Phosphate (LiFePO4) Battery
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">
                    {config.batteryCapacityKwh} kWh usable, {config.batteryMaxPowerKw} kW output, 90% roundtrip eff, 6000 cycles
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono font-bold text-emerald-600">
                    1 unit
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">10 Years / 6000 Cycles</td>
                  <td className="px-5 py-3.5 text-right font-mono text-slate-900">
                    {formatINR(Math.round(config.batteryCapacityKwh * 25000))}
                  </td>
                </tr>
              )}

              <tr className="hover:bg-slate-50/80 transition">
                <td className="px-5 py-3.5 font-semibold text-slate-900">
                  Elevated Hot-Dip GI Mounting Structure
                </td>
                <td className="px-5 py-3.5 text-slate-500">
                  80-micron hot-dip galvanised iron C-channels, anchor fastener bolts, elevated 1m height
                </td>
                <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-600">
                  {panelCount} kits
                </td>
                <td className="px-5 py-3.5 text-slate-500">25 Years Corrosion</td>
                <td className="px-5 py-3.5 text-right font-mono text-slate-900">
                  ₹{Math.round(panelCount * 1200).toLocaleString('en-IN')}
                </td>
              </tr>

              <tr className="hover:bg-slate-50/80 transition">
                <td className="px-5 py-3.5 font-semibold text-slate-900">
                  Electrical BoS, DCDB, ACDB & Earthing
                </td>
                <td className="px-5 py-3.5 text-slate-500">
                  Type-II SPD, MC4 connectors, 4mm² UV solar DC cable, chemical earthing pits & lightning arrestor
                </td>
                <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-600">
                  1 lot
                </td>
                <td className="px-5 py-3.5 text-slate-500">5-10 Years</td>
                <td className="px-5 py-3.5 text-right font-mono text-slate-900">
                  ₹22,000
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
