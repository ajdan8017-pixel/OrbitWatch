import * as THREE from 'three';
import { SatelliteCategory } from '../types';

/**
 * Procedural high-performance sprite textures for different satellite categories
 * and selection effects (pulsing reticle, sun corona, moon).
 */

const textureCache = new Map<string, THREE.CanvasTexture>();

function getOrCreateTexture(key: string, drawFn: (ctx: CanvasRenderingContext2D, size: number) => void, size = 128): THREE.CanvasTexture {
  if (textureCache.has(key)) {
    return textureCache.get(key)!;
  }
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  drawFn(ctx, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Stations (ISS, Tiangong) - Space station solar array icon in Amber Gold
 */
export function createStationSpriteTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('station_sprite', (ctx, size) => {
    const center = size / 2;
    // Outer glow
    const glow = ctx.createRadialGradient(center, center, 4, center, center, center * 0.95);
    glow.addColorStop(0, 'rgba(245, 158, 11, 0.9)');
    glow.addColorStop(0.3, 'rgba(245, 158, 11, 0.45)');
    glow.addColorStop(0.7, 'rgba(245, 158, 11, 0.1)');
    glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // Center pressurized module
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(center, center, size * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Solar panels (truss and wings)
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = size * 0.04;
    ctx.beginPath();
    ctx.moveTo(center - size * 0.38, center);
    ctx.lineTo(center + size * 0.38, center);
    ctx.stroke();

    // Left solar panel grid
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(center - size * 0.38, center - size * 0.22, size * 0.16, size * 0.44);
    // Right solar panel grid
    ctx.fillRect(center + size * 0.22, center - size * 0.22, size * 0.16, size * 0.44);

    // Panel grid lines
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = size * 0.02;
    ctx.strokeRect(center - size * 0.38, center - size * 0.22, size * 0.16, size * 0.44);
    ctx.strokeRect(center + size * 0.22, center - size * 0.22, size * 0.16, size * 0.44);
  });
}

/**
 * Starlink - Diamond / Rhombus with Cyan glow
 */
export function createStarlinkSpriteTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('starlink_sprite', (ctx, size) => {
    const center = size / 2;
    const glow = ctx.createRadialGradient(center, center, 2, center, center, center * 0.9);
    glow.addColorStop(0, 'rgba(6, 182, 212, 0.95)');
    glow.addColorStop(0.4, 'rgba(6, 182, 212, 0.4)');
    glow.addColorStop(0.8, 'rgba(6, 182, 212, 0.08)');
    glow.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // Rhombus (diamond)
    const r = size * 0.28;
    ctx.beginPath();
    ctx.moveTo(center, center - r);
    ctx.lineTo(center + r * 0.65, center);
    ctx.lineTo(center, center + r);
    ctx.lineTo(center - r * 0.65, center);
    ctx.closePath();
    ctx.fillStyle = '#e0f2fe';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.fill();

    // Center core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(center, center, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Navigation (GPS, GLONASS, Galileo) - Directional Triangle in Emerald Green
 */
export function createNavigationSpriteTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('navigation_sprite', (ctx, size) => {
    const center = size / 2;
    const glow = ctx.createRadialGradient(center, center, 3, center, center, center * 0.9);
    glow.addColorStop(0, 'rgba(16, 185, 129, 0.9)');
    glow.addColorStop(0.35, 'rgba(16, 185, 129, 0.35)');
    glow.addColorStop(0.75, 'rgba(16, 185, 129, 0.08)');
    glow.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // Equilateral triangle
    const r = size * 0.28;
    ctx.beginPath();
    ctx.moveTo(center, center - r);
    ctx.lineTo(center + r * 0.866, center + r * 0.5);
    ctx.lineTo(center - r * 0.866, center + r * 0.5);
    ctx.closePath();
    ctx.fillStyle = '#d1fae5';
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 10;
    ctx.fill();

    // Beacon center ring
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = size * 0.03;
    ctx.beginPath();
    ctx.arc(center, center + r * 0.1, size * 0.09, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(center, center + r * 0.1, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Science (Hubble, Fermi, Chandra) - Radiant 4-pointed Star in Rose/Magenta
 */
export function createScienceSpriteTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('science_sprite', (ctx, size) => {
    const center = size / 2;
    const glow = ctx.createRadialGradient(center, center, 2, center, center, center * 0.9);
    glow.addColorStop(0, 'rgba(236, 72, 153, 0.95)');
    glow.addColorStop(0.4, 'rgba(236, 72, 153, 0.4)');
    glow.addColorStop(0.8, 'rgba(236, 72, 153, 0.08)');
    glow.addColorStop(1, 'rgba(236, 72, 153, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // 4-pointed diamond star
    const rOuter = size * 0.34;
    const rInner = size * 0.1;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const r = i % 2 === 0 ? rOuter : rInner;
      const x = center + Math.cos(angle) * r;
      const y = center + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = '#fce7f3';
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 12;
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(center, center, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Weather & Earth Observation - Satellite dish / optics in Indigo/Violet
 */
export function createWeatherSpriteTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('weather_sprite', (ctx, size) => {
    const center = size / 2;
    const glow = ctx.createRadialGradient(center, center, 2, center, center, center * 0.9);
    glow.addColorStop(0, 'rgba(99, 102, 241, 0.9)');
    glow.addColorStop(0.4, 'rgba(99, 102, 241, 0.35)');
    glow.addColorStop(0.8, 'rgba(99, 102, 241, 0.08)');
    glow.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // Outer dish arc
    ctx.strokeStyle = '#c7d2fe';
    ctx.lineWidth = size * 0.04;
    ctx.beginPath();
    ctx.arc(center, center, size * 0.22, 0.2 * Math.PI, 1.8 * Math.PI);
    ctx.stroke();

    // Central core sensor
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#818cf8';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(center, center, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * Default / Other Satellites - Crisp glowing orbiter beacon
 */
export function createDefaultSpriteTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('default_sprite', (ctx, size) => {
    const center = size / 2;
    const glow = ctx.createRadialGradient(center, center, 1, center, center, center * 0.85);
    glow.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    glow.addColorStop(0.25, 'rgba(148, 163, 184, 0.7)');
    glow.addColorStop(0.6, 'rgba(148, 163, 184, 0.2)');
    glow.addColorStop(1, 'rgba(148, 163, 184, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(center, center, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * High-tech Pulsating Selection Reticle / Glow Ring for Selected Satellite
 */
export function createSelectionRingTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('selection_ring', (ctx, size) => {
    const center = size / 2;
    const rOuter = size * 0.44;
    const rInner = size * 0.32;

    // Glowing circle band
    const glow = ctx.createRadialGradient(center, center, rInner * 0.8, center, center, rOuter * 1.15);
    glow.addColorStop(0, 'rgba(56, 189, 248, 0)');
    glow.addColorStop(0.5, 'rgba(56, 189, 248, 0.85)');
    glow.addColorStop(0.85, 'rgba(56, 189, 248, 0.4)');
    glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // Dashed primary circle
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = size * 0.035;
    ctx.beginPath();
    ctx.arc(center, center, rOuter, 0, Math.PI * 2);
    ctx.stroke();

    // 4 Corner targeting notches / brackets
    const notchLen = size * 0.12;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = size * 0.045;
    // Top
    ctx.beginPath();
    ctx.moveTo(center, center - rOuter - notchLen * 0.5);
    ctx.lineTo(center, center - rOuter + notchLen * 0.5);
    ctx.stroke();
    // Bottom
    ctx.beginPath();
    ctx.moveTo(center, center + rOuter - notchLen * 0.5);
    ctx.lineTo(center, center + rOuter + notchLen * 0.5);
    ctx.stroke();
    // Left
    ctx.beginPath();
    ctx.moveTo(center - rOuter - notchLen * 0.5, center);
    ctx.lineTo(center - rOuter + notchLen * 0.5, center);
    ctx.stroke();
    // Right
    ctx.beginPath();
    ctx.moveTo(center + rOuter - notchLen * 0.5, center);
    ctx.lineTo(center + rOuter + notchLen * 0.5, center);
    ctx.stroke();
  }, 256);
}

/**
 * Sun Corona & Flare Sprite Texture
 */
export function createSunCoronaTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('sun_corona', (ctx, size) => {
    const center = size / 2;
    const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.12, 'rgba(255, 244, 214, 0.95)');
    grad.addColorStop(0.3, 'rgba(251, 191, 36, 0.6)');
    grad.addColorStop(0.65, 'rgba(245, 158, 11, 0.2)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }, 256);
}

/**
 * Moon Crater Procedural Texture
 */
export function createMoonTexture(): THREE.CanvasTexture {
  return getOrCreateTexture('moon_texture', (ctx, size) => {
    const width = size * 2;
    const height = size;
    ctx.canvas.width = width;
    ctx.canvas.height = height;

    // Base lunar regolith grey gradient
    ctx.fillStyle = '#8c8f94';
    ctx.fillRect(0, 0, width, height);

    // Lunar maria (dark basaltic plains)
    ctx.fillStyle = '#5c5f66';
    const maria = [
      [width * 0.35, height * 0.35, 90, 60],
      [width * 0.5, height * 0.4, 110, 80],
      [width * 0.65, height * 0.3, 70, 50],
      [width * 0.4, height * 0.6, 60, 45],
      [width * 0.8, height * 0.5, 80, 60]
    ];
    for (const [x, y, rx, ry] of maria) {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Impact craters
    for (let i = 0; i < 140; i++) {
      const cx = Math.random() * width;
      const cy = Math.random() * height;
      const r = 2 + Math.random() * 12;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#b8bac0';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = '#47494e';
      ctx.fill();
    }
  }, 512);
}

export function getSpriteTextureForCategory(category: SatelliteCategory): THREE.CanvasTexture {
  switch (category) {
    case 'stations':
      return createStationSpriteTexture();
    case 'starlink':
      return createStarlinkSpriteTexture();
    case 'navigation':
      return createNavigationSpriteTexture();
    case 'science':
      return createScienceSpriteTexture();
    case 'weather':
      return createWeatherSpriteTexture();
    default:
      return createDefaultSpriteTexture();
  }
}
