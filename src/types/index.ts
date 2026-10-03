export type SatelliteCategory =
  | 'stations'
  | 'starlink'
  | 'navigation'
  | 'weather'
  | 'science'
  | 'other';

export interface SatelliteDossier {
  country: string;
  countryFlag: string;
  countryCode: string;
  operator: string;
  launchDate: string;
  launchSite: string;
  rocket?: string;
  purpose: string;
  summary: string;
  funFact?: string;
}

export interface SatelliteItem {
  id: string; // NORAD ID
  name: string;
  line1: string;
  line2: string;
  category: SatelliteCategory;
  intlDesig?: string;
  launchYear?: number;
  inclinationDeg: number;
  periodMin: number;
  apogeeKm: number;
  perigeeKm: number;
  eccentricity: number;
  dossier?: SatelliteDossier;
}

export interface CurrentPosition {
  x: number;
  y: number;
  z: number;
  lat: number;
  lng: number;
  altitudeKm: number;
  speedKmS: number;
}

export interface OrbitPoint {
  x: number;
  y: number;
  z: number;
  lat?: number;
  lng?: number;
  alt?: number;
}

export interface LaunchMission {
  id: string;
  name: string;
  rocket: string;
  dateUtc: string;
  dateUnix: number;
  success: boolean | null;
  upcoming: boolean;
  details: string | null;
  patchUrl: string | null;
  webcastUrl: string | null;
  articleUrl: string | null;
  launchpad: string;
  payloads: string[];
}

export interface Astronaut {
  name: string;
  craft: string;
}

export interface FilterOptions {
  searchQuery: string;
  selectedCategories: string[];
  showStarlink: boolean;
  minAltitude: number;
  maxAltitude: number;
  orbitType: 'all' | 'leo' | 'meo' | 'geo';
}

export interface TimeState {
  simulatedTime: Date;
  speedMultiplier: number;
  isPaused: boolean;
}
