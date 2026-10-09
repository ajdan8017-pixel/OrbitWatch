import { describe, it, expect } from 'vitest';
import {
  calculateCelestialPositions,
  SUN_DISTANCE_UNITS,
  MOON_DISTANCE_UNITS,
  EARTH_ROTATION_DEG_PER_HOUR
} from '../src/utils/astronomy';

describe('Модуль астрономических вычислений (astronomy.test.ts)', () => {
  it('должен рассчитывать положение Солнца на дистанции SUN_DISTANCE_UNITS', () => {
    const testDate = new Date('2026-06-21T12:00:00Z'); // Летнее солнцестояние в полдень UTC
    const pos = calculateCelestialPositions(testDate);

    expect(pos).toBeDefined();
    expect(pos.sunPosition).toBeDefined();
    expect(pos.sunDirection).toBeDefined();

    // Дистанция до Солнца
    const dist = pos.sunPosition.length();
    expect(Math.abs(dist - SUN_DISTANCE_UNITS)).toBeLessThan(0.01);

    // Нормализованный вектор направления
    expect(Math.abs(pos.sunDirection.length() - 1.0)).toBeLessThan(0.001);
  });

  it('должен позиционировать подсолнечную точку вблизи 0° долготы в полдень UTC', () => {
    const noonUtc = new Date('2026-03-20T12:00:00Z'); // Весеннее равноденствие в полдень
    const pos = calculateCelestialPositions(noonUtc);

    expect(Math.abs(pos.subSolarLng)).toBeLessThan(0.01);
    // В равноденствие широта близка к экватору (~0°)
    expect(Math.abs(pos.subSolarLat)).toBeLessThan(2.0);
  });

  it('должен вычислять корректную дистанцию до Луны', () => {
    const testDate = new Date('2026-10-09T00:00:00Z');
    const pos = calculateCelestialPositions(testDate);

    expect(pos.moonPosition).toBeDefined();
    const moonDist = pos.moonPosition.length();
    expect(Math.abs(moonDist - MOON_DISTANCE_UNITS)).toBeLessThan(0.01);
  });

  it('должен учитывать вращение Земли на 15 градусов в час', () => {
    const t0 = new Date('2026-05-01T10:00:00Z');
    const t1 = new Date('2026-05-01T11:00:00Z');
    const pos0 = calculateCelestialPositions(t0);
    const pos1 = calculateCelestialPositions(t1);

    const diffLng = Math.abs(pos1.subSolarLng - pos0.subSolarLng);
    expect(diffLng).toBeCloseTo(EARTH_ROTATION_DEG_PER_HOUR, 1);
  });
});
