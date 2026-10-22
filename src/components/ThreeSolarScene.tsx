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
  const [selectedHour, setSelectedHour] = useState<number>(12.5); // 12:30 PM (Indian Solar Noon)
  const [selectedMonth, setSelectedMonth] = useState<number>(4); // April (Peak Indian Summer)
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
  const cameraThetaRef = useRef<number>(Math.PI / 4);
  const cameraPhiRef = useRef<number>(Math.PI / 3.4);
  const cameraRadiusRef = useRef<number>(25);

  // Solar position calculation for current hour and month
  const testDate = new Date(Date.UTC(2026, selectedMonth - 1, 21, Math.floor(selectedHour), (selectedHour % 1) * 60));
  const solarAngles = calculateSolarAngles(latitude, longitude, testDate);

  // Is panel in direct sun? Check elevation and angle relative to panel orientation
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
    cameraRef.current.lookAt(0, 3.8, 0);
  };

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 460;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070a12');
    scene.fog = new THREE.FogExp2('#070a12', 0.012);
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
    renderer.toneMappingExposure = 1.05;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight('#94a3b8', 0.45);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight('#60a5fa', '#0f172a', 0.4);
    scene.add(hemiLight);

    // Directional Sun Light
    const sunLight = new THREE.DirectionalLight('#fef08a', 2.8);
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
    const sunMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;

    // Sun Glow Halo
    const sunGlowGeo = new THREE.SphereGeometry(2.4, 16, 16);
    const sunGlowMat = new THREE.MeshBasicMaterial({
      color: '#f59e0b',
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
    });
    const sunGlow = new THREE.Mesh(sunGlowGeo, sunGlowMat);
    sunMesh.add(sunGlow);

    // 5. Ground Plane
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#0b0f19',
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(50, 50, '#1e2638', '#111726');
    grid.position.y = 0.01;
    scene.add(grid);

    // Compass markers (N, S, E, W)
    addCompassMarkers(scene);

    // 6. Modern Flat Terrace Building (No slanting roof)
    buildFlatTerraceBuilding(scene);

    // 7. Elevated Flat Terrace Solar Panels Mount
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

  // Update sun position in 3D scene when hour/month changes
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
      const sunWarmth = Math.sin(elevationRad);
      const intensity = Math.min(3.2, Math.max(0.2, 3.0 * Math.sin(elevationRad)));
      sunLightRef.current.intensity = intensity;
      sunLightRef.current.color.set(sunWarmth < 0.2 ? '#f97316' : '#fef08a');
      sunMeshRef.current.visible = true;
    } else {
      sunLightRef.current.intensity = 0.05;
      sunMeshRef.current.visible = false;
    }
  }, [selectedHour, selectedMonth, latitude, longitude, solarAngles.elevationDeg, solarAngles.azimuthDeg]);

  // Daylight scrubber animation
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
      cameraThetaRef.current = Math.PI / 4;
      cameraPhiRef.current = Math.PI / 3.4;
      cameraRadiusRef.current = 25;
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
      cameraRadiusRef.current = 25;
    }
    updateCameraPosition();
  };

  return (
    <div className="relative flex flex-col bg-[#0b0f19] border border-[#1e2638] rounded-2xl overflow-hidden shadow-2xl">
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
          <div className="bg-[#0f1422]/90 backdrop-blur-md border border-[#1e2638] rounded-xl px-4 py-2.5 shadow-lg text-xs flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${isSunUp ? 'bg-amber-400' : 'bg-slate-600'}`} />
            <div>
              <span className="text-slate-400">Elevation:</span>{' '}
              <span className={`font-mono font-bold ${isSunUp ? 'text-amber-400' : 'text-slate-400'}`}>
                {solarAngles.elevationDeg.toFixed(1)}°
              </span>
            </div>
            <div className="h-3.5 w-px bg-slate-700" />
            <div>
              <span className="text-slate-400">Azimuth:</span>{' '}
              <span className="font-mono font-bold text-sky-400">
                {solarAngles.azimuthDeg.toFixed(1)}°
              </span>
            </div>
          </div>

          {/* Panel Shading Status Badge */}
          <div className={`backdrop-blur-md border rounded-xl px-3.5 py-1.5 text-xs flex items-center gap-2 shadow-lg transition-all ${
            isIlluminated
              ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
              : 'bg-[#0f1422]/90 border-[#1e2638] text-slate-400'
          }`}>
            {isIlluminated ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium">Direct Sun on Flat Terrace Array</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-medium">
                  {isSunUp ? 'High Incident Angle / Parapet Shade' : 'Night Time (Sun Below Horizon)'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* HUD Top-Right: Camera Presets */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-[#0f1422]/90 backdrop-blur-md border border-[#1e2638] rounded-xl p-1 shadow-lg">
          {(['iso', 'top', 'front', 'solar'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setViewPreset(view)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                cameraView === view
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {view === 'iso' && 'Isometric'}
              {view === 'top' && 'Terrace (Top)'}
              {view === 'front' && 'Front Elevation'}
              {view === 'solar' && 'Sun Follow'}
            </button>
          ))}
        </div>

        {/* HUD Bottom Center: Navigation Hint */}
        <div className="absolute bottom-3 left-4 z-10 pointer-events-none text-[11px] text-slate-400 flex items-center gap-2 bg-[#0f1422]/70 px-3 py-1 rounded-full border border-[#1e2638]">
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span>Flat RCC Terrace • Drag to Orbit • Scroll to Zoom</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-[#080c14] p-4 border-t border-[#1e2638] flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex items-center gap-4 w-full md:w-3/5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2.5 rounded-xl border transition-all ${
              isPlaying
                ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                : 'bg-[#121826] hover:bg-slate-800 border-[#1e2638] text-white'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" /> Time of Day (IST)
              </span>
              <span className="font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                {String(Math.floor(selectedHour)).padStart(2, '0')}:
                {String(Math.floor((selectedHour % 1) * 60)).padStart(2, '0')} IST
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
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded appearance-none"
            />
          </div>
        </div>

        {/* Month Selector for Indian Seasons */}
        <div className="flex items-center gap-3 w-full md:w-2/5 justify-end">
          <span className="text-xs text-slate-400 whitespace-nowrap">Season:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-[#121826] border border-[#1e2638] rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
          >
            <option value={4}>April (Peak Summer / High DNI)</option>
            <option value={1}>January (Winter Sun / Low Angle)</option>
            <option value={7}>July (Monsoon / High Diffuse)</option>
            <option value={10}>October (Post-Monsoon Clear Sky)</option>
          </select>

          <button
            onClick={() => {
              setSelectedHour(12.5);
              setViewPreset('iso');
            }}
            className="p-2 bg-[#121826] hover:bg-slate-800 text-slate-300 rounded-xl border border-[#1e2638] transition"
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Helper Three.js Flat Terrace Geometry Builders
// -------------------------------------------------------------

function addCompassMarkers(scene: THREE.Scene) {
  const directions = [
    { label: 'N', x: 0, z: -14, color: '#ef4444' }, // North
    { label: 'S', x: 0, z: 14, color: '#38bdf8' },  // South
    { label: 'E', x: 14, z: 0, color: '#64748b' },  // East
    { label: 'W', x: -14, z: 0, color: '#64748b' }, // West
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
 * Builds a realistic Indian Flat Concrete Terrace Building (No slanting roof)
 */
function buildFlatTerraceBuilding(scene: THREE.Scene) {
  const buildingGroup = new THREE.Group();

  const buildingWidth = 11.0;
  const buildingHeight = 5.0; // Two-storey building
  const buildingDepth = 8.5;

  // 1. Main Two-Storey Building Body (Clean modern neutral off-white/beige stucco)
  const bodyGeo = new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: '#d1d5db',
    roughness: 0.65,
    metalness: 0.05,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = buildingHeight / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  buildingGroup.add(body);

  // 2. Flat RCC Roof Slab (Floor of the terrace)
  const terraceSlabGeo = new THREE.BoxGeometry(buildingWidth + 0.4, 0.3, buildingDepth + 0.4);
  const terraceSlabMat = new THREE.MeshStandardMaterial({
    color: '#9ca3af',
    roughness: 0.7,
  });
  const terraceSlab = new THREE.Mesh(terraceSlabGeo, terraceSlabMat);
  terraceSlab.position.y = buildingHeight + 0.15;
  terraceSlab.receiveShadow = true;
  buildingGroup.add(terraceSlab);

  // 3. Terrace Parapet Walls (3 ft / ~0.9m perimeter boundary wall)
  const parapetHeight = 0.9;
  const parapetThickness = 0.25;
  const parapetMat = new THREE.MeshStandardMaterial({
    color: '#e5e7eb',
    roughness: 0.6,
  });

  const parapetY = buildingHeight + 0.3 + parapetHeight / 2;

  // North Parapet (-Z)
  const northParapetGeo = new THREE.BoxGeometry(buildingWidth + 0.4, parapetHeight, parapetThickness);
  const northParapet = new THREE.Mesh(northParapetGeo, parapetMat);
  northParapet.position.set(0, parapetY, -(buildingDepth + 0.4) / 2 + parapetThickness / 2);
  northParapet.castShadow = true;
  northParapet.receiveShadow = true;
  buildingGroup.add(northParapet);

  // South Parapet (+Z)
  const southParapetGeo = new THREE.BoxGeometry(buildingWidth + 0.4, parapetHeight, parapetThickness);
  const southParapet = new THREE.Mesh(southParapetGeo, parapetMat);
  southParapet.position.set(0, parapetY, (buildingDepth + 0.4) / 2 - parapetThickness / 2);
  southParapet.castShadow = true;
  southParapet.receiveShadow = true;
  buildingGroup.add(southParapet);

  // West Parapet (-X)
  const westParapetGeo = new THREE.BoxGeometry(parapetThickness, parapetHeight, buildingDepth);
  const westParapet = new THREE.Mesh(westParapetGeo, parapetMat);
  westParapet.position.set(-(buildingWidth + 0.4) / 2 + parapetThickness / 2, parapetY, 0);
  westParapet.castShadow = true;
  westParapet.receiveShadow = true;
  buildingGroup.add(westParapet);

  // East Parapet (+X)
  const eastParapetGeo = new THREE.BoxGeometry(parapetThickness, parapetHeight, buildingDepth);
  const eastParapet = new THREE.Mesh(eastParapetGeo, parapetMat);
  eastParapet.position.set((buildingWidth + 0.4) / 2 - parapetThickness / 2, parapetY, 0);
  eastParapet.castShadow = true;
  eastParapet.receiveShadow = true;
  buildingGroup.add(eastParapet);

  // 4. Rooftop Staircase Headroom (Mumty Room) placed in NW corner
  const mumtyWidth = 2.6;
  const mumtyHeight = 2.4;
  const mumtyDepth = 2.6;
  const mumtyGeo = new THREE.BoxGeometry(mumtyWidth, mumtyHeight, mumtyDepth);
  const mumtyMat = new THREE.MeshStandardMaterial({ color: '#f3f4f6', roughness: 0.5 });
  const mumty = new THREE.Mesh(mumtyGeo, mumtyMat);
  mumty.position.set(-3.6, buildingHeight + 0.3 + mumtyHeight / 2, -2.6);
  mumty.castShadow = true;
  mumty.receiveShadow = true;
  buildingGroup.add(mumty);

  // Mumty Door
  const doorGeo = new THREE.BoxGeometry(0.8, 1.8, 0.05);
  const doorMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5 });
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(-3.6, buildingHeight + 0.3 + 0.9, -1.27);
  buildingGroup.add(door);

  // 5. Overhead Water Tank (Sintex-style black cylinder) on top of Mumty
  const tankGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.2, 24);
  const tankMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.3, metalness: 0.2 });
  const tank = new THREE.Mesh(tankGeo, tankMat);
  tank.position.set(-3.6, buildingHeight + 0.3 + mumtyHeight + 0.6, -2.6);
  tank.castShadow = true;
  buildingGroup.add(tank);

  // 6. Windows on Building Facade
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#0284c7',
    metalness: 0.8,
    roughness: 0.1,
  });

  const winGeo = new THREE.BoxGeometry(2.0, 1.4, 0.1);
  const win1 = new THREE.Mesh(winGeo, glassMat);
  win1.position.set(-2.5, 3.2, 4.3);
  buildingGroup.add(win1);

  const win2 = new THREE.Mesh(winGeo, glassMat);
  win2.position.set(2.5, 3.2, 4.3);
  buildingGroup.add(win2);

  const win3 = new THREE.Mesh(winGeo, glassMat);
  win3.position.set(2.5, 1.2, 4.3);
  buildingGroup.add(win3);

  // Main Entrance Door
  const mainDoorGeo = new THREE.BoxGeometry(1.4, 2.2, 0.1);
  const mainDoorMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.6 });
  const mainDoor = new THREE.Mesh(mainDoorGeo, mainDoorMat);
  mainDoor.position.set(-2.5, 1.1, 4.3);
  buildingGroup.add(mainDoor);

  scene.add(buildingGroup);
}

/**
 * Places the elevated solar array structure on the flat terrace
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

  const panelCount = Math.max(4, Math.min(32, Math.round(capacityKw / 0.4)));
  const cols = Math.min(6, Math.ceil(Math.sqrt(panelCount * 1.4)));
  const rows = Math.ceil(panelCount / cols);

  const panelWidth = 1.05;
  const panelHeight = 1.75;
  const panelDepth = 0.04;

  const panelGeo = new THREE.BoxGeometry(panelWidth, panelHeight, panelDepth);
  
  // High-efficiency monocrystalline solar cell look
  const panelMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    emissive: '#0369a1',
    emissiveIntensity: 0.1,
    metalness: 0.85,
    roughness: 0.25,
  });

  // Anodized Aluminum frame
  const frameMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    metalness: 0.9,
    roughness: 0.2,
  });

  // Elevated GI Strut Racking Material
  const strutMat = new THREE.MeshStandardMaterial({
    color: '#64748b',
    metalness: 0.8,
    roughness: 0.4,
  });

  const arrayMount = new THREE.Group();

  let added = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (added >= panelCount) break;

      const panel = new THREE.Mesh(panelGeo, panelMat);
      const posX = (c - cols / 2 + 0.5) * (panelWidth + 0.06);
      const posY = (r - rows / 2 + 0.5) * (panelHeight + 0.06);
      panel.position.set(posX, posY, 0.03);
      panel.castShadow = true;
      panel.receiveShadow = true;

      // Frame
      const frameGeo = new THREE.BoxGeometry(panelWidth + 0.03, panelHeight + 0.03, panelDepth * 0.8);
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(posX, posY, 0.01);
      frame.castShadow = true;

      arrayMount.add(frame);
      arrayMount.add(panel);
      added++;
    }
  }

  // Elevated Terrace Mounting Height:
  // Terrace slab floor is at y = 5.3
  // Elevated racking elevates panels ~1.0m above terrace floor so they are at y = 6.4
  arrayMount.position.set(1.2, 6.4, 0.8);

  // Apply Tilt (around X axis)
  const tiltRad = tiltDeg * (Math.PI / 180);
  arrayMount.rotation.x = Math.PI / 2 - tiltRad;

  // Apply Azimuth rotation (around Y axis)
  const azimuthRad = (azimuthDeg - 180) * (Math.PI / 180);
  arrayMount.rotation.y = azimuthRad;

  // Add 4 vertical GI support stanchions/legs connecting flat terrace floor to the array
  const legHeight = 1.1;
  const legGeo = new THREE.CylinderGeometry(0.04, 0.04, legHeight, 8);
  const legPositions = [
    [-1.8, 5.3 + legHeight / 2, -0.6],
    [3.8, 5.3 + legHeight / 2, -0.6],
    [-1.8, 5.3 + legHeight / 2, 2.0],
    [3.8, 5.3 + legHeight / 2, 2.0],
  ];

  legPositions.forEach(([lx, ly, lz]) => {
    const leg = new THREE.Mesh(legGeo, strutMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    panelsGroup.add(leg);
  });

  panelsGroup.add(arrayMount);
}
