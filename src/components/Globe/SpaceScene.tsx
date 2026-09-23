import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import * as satellite from 'satellite.js';
import {
  SatelliteItem,
  CurrentPosition,
  FilterOptions,
  TimeState
} from '../../types';
import {
  calculateSatellitePosition,
  calculateOrbitTrajectory,
  GLOBE_RADIUS_UNITS,
  EARTH_RADIUS_KM,
  SCALE_KM_TO_UNITS
} from '../../services/tleService';
import {
  createEarthDayTexture,
  createEarthNightTexture,
  createEarthCloudsTexture
} from '../../utils/earthTextures';
import {
  getSpriteTextureForCategory,
  createSelectionRingTexture,
  createSunCoronaTexture,
  createMoonTexture
} from '../../utils/satelliteSprites';
import { calculateCelestialPositions } from '../../utils/astronomy';
import { sounds } from '../../utils/soundManager';

interface SpaceSceneProps {
  satellites: SatelliteItem[];
  selectedSat: SatelliteItem | null;
  onSelectSatellite: (sat: SatelliteItem | null) => void;
  filters: FilterOptions;
  timeState: TimeState;
  isAutoRotate: boolean;
  onToggleAutoRotate: () => void;
  isTrackSatellite: boolean;
  onToggleTrackSatellite: (val: boolean) => void;
  isBloomEnabled: boolean;
}

const CATEGORY_COLORS: Record<string, number> = {
  stations: 0xf59e0b,   // Amber / Gold
  starlink: 0x06b6d4,   // Cyan
  navigation: 0x10b981, // Emerald green
  weather: 0x6366f1,    // Indigo / Violet
  science: 0xf43f5e,    // Rose / Pink
  other: 0x94a3b8       // Slate
};

export const SpaceScene: React.FC<SpaceSceneProps> = ({
  satellites,
  selectedSat,
  onSelectSatellite,
  filters,
  timeState,
  isAutoRotate,
  onToggleAutoRotate,
  isTrackSatellite,
  onToggleTrackSatellite,
  isBloomEnabled
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const earthGroupRef = useRef<THREE.Group | null>(null);
  const earthMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const atmosMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);

  // Celestial objects
  const sunGroupRef = useRef<THREE.Group | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const moonMeshRef = useRef<THREE.Mesh | null>(null);

  // Orbit & Tracking visuals
  const orbitLineRef = useRef<THREE.Line | null>(null);
  const trailLineRef = useRef<THREE.Line | null>(null);
  const groundTrackPointRef = useRef<THREE.Mesh | null>(null);
  const tetherLineRef = useRef<THREE.Line | null>(null);
  const footprintMeshRef = useRef<THREE.Mesh | null>(null);
  const selectionSpriteRef = useRef<THREE.Sprite | null>(null);
  const pulseBeadRef = useRef<THREE.Mesh | null>(null);

  // Satellite visual sprites map
  const satSpritesMap = useRef<Map<string, { sprite: THREE.Sprite; sat: SatelliteItem }>>(new Map());
  const satGroupRef = useRef<THREE.Group | null>(null);

  // Starfield particle systems
  const innerStarsRef = useRef<THREE.Points | null>(null);
  const outerStarsRef = useRef<THREE.Points | null>(null);

  // Hover state
  const [hoveredSat, setHoveredSat] = useState<{
    sat: SatelliteItem;
    screenX: number;
    screenY: number;
    altitude: number;
  } | null>(null);

  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  // Filtered satellite set for fast updates
  const filteredSats = useMemo(() => {
    return satellites.filter(sat => {
      if (!filters.selectedCategories.includes(sat.category)) return false;
      if (sat.category === 'starlink' && !filters.showStarlink) return false;
      if (filters.orbitType === 'leo' && sat.apogeeKm > 2000) return false;
      if (filters.orbitType === 'meo' && (sat.apogeeKm < 2000 || sat.apogeeKm > 35000)) return false;
      if (filters.orbitType === 'geo' && (sat.apogeeKm < 35000 || sat.apogeeKm > 36500)) return false;

      if (filters.searchQuery.trim().length > 0) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matchesName = sat.name.toLowerCase().includes(q);
        const matchesId = sat.id.includes(q);
        if (!matchesName && !matchesId) return false;
      }
      return true;
    });
  }, [satellites, filters]);

  // 1. Initialize Scene, Camera, Renderer, Post-processing, Earth, Celestial bodies
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // A. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x020617);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(0, 18, 32);
    cameraRef.current = camera;

    // B. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // C. Unreal Bloom Post-Processing
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.65, // strength
      0.4,  // radius
      0.82  // threshold
    );
    composer.addPass(bloomPass);
    composerRef.current = composer;

    // D. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 1.0;
    controls.minDistance = 11.2;
    controls.maxDistance = 120;
    controls.autoRotate = isAutoRotate;
    controls.autoRotateSpeed = 0.45;
    controlsRef.current = controls;

    // E. Dual-layer Starfield Particles with Parallax
    const createStarfield = (count: number, radius: number, size: number) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = radius * (0.92 + Math.random() * 0.16);

        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.cos(phi);
        pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

        // Stellar spectrum colors (blue-white, pure white, warm amber)
        const rand = Math.random();
        if (rand > 0.75) {
          col[i * 3] = 0.75; col[i * 3 + 1] = 0.88; col[i * 3 + 2] = 1.0; // Class B/A
        } else if (rand > 0.25) {
          col[i * 3] = 1.0; col[i * 3 + 1] = 1.0; col[i * 3 + 2] = 1.0;   // Class F
        } else {
          col[i * 3] = 1.0; col[i * 3 + 1] = 0.82; col[i * 3 + 2] = 0.65; // Class K
        }
      }

      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

      const mat = new THREE.PointsMaterial({
        size,
        vertexColors: true,
        transparent: true,
        opacity: 0.95
      });
      return new THREE.Points(geo, mat);
    };

    const innerStars = createStarfield(4500, 480, 1.4);
    const outerStars = createStarfield(3500, 720, 1.8);
    scene.add(innerStars);
    scene.add(outerStars);
    innerStarsRef.current = innerStars;
    outerStarsRef.current = outerStars;

    // F. Deep Space Ambient Light & Directional Sunlight
    const ambientLight = new THREE.AmbientLight(0x0c1424, 0.55);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffdf2, 2.6);
    sunLight.position.set(100, 20, 100);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // G. 3D Sun with Solar Corona Sprite
    const sunGroup = new THREE.Group();
    const sunMeshGeo = new THREE.SphereGeometry(3.5, 32, 32);
    const sunMeshMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sunCore = new THREE.Mesh(sunMeshGeo, sunMeshMat);
    sunGroup.add(sunCore);

    const coronaTexture = createSunCoronaTexture();
    const coronaMat = new THREE.SpriteMaterial({
      map: coronaTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const coronaSprite = new THREE.Sprite(coronaMat);
    coronaSprite.scale.set(24, 24, 1);
    sunGroup.add(coronaSprite);
    scene.add(sunGroup);
    sunGroupRef.current = sunGroup;

    // H. 3D Moon with Procedural Lunar Craters
    const moonTex = createMoonTexture();
    const moonGeo = new THREE.SphereGeometry(1.3, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      roughness: 0.85,
      metalness: 0.05
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(moonMesh);
    moonMeshRef.current = moonMesh;

    // I. Earth Group (Rotates with GST)
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);
    earthGroupRef.current = earthGroup;

    // Textures for Day, Night, and Clouds
    const earthDayTex = createEarthDayTexture();
    const earthNightTex = createEarthNightTexture();
    const earthCloudsTex = createEarthCloudsTexture();

    // 1. Day / Night Blended Earth Sphere
    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS_UNITS, 64, 64);
    const earthCustomMat = new THREE.ShaderMaterial({
      uniforms: {
        uDayTexture: { value: earthDayTex },
        uNightTexture: { value: earthNightTex },
        uSunDirection: { value: new THREE.Vector3(1, 0, 0) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uDayTexture;
        uniform sampler2D uNightTexture;
        uniform vec3 uSunDirection;
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 sunDir = normalize(uSunDirection);
          float dotSun = dot(normal, sunDir);

          // Smooth transition across terminator (-0.12 to 0.12)
          float dayFactor = smoothstep(-0.12, 0.12, dotSun);

          vec4 dayColor = texture2D(uDayTexture, vUv);
          vec4 nightColor = texture2D(uNightTexture, vUv);

          vec3 litDay = dayColor.rgb * (max(0.08, dotSun) * 1.25);
          vec3 litNight = nightColor.rgb * 1.7;

          vec3 finalColor = mix(litNight, litDay, dayFactor);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthCustomMat);
    earthGroup.add(earthMesh);
    earthMatRef.current = earthCustomMat;

    // 2. Earth Rotating Clouds Sphere
    const cloudsGeo = new THREE.SphereGeometry(GLOBE_RADIUS_UNITS * 1.008, 64, 64);
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: earthCloudsTex,
      transparent: true,
      opacity: 0.55,
      blending: THREE.NormalBlending,
      depthWrite: false
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    earthGroup.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;

    // 3. Atmospheric Fresnel Scattering Shader
    const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS_UNITS * 1.025, 48, 48);
    const atmosShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDirection: { value: new THREE.Vector3(1, 0, 0) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPos.xyz;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDirection;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);

          // Fresnel grazing angle falloff
          float fresnel = 1.0 - max(0.0, dot(normal, viewDir));
          float rim = pow(fresnel, 2.8);

          // Atmospheric scattering is brighter on daylight hemisphere
          float sunFactor = max(0.18, dot(normal, normalize(uSunDirection)));

          vec3 cyanGlow = vec3(0.22, 0.72, 1.0);
          vec3 deepIndigo = vec3(0.06, 0.28, 0.95);
          vec3 atmosColor = mix(deepIndigo, cyanGlow, fresnel);

          gl_FragColor = vec4(atmosColor, rim * sunFactor * 0.95);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosShaderMat);
    earthGroup.add(atmosMesh);
    atmosMatRef.current = atmosShaderMat;

    // J. Satellite Sprites Group
    const satGroup = new THREE.Group();
    scene.add(satGroup);
    satGroupRef.current = satGroup;

    // K. Pulsating Selection Reticle Sprite
    const selRingTex = createSelectionRingTexture();
    const selSpriteMat = new THREE.SpriteMaterial({
      map: selRingTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    });
    const selSprite = new THREE.Sprite(selSpriteMat);
    selSprite.visible = false;
    scene.add(selSprite);
    selectionSpriteRef.current = selSprite;

    // L. Traveling Energy Pulse Bead on Orbit
    const beadGeo = new THREE.SphereGeometry(0.16, 12, 12);
    const beadMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95
    });
    const pulseBead = new THREE.Mesh(beadGeo, beadMat);
    pulseBead.visible = false;
    scene.add(pulseBead);
    pulseBeadRef.current = pulseBead;

    // M. Window Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
      if (composerRef.current) {
        composerRef.current.setSize(w, h);
      }
    };
    window.addEventListener('resize', handleResize);

    // N. Animation Loop with Clock
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Controls update
      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Rotate clouds slightly for wind circulation
      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.rotation.y += delta * 0.012;
      }

      // Parallax star shift
      if (innerStarsRef.current) {
        innerStarsRef.current.rotation.y = elapsed * 0.0006;
      }
      if (outerStarsRef.current) {
        outerStarsRef.current.rotation.y = -elapsed * 0.0003;
      }

      // Animate Pulsating Selection Reticle
      if (selectionSpriteRef.current && selectionSpriteRef.current.visible) {
        const pulse = Math.sin(elapsed * 4.5);
        const scale = 2.6 + pulse * 0.35;
        selectionSpriteRef.current.scale.set(scale, scale, 1);
        selectionSpriteRef.current.material.opacity = 0.8 + pulse * 0.2;
        selectionSpriteRef.current.material.rotation += delta * 0.45;
      }

      // Render: Bloom Composer or standard Renderer
      if (composerRef.current && isBloomEnabled) {
        composerRef.current.render();
      } else {
        renderer.render(scene, camera);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      composer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update controls auto-rotation state
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoRotate;
    }
  }, [isAutoRotate]);

  // Update Sun & Moon positions, Light vectors, and Earth Rotation
  useEffect(() => {
    const celestial = calculateCelestialPositions(timeState.simulatedTime);

    // Sun Position & Lighting
    if (sunGroupRef.current) {
      sunGroupRef.current.position.copy(celestial.sunPosition);
    }
    if (sunLightRef.current) {
      sunLightRef.current.position.copy(celestial.sunPosition);
    }
    if (earthMatRef.current) {
      earthMatRef.current.uniforms.uSunDirection.value.copy(celestial.sunDirection);
    }
    if (atmosMatRef.current) {
      atmosMatRef.current.uniforms.uSunDirection.value.copy(celestial.sunDirection);
    }

    // Moon Position
    if (moonMeshRef.current) {
      moonMeshRef.current.position.copy(celestial.moonPosition);
    }

    // Earth's rotation to align with current Greenwich Sidereal Time (GST)
    if (earthGroupRef.current) {
      const gmst = satellite.gstime(timeState.simulatedTime);
      earthGroupRef.current.rotation.y = gmst;
    }
  }, [timeState.simulatedTime]);

  // 2. Create & Manage 2D Sprite Icons for Satellites
  useEffect(() => {
    if (!sceneRef.current || !satGroupRef.current) return;
    const satGroup = satGroupRef.current;

    const currentSprites = satSpritesMap.current;
    const newSprites = new Map<string, { sprite: THREE.Sprite; sat: SatelliteItem }>();

    for (const sat of filteredSats) {
      const isSelected = selectedSat?.id === sat.id;

      if (currentSprites.has(sat.id)) {
        const entry = currentSprites.get(sat.id)!;
        entry.sat = sat;
        const baseScale = sat.category === 'stations' ? 1.05 : 0.72;
        const scale = isSelected ? baseScale * 1.6 : baseScale;
        entry.sprite.scale.set(scale, scale, 1);
        newSprites.set(sat.id, entry);
        currentSprites.delete(sat.id);
      } else {
        const texture = getSpriteTextureForCategory(sat.category);
        const spriteMat = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          depthTest: true
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.userData = { satId: sat.id, sat };

        const baseScale = sat.category === 'stations' ? 1.05 : 0.72;
        const scale = isSelected ? baseScale * 1.6 : baseScale;
        sprite.scale.set(scale, scale, 1);

        satGroup.add(sprite);
        newSprites.set(sat.id, { sprite, sat });
      }
    }

    // Remove sprites that are no longer filtered
    currentSprites.forEach(({ sprite }) => {
      satGroup.remove(sprite);
      sprite.material.dispose();
    });

    satSpritesMap.current = newSprites;
  }, [filteredSats, selectedSat]);

  // 3. Update satellite sprite positions and camera tracking
  useEffect(() => {
    const time = timeState.simulatedTime;
    const selectedPos: CurrentPosition | null = selectedSat
      ? calculateSatellitePosition(selectedSat, time)
      : null;

    satSpritesMap.current.forEach(({ sprite, sat }) => {
      const pos = calculateSatellitePosition(sat, time);
      if (pos) {
        sprite.position.set(pos.x, pos.y, pos.z);
        sprite.visible = true;
      } else {
        sprite.visible = false;
      }
    });

    // Update Selection Reticle Position
    if (selectedSat && selectedPos && selectionSpriteRef.current) {
      selectionSpriteRef.current.position.set(selectedPos.x, selectedPos.y, selectedPos.z);
      selectionSpriteRef.current.visible = true;
    } else if (selectionSpriteRef.current) {
      selectionSpriteRef.current.visible = false;
    }

    // Camera Tracking of Selected Satellite
    if (isTrackSatellite && selectedPos && controlsRef.current && cameraRef.current) {
      const targetPos = new THREE.Vector3(selectedPos.x, selectedPos.y, selectedPos.z);
      controlsRef.current.target.lerp(targetPos, 0.08);

      const camOffset = cameraRef.current.position.clone().sub(controlsRef.current.target);
      if (camOffset.length() > 25) {
        camOffset.setLength(18);
        cameraRef.current.position.copy(targetPos).add(camOffset);
      }
    }
  }, [timeState.simulatedTime, isTrackSatellite, selectedSat]);

  // 4. Orbit Line with Gradient along Direction of Motion + NASA Eyes Trail + Ground Track
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Clean up previous orbit visuals
    if (orbitLineRef.current) {
      scene.remove(orbitLineRef.current);
      orbitLineRef.current.geometry.dispose();
      (orbitLineRef.current.material as THREE.Material).dispose();
      orbitLineRef.current = null;
    }
    if (trailLineRef.current) {
      scene.remove(trailLineRef.current);
      trailLineRef.current.geometry.dispose();
      (trailLineRef.current.material as THREE.Material).dispose();
      trailLineRef.current = null;
    }
    if (groundTrackPointRef.current) {
      scene.remove(groundTrackPointRef.current);
      groundTrackPointRef.current.geometry.dispose();
      groundTrackPointRef.current = null;
    }
    if (tetherLineRef.current) {
      scene.remove(tetherLineRef.current);
      tetherLineRef.current.geometry.dispose();
      tetherLineRef.current = null;
    }
    if (footprintMeshRef.current) {
      scene.remove(footprintMeshRef.current);
      footprintMeshRef.current.geometry.dispose();
      footprintMeshRef.current = null;
    }
    if (pulseBeadRef.current) {
      pulseBeadRef.current.visible = false;
    }

    if (!selectedSat) return;

    const baseColorHex = CATEGORY_COLORS[selectedSat.category] || 0x38bdf8;
    const baseColor = new THREE.Color(baseColorHex);

    // 1. Orbit Trajectory with Forward Motion Gradient
    const numPoints = 140;
    const trajectory = calculateOrbitTrajectory(selectedSat, timeState.simulatedTime, numPoints);

    if (trajectory.length > 2) {
      const positions = new Float32Array(trajectory.length * 3);
      const colors = new Float32Array(trajectory.length * 3);

      for (let i = 0; i < trajectory.length; i++) {
        positions[i * 3] = trajectory[i].x;
        positions[i * 3 + 1] = trajectory[i].y;
        positions[i * 3 + 2] = trajectory[i].z;

        // Gradient: from bright head (i=0, at satellite) to dim tail (i=numPoints)
        const progress = i / trajectory.length;
        const brightness = Math.max(0.18, Math.pow(1.0 - progress, 1.2));

        colors[i * 3] = baseColor.r * brightness;
        colors[i * 3 + 1] = baseColor.g * brightness;
        colors[i * 3 + 2] = baseColor.b * brightness;
      }

      const orbitGeo = new THREE.BufferGeometry();
      orbitGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      orbitGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const orbitMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false
      });

      const orbitLine = new THREE.Line(orbitGeo, orbitMat);
      orbitLine.renderOrder = 15;
      scene.add(orbitLine);
      orbitLineRef.current = orbitLine;
    }

    // 2. NASA Eyes-Style Fading Trail Behind Satellite (past positions)
    const trailSteps = 50;
    const periodMin = selectedSat.periodMin > 10 ? selectedSat.periodMin : 95;
    // Look back up to 25% of orbit period
    const trailSpanMs = (periodMin * 60 * 1000) * 0.25;
    const trailStepMs = trailSpanMs / trailSteps;
    const curTimeMs = timeState.simulatedTime.getTime();

    const trailVectors: THREE.Vector3[] = [];
    for (let i = trailSteps; i >= 0; i--) {
      const pastTime = new Date(curTimeMs - i * trailStepMs);
      const pos = calculateSatellitePosition(selectedSat, pastTime);
      if (pos) {
        trailVectors.push(new THREE.Vector3(pos.x, pos.y, pos.z));
      }
    }

    if (trailVectors.length > 2) {
      const trailPositions = new Float32Array(trailVectors.length * 3);
      const trailColors = new Float32Array(trailVectors.length * 3);

      for (let i = 0; i < trailVectors.length; i++) {
        trailPositions[i * 3] = trailVectors[i].x;
        trailPositions[i * 3 + 1] = trailVectors[i].y;
        trailPositions[i * 3 + 2] = trailVectors[i].z;

        // Alpha / brightness from 0 (oldest) to 1.0 (at satellite)
        const alpha = Math.pow(i / (trailVectors.length - 1), 2.0);
        trailColors[i * 3] = baseColor.r * alpha;
        trailColors[i * 3 + 1] = baseColor.g * alpha;
        trailColors[i * 3 + 2] = baseColor.b * alpha;
      }

      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

      const trailMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false
      });
      const trail = new THREE.Line(trailGeo, trailMat);
      trail.renderOrder = 16;
      scene.add(trail);
      trailLineRef.current = trail;
    }

    // 3. Sub-satellite Ground Marker & Altitude Tether Line
    const curPos = calculateSatellitePosition(selectedSat, timeState.simulatedTime);
    if (curPos) {
      const satVec = new THREE.Vector3(curPos.x, curPos.y, curPos.z);
      const groundVec = satVec.clone().normalize().multiplyScalar(GLOBE_RADIUS_UNITS * 1.002);

      // Ground beacon dot
      const beaconGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95
      });
      const groundTrack = new THREE.Mesh(beaconGeo, beaconMat);
      groundTrack.position.copy(groundVec);
      scene.add(groundTrack);
      groundTrackPointRef.current = groundTrack;

      // Tether line connecting ground to satellite
      const tetherGeo = new THREE.BufferGeometry().setFromPoints([groundVec, satVec]);
      const tetherMat = new THREE.LineDashedMaterial({
        color: 0xffffff,
        dashSize: 0.35,
        gapSize: 0.18,
        transparent: true,
        opacity: 0.65
      });
      const tether = new THREE.Line(tetherGeo, tetherMat);
      tether.computeLineDistances();
      scene.add(tether);
      tetherLineRef.current = tether;

      // Coverage Horizon Footprint Ring
      const h = curPos.altitudeKm;
      const cosTheta = EARTH_RADIUS_KM / (EARTH_RADIUS_KM + h);
      const theta = Math.acos(Math.max(0.01, Math.min(0.999, cosTheta)));
      const diskRadius = GLOBE_RADIUS_UNITS * Math.sin(theta);

      const footGeo = new THREE.RingGeometry(diskRadius * 0.96, diskRadius, 48);
      const footMat = new THREE.MeshBasicMaterial({
        color: baseColorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.38,
        depthWrite: false
      });
      const footMesh = new THREE.Mesh(footGeo, footMat);
      footMesh.position.copy(groundVec);
      footMesh.lookAt(satVec);
      scene.add(footMesh);
      footprintMeshRef.current = footMesh;
    }
  }, [selectedSat, timeState.simulatedTime]);

  // 5. Pointer Interactions (Click & Hover via Raycaster)
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, cameraRef.current);

    const sprites: THREE.Sprite[] = [];
    satSpritesMap.current.forEach(({ sprite }) => {
      if (sprite.visible) sprites.push(sprite);
    });

    const intersects = raycaster.current.intersectObjects(sprites, false);
    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Sprite;
      const sat = hit.userData.sat as SatelliteItem;
      if (sat) {
        sounds.playSelect();
        onSelectSatellite(sat);
      }
    }
  }, [onSelectSatellite]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, cameraRef.current);

    const sprites: THREE.Sprite[] = [];
    satSpritesMap.current.forEach(({ sprite }) => {
      if (sprite.visible) sprites.push(sprite);
    });

    const intersects = raycaster.current.intersectObjects(sprites, false);
    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Sprite;
      const sat = hit.userData.sat as SatelliteItem;
      if (sat) {
        setHoveredSat({
          sat,
          screenX: e.clientX,
          screenY: e.clientY,
          altitude: sat.apogeeKm
        });
        return;
      }
    }
    setHoveredSat(null);
  }, []);

  const handleResetCamera = () => {
    if (controlsRef.current && cameraRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      cameraRef.current.position.set(0, 18, 32);
      onToggleTrackSatellite(false);
      sounds.playPing();
    }
  };

  return (
    <div
      ref={containerRef}
      id="space-scene-container"
      className="relative w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHoveredSat(null)}
    >
      {/* Hover Tooltip */}
      {hoveredSat && (
        <div
          id="satellite-hover-tooltip"
          className="pointer-events-none absolute z-20 px-3.5 py-2 rounded-xl bg-slate-950/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl text-xs text-slate-100 flex flex-col gap-0.5 animate-fadeIn"
          style={{
            left: `${hoveredSat.screenX + 16}px`,
            top: `${hoveredSat.screenY - 24}px`
          }}
        >
          <div className="flex items-center gap-2 font-semibold text-slate-100">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: `#${(CATEGORY_COLORS[hoveredSat.sat.category] || 0x38bdf8).toString(16).padStart(6, '0')}` }}
            />
            {hoveredSat.sat.name}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>NORAD {hoveredSat.sat.id}</span>
            <span>•</span>
            <span className="text-cyan-400">~{hoveredSat.altitude} км</span>
          </div>
        </div>
      )}

      {/* Floating Viewport Controls */}
      <div
        id="scene-viewport-controls"
        className="absolute bottom-6 right-6 z-10 flex flex-col items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-800/80 p-1.5 rounded-2xl shadow-xl"
      >
        <button
          id="btn-auto-rotate"
          onClick={onToggleAutoRotate}
          title={isAutoRotate ? 'Остановить авто-вращение' : 'Включить авто-вращение'}
          className={`p-2.5 rounded-xl transition-all ${
            isAutoRotate
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <svg className={`w-5 h-5 ${isAutoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {selectedSat && (
          <button
            id="btn-track-satellite"
            onClick={() => onToggleTrackSatellite(!isTrackSatellite)}
            title={isTrackSatellite ? 'Отключить слежение' : 'Следить за спутником камерой'}
            className={`p-2.5 rounded-xl transition-all ${
              isTrackSatellite
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        )}

        <button
          id="btn-reset-view"
          onClick={handleResetCamera}
          title="Сбросить положение камеры"
          className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
      </div>
    </div>
  );
};
