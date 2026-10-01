import * as THREE from 'three';

/**
 * Astronomical calculations for realistic Sun and Moon positions
 * based on UTC date/time.
 */

export interface CelestialPositions {
  sunDirection: THREE.Vector3;
  sunPosition: THREE.Vector3;
  moonPosition: THREE.Vector3;
  subSolarLat: number;
  subSolarLng: number;
}

/**
 * Calculates accurate approximate Sun and Moon positions in Three.js coordinates
 * (Earth radius is 10 units, Sun distance is 140 units, Moon distance is 45 units)
 */
export function calculateCelestialPositions(date: Date): CelestialPositions {
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  
  // Day of year
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayOfYear = (date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24);

  // Solar declination (approximate, tilt is 23.44 deg)
  // Earth axis tilt = 23.44 degrees = 0.409 rad
  const declinationRad = 0.409 * Math.sin((2 * Math.PI / 365.25) * (dayOfYear - 81));
  const subSolarLat = (declinationRad * 180) / Math.PI;

  // Greenwich Hour Angle / Solar Noon longitude:
  // At 12:00 UTC, Sun is over Prime Meridian (0 deg).
  // Earth rotates 15 deg per hour from East to West.
  const subSolarLng = -((utcHours - 12) * 15);
  const subSolarLngRad = (subSolarLng * Math.PI) / 180;

  // Convert to Three.js Cartesian coordinate vector
  // Three.js: Y is North (+Y), X is 0 deg longitude (+X), Z is 90 deg West (+Z or -Z)
  const sunDistance = 140;
  const cosDec = Math.cos(declinationRad);
  const sinDec = Math.sin(declinationRad);

  const sunX = sunDistance * cosDec * Math.cos(subSolarLngRad);
  const sunY = sunDistance * sinDec;
  const sunZ = -sunDistance * cosDec * Math.sin(subSolarLngRad);

  const sunPosition = new THREE.Vector3(sunX, sunY, sunZ);
  const sunDirection = sunPosition.clone().normalize();

  // Moon Position:
  // Moon orbits Earth approximately every 27.3 days, inclined by ~5.1 deg
  const moonPhaseAngle = ((dayOfYear % 27.3) / 27.3) * Math.PI * 2;
  const moonDistance = 42;
  const moonInclination = 0.089; // ~5.1 degrees in radians

  const moonX = moonDistance * Math.cos(moonPhaseAngle);
  const moonY = moonDistance * Math.sin(moonPhaseAngle) * Math.sin(moonInclination);
  const moonZ = moonDistance * Math.sin(moonPhaseAngle) * Math.cos(moonInclination);

  const moonPosition = new THREE.Vector3(moonX, moonY, moonZ);

  return {
    sunDirection,
    sunPosition,
    moonPosition,
    subSolarLat,
    subSolarLng
  };
}
