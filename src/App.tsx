import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Box,
  Clock,
  BarChart3,
  IndianRupee,
  Cpu,
  Github,
  Sun,
  AlertCircle,
  MapPin,
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
import { MapPickerModal } from './components/MapPickerModal';

type ActiveTab = 'overview' | '3d' | 'hourly' | 'monthly' | 'financials' | 'specs';

export function App() {
  const defaultPreset = PRESETS[0]; // Bengaluru Villa Terrace (3 kWp)

  const [location, setLocation] = useState<LocationData>(defaultPreset.location);
  const [config, setConfig] = useState<PVSystemConfig>(defaultPreset.config);
  const [results, setResults] = useState<CompleteSimulationResults | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isEducationOpen, setIsEducationOpen] = useState<boolean>(false);
  const [isMapOpen, setIsMapOpen] = useState<boolean>(false);
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
    <div className="min-h-screen bg-[#080c14] text-[#e2e8f0] flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Navigation Bar */}
      <Navbar
        onSelectPreset={handleSelectPreset}
        onOpenEducation={() => setIsEducationOpen(true)}
        onOpenMap={() => setIsMapOpen(true)}
        simulationResults={results}
        isLoading={isLoading}
        onRefresh={handleRefresh}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Configuration & Hardware Parameters */}
        <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4">
          <ConfigPanel
            location={location}
            config={config}
            onUpdateLocation={handleUpdateLocation}
            onUpdateConfig={handleUpdateConfig}
            onOpenMap={() => setIsMapOpen(true)}
          />
        </aside>

        {/* Right Column: Simulation Dashboards & Visualizations */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
          {/* Tab Navigation Segmented Bar */}
          <div className="bg-[#0f1422] border border-[#1e2638] p-1 rounded-xl flex items-center gap-1 overflow-x-auto shadow-md">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('3d')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === '3d'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Flat Terrace 3D</span>
            </button>

            <button
              onClick={() => setActiveTab('hourly')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'hourly'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Diurnal 24h</span>
            </button>

            <button
              onClick={() => setActiveTab('monthly')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'monthly'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Monthly Yield</span>
            </button>

            <button
              onClick={() => setActiveTab('financials')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'financials'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <IndianRupee className="w-3.5 h-3.5" />
              <span>Discom Financials (₹)</span>
            </button>

            <button
              onClick={() => setActiveTab('specs')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'specs'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>BOM Schedule</span>
            </button>
          </div>

          {/* Error Message if any */}
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-xl flex items-center gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Active Tab View */}
          {results ? (
            <div className="transition-all duration-200">
              {activeTab === 'overview' && <OverviewTab results={results} />}

              {activeTab === '3d' && (
                <div className="flex flex-col gap-3">
                  <div className="bg-[#0f1422] border border-[#1e2638] rounded-xl px-4 py-2.5 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      Flat Concrete Terrace Rooftop Simulation for {location.name}
                    </span>
                    <span className="font-mono text-amber-400 font-bold text-[11px]">
                      Elevated Rack Tilt: {config.panelTiltDeg}° | Facing: True South ({config.panelAzimuthDeg}°)
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
            <div className="bg-[#0f1422] border border-[#1e2638] rounded-2xl p-16 flex flex-col items-center justify-center text-center">
              <Sun className="w-10 h-10 text-amber-400 animate-spin mb-3" />
              <h3 className="text-sm font-bold text-white">Running Solar Physics Model...</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Computing astronomical solar positions, Hay-Davies plane of array transposition, and Indian Discom tariff calculations.
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

      {/* Interactive Leaflet Map Picker Modal */}
      <MapPickerModal
        isOpen={isMapOpen}
        initialLocation={location}
        onClose={() => setIsMapOpen(false)}
        onSelectLocation={handleUpdateLocation}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-[#1e2638] bg-[#080c14] px-6 py-3.5 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span>HeliosPV • Solar Power System Simulator (India)</span>
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
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Repository</span>
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
