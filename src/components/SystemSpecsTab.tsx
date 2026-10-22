import React from 'react';
import { Layers, Cpu, Battery, Wrench, CheckCircle2, AlertTriangle } from 'lucide-react';
import { CompleteSimulationResults } from '../types/solar';
import { formatINR } from '../lib/financial-engine';

interface SystemSpecsTabProps {
  results: CompleteSimulationResults;
}

export const SystemSpecsTab: React.FC<SystemSpecsTabProps> = ({ results }) => {
  const { config } = results;

  // Indian standard Tier-1 High-Efficiency Module: 540W Mono PERC Half-Cut
  const panelWattage = 540;
  const panelCount = Math.max(1, Math.round((config.systemCapacityKw * 1000) / panelWattage));
  const totalModuleAreaSqM = Math.round(panelCount * 2.58 * 10) / 10; // ~2.58 m² per 540W module
  const totalModuleAreaSqFt = Math.round(totalModuleAreaSqM * 10.764);
  const totalWeightKg = Math.round(panelCount * 28.5); // ~28.5 kg per module

  // DC to AC Inverter Load Ratio (ILR)
  const dcAcRatio =
    config.inverterCapacityKw > 0
      ? Math.round((config.systemCapacityKw / config.inverterCapacityKw) * 100) / 100
      : 1.0;

  // Battery autonomy hours
  const hourlyBaseLoad = config.dailyConsumptionKwh / 24;
  const batteryAutonomyHours =
    config.hasBattery && hourlyBaseLoad > 0
      ? Math.round((config.batteryCapacityKwh / hourlyBaseLoad) * 10) / 10
      : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Engineering Design Checks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* DC:AC Ratio Card */}
        <div className="bg-[#0f1422] border border-[#1e2638] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">DC:AC Inverter Ratio</span>
              <Cpu className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-white font-mono">{dcAcRatio}</div>
          </div>
          <div className="mt-3">
            {dcAcRatio >= 1.15 && dcAcRatio <= 1.35 ? (
              <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Optimal Indian Standard (1.15 - 1.35)
              </span>
            ) : dcAcRatio < 1.15 ? (
              <span className="text-xs font-medium text-sky-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Conservative / Zero Peak Clipping
              </span>
            ) : (
              <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> High DC Overdrive (Peak Clipping)
              </span>
            )}
          </div>
        </div>

        {/* Roof Footprint Card */}
        <div className="bg-[#0f1422] border border-[#1e2638] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Terrace Area Required</span>
              <Layers className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-3xl font-bold text-white font-mono">
              {totalModuleAreaSqFt} <span className="text-sm font-sans text-slate-400 font-normal">sq ft</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400 font-mono">
            {totalModuleAreaSqM} m² • ~{totalWeightKg} kg array deadload
          </div>
        </div>

        {/* Battery Autonomy Card */}
        <div className="bg-[#0f1422] border border-[#1e2638] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Backup Autonomy</span>
              <Battery className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-white font-mono">
              {config.hasBattery ? (
                <>
                  {batteryAutonomyHours} <span className="text-sm font-sans text-slate-400 font-normal">Hours</span>
                </>
              ) : (
                <span className="text-lg text-slate-500 font-sans font-normal">Grid-Tied (No Battery)</span>
              )}
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            {config.hasBattery
              ? `Powers facility during Discom grid outages for ~${batteryAutonomyHours}h`
              : 'Add hybrid battery for power cut backup'}
          </div>
        </div>
      </div>

      {/* Bill of Materials (BOM) Table */}
      <div className="bg-[#0f1422] border border-[#1e2638] rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[#1e2638] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" /> Bill of Materials (BOM) & Equipment Schedule
            </h3>
            <p className="text-xs text-slate-400">
              Procurement specifications and electrical ratings based on Indian MNRE / ALMM certified components.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-xl">
            {panelCount} Solar Modules Total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080c14] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1e2638] font-semibold">
              <tr>
                <th className="px-5 py-3">Equipment / Component</th>
                <th className="px-5 py-3">Specification / Technology</th>
                <th className="px-5 py-3 text-center">Quantity</th>
                <th className="px-5 py-3">Warranty</th>
                <th className="px-5 py-3 text-right">Est. Unit Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2638] text-slate-300">
              {/* PV Modules */}
              <tr className="hover:bg-slate-800/20 transition">
                <td className="px-5 py-3.5 font-semibold text-white">
                  ALMM Approved Mono PERC Modules
                </td>
                <td className="px-5 py-3.5 text-slate-400">
                  {panelWattage}W Half-Cut Bi-Facial / Mono PERC, {config.panelEfficiencyPercent}% efficiency
                </td>
                <td className="px-5 py-3.5 text-center font-mono font-bold text-amber-400">
                  {panelCount} units
                </td>
                <td className="px-5 py-3.5 text-slate-400">25-Year Performance</td>
                <td className="px-5 py-3.5 text-right font-mono text-white">
                  ₹{Math.round(panelWattage * 22).toLocaleString('en-IN')}/ea
                </td>
              </tr>

              {/* String / Hybrid Inverter */}
              <tr className="hover:bg-slate-800/20 transition">
                <td className="px-5 py-3.5 font-semibold text-white">
                  Grid-Tied On-Grid MPPT Inverter
                </td>
                <td className="px-5 py-3.5 text-slate-400">
                  {config.inverterCapacityKw} kW AC, {config.inverterEfficiencyPercent}% efficiency, IP65 with Wi-Fi dongle
                </td>
                <td className="px-5 py-3.5 text-center font-mono font-bold text-sky-400">
                  1 unit
                </td>
                <td className="px-5 py-3.5 text-slate-400">10-12 Years</td>
                <td className="px-5 py-3.5 text-right font-mono text-white">
                  {formatINR(Math.round(config.inverterCapacityKw * 10000))}
                </td>
              </tr>

              {/* Battery Storage if configured */}
              {config.hasBattery && (
                <tr className="hover:bg-slate-800/20 transition">
                  <td className="px-5 py-3.5 font-semibold text-white">
                    Lithium Iron Phosphate (LiFePO4) Battery
                  </td>
                  <td className="px-5 py-3.5 text-slate-400">
                    {config.batteryCapacityKwh} kWh usable, {config.batteryMaxPowerKw} kW output, 90% roundtrip eff, 6000 cycles
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono font-bold text-emerald-400">
                    1 unit
                  </td>
                  <td className="px-5 py-3.5 text-slate-400">10 Years / 6000 Cycles</td>
                  <td className="px-5 py-3.5 text-right font-mono text-white">
                    {formatINR(Math.round(config.batteryCapacityKwh * 25000))}
                  </td>
                </tr>
              )}

              {/* Hot-dip Galvanised Strut Racking */}
              <tr className="hover:bg-slate-800/20 transition">
                <td className="px-5 py-3.5 font-semibold text-white">
                  Elevated Hot-Dip GI Terrace Mounting Structure
                </td>
                <td className="px-5 py-3.5 text-slate-400">
                  80-micron hot-dip galvanised iron C-channels, anchor fastener bolts, elevated 1m height
                </td>
                <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-300">
                  {panelCount} kits
                </td>
                <td className="px-5 py-3.5 text-slate-400">25 Years Corrosion</td>
                <td className="px-5 py-3.5 text-right font-mono text-white">
                  ₹{Math.round(panelCount * 1200).toLocaleString('en-IN')}
                </td>
              </tr>

              {/* Electrical BoS */}
              <tr className="hover:bg-slate-800/20 transition">
                <td className="px-5 py-3.5 font-semibold text-white">
                  Electrical BoS, DCDB, ACDB & Earthing
                </td>
                <td className="px-5 py-3.5 text-slate-400">
                  Type-II SPD, MC4 connectors, 4mm² UV solar DC cable, chemical earthing pits & lightning arrestor
                </td>
                <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-300">
                  1 lot
                </td>
                <td className="px-5 py-3.5 text-slate-400">5-10 Years</td>
                <td className="px-5 py-3.5 text-right font-mono text-white">
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
