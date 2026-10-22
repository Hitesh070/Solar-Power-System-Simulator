import React from 'react';
import { X, BookOpen, Sun, Compass, Zap, Battery, ExternalLink } from 'lucide-react';

interface EducationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EducationModal: React.FC<EducationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-slate-100 text-slate-900 border border-slate-200 rounded-2xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Photovoltaic Physics & Computational Principles</h2>
            <p className="text-xs text-slate-500">
              Understanding the mathematics, transposition models, and thermodynamics powering HI Grid.
            </p>
          </div>
        </div>

        {/* Educational Content Blocks */}
        <div className="space-y-5 text-xs text-slate-600 leading-relaxed">
          {/* Section 1: Solar Position Algorithms */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Sun className="w-4 h-4 text-slate-900" /> 1. Solar Geometry & Astronomical Position (Spencer / NOAA Algorithm)
            </h3>
            <p className="mb-3">
              The sun's position relative to an observer at latitude &phi; and longitude &lambda; is defined by:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 pl-1">
              <li>
                <strong className="text-slate-900">Solar Zenith (&theta;_z):</strong> Angle between the sun and the vertical overhead zenith with atmospheric refraction correction.
              </li>
              <li>
                <strong className="text-slate-900">Solar Elevation (&alpha;):</strong> Apparent angle above the horizon (&alpha; = 90° - &theta;_z).
              </li>
              <li>
                <strong className="text-slate-900">Solar Azimuth (&gamma;_s):</strong> Compass bearing from True North (0° = North, 90° = East, 180° = South, 270° = West).
              </li>
              <li>
                <strong className="text-slate-900">Equation of Time (EqT):</strong> Accounts for the Earth's orbital eccentricity and axial obliquity causing solar noon to deviate from 12:00 clock time.
              </li>
            </ul>
          </div>

          {/* Section 2: Plane of Array (POA) Irradiance */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-sky-700 mb-2 flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-600" /> 2. Transposition Model: Plane of Array (POA) with ASHRAE IAM
            </h3>
            <p className="mb-2">
              To simulate sunlight striking a tilted rooftop array, HI Grid applies the <strong>Hay-Davies transposition model</strong> coupled with physical <strong>Incidence Angle Modifier (IAM)</strong> glass transmission curves:
            </p>
            <div className="bg-white border border-slate-200 rounded-xl p-3 font-mono text-[11px] text-sky-800 my-2 shadow-sm">
              POA = I_beam × IAM(&theta;) + I_diffuse + I_ground<br />
              IAM(&theta;) = 1 - 0.05 × (1 / cos &theta; - 1)<br />
              I_beam = DNI × max(0, cos &theta;)<br />
              I_ground = GHI × &rho; × ((1 - cos &beta;) / 2)
            </div>
            <p className="text-slate-500">
              Where &theta; is the Angle of Incidence (AOI), &beta; is panel tilt, and &rho; &asymp; 0.20 is standard ground albedo.
            </p>
          </div>

          {/* Section 3: Cell Temperature & Faiman Model */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-emerald-700 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" /> 3. Operating Cell Temperature (Faiman Model - IEC 61853)
            </h3>
            <p className="mb-2">
              Under sunlight, dark silicon cells heat up significantly higher than ambient air. HI Grid implements the empirical <strong>Faiman heat transfer model</strong>:
            </p>
            <div className="bg-white border border-slate-200 rounded-xl p-3 font-mono text-[11px] text-emerald-800 my-2 shadow-sm">
              T_cell = T_amb + POA / (U_0 + U_1 × v_roof)<br />
              U_0 = 25.0 W/m²K, U_1 = 6.84 W/m²K/(m/s), v_roof ≈ 0.76 × v_10m
            </div>
            <p className="text-slate-500">
              Standard open-rack coefficients calibrate precisely to 45°C NOCT under standard reference conditions. Voltage derating of <strong className="text-slate-900">-0.35%/°C</strong> is applied for cell temperatures above 25°C STC.
            </p>
          </div>

          {/* Section 4: Battery Storage Dispatch & Energy Balance */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-purple-700 mb-2 flex items-center gap-2">
              <Battery className="w-4 h-4 text-purple-600" /> 4. Battery Storage & Diurnal Dispatch Hierarchy
            </h3>
            <p className="mb-2">
              Energy is dispatched instantaneously following priority rules:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1">
              <li><strong className="text-slate-900">Priority 1:</strong> Solar AC power directly covers household demand.</li>
              <li><strong className="text-slate-900">Priority 2:</strong> Any surplus power charges the battery bank up to maximum C-rate power and capacity.</li>
              <li><strong className="text-slate-900">Priority 3:</strong> Once battery reaches 100% SoC, excess is exported to the grid for feed-in credits.</li>
              <li><strong className="text-slate-900">Priority 4:</strong> At night or during cloudy periods, the battery discharges to cover demand down to reserve floor.</li>
            </ol>
          </div>

          {/* External References & Benchmarks */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <span className="text-[11px] text-slate-400">
              Calibrated against NREL PVWatts & PVlib Open-Source Standards.
            </span>
            <div className="flex items-center gap-3">
              <a
                href="https://pvwatts.nrel.gov/"
                target="_blank"
                rel="noreferrer"
                className="text-slate-900 hover:underline flex items-center gap-1 text-[11px] font-semibold"
              >
                NREL PVWatts <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://pvlib-python.readthedocs.io/"
                target="_blank"
                rel="noreferrer"
                className="text-slate-900 hover:underline flex items-center gap-1 text-[11px] font-semibold"
              >
                pvlib-python Docs <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://open-meteo.com/en/docs/solar-radiation-api"
                target="_blank"
                rel="noreferrer"
                className="text-slate-900 hover:underline flex items-center gap-1 text-[11px] font-semibold"
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
