import * as satellite from 'satellite.js';
import { SatelliteItem, CurrentPosition, OrbitPoint, SatelliteCategory } from '../types';
import { FALLBACK_TLE_DATA } from '../data/fallbackSatellites';
import { getSatelliteDossier } from '../data/satelliteDescriptions';
import { validateTLE, safeStorageSetItem, safeStorageGetItem } from '../utils/exceptions';

export const EARTH_RADIUS_KM = 6371;
export const GLOBE_RADIUS_UNITS = 10.0;
export const SCALE_KM_TO_UNITS = GLOBE_RADIUS_UNITS / EARTH_RADIUS_KM;

// Cache of compiled satrec objects for performance
const satrecCache = new Map<string, any>();

export function getSatrec(sat: SatelliteItem): any {
  if (satrecCache.has(sat.id)) {
    return satrecCache.get(sat.id);
  }
  try {
    const satrec = satellite.twoline2satrec(sat.line1, sat.line2);
    satrecCache.set(sat.id, satrec);
    return satrec;
  } catch (err) {
    console.warn(`[TLE] Failed to parse satrec for ${sat.name}`, err);
    return null;
  }
}

/**
 * Calculates current 3D position, lat, lng, altitude, and speed for a satellite
 */
export function calculateSatellitePosition(sat: SatelliteItem, date: Date): CurrentPosition | null {
  const satrec = getSatrec(sat);
  if (!satrec) return null;

  try {
    const positionAndVelocity = satellite.propagate(satrec, date);
    if (!positionAndVelocity || typeof positionAndVelocity !== 'object') {
      return null;
    }
    const positionEci = positionAndVelocity.position;
    const velocityEci = positionAndVelocity.velocity;

    if (!positionEci || typeof positionEci !== 'object' || isNaN(positionEci.x)) {
      return null;
    }

    const gmst = satellite.gstime(date);
    const geodetic = satellite.eciToGeodetic(positionEci as any, gmst);

    const lat = satellite.radiansToDegrees(geodetic.latitude);
    const lng = satellite.radiansToDegrees(geodetic.longitude);
    const altitudeKm = geodetic.height;

    let speedKmS = 7.5;
    if (velocityEci && typeof velocityEci === 'object' && !isNaN(velocityEci.x)) {
      speedKmS = Math.sqrt(
        velocityEci.x * velocityEci.x +
        velocityEci.y * velocityEci.y +
        velocityEci.z * velocityEci.z
      );
    }

    // Convert ECI to Three.js coordinates
    // ECI: Z is North, X is Vernal Equinox, Y is orthogonal in equatorial plane
    // Three.js: Y is North, X is right, -Z is forward
    const x = positionEci.x * SCALE_KM_TO_UNITS;
    const y = positionEci.z * SCALE_KM_TO_UNITS;
    const z = -positionEci.y * SCALE_KM_TO_UNITS;

    return {
      x,
      y,
      z,
      lat,
      lng,
      altitudeKm,
      speedKmS
    };
  } catch (err) {
    return null;
  }
}

/**
 * Computes complete 3D orbital trajectory points for one full period
 */
export function calculateOrbitTrajectory(sat: SatelliteItem, baseDate: Date, numSteps = 120): OrbitPoint[] {
  const satrec = getSatrec(sat);
  if (!satrec) return [];

  const points: OrbitPoint[] = [];
  const periodMin = sat.periodMin > 10 && sat.periodMin < 3000 ? sat.periodMin : 95;
  const totalMs = periodMin * 60 * 1000;
  const stepMs = totalMs / numSteps;

  const startTime = baseDate.getTime();

  for (let i = 0; i <= numSteps; i++) {
    const time = new Date(startTime + i * stepMs);
    try {
      const pv = satellite.propagate(satrec, time);
      if (pv && typeof pv === 'object') {
        const pos = pv.position;
        if (pos && typeof pos === 'object' && !isNaN(pos.x)) {
          const x = pos.x * SCALE_KM_TO_UNITS;
          const y = pos.z * SCALE_KM_TO_UNITS;
          const z = -pos.y * SCALE_KM_TO_UNITS;
          points.push({ x, y, z });
        }
      }
    } catch {
      // skip
    }
  }

  return points;
}

/**
 * Parses raw TLE text into SatelliteItem objects
 */
export function parseTLEText(text: string, category: SatelliteCategory = 'other'): SatelliteItem[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const items: SatelliteItem[] = [];

  let i = 0;
  while (i < lines.length) {
    // 3-line format:
    // Line 0: NAME
    // Line 1: 1 NNNNN...
    // Line 2: 2 NNNNN...
    if (i + 2 < lines.length && lines[i + 1].startsWith('1 ') && lines[i + 2].startsWith('2 ')) {
      const name = lines[i].replace(/^0\s+/, '').trim();
      const line1 = lines[i + 1];
      const line2 = lines[i + 2];
      const item = parseSingleTLE(name, line1, line2, category);
      if (item) items.push(item);
      i += 3;
    } else if (i + 1 < lines.length && lines[i].startsWith('1 ') && lines[i + 1].startsWith('2 ')) {
      // 2-line format
      const id = lines[i].substring(2, 7).trim();
      const name = `SAT-${id}`;
      const line1 = lines[i];
      const line2 = lines[i + 1];
      const item = parseSingleTLE(name, line1, line2, category);
      if (item) items.push(item);
      i += 2;
    } else {
      i++;
    }
  }

  return items;
}

function parseSingleTLE(name: string, line1: string, line2: string, defaultCategory: SatelliteCategory): SatelliteItem | null {
  try {
    // Validate TLE integrity
    validateTLE(name, line1, line2);

    const id = line1.substring(2, 7).trim();
    const intlDesig = line1.substring(9, 17).trim();
    const launchYearShort = parseInt(line1.substring(9, 11).trim(), 10);
    const launchYear = isNaN(launchYearShort) ? 2000 : (launchYearShort > 50 ? 1900 + launchYearShort : 2000 + launchYearShort);

    const inclinationDeg = parseFloat(line2.substring(8, 16).trim()) || 0;
    const eccStr = '0.' + line2.substring(26, 33).trim();
    const eccentricity = parseFloat(eccStr) || 0;
    const meanMotion = parseFloat(line2.substring(52, 63).trim()) || 15;
    const periodMin = meanMotion > 0 ? (1440 / meanMotion) : 95;

    // Approximate semi-major axis: a = (mu / (n^2))^(1/3)
    // where mu = 398600.4418 km^3/s^2, n in rad/s
    const nRadS = (meanMotion * 2 * Math.PI) / 86400;
    const semiMajorAxisKm = Math.pow(398600.4418 / (nRadS * nRadS), 1 / 3);
    const apogeeKm = Math.round(semiMajorAxisKm * (1 + eccentricity) - EARTH_RADIUS_KM);
    const perigeeKm = Math.round(semiMajorAxisKm * (1 - eccentricity) - EARTH_RADIUS_KM);

    // Auto-detect category from name or default
    let category = defaultCategory;
    const upperName = name.toUpperCase();
    if (upperName.includes('ISS') || upperName.includes('ZARYA') || upperName.includes('TIANGONG') || upperName.includes('STATION') || upperName.includes('CREW DRAGON') || upperName.includes('SOYUZ')) {
      category = 'stations';
    } else if (upperName.includes('STARLINK')) {
      category = 'starlink';
    } else if (upperName.includes('GPS') || upperName.includes('NAVSTAR') || upperName.includes('GLONASS') || upperName.includes('GALILEO') || upperName.includes('BEIDOU')) {
      category = 'navigation';
    } else if (upperName.includes('NOAA') || upperName.includes('GOES') || upperName.includes('METEOR') || upperName.includes('TERRA') || upperName.includes('AQUA') || upperName.includes('SENTINEL') || upperName.includes('LANDSAT') || upperName.includes('METOP')) {
      category = 'weather';
    } else if (upperName.includes('HUBBLE') || upperName.includes('FERMI') || upperName.includes('CHANDRA') || upperName.includes('TESS') || upperName.includes('SWIFT') || upperName.includes('VANGUARD') || upperName.includes('CHEOPS')) {
      category = 'science';
    }

    const dossier = getSatelliteDossier(id, name, category, intlDesig, launchYear);

    return {
      id,
      name,
      line1,
      line2,
      category,
      intlDesig,
      launchYear,
      inclinationDeg,
      periodMin: parseFloat(periodMin.toFixed(2)),
      apogeeKm: Math.max(100, apogeeKm),
      perigeeKm: Math.max(100, perigeeKm),
      eccentricity,
      dossier
    };
  } catch {
    return null;
  }
}

/**
 * Fetches TLE data for a given group from server proxy or fallback
 */
export async function fetchTLEForGroup(group: string): Promise<SatelliteItem[]> {
  try {
    const res = await fetch(`/api/tle/${group}`);
    if (res.ok) {
      const text = await res.text();
      const items = parseTLEText(text, group as SatelliteCategory);
      if (items.length > 0) {
        // Cache to localStorage securely
        safeStorageSetItem(`orbitwatch_cache_${group}`, text);
        return items;
      }
    }
  } catch {
    // Network or parse issue, gracefully use cached or fallback satellites
  }

  // Check localStorage cache
  const cachedText = safeStorageGetItem(`orbitwatch_cache_${group}`);
  if (cachedText) {
    const cachedItems = parseTLEText(cachedText, group as SatelliteCategory);
    if (cachedItems.length > 0) {
      return cachedItems;
    }
  }

  // Filter fallback satellites for this category
  return FALLBACK_TLE_DATA.filter(s => s.category === group || group === 'stations' || group === 'all');
}

/**
 * Loads all satellite groups and combines with fallback catalog
 */
export async function loadInitialSatelliteCatalog(): Promise<{
  satellites: SatelliteItem[];
  source: 'celestrak' | 'cache' | 'fallback';
  timestamp: Date;
}> {
  // Always begin with high-quality fallback data instantly
  const catalogMap = new Map<string, SatelliteItem>();
  for (const item of FALLBACK_TLE_DATA) {
    if (!item.dossier) {
      item.dossier = getSatelliteDossier(item.id, item.name, item.category, item.intlDesig, item.launchYear);
    }
    catalogMap.set(item.id, item);
  }

  let source: 'celestrak' | 'cache' | 'fallback' = 'fallback';

  // Request key groups from CelesTrak in parallel
  const groupsToFetch = ['stations', 'weather', 'science', 'navigation', 'starlink'];

  const results = await Promise.allSettled(
    groupsToFetch.map(g => fetchTLEForGroup(g))
  );

  let freshCount = 0;
  for (const res of results) {
    if (res.status === 'fulfilled' && res.value.length > 0) {
      for (const sat of res.value) {
        catalogMap.set(sat.id, sat);
      }
      freshCount++;
    }
  }

  if (freshCount > 0) {
    source = 'celestrak';
  }

  return {
    satellites: Array.from(catalogMap.values()),
    source,
    timestamp: new Date()
  };
}
