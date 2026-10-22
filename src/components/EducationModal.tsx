import React from 'react';
import { X, BookOpen, Sun, Compass, Zap, Battery, ExternalLink } from 'lucide-react';

interface EducationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EducationModal: React.FC<EducationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Photovoltaic Physics & Computational Principles</h2>
            <p className="text-xs text-slate-400">
              Understanding the mathematics, transposition models, and thermodynamics powering HeliosPV.
            </p>
          </div>
        </div>

        {/* Educational Content Blocks */}
        <div className="space-y-6 text-xs text-slate-300 leading-relaxed">
          {/* Section 1: Solar Position Algorithms */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2">
              <Sun className="w-4 h-4" /> 1. Solar Geometry & Astronomical Position (SPA / Michalsky)
            </h3>
            <p className="mb-3">
              The sun's position relative to an observer at latitude &phi; and longitude &lambda; is defined by:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-1">
              <li>
                <strong className="text-white">Solar Zenith (&theta;_z):</strong> Angle between the sun and the vertical overhead zenith (0° at direct overhead, 90° at horizon).
              </li>
              <li>
                <strong className="text-white">Solar Elevation (&alpha;):</strong> Angle above the horizon (&alpha; = 90° - &theta;_z).
              </li>
              <li>
                <strong className="text-white">Solar Azimuth (&gamma;_s):</strong> Compass bearing from True North (0° = North, 90° = East, 180° = South, 270° = West).
              </li>
              <li>
                <strong className="text-white">Equation of Time (EqT):</strong> Accounts for the Earth's elliptical orbit and axial tilt causing solar noon to deviate from 12:00 clock time by up to &plusmn; 16 minutes.
              </li>
            </ul>
          </div>

          {/* Section 2: Plane of Array (POA) Irradiance */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-sky-400 mb-2 flex items-center gap-2">
              <Compass className="w-4 h-4" /> 2. Transposition Model: Plane of Array (POA) Irradiance
            </h3>
            <p className="mb-2">
              Horizontal irradiance measured by weather stations consists of Direct Normal Irradiance (DNI) and Diffuse Horizontal Irradiance (DHI). To simulate the sunlight hitting a tilted roof, HeliosPV applies the <strong>Hay-Davies transposition model</strong>:
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-sky-300 my-2">
              POA = I_beam + I_diffuse + I_ground<br />
              I_beam = DNI × max(0, cos &theta;)<br />
              I_ground = GHI × &rho; × ((1 - cos &beta;) / 2)
            </div>
            <p className="text-slate-400">
              Where &theta; is the Angle of Incidence (AOI), &beta; is panel tilt, and &rho; &asymp; 0.20 is the standard ground albedo reflectance.
            </p>
          </div>

          {/* Section 3: Cell Temperature & King / Sandia Model */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" /> 3. Operating Cell Temperature & Power Derating
            </h3>
            <p className="mb-2">
              Solar panels are rated at <strong>Standard Test Conditions (STC: 1000 W/m² @ 25°C)</strong>. Under real sunlight, dark silicon cells heat up significantly higher than the surrounding air:
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-emerald-300 my-2">
              T_cell = T_amb + (POA / 800) × (NOCT - 20) × exp(-0.05 × WindSpeed)
            </div>
            <p className="text-slate-400">
              Because silicon is a semiconductor, voltage drops as cell temperature rises (typically <strong className="text-white">-0.35%/°C</strong>). On a 35°C summer day with cells reaching 65°C, panel power output drops by ~14% strictly due to heat!
            </p>
          </div>

          {/* Section 4: Battery Storage Dispatch & Energy Balance */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-purple-400 mb-2 flex items-center gap-2">
              <Battery className="w-4 h-4" /> 4. Battery Storage & Diurnal Dispatch Hierarchy
            </h3>
            <p className="mb-2">
              Energy is dispatched instantaneously following priority rules:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-400 pl-1">
              <li><strong className="text-white">Priority 1:</strong> Solar AC power directly covers household demand.</li>
              <li><strong className="text-white">Priority 2:</strong> Any surplus power charges the battery bank up to maximum C-rate power and capacity.</li>
              <li><strong className="text-white">Priority 3:</strong> Once battery reaches 100% SoC, excess is exported to the grid for feed-in credits.</li>
              <li><strong className="text-white">Priority 4:</strong> At night or during cloudy periods, the battery discharges to cover demand down to its depth-of-discharge reserve floor (e.g. 15%).</li>
            </ol>
          </div>

          {/* External References & Benchmarks */}
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <span className="text-[11px] text-slate-500">
              Calibrated against NREL PVWatts & PVlib Open-Source Standards.
            </span>
            <div className="flex items-center gap-3">
              <a
                href="https://pvwatts.nrel.gov/"
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                NREL PVWatts <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://pvlib-python.readthedocs.io/"
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                pvlib-python Docs <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://open-meteo.com/en/docs/solar-radiation-api"
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                Open-Meteo Solar API <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
