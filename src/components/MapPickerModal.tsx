import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Search, Check, X, Crosshair, Loader2 } from 'lucide-react';
import { LocationData } from '../types/solar';

interface MapPickerModalProps {
  isOpen: boolean;
  initialLocation: LocationData;
  onClose: () => void;
  onSelectLocation: (loc: LocationData) => void;
}

export const MapPickerModal: React.FC<MapPickerModalProps> = ({
  isOpen,
  initialLocation,
  onClose,
  onSelectLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [currentLat, setCurrentLat] = useState<number>(initialLocation.latitude);
  const [currentLon, setCurrentLon] = useState<number>(initialLocation.longitude);
  const [locationName, setLocationName] = useState<string>(initialLocation.name);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);

  // Initialize or update Leaflet Map
  useEffect(() => {
    if (!isOpen) return;

    // Wait for DOM container to be ready
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        // Custom SVG Pin Icon
        const pinIcon = L.divIcon({
          className: 'custom-map-pin',
          html: `<div style="
            width: 32px;
            height: 32px;
            background: #f59e0b;
            border: 3px solid #0f172a;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 14px rgba(245, 158, 11, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="width: 10px; height: 10px; background: #0f172a; border-radius: 50%;"></div>
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        const map = L.map(mapContainerRef.current, {
          center: [initialLocation.latitude, initialLocation.longitude],
          zoom: 12,
          zoomControl: true,
        });

        // Clean CartoDB Dark Matter / Positron or OpenStreetMap tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 19,
        }).addTo(map);

        const marker = L.marker([initialLocation.latitude, initialLocation.longitude], {
          icon: pinIcon,
          draggable: true,
        }).addTo(map);

        // Click on map to move marker
        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setCurrentLat(lat);
          setCurrentLon(lng);
          fetchAddressFromCoords(lat, lng);
        });

        // Drag marker
        marker.on('dragend', () => {
          const latLng = marker.getLatLng();
          setCurrentLat(latLng.lat);
          setCurrentLon(latLng.lng);
          fetchAddressFromCoords(latLng.lat, latLng.lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([initialLocation.latitude, initialLocation.longitude], 12);
        if (markerRef.current) {
          markerRef.current.setLatLng([initialLocation.latitude, initialLocation.longitude]);
        }
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen, initialLocation.latitude, initialLocation.longitude]);

  // Reverse Geocoding helper
  const fetchAddressFromCoords = async (lat: number, lon: number) => {
    setIsReverseGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
        const state = data.address?.state || '';
        const suburb = data.address?.suburb || data.address?.neighbourhood || '';
        const formatted = [suburb, city, state, 'India'].filter(Boolean).join(', ') || data.display_name.split(',').slice(0, 3).join(',');
        setLocationName(formatted);
      }
    } catch (e) {
      console.warn('Reverse geocode error:', e);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Search autocomplete
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsLoading(true);

    try {
      // Prioritize India by appending India or using countrycodes=in
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&countrycodes=in&limit=5&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.warn('Search failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSearchResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    setCurrentLat(lat);
    setCurrentLon(lon);
    setLocationName(item.display_name.split(',').slice(0, 3).join(', '));
    setSearchResults([]);
    setSearchQuery('');

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], 14, { duration: 1.2 });
      markerRef.current.setLatLng([lat, lon]);
    }
  };

  const handleConfirm = () => {
    onSelectLocation({
      name: locationName,
      latitude: currentLat,
      longitude: currentLon,
      country: 'India',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#0f1422] border border-[#1e2638] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e2638] flex items-center justify-between bg-[#0b0f19]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Select Rooftop Location</h3>
              <p className="text-xs text-slate-400">
                Click anywhere on the map or drag the pin to set your exact rooftop GPS coordinates.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar Bar */}
        <div className="p-4 border-b border-[#1e2638] bg-[#0d121e]">
          <form onSubmit={handleSearchSubmit} className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search Indian city, pin code, or locality (e.g., Koramangala Bangalore, Connaught Place Delhi)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#080c14] border border-[#1e2638] focus:border-amber-500 text-xs text-white pl-10 pr-3 py-2.5 rounded-xl focus:outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </button>
          </form>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-[#080c14] border border-[#1e2638] rounded-xl overflow-hidden shadow-xl">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-left px-3.5 py-2.5 text-xs text-slate-300 hover:bg-[#121826] hover:text-white border-b border-[#1e2638] last:border-b-0 transition flex items-center justify-between"
                >
                  <span className="truncate pr-2">{item.display_name}</span>
                  <Crosshair className="w-3 h-3 text-amber-400 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Leaflet Map Canvas */}
        <div className="relative flex-1 min-h-[380px] w-full bg-[#080c14]">
          <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />
        </div>

        {/* Selected Coordinates Footer Bar */}
        <div className="p-4 bg-[#0b0f19] border-t border-[#1e2638] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="text-xs">
              <span className="text-slate-500 block">Selected Location:</span>
              <span className="text-white font-medium flex items-center gap-1.5">
                {isReverseGeocoding ? (
                  <span className="text-slate-400 italic flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Resolving address...
                  </span>
                ) : (
                  locationName
                )}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-800 hidden sm:block" />
            <div className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
              {currentLat.toFixed(4)}°N, {currentLon.toFixed(4)}°E
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-[#121826] hover:bg-slate-800 rounded-xl border border-[#1e2638] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
