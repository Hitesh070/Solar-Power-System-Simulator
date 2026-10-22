import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Sun, Play, Pause, RotateCcw, Eye, ShieldCheck, AlertCircle } from 'lucide-react';
import { calculateSolarAngles } from '../lib/solar-engine';

interface ThreeSolarSceneProps {
  latitude: number;
  longitude: number;
  panelTiltDeg: number;
  panelAzimuthDeg: number;
  systemCapacityKw: number;
}

export const ThreeSolarScene: React.FC<ThreeSolarSceneProps> = ({
  latitude,
  longitude,
  panelTiltDeg,
  panelAzimuthDeg,
  systemCapacityKw,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedHour, setSelectedHour] = useState<number>(12.5); // 12:30 PM (Solar Noon)
  const [selectedMonth, setSelectedMonth] = useState<number>(5); // May (High summer insolation)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [cameraView, setCameraView] = useState<'iso' | 'top' | 'front' | 'solar'>('iso');

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const sunMeshRef = useRef<THREE.Mesh | null>(null);
  const roofPanelsGroupRef = useRef<THREE.Group | null>(null);

  // Mouse interaction state for camera orbiting
  const isDraggingRef = useRef<boolean>(false);
  const prevMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraThetaRef = useRef<number>(Math.PI / 4.2);
  const cameraPhiRef = useRef<number>(Math.PI / 3.2);
  const cameraRadiusRef = useRef<number>(26);

  // Solar position calculation for current hour and month
  const testDate = new Date(Date.UTC(2026, selectedMonth - 1, 21, Math.floor(selectedHour), (selectedHour % 1) * 60));
  const solarAngles = calculateSolarAngles(latitude, longitude, testDate);

  // Direct sun check
  const isSunUp = solarAngles.elevationDeg > 0;
  const sunAzimuthDiff = Math.abs(solarAngles.azimuthDeg - panelAzimuthDeg);
  const isIlluminated = isSunUp && (sunAzimuthDiff < 95 || sunAzimuthDiff > 265);

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const theta = cameraThetaRef.current;
    const phi = cameraPhiRef.current;
    const r = cameraRadiusRef.current;

    cameraRef.current.position.x = r * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = r * Math.cos(phi);
    cameraRef.current.position.z = r * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.lookAt(0, 3.6, 0);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 460;

    // 1. Scene setup — Clean architectural light background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f1f5f9'); // Clean slate-100 sky
    scene.fog = new THREE.FogExp2('#f1f5f9', 0.012);
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights — Natural soft outdoor sunlight
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.75);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight('#bae6fd', '#cbd5e1', 0.6);
    scene.add(hemiLight);

    // Directional Sun Light
    const sunLight = new THREE.DirectionalLight('#fffbeb', 2.6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.camera.left = -16;
    sunLight.shadow.camera.right = 16;
    sunLight.shadow.camera.top = 16;
    sunLight.shadow.camera.bottom = -16;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Sun Sphere Visualizer
    const sunGeo = new THREE.SphereGeometry(1.2, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: '#f59e0b' });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;

    // Sun Halo
    const sunGlowGeo = new THREE.SphereGeometry(2.2, 16, 16);
    const sunGlowMat = new THREE.MeshBasicMaterial({
      color: '#fbbf24',
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
    });
    const sunGlow = new THREE.Mesh(sunGlowGeo, sunGlowMat);
    sunMesh.add(sunGlow);

    // 5. Clean Architectural Ground
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(50, 50, '#94a3b8', '#cbd5e1');
    grid.position.y = 0.01;
    scene.add(grid);

    // Compass markers (N, S, E, W)
    addCompassMarkers(scene);

    // 6. Modern Clean Flat Terrace Building
    buildFlatTerraceBuilding(scene);

    // 7. Accurately Scaled Elevated Solar Panels
    const panelsGroup = new THREE.Group();
    scene.add(panelsGroup);
    roofPanelsGroupRef.current = panelsGroup;
    updateElevatedTerracePanels(panelsGroup, panelTiltDeg, panelAzimuthDeg, systemCapacityKw);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 460;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update panels orientation when tilt/azimuth/capacity change
  useEffect(() => {
    if (roofPanelsGroupRef.current) {
      updateElevatedTerracePanels(roofPanelsGroupRef.current, panelTiltDeg, panelAzimuthDeg, systemCapacityKw);
    }
  }, [panelTiltDeg, panelAzimuthDeg, systemCapacityKw]);

  // Update sun position in 3D scene
  useEffect(() => {
    if (!sunLightRef.current || !sunMeshRef.current) return;

    const elevationRad = solarAngles.elevationDeg * (Math.PI / 180);
    const azimuthRad = (solarAngles.azimuthDeg - 180) * (Math.PI / 180);

    const sunDistance = 35;
    const isAboveHorizon = solarAngles.elevationDeg > 0;

    const x = sunDistance * Math.cos(elevationRad) * Math.sin(azimuthRad);
    const y = Math.max(-5, sunDistance * Math.sin(elevationRad));
    const z = sunDistance * Math.cos(elevationRad) * Math.cos(azimuthRad);

    sunLightRef.current.position.set(x, y, z);
    sunMeshRef.current.position.set(x, y, z);

    if (isAboveHorizon) {
      const intensity = Math.min(3.0, Math.max(0.4, 2.8 * Math.sin(elevationRad)));
      sunLightRef.current.intensity = intensity;
      sunLightRef.current.color.set('#fffbeb');
      sunMeshRef.current.visible = true;
    } else {
      sunLightRef.current.intensity = 0.05;
      sunMeshRef.current.visible = false;
    }
  }, [selectedHour, selectedMonth, latitude, longitude, solarAngles.elevationDeg, solarAngles.azimuthDeg]);

  // Scrubber animation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSelectedHour((prev) => {
        const next = prev + 0.15;
        return next > 23.5 ? 0.5 : next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - prevMousePosRef.current.x;
    const deltaY = e.clientY - prevMousePosRef.current.y;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };

    cameraThetaRef.current -= deltaX * 0.008;
    cameraPhiRef.current = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, cameraPhiRef.current - deltaY * 0.008));
    updateCameraPosition();
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    cameraRadiusRef.current = Math.max(12, Math.min(50, cameraRadiusRef.current + e.deltaY * 0.02));
    updateCameraPosition();
  };

  const setViewPreset = (view: 'iso' | 'top' | 'front' | 'solar') => {
    setCameraView(view);
    if (view === 'iso') {
      cameraThetaRef.current = Math.PI / 4.2;
      cameraPhiRef.current = Math.PI / 3.2;
      cameraRadiusRef.current = 26;
    } else if (view === 'top') {
      cameraThetaRef.current = 0;
      cameraPhiRef.current = 0.08;
      cameraRadiusRef.current = 24;
    } else if (view === 'front') {
      cameraThetaRef.current = 0;
      cameraPhiRef.current = Math.PI / 2.3;
      cameraRadiusRef.current = 22;
    } else if (view === 'solar') {
      const azRad = (solarAngles.azimuthDeg - 180) * (Math.PI / 180);
      cameraThetaRef.current = azRad;
      cameraPhiRef.current = Math.PI / 3;
      cameraRadiusRef.current = 26;
    }
    updateCameraPosition();
  };

  return (
    <div className="relative flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* 3D Canvas Viewport */}
      <div
        ref={mountRef}
        className="w-full h-[460px] cursor-grab active:cursor-grabbing relative select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* HUD Top-Left: Solar Elevation & Azimuth */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm text-xs flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${isSunUp ? 'bg-slate-900' : 'bg-slate-400'}`} />
            <div>
              <span className="text-slate-500">Elevation:</span>{' '}
              <span className={`font-mono font-bold ${isSunUp ? 'text-slate-900' : 'text-slate-500'}`}>
                {solarAngles.elevationDeg.toFixed(1)}°
              </span>
            </div>
            <div className="h-3.5 w-px bg-slate-200" />
            <div>
              <span className="text-slate-500">Azimuth:</span>{' '}
              <span className="font-mono font-bold text-slate-700">
                {solarAngles.azimuthDeg.toFixed(1)}°
              </span>
            </div>
          </div>

          {/* Direct Sun Badge */}
          <div className={`backdrop-blur-md border rounded-xl px-3.5 py-1.5 text-xs flex items-center gap-2 shadow-sm transition-all ${
            isIlluminated
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
              : 'bg-white/90 border-slate-200 text-slate-500'
          }`}>
            {isIlluminated ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-medium">Direct Sun on Rooftop Array (Zero Shading)</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-slate-600" />
                <span className="font-medium">
                  {isSunUp ? 'High Incident Angle / Parapet Shade' : 'Night Time (Sun Below Horizon)'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* HUD Top-Right: Camera Presets */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl p-1 shadow-sm">
          {(['iso', 'top', 'front', 'solar'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setViewPreset(view)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                cameraView === view
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {view === 'iso' && 'Isometric'}
              {view === 'top' && 'Rooftop (Top)'}
              {view === 'front' && 'Front Elevation'}
              {view === 'solar' && 'Sun Follow'}
            </button>
          ))}
        </div>

        {/* HUD Bottom Center: Drag Hint */}
        <div className="absolute bottom-3 left-4 z-10 pointer-events-none text-[11px] text-slate-500 flex items-center gap-2 bg-white/80 px-3 py-1 rounded-full border border-slate-200 shadow-sm backdrop-blur-sm">
          <Eye className="w-3.5 h-3.5 text-slate-700" />
          <span>Flat Terrace Array • Click & Drag to Orbit • Scroll to Zoom</span>
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex items-center gap-4 w-full md:w-3/5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2.5 rounded-xl border transition-all ${
              isPlaying
                ? 'bg-blue-600 border-blue-700 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title={isPlaying ? 'Pause' : 'Play 24h Cycle'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 font-medium flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-blue-600" /> Time of Day
              </span>
              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {String(Math.floor(selectedHour)).padStart(2, '0')}:
                {String(Math.floor((selectedHour % 1) * 60)).padStart(2, '0')}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="23.9"
              step="0.1"
              value={selectedHour}
              onChange={(e) => {
                setSelectedHour(parseFloat(e.target.value));
                if (isPlaying) setIsPlaying(false);
              }}
              className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded appearance-none"
            />
          </div>
        </div>

        {/* Season Selector */}
        <div className="flex items-center gap-3 w-full md:w-2/5 justify-end">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Season:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-900 shadow-sm"
          >
            <option value={6}>June (Summer Solstice)</option>
            <option value={3}>March (Spring Equinox)</option>
            <option value={9}>September (Autumn Equinox)</option>
            <option value={12}>December (Winter Solstice)</option>
          </select>

          <button
            onClick={() => {
              setSelectedHour(12.5);
              setViewPreset('iso');
            }}
            className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition shadow-sm"
            title="Reset Time & View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Three.js Clean Architectural Builders
// -------------------------------------------------------------

function addCompassMarkers(scene: THREE.Scene) {
  const directions = [
    { label: 'N', x: 0, z: -14, color: '#ef4444' },
    { label: 'S', x: 0, z: 14, color: '#0284c7' },
    { label: 'E', x: 14, z: 0, color: '#64748b' },
    { label: 'W', x: -14, z: 0, color: '#64748b' },
  ];

  directions.forEach(({ x, z, color }) => {
    const markerGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16);
    const markerMat = new THREE.MeshBasicMaterial({ color });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(x, 0.05, z);
    scene.add(marker);
  });
}

/**
 * Builds a proportional Flat Concrete Terrace Building
 */
function buildFlatTerraceBuilding(scene: THREE.Scene) {
  const buildingGroup = new THREE.Group();

  const width = 12.0;
  const height = 4.8;
  const depth = 9.0;

  // 1. Main Building Body (Clean modern architecture)
  const bodyGeo = new THREE.BoxGeometry(width, height, depth);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.8,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  buildingGroup.add(body);

  // 2. Concrete Terrace Roof Slab
  const slabGeo = new THREE.BoxGeometry(width + 0.4, 0.25, depth + 0.4);
  const slabMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.7,
  });
  const slab = new THREE.Mesh(slabGeo, slabMat);
  slab.position.y = height + 0.125;
  slab.receiveShadow = true;
  buildingGroup.add(slab);

  // 3. Parapet Boundary Walls (Terrace coping)
  const pHeight = 0.8;
  const pThick = 0.25;
  const pMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.7 });

  const pY = height + 0.25 + pHeight / 2;

  // North wall
  const nWall = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, pHeight, pThick), pMat);
  nWall.position.set(0, pY, -(depth + 0.4) / 2 + pThick / 2);
  nWall.castShadow = true;
  nWall.receiveShadow = true;
  buildingGroup.add(nWall);

  // South wall
  const sWall = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, pHeight, pThick), pMat);
  sWall.position.set(0, pY, (depth + 0.4) / 2 - pThick / 2);
  sWall.castShadow = true;
  sWall.receiveShadow = true;
  buildingGroup.add(sWall);

  // West wall
  const wWall = new THREE.Mesh(new THREE.BoxGeometry(pThick, pHeight, depth), pMat);
  wWall.position.set(-(width + 0.4) / 2 + pThick / 2, pY, 0);
  wWall.castShadow = true;
  wWall.receiveShadow = true;
  buildingGroup.add(wWall);

  // East wall
  const eWall = new THREE.Mesh(new THREE.BoxGeometry(pThick, pHeight, depth), pMat);
  eWall.position.set((width + 0.4) / 2 - pThick / 2, pY, 0);
  eWall.castShadow = true;
  eWall.receiveShadow = true;
  buildingGroup.add(eWall);

  // 4. Staircase Headroom (Mumty) in North-West corner
  const mumtyWidth = 2.4;
  const mumtyHeight = 2.2;
  const mumtyDepth = 2.4;
  const mumty = new THREE.Mesh(
    new THREE.BoxGeometry(mumtyWidth, mumtyHeight, mumtyDepth),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 })
  );
  mumty.position.set(-4.0, height + 0.25 + mumtyHeight / 2, -2.8);
  mumty.castShadow = true;
  mumty.receiveShadow = true;
  buildingGroup.add(mumty);

  // Overhead Water Tank
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 1.1, 20),
    new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4 })
  );
  tank.position.set(-4.0, height + 0.25 + mumtyHeight + 0.55, -2.8);
  tank.castShadow = true;
  buildingGroup.add(tank);

  // Architectural Windows
  const glassMat = new THREE.MeshStandardMaterial({ color: '#0284c7', metalness: 0.8, roughness: 0.1 });
  const winGeo = new THREE.BoxGeometry(2.0, 1.4, 0.1);
  const win1 = new THREE.Mesh(winGeo, glassMat);
  win1.position.set(-2.5, 3.2, depth / 2 + 0.05);
  buildingGroup.add(win1);

  const win2 = new THREE.Mesh(winGeo, glassMat);
  win2.position.set(2.5, 3.2, depth / 2 + 0.05);
  buildingGroup.add(win2);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 2.2, 0.1),
    new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.6 })
  );
  door.position.set(2.5, 1.1, depth / 2 + 0.05);
  buildingGroup.add(door);

  scene.add(buildingGroup);
}

/**
 * Accurately sizes and positions the solar array safely inside the terrace perimeter
 * Eliminates wall clipping and aligns support legs directly beneath the array
 */
function updateElevatedTerracePanels(
  panelsGroup: THREE.Group,
  tiltDeg: number,
  azimuthDeg: number,
  capacityKw: number
) {
  while (panelsGroup.children.length > 0) {
    const child = panelsGroup.children[0];
    panelsGroup.remove(child);
  }

  // Determine appropriate visual panel count (representative module grid)
  // Clamp to max 16 modules so array never overflows terrace boundary!
  const panelCount = Math.max(4, Math.min(16, Math.round(capacityKw / 0.4)));
  const cols = Math.min(4, Math.ceil(Math.sqrt(panelCount)));
  const rows = Math.ceil(panelCount / cols);

  const panelWidth = 1.0;
  const panelHeight = 1.65;
  const panelDepth = 0.04;

  const panelGeo = new THREE.BoxGeometry(panelWidth, panelHeight, panelDepth);
  
  // High-efficiency dark monocrystalline silicon PV cell material
  const panelMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    emissive: '#0284c7',
    emissiveIntensity: 0.08,
    metalness: 0.85,
    roughness: 0.25,
  });

  // Silver aluminum frame
  const frameMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    metalness: 0.95,
    roughness: 0.2,
  });

  // Hot-dip galvanized steel strut material
  const rackMat = new THREE.MeshStandardMaterial({
    color: '#64748b',
    metalness: 0.8,
    roughness: 0.4,
  });

  // Root anchor group positioned in center of open terrace area
  // Terrace slab floor is at y = 5.05
  // Open terrace center is around x = 1.2, z = 0.5 (leaving clearance from mumty at x = -4.0, z = -2.8)
  const terraceFloorY = 5.05;
  const arrayBaseY = terraceFloorY + 0.6; // elevated 0.6m above terrace

  const arrayMount = new THREE.Group();
  arrayMount.position.set(1.0, arrayBaseY, 0.4);

  // Rotate entire mount by Azimuth around vertical Y axis
  // 180° = True South (+Z), 0° = North (-Z), 90° = East (+X), 270° = West (-X)
  const azimuthRad = (azimuthDeg - 180) * (Math.PI / 180);
  arrayMount.rotation.y = azimuthRad;

  // Child group for tilting the panels along the lower pivot axis
  const tiltGroup = new THREE.Group();
  const tiltRad = tiltDeg * (Math.PI / 180);
  // Panel tilt rotates around X axis
  tiltGroup.rotation.x = Math.PI / 2 - tiltRad;

  let added = 0;
  const totalArrayWidth = cols * (panelWidth + 0.05);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (added >= panelCount) break;

      const posX = (c - cols / 2 + 0.5) * (panelWidth + 0.05);
      const posY = (r - rows / 2 + 0.5) * (panelHeight + 0.05);

      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(posX, posY, 0.03);
      panel.castShadow = true;
      panel.receiveShadow = true;

      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(panelWidth + 0.03, panelHeight + 0.03, panelDepth * 0.8),
        frameMat
      );
      frame.position.set(posX, posY, 0.01);
      frame.castShadow = true;

      tiltGroup.add(frame);
      tiltGroup.add(panel);
      added++;
    }
  }

  arrayMount.add(tiltGroup);

  // Add 4 structural mounting legs directly connecting array corners to terrace floor
  const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
  const halfW = totalArrayWidth / 2 - 0.2;
  const legCoords = [
    [-halfW, 0.8],
    [halfW, 0.8],
    [-halfW, -0.8],
    [halfW, -0.8],
  ];

  legCoords.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, rackMat);
    leg.position.set(lx, (terraceFloorY + arrayBaseY) / 2 - arrayBaseY, lz);
    leg.castShadow = true;
    arrayMount.add(leg);
  });

  panelsGroup.add(arrayMount);
}
