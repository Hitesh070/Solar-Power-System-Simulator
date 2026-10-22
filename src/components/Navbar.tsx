import React from 'react';
import { Sun, Download, BookOpen, Layers, RefreshCw } from 'lucide-react';
import { PRESETS, SystemPreset } from '../lib/mock-presets';
import { CompleteSimulationResults } from '../types/solar';

interface NavbarProps {
  onSelectPreset: (preset: SystemPreset) => void;
  onOpenEducation: () => void;
  simulationResults: CompleteSimulationResults | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSelectPreset,
  onOpenEducation,
  simulationResults,
  isLoading,
  onRefresh,
}) => {
  const exportSimulationData = () => {
    if (!simulationResults) return;

    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(simulationResults, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `HeliosPV_Simulation_${simulationResults.location.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
          <Sun className="w-6 h-6 animate-[spin_12s_linear_infinite]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
              Helios<span className="text-amber-400">PV</span>
            </h1>
            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Simulator v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Physics-Grade Photovoltaic & Energy Storage Model
          </p>
        </div>
      </div>

      {/* Center / Action Buttons */}
      <div className="flex items-center gap-2.5">
        {/* Preset Selector Dropdown */}
        <div className="relative hidden md:flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <select
            onChange={(e) => {
              const selected = PRESETS.find((p) => p.id === e.target.value);
              if (selected) onSelectPreset(selected);
            }}
            defaultValue=""
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-amber-500 transition cursor-pointer"
          >
            <option value="" disabled>
              Load Benchmark Preset...
            </option>
            {PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} ({preset.badge})
              </option>
            ))}
          </select>
        </div>

        {/* Education & Physics Theory Button */}
        <button
          onClick={onOpenEducation}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold transition"
          title="Learn the Solar Physics & Equations"
        >
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Physics Theory</span>
        </button>

        {/* Export JSON Report */}
        <button
          onClick={exportSimulationData}
          disabled={!simulationResults}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold transition"
          title="Export Simulation JSON"
        >
          <Download className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Re-simulate Button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Simulating...' : 'Run Simulation'}</span>
        </button>
      </div>
    </header>
  );
};
