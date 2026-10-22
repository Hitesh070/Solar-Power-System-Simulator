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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-3 flex items-center justify-between gap-4 shadow-sm">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-white font-bold shadow-sm">
          <Sun className="w-5 h-5 fill-current" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1">
              Helios<span className="text-amber-500">PV</span>
            </h1>
            <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Simulator v1.0
            </span>
          </div>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Computational Photovoltaic & Energy Storage Model
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Preset Selector Dropdown — Previous beloved layout */}
        <div className="relative hidden md:flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <select
            onChange={(e) => {
              const selected = PRESETS.find((p) => p.id === e.target.value);
              if (selected) onSelectPreset(selected);
            }}
            defaultValue=""
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-1.5 font-medium focus:outline-none focus:border-amber-500 transition cursor-pointer"
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

        {/* Map Pinpoint Trigger */}
        <button
          onClick={onOpenMap}
          className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
          title="Pick Location on Interactive Map"
        >
          <MapPin className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">Map</span>
        </button>

        {/* Physics Theory */}
        <button
          onClick={onOpenEducation}
          className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
          title="Learn the Solar Physics & Formulas"
        >
          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Physics</span>
        </button>

        {/* Export JSON */}
        <button
          onClick={exportSimulationData}
          disabled={!simulationResults}
          className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
          title="Export Simulation JSON"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Run Simulation */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Simulating...' : 'Run Simulation'}</span>
        </button>
      </div>
    </header>
  );
};
