import { describe, it, expect, beforeEach, vi } from 'vitest';
import { safeLocalStorageSet, safeStorageGetItem, safeStorageSetItem, StorageQuotaError } from '../src/utils/exceptions';

describe('Модуль отказоустойчивого хранилища (storage.test.ts)', () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => mockStore[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        mockStore[key] = String(val);
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStore[key];
      }),
      clear: vi.fn(() => {
        mockStore = {};
      }),
      length: 0,
      key: vi.fn((_i: number) => null)
    };

    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  it('должен успешно сохранять и считывать строковые данные TLE', () => {
    const success = safeStorageSetItem('orbitwatch_cache_stations', 'ISS TLE DATA');
    expect(success).toBe(true);

    const retrieved = safeStorageGetItem('orbitwatch_cache_stations');
    expect(retrieved).toBe('ISS TLE DATA');
  });

  it('должен возвращать null при чтении несуществующего ключа', () => {
    const data = safeStorageGetItem('non_existent_key_999');
    expect(data).toBeNull();
  });

  it('должен пытаться освободить временный кэш при ошибке квоты (QuotaExceededError)', () => {
    mockStore['orbitwatch_tle_cache_temp'] = 'OLD_LARGE_DATA';

    // Эмулируем переполнение хранилища при первой попытке
    let attempt = 0;
    const quotaExceededMock = {
      getItem: vi.fn((key: string) => mockStore[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        attempt++;
        if (attempt === 1) {
          const err = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
          throw err;
        }
        mockStore[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStore[key];
      }),
      clear: vi.fn(),
      length: 1,
      key: vi.fn()
    };

    vi.stubGlobal('localStorage', quotaExceededMock);

    const result = safeLocalStorageSet('new_cache_key', 'NEW_IMPORTANT_DATA');
    expect(result).toBe(true);
    expect(quotaExceededMock.removeItem).toHaveBeenCalledWith('orbitwatch_tle_cache_temp');
    expect(mockStore['new_cache_key']).toBe('NEW_IMPORTANT_DATA');
  });
});
