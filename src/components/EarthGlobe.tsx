import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export const EarthGlobe: React.FC = () => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.15, 4.2);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const globe = new THREE.Group();
    scene.add(globe);
    const earthGeometry = new THREE.SphereGeometry(1, 96, 96);
    const earthMaterial = new THREE.MeshPhongMaterial({ color: 0x1769a8, shininess: 18, specular: 0x286b9b });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    globe.add(earth);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
      texture => {
        texture.colorSpace = THREE.SRGBColorSpace;
        earthMaterial.map = texture;
        earthMaterial.color.set(0xffffff);
        earthMaterial.needsUpdate = true;
      },
      undefined,
      () => { /* Keep the procedural blue globe if the texture host is unavailable. */ }
    );

    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.012, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x8bdcff, transparent: true, opacity: 0.055, wireframe: true })
    );
    globe.add(clouds);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.075, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x168dff, transparent: true, opacity: 0.13, side: THREE.BackSide, blending: THREE.AdditiveBlending })
    );
    globe.add(atmosphere);

    const ambient = new THREE.AmbientLight(0x8bbce8, 1.25);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(-3, 2, 4);
    scene.add(sun);
    const rim = new THREE.PointLight(0x16baff, 2.2, 8);
    rim.position.set(2, -1, -2);
    scene.add(rim);

    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(1.43, 0.0035, 8, 180),
      new THREE.MeshBasicMaterial({ color: 0x36c8ff, transparent: true, opacity: 0.5 })
    );
    orbit.rotation.set(1.18, 0.2, -0.35);
    globe.add(orbit);
    const orbit2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.58, 0.002, 8, 180),
      new THREE.MeshBasicMaterial({ color: 0x8cddff, transparent: true, opacity: 0.22 })
    );
    orbit2.rotation.set(0.82, -0.5, 0.4);
    globe.add(orbit2);

    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(1200 * 3);
    for (let i = 0; i < 1200; i++) {
      const radius = 3 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi);
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xb9e8ff, size: 0.012, transparent: true, opacity: 0.8 }));
    scene.add(stars);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 3.1;
    controls.maxDistance = 5.4;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.42;
    controls.enableDamping = true;
    controls.dampingFactor = 0.045;

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let active = true;
    renderer.setAnimationLoop(() => {
      if (!active) return;
      clouds.rotation.y += 0.00022;
      stars.rotation.y += 0.000025;
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      active = false;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      earthGeometry.dispose();
      earthMaterial.map?.dispose();
      earthMaterial.dispose();
      clouds.geometry.dispose();
      (clouds.material as THREE.Material).dispose();
      atmosphere.geometry.dispose();
      (atmosphere.material as THREE.Material).dispose();
      orbit.geometry.dispose();
      (orbit.material as THREE.Material).dispose();
      orbit2.geometry.dispose();
      (orbit2.material as THREE.Material).dispose();
      starGeometry.dispose();
      (stars.material as THREE.Material).dispose();
      renderer.dispose();
      if (host.contains(renderer.domElement)) host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative h-[360px] sm:h-[430px] w-full overflow-hidden rounded-2xl border border-cyan-400/20 bg-[radial-gradient(ellipse_at_50%_48%,rgba(10,66,112,.42),rgba(2,6,23,.96)_68%)] shadow-[0_0_70px_rgba(14,165,233,.12)]">
      <div ref={hostRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_42%,rgba(2,6,23,.58)_100%)]" />
      <div className="absolute left-5 top-5 z-10">
        <div className="text-[10px] font-mono tracking-[.28em] text-cyan-300">PLANETARY VISUALIZATION</div>
        <div className="mt-1 text-sm font-semibold tracking-wide text-white">EARTH • ORBITAL VIEW</div>
      </div>
      <div className="absolute bottom-4 left-5 z-10 flex items-center gap-2 text-[10px] font-mono text-cyan-100/70">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#22d3ee]" />
        INTERACTIVE 3D • DRAG TO ROTATE
      </div>
      <div className="absolute bottom-4 right-5 z-10 text-[10px] font-mono text-slate-400">VISUALIZATION ONLY · NO LIVE SATELLITE DATA</div>
    </div>
  );
};
