import React from 'react';
import { Layers, Cpu, Battery, Wrench, CheckCircle2, AlertTriangle } from 'lucide-react';
import { CompleteSimulationResults } from '../types/solar';

interface SystemSpecsTabProps {
  results: CompleteSimulationResults;
}

export const SystemSpecsTab: React.FC<SystemSpecsTabProps> = ({ results }) => {
  const { config } = results;

  // Module sizing
  const panelWattage = 415; // 415W Tier-1 Mono PERC module
  const panelCount = Math.max(1, Math.round((config.systemCapacityKw * 1000) / panelWattage));
  const totalModuleAreaSqM = Math.round(panelCount * 1.95 * 10) / 10; // ~1.95 m² per 415W module
  const totalModuleAreaSqFt = Math.round(totalModuleAreaSqM * 10.764);
  const totalWeightKg = Math.round(panelCount * 21.5); // ~21.5 kg per module

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
    <div className="flex flex-col gap-6">
      {/* Engineering Design Checks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* DC:AC Ratio Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">DC:AC Inverter Ratio</span>
              <Cpu className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-black text-white font-mono">{dcAcRatio}</div>
          </div>
          <div className="mt-3">
            {dcAcRatio >= 1.15 && dcAcRatio <= 1.35 ? (
              <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Optimal Sizing (1.15 - 1.35)
              </span>
            ) : dcAcRatio < 1.15 ? (
              <span className="text-xs font-medium text-sky-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Conservative / No Inverter Clipping
              </span>
            ) : (
              <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> High DC Overdrive (Expect Peak Clipping)
              </span>
            )}
          </div>
        </div>

        {/* Roof Footprint Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Array Roof Area</span>
              <Layers className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-3xl font-black text-white font-mono">
              {totalModuleAreaSqM} <span className="text-sm font-sans text-slate-400">m²</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400 font-mono">
            {totalModuleAreaSqFt} sq ft • ~{totalWeightKg} kg array load
          </div>
        </div>

        {/* Battery Autonomy Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Storage Autonomy</span>
              <Battery className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-white font-mono">
              {config.hasBattery ? (
                <>
                  {batteryAutonomyHours} <span className="text-sm font-sans text-slate-400">Hours</span>
                </>
              ) : (
                <span className="text-lg text-slate-500 font-sans">No Battery</span>
              )}
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            {config.hasBattery
              ? `Supplies facility without solar or grid for ~${batteryAutonomyHours}h`
              : 'Add battery storage to store surplus for night use'}
          </div>
        </div>
      </div>

      {/* Complete Engineering Bill of Materials (BOM) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" /> System Bill of Materials (BOM) & Equipment Schedule
            </h3>
            <p className="text-xs text-slate-400">
              Hardware specifications, quantities, and electrical ratings based on configured system.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-xl">
            {panelCount} Solar Modules Total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
              <tr>
                <th className="px-5 py-3">Component / Equipment</th>
                <th className="px-5 py-3">Specification / Technology</th>
                <th className="px-5 py-3 text-center">Quantity</th>
                <th className="px-5 py-3">Warranty</th>
                <th className="px-5 py-3 text-right">Est. Unit Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {/* PV Modules */}
              <tr className="hover:bg-slate-800/40 transition">
                <td className="px-5 py-3 font-semibold text-white">
                  Tier-1 Monocrystalline PV Module
                </td>
                <td className="px-5 py-3 text-slate-400">
                  {panelWattage}W Half-Cell PERC, {config.panelEfficiencyPercent}% efficiency, -0.35%/°C temp coeff
                </td>
                <td className="px-5 py-3 text-center font-mono font-bold text-amber-400">
                  {panelCount} units
                </td>
                <td className="px-5 py-3 text-slate-400">25-Year Linear Output</td>
                <td className="px-5 py-3 text-right font-mono text-white">
                  ${Math.round(panelWattage * 0.32)}/ea
                </td>
              </tr>

              {/* String / Hybrid Inverter */}
              <tr className="hover:bg-slate-800/40 transition">
                <td className="px-5 py-3 font-semibold text-white">
                  Smart Hybrid MPPT Inverter
                </td>
                <td className="px-5 py-3 text-slate-400">
                  {config.inverterCapacityKw} kW AC rated, {config.inverterEfficiencyPercent}% peak efficiency, dual MPPT
                </td>
                <td className="px-5 py-3 text-center font-mono font-bold text-sky-400">
                  1 unit
                </td>
                <td className="px-5 py-3 text-slate-400">10-12 Years</td>
                <td className="px-5 py-3 text-right font-mono text-white">
                  ${Math.round(config.inverterCapacityKw * 220).toLocaleString()}
                </td>
              </tr>

              {/* Battery Storage if configured */}
              {config.hasBattery && (
                <tr className="hover:bg-slate-800/40 transition">
                  <td className="px-5 py-3 font-semibold text-white">
                    Lithium Iron Phosphate (LiFePO4) BESS
                  </td>
                  <td className="px-5 py-3 text-slate-400">
                    {config.batteryCapacityKwh} kWh usable, {config.batteryMaxPowerKw} kW output, 90% roundtrip eff, 6000 cycles
                  </td>
                  <td className="px-5 py-3 text-center font-mono font-bold text-emerald-400">
                    1 unit
                  </td>
                  <td className="px-5 py-3 text-slate-400">10 Years / 6000 Cycles</td>
                  <td className="px-5 py-3 text-right font-mono text-white">
                    ${Math.round(config.batteryCapacityKwh * 450).toLocaleString()}
                  </td>
                </tr>
              )}

              {/* Racking & Mounting */}
              <tr className="hover:bg-slate-800/40 transition">
                <td className="px-5 py-3 font-semibold text-white">
                  Roof Mounting Rails & Clamps
                </td>
                <td className="px-5 py-3 text-slate-400">
                  Anodized aluminum extruded rails, stainless hardware, flashed roof attachments
                </td>
                <td className="px-5 py-3 text-center font-mono font-bold text-slate-300">
                  {panelCount} kits
                </td>
                <td className="px-5 py-3 text-slate-400">20 Years Structural</td>
                <td className="px-5 py-3 text-right font-mono text-white">
                  ${Math.round(panelCount * 25).toLocaleString()}
                </td>
              </tr>

              {/* Balance of System */}
              <tr className="hover:bg-slate-800/40 transition">
                <td className="px-5 py-3 font-semibold text-white">
                  Electrical BoS & Protection
                </td>
                <td className="px-5 py-3 text-slate-400">
                  DC isolator switches, AC disconnect, Type-II surge protection, 4mm² UV solar cabling
                </td>
                <td className="px-5 py-3 text-center font-mono font-bold text-slate-300">
                  1 lot
                </td>
                <td className="px-5 py-3 text-slate-400">5-10 Years</td>
                <td className="px-5 py-3 text-right font-mono text-white">
                  $850
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
