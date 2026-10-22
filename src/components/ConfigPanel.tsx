import React, { useState } from 'react';
import {
  MapPin,
  Battery,
  Zap,
  DollarSign,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LocationData, PVSystemConfig } from '../types/solar';
import { searchLocation } from '../lib/weather-api';

interface ConfigPanelProps {
  location: LocationData;
  config: PVSystemConfig;
  onUpdateLocation: (loc: LocationData) => void;
  onUpdateConfig: (newConfig: Partial<PVSystemConfig>) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  location,
  config,
  onUpdateLocation,
  onUpdateConfig,
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
      name: item.displayName.split(',').slice(0, 3).join(','),
      latitude: item.lat,
      longitude: item.lon,
      timezone: 'Auto',
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 flex flex-col gap-5 shadow-xl">
      {/* 1. Location & Geocoding Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" /> Geographic Location
          </label>
          <span className="text-[11px] font-mono text-amber-400">
            {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
          </span>
        </div>

        {/* Search input */}
        <form onSubmit={handleSearch} className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search city, address or coordinates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-xs text-white pl-8 pr-3 py-2 rounded-xl focus:outline-none transition"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-medium border border-slate-700 transition"
          >
            {isSearching ? '...' : 'Find'}
          </button>
        </form>

        {/* Autocomplete dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-slate-950 border border-slate-700 rounded-xl overflow-hidden shadow-2xl z-20">
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectSearchResult(item)}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white border-b border-slate-800/60 last:border-b-0 transition flex items-center justify-between"
              >
                <span className="truncate pr-2">{item.displayName}</span>
                <Check className="w-3 h-3 text-amber-400 opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}

        {/* Active location tag */}
        <div className="mt-2 text-xs text-slate-400 bg-slate-950/70 px-3 py-2 rounded-xl border border-slate-800/80 truncate">
          <span className="font-semibold text-white">{location.name}</span>
        </div>
      </div>

      <div className="h-px bg-slate-800" />

      {/* 2. Solar PV Hardware Parameters */}
      <div>
        <button
          type="button"
          onClick={() => setActiveAccordion(activeAccordion === 'pv' ? null : 'pv')}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider mb-2"
        >
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Photovoltaic Array
          </span>
          {activeAccordion === 'pv' ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {activeAccordion === 'pv' && (
          <div className="flex flex-col gap-3 pt-1">
            {/* DC Capacity Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">System DC Power:</span>
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

            {/* Tilt Angle Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Roof Tilt Angle:</span>
                <span className="font-mono font-bold text-sky-400">
                  {config.panelTiltDeg}° ({config.panelTiltDeg === 0 ? 'Flat' : config.panelTiltDeg > 50 ? 'Steep' : 'Optimal'})
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="1"
                value={config.panelTiltDeg}
                onChange={(e) =>
                  onUpdateConfig({ panelTiltDeg: parseInt(e.target.value) })
                }
                className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded appearance-none"
              />
            </div>

            {/* Azimuth Angle Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Panel Azimuth (Facing):</span>
                <span className="font-mono font-bold text-amber-400">
                  {config.panelAzimuthDeg}° (
                  {config.panelAzimuthDeg === 180
                    ? 'South'
                    : config.panelAzimuthDeg === 90
                    ? 'East'
                    : config.panelAzimuthDeg === 270
                    ? 'West'
                    : config.panelAzimuthDeg === 0
                    ? 'North'
                    : config.panelAzimuthDeg < 180
                    ? 'SE'
                    : 'SW'}
                  )
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={config.panelAzimuthDeg}
                onChange={(e) =>
                  onUpdateConfig({ panelAzimuthDeg: parseInt(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded appearance-none"
              />
            </div>

            {/* Inverter Capacity */}
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-slate-800" />

      {/* 3. Battery Storage System (BESS) */}
      <div>
        <button
          type="button"
          onClick={() => setActiveAccordion(activeAccordion === 'battery' ? null : 'battery')}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider mb-2"
        >
          <span className="flex items-center gap-1.5">
            <Battery className="w-3.5 h-3.5 text-emerald-400" /> Battery Storage (BESS)
          </span>
          {activeAccordion === 'battery' ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {activeAccordion === 'battery' && (
          <div className="flex flex-col gap-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={config.hasBattery}
                onChange={(e) => onUpdateConfig({ hasBattery: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
              <span className="text-xs text-slate-200 font-medium">
                Include Energy Storage Battery
              </span>
            </label>

            {config.hasBattery && (
              <>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Battery Usable Capacity:</span>
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
                      Max Power (kW):
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-slate-800" />

      {/* 4. Consumption & Financial Settings */}
      <div>
        <button
          type="button"
          onClick={() => setActiveAccordion(activeAccordion === 'econ' ? null : 'econ')}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider mb-2"
        >
          <span className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" /> Load & Utility Rates
          </span>
          {activeAccordion === 'econ' ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {activeAccordion === 'econ' && (
          <div className="flex flex-col gap-3 pt-1">
            {/* Daily Consumption */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Daily Demand (kWh/day):</span>
                <span className="font-mono font-bold text-purple-400">
                  {config.dailyConsumptionKwh} kWh
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="500"
                step="1"
                value={config.dailyConsumptionKwh}
                onChange={(e) =>
                  onUpdateConfig({ dailyConsumptionKwh: parseFloat(e.target.value) })
                }
                className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded appearance-none"
              />
            </div>

            {/* Load Profile Type */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Demand Profile Type:
              </label>
              <select
                value={config.loadProfileType}
                onChange={(e) =>
                  onUpdateConfig({
                    loadProfileType: e.target.value as PVSystemConfig['loadProfileType'],
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="residential">Residential (Morning & Evening Peak)</option>
                <option value="evening-heavy">Evening-Heavy (AC / Night Shift)</option>
                <option value="commercial">Commercial (Daytime 9am - 5pm Peak)</option>
                <option value="flat">Flat / Constant Industrial Base</option>
              </select>
            </div>

            {/* Tariffs & Capital Cost */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Grid Rate ($/kWh):
                </label>
                <input
                  type="number"
                  min="0.01"
                  max="1.50"
                  step="0.01"
                  value={config.gridElectricityRateUsd}
                  onChange={(e) =>
                    onUpdateConfig({
                      gridElectricityRateUsd: parseFloat(e.target.value) || 0.15,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Export Tariff ($/kWh):
                </label>
                <input
                  type="number"
                  min="0.00"
                  max="1.00"
                  step="0.01"
                  value={config.feedInTariffUsd}
                  onChange={(e) =>
                    onUpdateConfig({
                      feedInTariffUsd: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Total System Turnkey Cost ($):
              </label>
              <input
                type="number"
                min="1000"
                max="500000"
                step="500"
                value={config.systemCostUsd}
                onChange={(e) =>
                  onUpdateConfig({ systemCostUsd: parseFloat(e.target.value) || 5000 })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
