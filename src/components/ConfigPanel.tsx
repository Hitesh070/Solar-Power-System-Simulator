import React, { useState } from 'react';
import {
  MapPin,
  Battery,
  Zap,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  Map,
  IndianRupee,
} from 'lucide-react';
import { LocationData, PVSystemConfig } from '../types/solar';
import { searchLocation } from '../lib/weather-api';

interface ConfigPanelProps {
  location: LocationData;
  config: PVSystemConfig;
  onUpdateLocation: (loc: LocationData) => void;
  onUpdateConfig: (newConfig: Partial<PVSystemConfig>) => void;
  onOpenMap: () => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  location,
  config,
  onUpdateLocation,
  onUpdateConfig,
  onOpenMap,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<'pv' | 'battery' | 'econ' | null>('pv');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await searchLocation(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const selectSearchResult = (item: any) => {
    onUpdateLocation({
      name: item.displayName.split(',').slice(0, 3).join(', '),
      latitude: item.lat,
      longitude: item.lon,
      country: 'India',
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  // Recommended tilt for Indian latitude (Rule of thumb: Tilt ≈ Latitude)
  const recommendedTilt = Math.max(10, Math.min(32, Math.round(location.latitude)));

  return (
    <div className="bg-[#0f1422] border border-[#1e2638] rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
      {/* 1. Location & Interactive Map Pinpoint */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" /> Rooftop Location
          </label>
          <span className="text-[11px] font-mono text-amber-400">
            {location.latitude.toFixed(2)}°N, {location.longitude.toFixed(2)}°E
          </span>
        </div>

        {/* Search input with Map Pinpoint button */}
        <form onSubmit={handleSearch} className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search Indian city, pin code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#080c14] border border-[#1e2638] focus:border-amber-500 text-xs text-white pl-8 pr-3 py-2 rounded-xl focus:outline-none transition"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="bg-[#121826] hover:bg-slate-800 text-slate-200 px-3 py-2 rounded-xl text-xs font-medium border border-[#1e2638] transition"
          >
            {isSearching ? '...' : 'Find'}
          </button>
          <button
            type="button"
            onClick={onOpenMap}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
            title="Open Interactive Map to pinpoint exact rooftop"
          >
            <Map className="w-3.5 h-3.5" />
            <span>Map Pin</span>
          </button>
        </form>

        {/* Autocomplete dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-[#080c14] border border-[#1e2638] rounded-xl overflow-hidden shadow-2xl z-20">
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectSearchResult(item)}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-[#121826] hover:text-white border-b border-[#1e2638] last:border-b-0 transition flex items-center justify-between"
              >
                <span className="truncate pr-2">{item.displayName}</span>
                <Check className="w-3 h-3 text-amber-400 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Active location tag */}
        <div className="mt-2 text-xs text-slate-400 bg-[#080c14] px-3 py-2 rounded-xl border border-[#1e2638] flex items-center justify-between">
          <span className="font-medium text-white truncate">{location.name}</span>
          <button
            onClick={onOpenMap}
            className="text-[11px] text-amber-400 hover:underline shrink-0 ml-2"
          >
            Change
          </button>
        </div>
      </div>

      <div className="h-px bg-[#1e2638]" />

      {/* 2. Solar PV Hardware Parameters */}
      <div>
        <button
          type="button"
          onClick={() => setActiveAccordion(activeAccordion === 'pv' ? null : 'pv')}
          className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2"
        >
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Photovoltaic System
          </span>
          {activeAccordion === 'pv' ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {activeAccordion === 'pv' && (
          <div className="flex flex-col gap-3 pt-1">
            {/* System DC Capacity */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">System DC Capacity:</span>
                <span className="font-mono font-bold text-amber-400">
                  {config.systemCapacityKw.toFixed(1)} kWp
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="100.0"
                step="0.2"
                value={config.systemCapacityKw}
                onChange={(e) =>
                  onUpdateConfig({ systemCapacityKw: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded appearance-none"
              />
            </div>

            {/* Flat Terrace Tilt Angle */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Terrace Rack Tilt:</span>
                <span className="font-mono font-bold text-sky-400">
                  {config.panelTiltDeg}° (Opt: {recommendedTilt}°)
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="45"
                step="1"
                value={config.panelTiltDeg}
                onChange={(e) =>
                  onUpdateConfig({ panelTiltDeg: parseInt(e.target.value) })
                }
                className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded appearance-none"
              />
            </div>

            {/* Azimuth Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Orientation (Azimuth):</span>
                <span className="font-mono font-bold text-amber-400">
                  {config.panelAzimuthDeg}° ({config.panelAzimuthDeg === 180 ? 'True South' : `${config.panelAzimuthDeg}°`})
                </span>
              </div>
              <input
                type="range"
                min="90"
                max="270"
                step="5"
                value={config.panelAzimuthDeg}
                onChange={(e) =>
                  onUpdateConfig({ panelAzimuthDeg: parseInt(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded appearance-none"
              />
            </div>

            {/* Inverter Capacity & Losses */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Inverter AC (kW):
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="120"
                  step="0.5"
                  value={config.inverterCapacityKw}
                  onChange={(e) =>
                    onUpdateConfig({ inverterCapacityKw: parseFloat(e.target.value) || 1 })
                  }
                  className="w-full bg-[#080c14] border border-[#1e2638] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  System Losses (%):
                </label>
                <input
                  type="number"
                  min="5"
                  max="30"
                  step="1"
                  value={config.systemLossesPercent}
                  onChange={(e) =>
                    onUpdateConfig({ systemLossesPercent: parseFloat(e.target.value) || 14 })
                  }
                  className="w-full bg-[#080c14] border border-[#1e2638] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-[#1e2638]" />

      {/* 3. Battery Storage System (BESS) */}
      <div>
        <button
          type="button"
          onClick={() => setActiveAccordion(activeAccordion === 'battery' ? null : 'battery')}
          className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2"
        >
          <span className="flex items-center gap-1.5">
            <Battery className="w-3.5 h-3.5 text-emerald-400" /> Battery Storage (Optional)
          </span>
          {activeAccordion === 'battery' ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {activeAccordion === 'battery' && (
          <div className="flex flex-col gap-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer bg-[#080c14] p-2.5 rounded-xl border border-[#1e2638]">
              <input
                type="checkbox"
                checked={config.hasBattery}
                onChange={(e) => onUpdateConfig({ hasBattery: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
              <span className="text-xs text-slate-200 font-medium">
                Include Lithium Battery Storage
              </span>
            </label>

            {config.hasBattery && (
              <>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Battery Capacity:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {config.batteryCapacityKwh.toFixed(1)} kWh
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2.0"
                    max="100.0"
                    step="0.5"
                    value={config.batteryCapacityKwh}
                    onChange={(e) =>
                      onUpdateConfig({ batteryCapacityKwh: parseFloat(e.target.value) })
                    }
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded appearance-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Max Output (kW):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      step="0.5"
                      value={config.batteryMaxPowerKw}
                      onChange={(e) =>
                        onUpdateConfig({ batteryMaxPowerKw: parseFloat(e.target.value) || 3 })
                      }
                      className="w-full bg-[#080c14] border border-[#1e2638] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Min Reserve (%):
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="30"
                      step="1"
                      value={config.batteryMinSocPercent}
                      onChange={(e) =>
                        onUpdateConfig({ batteryMinSocPercent: parseInt(e.target.value) || 15 })
                      }
                      className="w-full bg-[#080c14] border border-[#1e2638] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-[#1e2638]" />

      {/* 4. DISCOM Tariffs & System Cost (INR) */}
      <div>
        <button
          type="button"
          onClick={() => setActiveAccordion(activeAccordion === 'econ' ? null : 'econ')}
          className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2"
        >
          <span className="flex items-center gap-1.5">
            <IndianRupee className="w-3.5 h-3.5 text-amber-400" /> Discom Tariffs & Cost (₹)
          </span>
          {activeAccordion === 'econ' ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {activeAccordion === 'econ' && (
          <div className="flex flex-col gap-3 pt-1">
            {/* Daily Consumption in units */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Daily Demand (Units / day):</span>
                <span className="font-mono font-bold text-purple-400">
                  {config.dailyConsumptionKwh} kWh
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="400"
                step="1"
                value={config.dailyConsumptionKwh}
                onChange={(e) =>
                  onUpdateConfig({ dailyConsumptionKwh: parseFloat(e.target.value) })
                }
                className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded appearance-none"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                ~{Math.round(config.dailyConsumptionKwh * 30)} units / month
              </span>
            </div>

            {/* Load Profile Type */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Usage Pattern:
              </label>
              <select
                value={config.loadProfileType}
                onChange={(e) =>
                  onUpdateConfig({
                    loadProfileType: e.target.value as PVSystemConfig['loadProfileType'],
                  })
                }
                className="w-full bg-[#080c14] border border-[#1e2638] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="residential">Residential (Morning & Evening Peak)</option>
                <option value="evening-heavy">Evening-Heavy (AC / Late night)</option>
                <option value="commercial">Commercial (Daytime 9am - 6pm)</option>
                <option value="flat">Flat / Constant Industrial Base</option>
              </select>
            </div>

            {/* Indian Tariffs in INR */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Grid Tariff (₹/unit):
                </label>
                <input
                  type="number"
                  min="1.0"
                  max="25.0"
                  step="0.1"
                  value={config.gridElectricityRateInr}
                  onChange={(e) =>
                    onUpdateConfig({
                      gridElectricityRateInr: parseFloat(e.target.value) || 7.5,
                    })
                  }
                  className="w-full bg-[#080c14] border border-[#1e2638] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Export Tariff (₹/unit):
                </label>
                <input
                  type="number"
                  min="0.0"
                  max="15.0"
                  step="0.1"
                  value={config.feedInTariffInr}
                  onChange={(e) =>
                    onUpdateConfig({
                      feedInTariffInr: parseFloat(e.target.value) || 3.0,
                    })
                  }
                  className="w-full bg-[#080c14] border border-[#1e2638] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* System Cost in INR */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] text-slate-400">
                  Total System Capex (₹):
                </label>
                <span className="text-[11px] font-mono text-amber-400">
                  ₹{(config.systemCostInr / 100000).toFixed(2)} Lakh
                </span>
              </div>
              <input
                type="number"
                min="50000"
                max="50000000"
                step="5000"
                value={config.systemCostInr}
                onChange={(e) =>
                  onUpdateConfig({ systemCostInr: parseFloat(e.target.value) || 150000 })
                }
                className="w-full bg-[#080c14] border border-[#1e2638] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Typical ₹50,000 - ₹65,000 / kWp in India (before subsidy)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
