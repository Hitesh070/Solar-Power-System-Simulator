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

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        // High-contrast clean pin icon
        const pinIcon = L.divIcon({
          className: 'custom-map-pin',
          html: `<div style="
            width: 32px;
            height: 32px;
            background: #f59e0b;
            border: 3px solid #ffffff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="width: 10px; height: 10px; background: #ffffff; border-radius: 50%;"></div>
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        const map = L.map(mapContainerRef.current, {
          center: [initialLocation.latitude, initialLocation.longitude],
          zoom: 12,
          zoomControl: true,
        });

        // Standard official OpenStreetMap tiles (100% free, NO API key required, zero watermarks)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        const marker = L.marker([initialLocation.latitude, initialLocation.longitude], {
          icon: pinIcon,
          draggable: true,
        }).addTo(map);

        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setCurrentLat(lat);
          setCurrentLon(lng);
          fetchAddressFromCoords(lat, lng);
        });

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

  const fetchAddressFromCoords = async (lat: number, lon: number) => {
    setIsReverseGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state_district || '';
        const state = data.address?.state || '';
        const country = data.address?.country || '';
        const suburb = data.address?.suburb || data.address?.neighbourhood || '';
        const formatted = [suburb, city, state, country].filter(Boolean).join(', ') || data.display_name.split(',').slice(0, 3).join(',');
        setLocationName(formatted);
      }
    } catch (e) {
      console.warn('Reverse geocode error:', e);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsLoading(true);

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&limit=5&addressdetails=1`;
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
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 text-slate-900 rounded-xl border border-slate-200">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Select Rooftop Location</h3>
              <p className="text-xs text-slate-500">
                Click anywhere on the map or drag the pin to set your exact geographic coordinates.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <form onSubmit={handleSearchSubmit} className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search city, address, or locality anywhere in the world..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 text-xs text-slate-900 pl-10 pr-3 py-2.5 rounded-xl focus:outline-none transition focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-slate-900 hover:bg-black text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </button>
          </form>

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-b border-slate-100 last:border-b-0 transition flex items-center justify-between"
                >
                  <span className="truncate pr-2">{item.display_name}</span>
                  <Crosshair className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Leaflet Map Canvas */}
        <div className="relative flex-1 min-h-[380px] w-full bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="text-xs">
              <span className="text-slate-400 block font-medium">Selected Location:</span>
              <span className="text-slate-900 font-semibold flex items-center gap-1.5">
                {isReverseGeocoding ? (
                  <span className="text-slate-500 italic flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Resolving address...
                  </span>
                ) : (
                  locationName
                )}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {currentLat.toFixed(4)}°, {currentLon.toFixed(4)}°
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl transition flex items-center gap-1.5 shadow-sm"
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
