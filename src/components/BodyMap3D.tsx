import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MUSCLE_GROUPS } from '../utils/muscleData';
import { MuscleGroupInfo, HealthReading } from '../types/astramed';
import { 
  RotateCcw, 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  Activity, 
  TrendingDown, 
  ExternalLink, 
  Layers,
  ChevronDown,
  ChevronUp,
  User,
  Info
} from 'lucide-react';

interface BodyMap3DProps {
  selectedCrewName?: string;
  readings: HealthReading[];
  onSelectMuscle?: (muscleId: string) => void;
  onOpenResearch?: (category: string) => void;
}

export const BodyMap3D: React.FC<BodyMap3DProps> = ({
  selectedCrewName = 'Crew Member',
  readings,
  onSelectMuscle,
  onOpenResearch
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedMuscleId, setSelectedMuscleId] = useState<string>('quadriceps');
  const [hoveredMuscleId, setHoveredMuscleId] = useState<string | null>(null);
  const [modelGender, setModelGender] = useState<'male' | 'female'>('male');
  const [viewAngle, setViewAngle] = useState<'front' | 'back' | 'left' | 'right'>('front');
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);

  // References for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const muscleMeshesRef = useRef<Map<string, THREE.Mesh[]>>(new Map());
  const requestRenderRef = useRef<(() => void) | null>(null);

  // Active muscle information
  const currentMuscle: MuscleGroupInfo | undefined = MUSCLE_GROUPS[selectedMuscleId];

  // Derive relevant readings for this muscle
  const muscleReadings = readings.filter(r => 
    r.parameter === currentMuscle?.crewMetricKey
  );
  const latestReading = muscleReadings[0];
  const deltaValue = latestReading ? (latestReading.value - 100) : -8.5; // fallback delta if baseline 100%

  // Function to highlight muscle meshes
  const updateHighlights = useCallback((activeId: string | null, hoveredId: string | null) => {
    muscleMeshesRef.current.forEach((meshes, id) => {
      const isSelected = id === activeId;
      const isHovered = id === hoveredId;

      meshes.forEach(mesh => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (!mat) return;

        if (isSelected) {
          mat.color.setHex(0x06b6d4); // Vivid Cyan
          mat.emissive.setHex(0x0891b2);
          mat.emissiveIntensity = 0.65;
          mat.roughness = 0.2;
          mat.metalness = 0.4;
        } else if (isHovered) {
          mat.color.setHex(0x38bdf8); // Sky Blue
          mat.emissive.setHex(0x0284c7);
          mat.emissiveIntensity = 0.35;
          mat.roughness = 0.3;
        } else {
          // Default metallic dark navy/slate muscular tone
          mat.color.setHex(0x1e293b);
          mat.emissive.setHex(0x0f172a);
          mat.emissiveIntensity = 0.1;
          mat.roughness = 0.5;
          mat.metalness = 0.25;
        }
      });
    });

    if (requestRenderRef.current) {
      requestRenderRef.current();
    }
  }, []);

  // Update highlights when selection or hover changes
  useEffect(() => {
    updateHighlights(selectedMuscleId, hoveredMuscleId);
  }, [selectedMuscleId, hoveredMuscleId, updateHighlights]);

  // Set camera angle helper
  const setCameraPreset = (angle: 'front' | 'back' | 'left' | 'right') => {
    setViewAngle(angle);
    if (!cameraRef.current || !controlsRef.current) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    controls.target.set(0, 0.95, 0);

    const distance = 2.4;
    switch (angle) {
      case 'front':
        camera.position.set(0, 1.0, distance);
        break;
      case 'back':
        camera.position.set(0, 1.0, -distance);
        break;
      case 'left':
        camera.position.set(-distance, 1.0, 0);
        break;
      case 'right':
        camera.position.set(distance, 1.0, 0);
        break;
    }
    camera.lookAt(0, 0.95, 0);
    controls.update();

    if (requestRenderRef.current) {
      requestRenderRef.current();
    }
  };

  const resetCamera = () => {
    setCameraPreset('front');
  };

  const zoomCamera = (factor: number) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    camera.position.multiplyScalar(factor);
    controlsRef.current.update();
    if (requestRenderRef.current) requestRenderRef.current();
  };

  // Main Three.js Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060b13); // Deep mission navy/black
    scene.fog = new THREE.FogExp2(0x060b13, 0.15);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(0, 1.0, 2.4);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // 4. Environment Map via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Lighting
    const keyLight = new THREE.DirectionalLight(0xdbeafe, 1.8);
    keyLight.position.set(2, 4, 3);
    keyLight.castShadow = !isSoftwareGl;
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 1.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.4);
    rimLight.position.set(-2, 3, -3);
    scene.add(rimLight);

    // Ground platform grid
    const grid = new THREE.GridHelper(3.0, 16, 0x0891b2, 0x1e293b);
    grid.position.y = -0.01;
    scene.add(grid);

    // Subtle contact grounding shadow disk
    const shadowGeo = new THREE.CircleGeometry(0.8, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x020617,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.001;
    scene.add(shadowMesh);

    // 6. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.95, 0);
    controls.minDistance = 1.0;
    controls.maxDistance = 4.5;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // avoid looking from below ground
    controlsRef.current = controls;

    // 7. Render On Demand Loop
    let renderBusy = false;
    let renderDirty = false;
    let frameId = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 60);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const requestRender = () => {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        controls.update();
        renderer.render(scene, camera);
        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };
    requestRenderRef.current = requestRender;

    // Listen to control changes
    controls.addEventListener('change', () => {
      requestRender();
    });

    // --- Build Procedural Anatomical Musculoskeletal Model ---
    const anatomyGroup = new THREE.Group();
    scene.add(anatomyGroup);

    const muscleMap = new Map<string, THREE.Mesh[]>();
    const raycastTargets: THREE.Mesh[] = [];

    // Helper to register muscle mesh
    const registerMuscle = (id: string, mesh: THREE.Mesh) => {
      mesh.userData = { muscleId: id };
      raycastTargets.push(mesh);
      if (!muscleMap.has(id)) {
        muscleMap.set(id, []);
      }
      muscleMap.get(id)!.push(mesh);
    };

    // Shared Materials
    const skeletonMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // slate skeleton structure
      roughness: 0.6,
      metalness: 0.2
    });

    const createMuscleMat = () => new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.25
    });

    // Structural Skeletal Core (Head, Neck, Spine, Pelvis)
    // Head
    const headGeo = new THREE.SphereGeometry(0.12, 24, 24);
    headGeo.scale(1, 1.25, 1.1);
    const headMesh = new THREE.Mesh(headGeo, skeletonMat);
    headMesh.position.set(0, 1.72, 0);
    anatomyGroup.add(headMesh);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.09, 16);
    const neckMesh = new THREE.Mesh(neckGeo, skeletonMat);
    neckMesh.position.set(0, 1.58, 0);
    anatomyGroup.add(neckMesh);

    // Torso Core / Spine
    const spineGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.5, 16);
    const spineMesh = new THREE.Mesh(spineGeo, skeletonMat);
    spineMesh.position.set(0, 1.28, 0);
    anatomyGroup.add(spineMesh);

    // Pelvis
    const pelvisGeo = new THREE.CylinderGeometry(0.14, 0.11, 0.16, 16);
    pelvisGeo.scale(1.2, 1, 0.9);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, skeletonMat);
    pelvisMesh.position.set(0, 0.98, 0);
    anatomyGroup.add(pelvisMesh);

    // --- REQUIRED MUSCLE GROUPS ---
    // 1. Pectorals (Anterior chest)
    const pectLeftGeo = new THREE.BoxGeometry(0.13, 0.11, 0.07);
    const pectLeft = new THREE.Mesh(pectLeftGeo, createMuscleMat());
    pectLeft.position.set(-0.08, 1.44, 0.08);
    pectLeft.rotation.z = -0.15;
    anatomyGroup.add(pectLeft);
    registerMuscle('pectorals', pectLeft);

    const pectRightGeo = new THREE.BoxGeometry(0.13, 0.11, 0.07);
    const pectRight = new THREE.Mesh(pectRightGeo, createMuscleMat());
    pectRight.position.set(0.08, 1.44, 0.08);
    pectRight.rotation.z = 0.15;
    anatomyGroup.add(pectRight);
    registerMuscle('pectorals', pectRight);

    // 2. Abdominals (Rectus Abdominis Core)
    const absUpperGeo = new THREE.BoxGeometry(0.17, 0.12, 0.06);
    const absUpper = new THREE.Mesh(absUpperGeo, createMuscleMat());
    absUpper.position.set(0, 1.30, 0.075);
    anatomyGroup.add(absUpper);
    registerMuscle('abdominals', absUpper);

    const absLowerGeo = new THREE.BoxGeometry(0.15, 0.14, 0.06);
    const absLower = new THREE.Mesh(absLowerGeo, createMuscleMat());
    absLower.position.set(0, 1.15, 0.07);
    anatomyGroup.add(absLower);
    registerMuscle('abdominals', absLower);

    // 3. Deltoids (Shoulders)
    const deltLeftGeo = new THREE.SphereGeometry(0.075, 16, 16);
    deltLeftGeo.scale(1.2, 1.4, 1.1);
    const deltLeft = new THREE.Mesh(deltLeftGeo, createMuscleMat());
    deltLeft.position.set(-0.24, 1.47, 0);
    anatomyGroup.add(deltLeft);
    registerMuscle('deltoids', deltLeft);

    const deltRight = new THREE.Mesh(deltLeftGeo.clone(), createMuscleMat());
    deltRight.position.set(0.24, 1.47, 0);
    anatomyGroup.add(deltRight);
    registerMuscle('deltoids', deltRight);

    // 4. Biceps (Anterior upper arm)
    const bicepGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.18, 16);
    bicepGeo.scale(1.1, 1, 1.2);
    const bicepLeft = new THREE.Mesh(bicepGeo, createMuscleMat());
    bicepLeft.position.set(-0.25, 1.30, 0.03);
    bicepLeft.rotation.z = 0.08;
    anatomyGroup.add(bicepLeft);
    registerMuscle('biceps', bicepLeft);

    const bicepRight = new THREE.Mesh(bicepGeo.clone(), createMuscleMat());
    bicepRight.position.set(0.25, 1.30, 0.03);
    bicepRight.rotation.z = -0.08;
    anatomyGroup.add(bicepRight);
    registerMuscle('biceps', bicepRight);

    // 5. Triceps (Posterior upper arm)
    const tricepGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.18, 16);
    tricepGeo.scale(1.1, 1, 1.2);
    const tricepLeft = new THREE.Mesh(tricepGeo, createMuscleMat());
    tricepLeft.position.set(-0.25, 1.30, -0.03);
    tricepLeft.rotation.z = 0.08;
    anatomyGroup.add(tricepLeft);
    registerMuscle('triceps', tricepLeft);

    const tricepRight = new THREE.Mesh(tricepGeo.clone(), createMuscleMat());
    tricepRight.position.set(0.25, 1.30, -0.03);
    tricepRight.rotation.z = -0.08;
    anatomyGroup.add(tricepRight);
    registerMuscle('triceps', tricepRight);

    // Forearms / Hands (Structural)
    const forearmGeo = new THREE.CylinderGeometry(0.038, 0.03, 0.22, 16);
    const forearmLeft = new THREE.Mesh(forearmGeo, skeletonMat);
    forearmLeft.position.set(-0.27, 1.08, 0);
    anatomyGroup.add(forearmLeft);

    const forearmRight = new THREE.Mesh(forearmGeo.clone(), skeletonMat);
    forearmRight.position.set(0.27, 1.08, 0);
    anatomyGroup.add(forearmRight);

    // 6. Quadriceps (Anterior Thighs)
    const quadGeo = new THREE.CylinderGeometry(0.075, 0.055, 0.36, 16);
    quadGeo.scale(1.1, 1, 1.25);
    const quadLeft = new THREE.Mesh(quadGeo, createMuscleMat());
    quadLeft.position.set(-0.12, 0.72, 0.03);
    quadLeft.rotation.z = -0.04;
    anatomyGroup.add(quadLeft);
    registerMuscle('quadriceps', quadLeft);

    const quadRight = new THREE.Mesh(quadGeo.clone(), createMuscleMat());
    quadRight.position.set(0.12, 0.72, 0.03);
    quadRight.rotation.z = 0.04;
    anatomyGroup.add(quadRight);
    registerMuscle('quadriceps', quadRight);

    // 7. Hamstrings (Posterior Thighs)
    const hamGeo = new THREE.CylinderGeometry(0.072, 0.052, 0.34, 16);
    hamGeo.scale(1.1, 1, 1.25);
    const hamLeft = new THREE.Mesh(hamGeo, createMuscleMat());
    hamLeft.position.set(-0.12, 0.72, -0.03);
    hamLeft.rotation.z = -0.04;
    anatomyGroup.add(hamLeft);
    registerMuscle('hamstrings', hamLeft);

    const hamRight = new THREE.Mesh(hamGeo.clone(), createMuscleMat());
    hamRight.position.set(0.12, 0.72, -0.03);
    hamRight.rotation.z = 0.04;
    anatomyGroup.add(hamRight);
    registerMuscle('hamstrings', hamRight);

    // Knees (Structural)
    const kneeGeo = new THREE.SphereGeometry(0.048, 16, 16);
    const kneeLeft = new THREE.Mesh(kneeGeo, skeletonMat);
    kneeLeft.position.set(-0.11, 0.50, 0);
    anatomyGroup.add(kneeLeft);

    const kneeRight = new THREE.Mesh(kneeGeo.clone(), skeletonMat);
    kneeRight.position.set(0.11, 0.50, 0);
    anatomyGroup.add(kneeRight);

    // 8. Calves (Posterior Lower Leg: Gastrocnemius / Soleus)
    const calfGeo = new THREE.CylinderGeometry(0.06, 0.035, 0.38, 16);
    calfGeo.scale(1.1, 1, 1.3);
    const calfLeft = new THREE.Mesh(calfGeo, createMuscleMat());
    calfLeft.position.set(-0.11, 0.28, -0.02);
    anatomyGroup.add(calfLeft);
    registerMuscle('calves', calfLeft);

    const calfRight = new THREE.Mesh(calfGeo.clone(), createMuscleMat());
    calfRight.position.set(0.11, 0.28, -0.02);
    anatomyGroup.add(calfRight);
    registerMuscle('calves', calfRight);

    // Shin (Anterior lower leg - structural)
    const shinGeo = new THREE.CylinderGeometry(0.04, 0.032, 0.38, 16);
    const shinLeft = new THREE.Mesh(shinGeo, skeletonMat);
    shinLeft.position.set(-0.11, 0.28, 0.025);
    anatomyGroup.add(shinLeft);

    const shinRight = new THREE.Mesh(shinGeo.clone(), skeletonMat);
    shinRight.position.set(0.11, 0.28, 0.025);
    anatomyGroup.add(shinRight);

    // Feet
    const footGeo = new THREE.BoxGeometry(0.07, 0.05, 0.16);
    const footLeft = new THREE.Mesh(footGeo, skeletonMat);
    footLeft.position.set(-0.11, 0.04, 0.04);
    anatomyGroup.add(footLeft);

    const footRight = new THREE.Mesh(footGeo.clone(), skeletonMat);
    footRight.position.set(0.11, 0.04, 0.04);
    anatomyGroup.add(footRight);

    muscleMeshesRef.current = muscleMap;

    // Trigger initial render
    requestRender();
    updateHighlights(selectedMuscleId, null);

    // Raycasting for muscle selection & hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getIntersectedMuscle = (event: MouseEvent): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(raycastTargets, false);
      if (intersects.length > 0) {
        return (intersects[0].object.userData?.muscleId as string) || null;
      }
      return null;
    };

    const handlePointerMove = (e: MouseEvent) => {
      const muscleId = getIntersectedMuscle(e);
      setHoveredMuscleId(muscleId);
      if (renderer.domElement) {
        renderer.domElement.style.cursor = muscleId ? 'pointer' : 'default';
      }
    };

    const handleClick = (e: MouseEvent) => {
      const muscleId = getIntersectedMuscle(e);
      if (muscleId) {
        setSelectedMuscleId(muscleId);
        if (onSelectMuscle) onSelectMuscle(muscleId);
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('mousemove', handlePointerMove);
    domElem.addEventListener('click', handleClick);

    // Resize observer
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
          requestRender();
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      domElem.removeEventListener('mousemove', handlePointerMove);
      domElem.removeEventListener('click', handleClick);
      controls.dispose();
      renderer.dispose();
      if (container.contains(domElem)) {
        container.removeChild(domElem);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[620px] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex flex-col">
      {/* Top Header Badge */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-xs font-mono text-cyan-300 backdrop-blur-sm shadow-md">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>3D MUSCULOSKELETAL ANATOMY VIEWER</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
        </div>

        {/* Gender model toggle */}
        <div className="flex items-center rounded-lg bg-slate-900/90 border border-slate-700/60 p-0.5 text-xs font-mono">
          <button
            onClick={() => setModelGender('male')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              modelGender === 'male' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            MALE ANATOMY
          </button>
          <button
            onClick={() => setModelGender('female')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              modelGender === 'female' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            FEMALE PROFILE
          </button>
        </div>
      </div>

      {/* Top Right Quick Metrics & Active Muscle Badge */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2 pointer-events-auto">
        <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/60 text-xs font-mono text-slate-300 backdrop-blur-sm">
          <span className="text-slate-400">MONITORED:</span> <strong className="text-white">{selectedCrewName}</strong>
        </div>
        {currentMuscle && (
          <div className="px-3 py-1 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 backdrop-blur-sm">
            <span>ACTIVE: </span><strong>{currentMuscle.name}</strong>
          </div>
        )}
      </div>

      {/* Main 3D Canvas Mount Point */}
      <div ref={mountRef} className="w-full flex-1 relative cursor-grab active:cursor-grabbing" />

      {/* Ergonomic Collapsible Bottom Control Dock with Integrated Muscle Inspector */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-4xl pointer-events-auto">
        <div className="relative bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden">
          {/* Collapse/Expand Toggle Tab */}
          <button
            onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-950/80 border-b border-slate-800 text-[10px] font-mono text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
            aria-label={isControlsCollapsed ? 'Expand 3D Controls and Muscle Telemetry' : 'Collapse 3D Controls and Muscle Telemetry'}
          >
            <span>{isControlsCollapsed ? 'SHOW VIEW CONTROLS & MUSCLE DATA' : 'COLLAPSE DOCK'}</span>
            {isControlsCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {!isControlsCollapsed && (
            <div className="p-3.5 space-y-3 text-xs">
              {/* Muscle Selector Pills & Camera Tools Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  <span className="text-[10px] font-mono text-slate-400 uppercase mr-1">Select Muscle:</span>
                  {Object.keys(MUSCLE_GROUPS).map(id => {
                    const m = MUSCLE_GROUPS[id];
                    const isSelected = selectedMuscleId === id;
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          setSelectedMuscleId(id);
                          if (onSelectMuscle) onSelectMuscle(id);
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all whitespace-nowrap cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-600 text-white font-bold shadow-sm'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {m.name.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                    <button
                      onClick={() => setCameraPreset('front')}
                      className={`px-2 py-1 text-[11px] font-mono rounded ${
                        viewAngle === 'front' ? 'bg-cyan-700 text-white font-semibold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      FRONT
                    </button>
                    <button
                      onClick={() => setCameraPreset('back')}
                      className={`px-2 py-1 text-[11px] font-mono rounded ${
                        viewAngle === 'back' ? 'bg-cyan-700 text-white font-semibold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      BACK
                    </button>
                  </div>

                  <button
                    onClick={() => zoomCamera(0.85)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white border border-slate-700/60"
                    title="Zoom In"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => zoomCamera(1.15)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white border border-slate-700/60"
                    title="Zoom Out"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={resetCamera}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white border border-slate-700/60"
                    title="Reset Camera"
                    aria-label="Reset camera"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Integrated Muscle Telemetry & Literature Row */}
              {currentMuscle && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-0.5">
                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                      <strong className="text-white">{currentMuscle.name}</strong>
                      <span className={`font-bold flex items-center gap-1 ${deltaValue < -5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        <TrendingDown className="w-3.5 h-3.5" />
                        {deltaValue > 0 ? `+${deltaValue.toFixed(1)}%` : `${deltaValue.toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300 line-clamp-2">
                      {currentMuscle.microgravityImpact}
                    </div>
                  </div>

                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] font-mono uppercase text-slate-400 mb-0.5">Countermeasure:</div>
                    <div className="text-[10px] text-slate-300 line-clamp-2">
                      {currentMuscle.countermeasures}
                    </div>
                  </div>

                  <div className="flex items-center">
                    {onOpenResearch && (
                      <button
                        onClick={() => onOpenResearch('Musculoskeletal Health')}
                        className="w-full py-2 px-3 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 font-mono text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Related NASA OSDR Studies</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
