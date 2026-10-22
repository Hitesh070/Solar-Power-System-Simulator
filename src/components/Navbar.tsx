import React from 'react';
import { Sun, Download, BookOpen, Layers, RefreshCw, MapPin } from 'lucide-react';
import { PRESETS, SystemPreset } from '../lib/mock-presets';
import { CompleteSimulationResults } from '../types/solar';

interface NavbarProps {
  onSelectPreset: (preset: SystemPreset) => void;
  onOpenEducation: () => void;
  onOpenMap: () => void;
  simulationResults: CompleteSimulationResults | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSelectPreset,
  onOpenEducation,
  onOpenMap,
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
      `HeliosPV_Solar_Report_${simulationResults.location.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <header className="sticky top-0 z-40 bg-[#080c14]/90 backdrop-blur-md border-b border-[#1e2638] px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
          <Sun className="w-5 h-5 fill-current" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1">
              Helios<span className="text-amber-400">PV</span>
            </h1>
            <span className="bg-[#121826] text-amber-400 border border-[#1e2638] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              India Edition
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Photovoltaic Flat Rooftop Simulator & Discom Net-Metering
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Preset Selector Dropdown */}
        <div className="relative hidden md:flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <select
            onChange={(e) => {
              const selected = PRESETS.find((p) => p.id === e.target.value);
              if (selected) onSelectPreset(selected);
            }}
            defaultValue=""
            className="bg-[#0f1422] border border-[#1e2638] hover:border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-1.5 font-medium focus:outline-none focus:border-amber-500 transition cursor-pointer"
          >
            <option value="" disabled>
              Load Benchmark City...
            </option>
            {PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        {/* Map Pinpoint Trigger */}
        <button
          onClick={onOpenMap}
          className="flex items-center gap-1.5 bg-[#0f1422] hover:bg-[#121826] border border-[#1e2638] text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-medium transition"
          title="Interactive Map Pinpoint"
        >
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Map</span>
        </button>

        {/* Physics Theory */}
        <button
          onClick={onOpenEducation}
          className="flex items-center gap-1.5 bg-[#0f1422] hover:bg-[#121826] border border-[#1e2638] text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-medium transition"
          title="Learn the Solar Physics & Formulas"
        >
          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Physics</span>
        </button>

        {/* Export JSON Report */}
        <button
          onClick={exportSimulationData}
          disabled={!simulationResults}
          className="flex items-center gap-1.5 bg-[#0f1422] hover:bg-[#121826] disabled:opacity-50 border border-[#1e2638] text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-medium transition"
          title="Export Simulation JSON"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Run Simulation */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Simulating...' : 'Simulate'}</span>
        </button>
      </div>
    </header>
  );
};
