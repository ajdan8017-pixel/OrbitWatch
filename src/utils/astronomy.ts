import * as THREE from 'three';

/**
 * Astronomical calculations for realistic Sun and Moon positions
 * based on UTC date/time.
 */

// Astronomical constants (NC-02 fix: eliminate magic numbers)
export const SUN_DISTANCE_UNITS = 140.0;
export const MOON_DISTANCE_UNITS = 42.0;
export const EARTH_AXIS_TILT_RAD = 0.409; // 23.44 degrees in radians
export const DAYS_PER_TROPICAL_YEAR = 365.25;
export const SPRING_EQUINOX_DAY_OFFSET = 81.0;
export const EARTH_ROTATION_DEG_PER_HOUR = 15.0;
export const MOON_ORBITAL_PERIOD_DAYS = 27.3;
export const MOON_ORBITAL_INCLINATION_RAD = 0.089; // ~5.1 degrees in radians
export const MS_PER_DAY = 1000 * 60 * 60 * 24;

export interface CelestialPositions {
  sunDirection: THREE.Vector3;
  sunPosition: THREE.Vector3;
  moonPosition: THREE.Vector3;
  subSolarLat: number;
  subSolarLng: number;
}

/**
 * Calculates accurate approximate Sun and Moon positions in Three.js coordinates
 * (Earth radius is 10 units, Sun distance is 140 units, Moon distance is 42 units)
 * @param date - UTC Date of the celestial calculation
 * @returns CelestialPositions object containing vectors and sub-solar coordinates
 */
export function calculateCelestialPositions(date: Date): CelestialPositions {
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  
  // Day of year calculation
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayOfYear = (date.getTime() - startOfYear.getTime()) / MS_PER_DAY;

  // Solar declination (approximate, Earth axial tilt = 23.44 deg = 0.409 rad)
  const declinationRad = EARTH_AXIS_TILT_RAD * Math.sin(
    (2 * Math.PI / DAYS_PER_TROPICAL_YEAR) * (dayOfYear - SPRING_EQUINOX_DAY_OFFSET)
  );
  const subSolarLat = (declinationRad * 180) / Math.PI;

  // Greenwich Hour Angle / Solar Noon longitude:
  // At 12:00 UTC, Sun is over Prime Meridian (0 deg).
  // Earth rotates 15 deg per hour from East to West.
  const subSolarLng = -((utcHours - 12) * EARTH_ROTATION_DEG_PER_HOUR);
  const subSolarLngRad = (subSolarLng * Math.PI) / 180;

  // Convert to Three.js Cartesian coordinate vector
  // Three.js: Y is North (+Y), X is 0 deg longitude (+X), Z is 90 deg West (+Z or -Z)
  const cosDec = Math.cos(declinationRad);
  const sinDec = Math.sin(declinationRad);

  const sunX = SUN_DISTANCE_UNITS * cosDec * Math.cos(subSolarLngRad);
  const sunY = SUN_DISTANCE_UNITS * sinDec;
  const sunZ = -SUN_DISTANCE_UNITS * cosDec * Math.sin(subSolarLngRad);

  const sunPosition = new THREE.Vector3(sunX, sunY, sunZ);
  const sunDirection = sunPosition.clone().normalize();

  // Moon Position:
  // Moon orbits Earth approximately every 27.3 days, inclined by ~5.1 deg
  const moonPhaseAngle = ((dayOfYear % MOON_ORBITAL_PERIOD_DAYS) / MOON_ORBITAL_PERIOD_DAYS) * Math.PI * 2;

  const moonX = MOON_DISTANCE_UNITS * Math.cos(moonPhaseAngle);
  const moonY = MOON_DISTANCE_UNITS * Math.sin(moonPhaseAngle) * Math.sin(MOON_ORBITAL_INCLINATION_RAD);
  const moonZ = MOON_DISTANCE_UNITS * Math.sin(moonPhaseAngle) * Math.cos(MOON_ORBITAL_INCLINATION_RAD);

  const moonPosition = new THREE.Vector3(moonX, moonY, moonZ);

  return {
    sunDirection,
    sunPosition,
    moonPosition,
    subSolarLat,
    subSolarLng
  };
}
