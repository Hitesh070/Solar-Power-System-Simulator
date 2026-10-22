import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Box,
  Clock,
  BarChart3,
  DollarSign,
  Cpu,
  Github,
  Sun,
  AlertCircle,
} from 'lucide-react';
import { LocationData, PVSystemConfig, CompleteSimulationResults } from './types/solar';
import { PRESETS, SystemPreset } from './lib/mock-presets';
import { runSolarSimulation } from './lib/simulator';
import { Navbar } from './components/Navbar';
import { ConfigPanel } from './components/ConfigPanel';
import { OverviewTab } from './components/OverviewTab';
import { HourlySimulationTab } from './components/HourlySimulationTab';
import { MonthlyYieldTab } from './components/MonthlyYieldTab';
import { ThreeSolarScene } from './components/ThreeSolarScene';
import { FinancialsTab } from './components/FinancialsTab';
import { SystemSpecsTab } from './components/SystemSpecsTab';
import { EducationModal } from './components/EducationModal';

type ActiveTab = 'overview' | '3d' | 'hourly' | 'monthly' | 'financials' | 'specs';

export function App() {
  const defaultPreset = PRESETS[0];

  const [location, setLocation] = useState<LocationData>(defaultPreset.location);
  const [config, setConfig] = useState<PVSystemConfig>(defaultPreset.config);
  const [results, setResults] = useState<CompleteSimulationResults | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isEducationOpen, setIsEducationOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Run simulation engine
  const executeSimulation = useCallback(
    async (loc: LocationData, cfg: PVSystemConfig) => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const simResults = await runSolarSimulation(loc, cfg);
        setResults(simResults);
      } catch (err: any) {
        console.error('Simulation error:', err);
        setErrorMsg('Failed to run simulation. Please verify input parameters.');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Initial simulation run on component mount
  useEffect(() => {
    executeSimulation(location, config);
  }, [executeSimulation, location, config]);

  const handleSelectPreset = (preset: SystemPreset) => {
    setLocation(preset.location);
    setConfig(preset.config);
    executeSimulation(preset.location, preset.config);
  };

  const handleUpdateConfig = (newConfigPart: Partial<PVSystemConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfigPart }));
  };

  const handleUpdateLocation = (newLoc: LocationData) => {
    setLocation(newLoc);
    executeSimulation(newLoc, config);
  };

  const handleRefresh = () => {
    executeSimulation(location, config);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Navigation Bar */}
      <Navbar
        onSelectPreset={handleSelectPreset}
        onOpenEducation={() => setIsEducationOpen(true)}
        simulationResults={results}
        isLoading={isLoading}
        onRefresh={handleRefresh}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration & Hardware Parameters */}
        <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4">
          <ConfigPanel
            location={location}
            config={config}
            onUpdateLocation={handleUpdateLocation}
            onUpdateConfig={handleUpdateConfig}
          />
        </aside>

        {/* Right Column: Simulation Dashboards & Visualizations */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-5">
          {/* Tab Navigation Pill Bar */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto shadow-lg">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('3d')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === '3d'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Box className="w-4 h-4" />
              <span>3D Roof & Sun</span>
            </button>

            <button
              onClick={() => setActiveTab('hourly')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'hourly'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Diurnal 24h</span>
            </button>

            <button
              onClick={() => setActiveTab('monthly')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'monthly'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Monthly Yield</span>
            </button>

            <button
              onClick={() => setActiveTab('financials')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'financials'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Financials & ROI</span>
            </button>

            <button
              onClick={() => setActiveTab('specs')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'specs'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>BOM & Specs</span>
            </button>
          </div>

          {/* Error Message if any */}
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-2xl flex items-center gap-3 text-xs">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Active Tab View */}
          {results ? (
            <div className="transition-all duration-300">
              {activeTab === 'overview' && <OverviewTab results={results} />}

              {activeTab === '3d' && (
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 flex items-center justify-between">
                    <span>
                      Live 3D Ray-Traced Shadow & Sunlight Angle Simulation for {location.name}
                    </span>
                    <span className="font-mono text-amber-400 font-bold">
                      Tilt: {config.panelTiltDeg}° | Azimuth: {config.panelAzimuthDeg}°
                    </span>
                  </div>
                  <ThreeSolarScene
                    latitude={location.latitude}
                    longitude={location.longitude}
                    panelTiltDeg={config.panelTiltDeg}
                    panelAzimuthDeg={config.panelAzimuthDeg}
                    systemCapacityKw={config.systemCapacityKw}
                  />
                </div>
              )}

              {activeTab === 'hourly' && <HourlySimulationTab results={results} />}

              {activeTab === 'monthly' && <MonthlyYieldTab results={results} />}

              {activeTab === 'financials' && <FinancialsTab results={results} />}

              {activeTab === 'specs' && <SystemSpecsTab results={results} />}
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-16 flex flex-col items-center justify-center text-center">
              <Sun className="w-12 h-12 text-amber-400 animate-spin mb-4" />
              <h3 className="text-base font-bold text-white">Running Photovoltaic Physics Simulation...</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Computing solar zenith angles, Hay-Davies plane of array transposition, cell thermal derating, and battery state of charge.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Physics Theory Modal */}
      <EducationModal
        isOpen={isEducationOpen}
        onClose={() => setIsEducationOpen(false)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 px-6 py-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-400" />
          <span>HeliosPV • Solar Power System Simulator</span>
          <span>•</span>
          <span>Open-Meteo & NREL Reference Models</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/Hitesh070/Solar-Power-System-Simulator"
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-white transition flex items-center gap-1.5 font-medium"
          >
            <Github className="w-4 h-4" />
            <span>GitHub Repository</span>
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
