import * as THREE from 'three';

/**
 * Creates high quality procedural and fallback textures for Earth, clouds, and night lights
 */

export function createEarthDayTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Deep ocean gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#0a1d37');
  oceanGrad.addColorStop(0.2, '#0c2444');
  oceanGrad.addColorStop(0.5, '#0e2a4f');
  oceanGrad.addColorStop(0.8, '#0c2444');
  oceanGrad.addColorStop(1, '#0a1d37');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle bathymetric ocean floor highlights
  ctx.fillStyle = '#113560';
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 60; i++) {
    const rx = Math.random() * width;
    const ry = height * 0.2 + Math.random() * (height * 0.6);
    const rw = 40 + Math.random() * 120;
    const rh = 20 + Math.random() * 60;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rw, rh, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // Major continental landmass approximations (Equirectangular projection)
  // [minLon, minLat, maxLon, maxLat] mapped to canvas
  function mapCoords(lonDeg: number, latDeg: number): [number, number] {
    const x = ((lonDeg + 180) / 360) * width;
    const y = ((90 - latDeg) / 180) * height;
    return [x, y];
  }

  function drawLandmass(points: [number, number][], fill = '#2e5a27', stroke = '#3d6e35') {
    if (points.length < 3) return;
    ctx.beginPath();
    const [x0, y0] = mapCoords(points[0][0], points[0][1]);
    ctx.moveTo(x0, y0);
    for (let i = 1; i < points.length; i++) {
      const [x, y] = mapCoords(points[i][0], points[i][1]);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Eurasia & Africa
  drawLandmass([
    [-10, 36], [0, 44], [10, 54], [25, 71], [60, 70], [100, 76], [140, 72], [170, 66],
    [160, 55], [140, 45], [120, 30], [105, 10], [90, 22], [75, 8], [60, 25],
    [50, 12], [40, 15], [30, 31], [15, 38], [-5, 36]
  ], '#3b5e2b', '#4e7a3a');

  // Africa
  drawLandmass([
    [-17, 15], [-5, 36], [10, 37], [32, 31], [43, 12], [51, 12], [40, -10],
    [32, -28], [20, -34], [18, -34], [12, -15], [9, 4], [-15, 12], [-17, 15]
  ], '#7a703d', '#96884d'); // Sahara ochre / savannah

  // North America
  drawLandmass([
    [-168, 66], [-140, 70], [-95, 73], [-80, 62], [-65, 45], [-75, 35], [-81, 25],
    [-97, 26], [-105, 20], [-87, 15], [-105, 23], [-117, 32], [-124, 48], [-135, 58],
    [-165, 60], [-168, 66]
  ], '#3d5e30', '#527c42');

  // South America
  drawLandmass([
    [-77, 8], [-60, 10], [-50, -2], [-35, -5], [-39, -15], [-53, -33], [-65, -45],
    [-70, -55], [-75, -50], [-72, -35], [-78, -10], [-80, -2], [-77, 8]
  ], '#27582b', '#36733b'); // Amazon green

  // Australia
  drawLandmass([
    [114, -22], [125, -15], [136, -12], [145, -15], [153, -28], [150, -37],
    [138, -35], [128, -32], [115, -34], [113, -26]
  ], '#8d683a', '#ab8049'); // Outback ochre

  // Greenland
  drawLandmass([
    [-55, 60], [-40, 65], [-20, 75], [-30, 83], [-50, 82], [-60, 76], [-55, 60]
  ], '#d8e4ea', '#ffffff');

  // Antarctica
  ctx.beginPath();
  const [ax0, ay0] = mapCoords(-180, -70);
  ctx.moveTo(ax0, ay0);
  for (let lon = -180; lon <= 180; lon += 15) {
    const lat = -70 - Math.sin((lon * Math.PI) / 60) * 8;
    const [x, y] = mapCoords(lon, lat);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = '#e8f2f8';
  ctx.fill();

  // Arctic ice
  ctx.beginPath();
  ctx.rect(0, 0, width, height * 0.08);
  ctx.fillStyle = 'rgba(235, 245, 252, 0.85)';
  ctx.fill();

  // Latitude and Longitude subtle grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  // Parallels (Equator, Tropics, Polar)
  const parallels = [-66.5, -23.5, 0, 23.5, 66.5];
  for (const lat of parallels) {
    const [, y] = mapCoords(0, lat);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  // Meridians (every 30 deg)
  for (let lon = -180; lon <= 180; lon += 30) {
    const [x] = mapCoords(lon, 0);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function createEarthNightTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Dark background
  ctx.fillStyle = '#01050e';
  ctx.fillRect(0, 0, width, height);

  function mapCoords(lonDeg: number, latDeg: number): [number, number] {
    const x = ((lonDeg + 180) / 360) * width;
    const y = ((90 - latDeg) / 180) * height;
    return [x, y];
  }

  function drawCityCluster(lon: number, lat: number, radius: number, density = 25) {
    const [cx, cy] = mapCoords(lon, lat);
    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 1.5) * radius;
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      const alpha = 0.3 + Math.random() * 0.7;
      const size = 1 + Math.random() * 2.5;

      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 215, 120, ${alpha})`;
      ctx.fill();
    }
  }

  // Major global population and city lights
  // North America
  drawCityCluster(-74, 40.7, 35, 60); // NYC / East Coast
  drawCityCluster(-87.6, 41.8, 25, 40); // Chicago
  drawCityCluster(-118.2, 34, 30, 50); // LA
  drawCityCluster(-122.4, 37.7, 20, 35); // SF Bay Area
  drawCityCluster(-96.8, 32.7, 20, 30); // Texas
  drawCityCluster(-80.2, 25.7, 15, 25); // Florida

  // Europe
  drawCityCluster(2.35, 48.85, 45, 80); // Paris / Western Europe
  drawCityCluster(-0.12, 51.5, 30, 50); // London
  drawCityCluster(13.4, 52.5, 35, 55); // Berlin / Central Europe
  drawCityCluster(37.6, 55.7, 28, 45); // Moscow
  drawCityCluster(30.3, 59.9, 18, 25); // St. Petersburg

  // Asia
  drawCityCluster(139.7, 35.6, 40, 75); // Tokyo
  drawCityCluster(126.9, 37.5, 25, 40); // Seoul
  drawCityCluster(121.4, 31.2, 50, 90); // Shanghai / East China
  drawCityCluster(116.4, 39.9, 35, 60); // Beijing
  drawCityCluster(114.1, 22.3, 35, 60); // Hong Kong / Pearl River
  drawCityCluster(77.2, 28.6, 45, 75); // Delhi
  drawCityCluster(72.8, 19.0, 30, 50); // Mumbai

  // Middle East & Africa
  drawCityCluster(31.2, 30.0, 25, 40); // Nile Delta / Cairo
  drawCityCluster(55.3, 25.2, 20, 35); // Dubai / Gulf

  // South America
  drawCityCluster(-46.6, -23.5, 30, 50); // Sao Paulo
  drawCityCluster(-58.3, -34.6, 25, 40); // Buenos Aires

  // Australia
  drawCityCluster(151.2, -33.8, 20, 30); // Sydney
  drawCityCluster(144.9, -37.8, 18, 25); // Melbourne

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function createEarthCloudsTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, width, height);

  // Procedural cloud formations (cyclones and bands)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';

  for (let i = 0; i < 90; i++) {
    const cx = Math.random() * width;
    const cy = height * 0.15 + Math.random() * (height * 0.7);
    const radX = 60 + Math.random() * 180;
    const radY = 25 + Math.random() * 60;
    const rot = (Math.random() - 0.5) * 0.6;

    const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, radX);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(1, radY / radX);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radX, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Equatorial cloud band (ITCZ)
  const itczY = height * 0.5;
  for (let x = 0; x < width; x += 120) {
    const waveY = itczY + Math.sin(x * 0.02) * 30;
    const grad = ctx.createRadialGradient(x, waveY, 10, x, waveY, 140);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 140, waveY - 70, 280, 140);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}
