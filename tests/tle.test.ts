import { describe, it, expect } from 'vitest';
import { calculateTLEChecksum, validateTLE, TleValidationError } from '../src/utils/exceptions';
import { parseTLEText } from '../src/services/tleService';

describe('Модуль валидации и парсинга TLE (tle.test.ts)', () => {
  // Эталонные строки МКС (ZARYA)
  const issLine1 = '1 25544U 98067A   26088.51437142  .00014389  00000+0  26245-3 0  9997';
  const issLine2 = '2 25544  51.6416 195.4211 0006248  94.3412  24.3124 15.49815234473823';

  describe('calculateTLEChecksum', () => {
    it('должен корректно вычислять контрольную сумму строки 1 МКС (равно 7)', () => {
      const sum = calculateTLEChecksum(issLine1);
      expect(sum).toBe(7);
    });

    it('должен корректно вычислять контрольную сумму строки 2 МКС (равно 3)', () => {
      const sum = calculateTLEChecksum(issLine2);
      expect(sum).toBe(3);
    });

    it('должен корректно учитывать символы дефиса "-" как 1 в алгоритме NORAD', () => {
      const lineWithMinus = '1 00005U 58002B   26088.00000000 -.00000000 -00000-0 -00000-0 0  999';
      const sum = calculateTLEChecksum(lineWithMinus);
      expect(typeof sum).toBe('number');
      expect(sum).toBeGreaterThanOrEqual(0);
      expect(sum).toBeLessThanOrEqual(9);
    });
  });

  describe('validateTLE', () => {
    it('должен возвращать true для валидных строк TLE МКС', () => {
      expect(validateTLE(issLine1, issLine2)).toBe(true);
    });

    it('должен выбрасывать TleValidationError при пустых строках (Fail Fast)', () => {
      expect(() => validateTLE('', issLine2)).toThrow(TleValidationError);
      expect(() => validateTLE(issLine1, '')).toThrow('Строки TLE не могут быть пустыми');
    });

    it('должен выбрасывать TleValidationError при длине строки !== 69 символов', () => {
      const shortLine = issLine1.substring(0, 68); // 68 символов
      expect(() => validateTLE(shortLine, issLine2)).toThrow(TleValidationError);
      expect(() => validateTLE(shortLine, issLine2)).toThrow(/Неверная длина строки TLE/);
    });

    it('должен выбрасывать TleValidationError если строка 1 не начинается с "1 "', () => {
      const brokenStart = '3' + issLine1.substring(1);
      expect(() => validateTLE(brokenStart, issLine2)).toThrow(/Строка 1 должна начинаться с "1 "/);
    });

    it('должен выбрасывать TleValidationError при несовпадении контрольной суммы строки 2', () => {
      // Меняем контрольную цифру '3' на '9'
      const corruptedLine2 = issLine2.substring(0, 68) + '9';
      expect(() => validateTLE(issLine1, corruptedLine2)).toThrow(/Несовпадение контрольной суммы/);
    });
  });

  describe('parseTLEText', () => {
    it('должен успешно парсить стандартный 3-строчный блок TLE в SatelliteItem', () => {
      const rawText = `ISS (ZARYA)\n${issLine1}\n${issLine2}`;
      const items = parseTLEText(rawText);
      expect(items).toHaveLength(1);
      const sat = items[0];
      expect(sat.id).toBe('25544');
      expect(sat.name).toBe('ISS (ZARYA)');
      expect(sat.category).toBe('stations');
      expect(sat.inclinationDeg).toBeCloseTo(51.64, 1);
      expect(sat.periodMin).toBeGreaterThan(90);
      expect(sat.periodMin).toBeLessThan(95);
    });

    it('должен корректно классифицировать спутник STARLINK в категорию "starlink"', () => {
      const starlinkText = `STARLINK-1007\n${issLine1}\n${issLine2}`;
      const items = parseTLEText(starlinkText);
      expect(items).toHaveLength(1);
      expect(items[0].category).toBe('starlink');
      expect(items[0].name).toBe('STARLINK-1007');
    });

    it('должен игнорировать пустые строки и не ломаться на мусорных данных', () => {
      const messyText = `\n\n  \nINVALID DATA\n\n`;
      const items = parseTLEText(messyText);
      expect(items).toEqual([]);
    });
  });
});
