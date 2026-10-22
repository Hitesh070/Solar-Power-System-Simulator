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
  const [selectedHour, setSelectedHour] = useState<number>(13.5); // 1:30 PM
  const [selectedMonth, setSelectedMonth] = useState<number>(6); // June
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
  const cameraPhiRef = useRef<number>(Math.PI / 3.5);
  const cameraRadiusRef = useRef<number>(24);

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
    cameraRef.current.lookAt(0, 3.5, 0);
  };

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 450;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030712'); // Slate 950
    scene.fog = new THREE.FogExp2('#030712', 0.015);
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight('#94a3b8', 0.4);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight('#38bdf8', '#1e293b', 0.35);
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
    sunLight.shadow.bias = -0.0005;
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

    // 5. Environment & Ground Grid
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.85,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // Compass ring & grid helper
    const grid = new THREE.GridHelper(50, 50, '#334155', '#1e293b');
    grid.position.y = 0.01;
    scene.add(grid);

    // Compass markings: North (+Z), South (-Z), East (+X), West (-X)
    addCompassMarkers(scene);

    // 6. House Architecture
    buildModernHouse(scene);

    // 7. Roof Panels Array Group
    const panelsGroup = new THREE.Group();
    scene.add(panelsGroup);
    roofPanelsGroupRef.current = panelsGroup;
    updateRoofPanels(panelsGroup, panelTiltDeg, panelAzimuthDeg, systemCapacityKw);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 450;
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
      updateRoofPanels(roofPanelsGroupRef.current, panelTiltDeg, panelAzimuthDeg, systemCapacityKw);
    }
  }, [panelTiltDeg, panelAzimuthDeg, systemCapacityKw]);

  // Update sun position in 3D scene when hour/month or coordinates change
  useEffect(() => {
    if (!sunLightRef.current || !sunMeshRef.current) return;

    const elevationRad = solarAngles.elevationDeg * (Math.PI / 180);
    const azimuthRad = (solarAngles.azimuthDeg - 180) * (Math.PI / 180); // Align with coordinate axes

    const sunDistance = 35;
    const isAboveHorizon = solarAngles.elevationDeg > 0;

    const x = sunDistance * Math.cos(elevationRad) * Math.sin(azimuthRad);
    const y = Math.max(-5, sunDistance * Math.sin(elevationRad));
    const z = sunDistance * Math.cos(elevationRad) * Math.cos(azimuthRad);

    sunLightRef.current.position.set(x, y, z);
    sunMeshRef.current.position.set(x, y, z);

    if (isAboveHorizon) {
      // Golden hour warming
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

  // Daylight scrubber animation interval
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
    cameraRadiusRef.current = Math.max(10, Math.min(50, cameraRadiusRef.current + e.deltaY * 0.02));
    updateCameraPosition();
  };

  const setViewPreset = (view: 'iso' | 'top' | 'front' | 'solar') => {
    setCameraView(view);
    if (view === 'iso') {
      cameraThetaRef.current = Math.PI / 4;
      cameraPhiRef.current = Math.PI / 3.2;
      cameraRadiusRef.current = 24;
    } else if (view === 'top') {
      cameraThetaRef.current = 0;
      cameraPhiRef.current = 0.12;
      cameraRadiusRef.current = 26;
    } else if (view === 'front') {
      cameraThetaRef.current = 0;
      cameraPhiRef.current = Math.PI / 2.3;
      cameraRadiusRef.current = 22;
    } else if (view === 'solar') {
      const azRad = (solarAngles.azimuthDeg - 180) * (Math.PI / 180);
      cameraThetaRef.current = azRad;
      cameraPhiRef.current = Math.PI / 3;
      cameraRadiusRef.current = 24;
    }
    updateCameraPosition();
  };

  return (
    <div className="relative flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
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
        {/* HUD Top-Left: Realtime Sun & Shadow Analytics */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl px-4 py-2.5 shadow-lg text-xs flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isSunUp ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
            <div>
              <span className="text-slate-400 font-medium">Solar Elevation:</span>{' '}
              <span className={`font-mono font-bold ${isSunUp ? 'text-amber-300' : 'text-slate-400'}`}>
                {solarAngles.elevationDeg.toFixed(1)}°
              </span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div>
              <span className="text-slate-400 font-medium">Azimuth:</span>{' '}
              <span className="font-mono font-bold text-sky-400">
                {solarAngles.azimuthDeg.toFixed(1)}°
              </span>
            </div>
          </div>

          {/* Panel Shadow / Direct Sunlight Status Badge */}
          <div className={`backdrop-blur-md border rounded-xl px-4 py-2 text-xs flex items-center gap-2 shadow-lg transition-all ${
            isIlluminated
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900/80 border-slate-700/70 text-slate-400'
          }`}>
            {isIlluminated ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-medium">Direct Sun on Array (Zero Shading)</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="font-medium">
                  {isSunUp ? 'Self-Shaded / High Incident Angle' : 'Night Time (Sun Below Horizon)'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* HUD Top-Right: Camera Presets */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl p-1 shadow-lg">
          {(['iso', 'top', 'front', 'solar'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setViewPreset(view)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                cameraView === view
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {view === 'iso' && 'Isometric'}
              {view === 'top' && 'Roof (Top)'}
              {view === 'front' && 'Front Elevation'}
              {view === 'solar' && 'Sun Follow'}
            </button>
          ))}
        </div>

        {/* HUD Bottom Center: Drag Instruction Helper */}
        <div className="absolute bottom-3 left-4 z-10 pointer-events-none text-[11px] text-slate-400 flex items-center gap-2 bg-slate-900/60 px-3 py-1 rounded-full backdrop-blur-sm border border-slate-800">
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span>Click & Drag to Orbit Camera • Scroll to Zoom</span>
        </div>
      </div>

      {/* Interactive Controls Bar: Time of Day Scrubber & Month Selector */}
      <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-col md:flex-row items-center gap-4 justify-between">
        {/* Play/Pause & Time Slider */}
        <div className="flex items-center gap-4 w-full md:w-3/5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2.5 rounded-xl border transition-all ${
              isPlaying
                ? 'bg-amber-500 border-amber-400 text-slate-950'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
            }`}
            title={isPlaying ? 'Pause Simulation' : 'Play 24-Hour Cycle'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" /> Time of Day
              </span>
              <span className="font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
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
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
            />
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-3 w-full md:w-2/5 justify-end">
          <span className="text-xs text-slate-400 whitespace-nowrap">Solar Season:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
          >
            <option value={6}>June (Summer Solstice)</option>
            <option value={3}>March (Spring Equinox)</option>
            <option value={9}>September (Autumn Equinox)</option>
            <option value={12}>December (Winter Solstice)</option>
          </select>

          <button
            onClick={() => {
              setSelectedHour(13.5);
              setViewPreset('iso');
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
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
// Helper Three.js Geometry Builders
// -------------------------------------------------------------

function addCompassMarkers(scene: THREE.Scene) {
  const directions = [
    { label: 'N', x: 0, z: -14, color: '#ef4444' }, // North
    { label: 'S', x: 0, z: 14, color: '#38bdf8' },  // South
    { label: 'E', x: 14, z: 0, color: '#94a3b8' },  // East
    { label: 'W', x: -14, z: 0, color: '#94a3b8' }, // West
  ];

  directions.forEach(({ x, z, color }) => {
    const markerGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
    const markerMat = new THREE.MeshBasicMaterial({ color });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(x, 0.05, z);
    scene.add(marker);
  });
}

function buildModernHouse(scene: THREE.Scene) {
  const houseGroup = new THREE.Group();

  // Main Walls (Modern white stucco)
  const wallGeo = new THREE.BoxGeometry(10, 4.5, 7.5);
  const wallMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.6,
  });
  const walls = new THREE.Mesh(wallGeo, wallMat);
  walls.position.y = 2.25;
  walls.castShadow = true;
  walls.receiveShadow = true;
  houseGroup.add(walls);

  // Roof Structure (Gabled base)
  const roofHeight = 2.2;
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-5.2, 0);
  roofShape.lineTo(0, roofHeight);
  roofShape.lineTo(5.2, 0);
  roofShape.closePath();

  const extrudeSettings = { depth: 8.0, bevelEnabled: false };
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
  const roofMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.45,
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.rotation.y = Math.PI / 2;
  roof.position.set(4.0, 4.5, -5.2);
  roof.castShadow = true;
  roof.receiveShadow = true;
  houseGroup.add(roof);

  // Windows (Reflective dark glass)
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#0284c7',
    metalness: 0.8,
    roughness: 0.1,
  });

  const frontWindowGeo = new THREE.BoxGeometry(2.5, 1.8, 0.1);
  const frontWindow = new THREE.Mesh(frontWindowGeo, glassMat);
  frontWindow.position.set(-2, 2.2, 3.8);
  houseGroup.add(frontWindow);

  const frontDoorGeo = new THREE.BoxGeometry(1.2, 2.4, 0.1);
  const doorMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7 });
  const frontDoor = new THREE.Mesh(frontDoorGeo, doorMat);
  frontDoor.position.set(2, 1.2, 3.8);
  houseGroup.add(frontDoor);

  // Chimney Obstruction (Casts dynamic realistic shadow across roof)
  const chimneyGeo = new THREE.BoxGeometry(0.9, 3.2, 0.9);
  const chimneyMat = new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.8 });
  const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
  chimney.position.set(-2.5, 5.2, -1.0);
  chimney.castShadow = true;
  chimney.receiveShadow = true;
  houseGroup.add(chimney);

  // Shading Tree (Nearby obstacle to test real shade)
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 4.0, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.set(9.0, 2.0, 4.0);
  trunk.castShadow = true;
  houseGroup.add(trunk);

  const foliageGeo = new THREE.DodecahedronGeometry(2.4, 1);
  const foliageMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.8 });
  const foliage = new THREE.Mesh(foliageGeo, foliageMat);
  foliage.position.set(9.0, 5.5, 4.0);
  foliage.castShadow = true;
  houseGroup.add(foliage);

  scene.add(houseGroup);
}

function updateRoofPanels(
  panelsGroup: THREE.Group,
  tiltDeg: number,
  azimuthDeg: number,
  capacityKw: number
) {
  // Clear previous panels
  while (panelsGroup.children.length > 0) {
    const child = panelsGroup.children[0];
    panelsGroup.remove(child);
  }

  // Calculate panel quantity: typical module ~400W (0.4 kW)
  const panelCount = Math.max(4, Math.min(32, Math.round(capacityKw / 0.4)));
  const cols = Math.min(8, Math.ceil(Math.sqrt(panelCount * 1.5)));
  const rows = Math.ceil(panelCount / cols);

  const panelWidth = 1.0;
  const panelHeight = 1.6;
  const panelDepth = 0.04;

  const panelGeo = new THREE.BoxGeometry(panelWidth, panelHeight, panelDepth);
  
  // Silicon PV cell material with anti-reflective dark blue shine
  const panelMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    emissive: '#0369a1',
    emissiveIntensity: 0.12,
    metalness: 0.85,
    roughness: 0.25,
  });

  // Aluminum mounting frame
  const frameMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    metalness: 0.95,
    roughness: 0.2,
  });

  const arrayMount = new THREE.Group();

  let added = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (added >= panelCount) break;

      const panel = new THREE.Mesh(panelGeo, panelMat);
      const posX = (c - cols / 2 + 0.5) * (panelWidth + 0.05);
      const posY = (r - rows / 2 + 0.5) * (panelHeight + 0.05);
      panel.position.set(posX, posY, 0.03);
      panel.castShadow = true;
      panel.receiveShadow = true;

      // Add silver border
      const frameGeo = new THREE.BoxGeometry(panelWidth + 0.03, panelHeight + 0.03, panelDepth * 0.8);
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(posX, posY, 0.01);
      frame.castShadow = true;

      arrayMount.add(frame);
      arrayMount.add(panel);
      added++;
    }
  }

  // Place array on roof surface:
  // Base roof peak is at y = 5.8
  arrayMount.position.set(0, 5.8, 1.2);

  // Apply Panel Tilt (around X axis)
  const tiltRad = tiltDeg * (Math.PI / 180);
  arrayMount.rotation.x = Math.PI / 2 - tiltRad;

  // Apply Panel Azimuth rotation (around Y axis)
  // 180° = South (+Z), 0° = North (-Z), 90° = East (+X), 270° = West (-X)
  const azimuthRad = (azimuthDeg - 180) * (Math.PI / 180);
  arrayMount.rotation.y = azimuthRad;

  panelsGroup.add(arrayMount);
}
