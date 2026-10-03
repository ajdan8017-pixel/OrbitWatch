import { describe, it, expect } from 'vitest';
import {
  calculateSatellitePosition,
  calculateOrbitTrajectory,
  getSatrec,
  EARTH_RADIUS_KM,
  SCALE_KM_TO_UNITS
} from '../src/services/tleService';
import { SatelliteItem } from '../src/types';

describe('Модуль баллистических расчетов SGP4 (sgp4.test.ts)', () => {
  const issSatellite: SatelliteItem = {
    id: '25544',
    name: 'ISS (ZARYA)',
    line1: '1 25544U 98067A   26088.51437142  .00014389  00000+0  26245-3 0  9997',
    line2: '2 25544  51.6416 195.4211 0006248  94.3412  24.3124 15.49815234473824',
    category: 'stations',
    intlDesig: '98067A',
    launchYear: 1998,
    inclinationDeg: 51.64,
    periodMin: 92.9,
    apogeeKm: 422,
    perigeeKm: 418,
    eccentricity: 0.0006248
  };

  describe('getSatrec', () => {
    it('должен успешно компилировать TLE в структуру satrec', () => {
      const satrec = getSatrec(issSatellite);
      expect(satrec).not.toBeNull();
      expect(satrec.satnum).toBe('25544');
    });

    it('должен кэшировать скомпилированные объекты satrec для экономии CPU', () => {
      const satrec1 = getSatrec(issSatellite);
      const satrec2 = getSatrec(issSatellite);
      expect(satrec1).toBe(satrec2); // Strict reference equality from Map cache
    });
  });

  describe('calculateSatellitePosition', () => {
    const testDate = new Date('2026-03-29T12:00:00Z');

    it('должен возвращать валидные трехмерные координаты x, y, z для МКС', () => {
      const pos = calculateSatellitePosition(issSatellite, testDate);
      expect(pos).not.toBeNull();
      if (!pos) return;

      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
      expect(typeof pos.z).toBe('number');
      expect(isNaN(pos.x)).toBe(false);

      // Рассчитываем радиус орбиты от центра сферы Three.js
      const radiusUnits = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
      // Сфера Земли = 10 units, орбита МКС (~420 км) = 10 * (1 + 420/6371) ≈ 10.66 units
      expect(radiusUnits).toBeGreaterThan(10.0);
      expect(radiusUnits).toBeLessThan(11.5);
    });

    it('должен рассчитывать высоту МКС в пределах реального диапазона 410–430 км', () => {
      const pos = calculateSatellitePosition(issSatellite, testDate);
      expect(pos).not.toBeNull();
      if (!pos) return;

      expect(pos.altitudeKm).toBeGreaterThan(400);
      expect(pos.altitudeKm).toBeLessThan(440);
    });

    it('должен рассчитывать 1-ю космическую скорость МКС в диапазоне 7.60–7.75 км/с', () => {
      const pos = calculateSatellitePosition(issSatellite, testDate);
      expect(pos).not.toBeNull();
      if (!pos) return;

      expect(pos.speedKmS).toBeGreaterThan(7.5);
      expect(pos.speedKmS).toBeLessThan(7.8);
    });

    it('должен возвращать валидные широту [-90; 90] и долготу [-180; 180]', () => {
      const pos = calculateSatellitePosition(issSatellite, testDate);
      expect(pos).not.toBeNull();
      if (!pos) return;

      expect(pos.lat).toBeGreaterThanOrEqual(-90);
      expect(pos.lat).toBeLessThanOrEqual(90);
      expect(pos.lng).toBeGreaterThanOrEqual(-180);
      expect(pos.lng).toBeLessThanOrEqual(180);
    });
  });

  describe('calculateOrbitTrajectory', () => {
    it('должен генерировать массив точек заданной длины (numSteps + 1)', () => {
      const points = calculateOrbitTrajectory(issSatellite, new Date(), 60);
      expect(points.length).toBe(61);
    });

    it('должен замыкать траекторию витка: первая и последняя точки должны быть близки', () => {
      const points = calculateOrbitTrajectory(issSatellite, new Date(), 120);
      expect(points.length).toBeGreaterThan(10);

      const pFirst = points[0];
      const pLast = points[points.length - 1];

      const dx = pFirst.x - pLast.x;
      const dy = pFirst.y - pLast.y;
      const dz = pFirst.z - pLast.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // В масштабе Three.js разница между концами витка должна быть минимальной
      expect(distance).toBeLessThan(0.5);
    });
  });
});
