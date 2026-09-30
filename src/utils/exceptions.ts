/**
 * Иерархия классов исключений и валидаторы для веб-приложения OrbitWatch
 * Разработано в рамках Дня 7: «Обработка исключительных ситуаций и отказоустойчивость»
 */

export type ErrorSeverity = 'critical' | 'warning' | 'info';

export class OrbitWatchError extends Error {
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly timestamp: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code = 'ORBITWATCH_CORE_ERROR',
    severity: ErrorSeverity = 'warning',
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'OrbitWatchError';
    this.code = code;
    this.severity = severity;
    this.timestamp = new Date().toISOString();
    this.context = context;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Ошибка валидации формата и контрольной суммы TLE */
export class TleValidationError extends OrbitWatchError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'TLE_VALIDATION_ERROR', 'warning', context);
    this.name = 'TleValidationError';
  }
}

/** Ошибка орбитальной баллистической модели SGP4 (сингулярности, падение аппарата) */
export class Sgp4PropagationError extends OrbitWatchError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'SGP4_PROPAGATION_ERROR', 'warning', context);
    this.name = 'Sgp4PropagationError';
  }
}

/** Критическая ошибка WebGL рендеринга (потеря контекста видеокарты) */
export class WebGlContextError extends OrbitWatchError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'WEBGL_CONTEXT_ERROR', 'critical', context);
    this.name = 'WebGlContextError';
  }
}

/** Ошибка переполнения или недоступности хранилища LocalStorage */
export class StorageQuotaError extends OrbitWatchError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'STORAGE_QUOTA_ERROR', 'warning', context);
    this.name = 'StorageQuotaError';
  }
}

/** Ошибка сетевого взаимодействия и внешних API-шлюзов */
export class NetworkProxyError extends OrbitWatchError {
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number, context?: Record<string, unknown>) {
    super(message, 'NETWORK_PROXY_ERROR', 'warning', context);
    this.name = 'NetworkProxyError';
    this.statusCode = statusCode;
  }
}

// ----------------- Функции-валидаторы -----------------

/**
 * Валидация контрольной суммы строки TLE по стандарту NORAD
 */
export function calculateTLEChecksum(line: string): number {
  let checksum = 0;
  // Контрольная сумма считается по первым 68 символам
  for (let i = 0; i < Math.min(line.length - 1, 68); i++) {
    const char = line[i];
    if (char >= '0' && char <= '9') {
      checksum += parseInt(char, 10);
    } else if (char === '-') {
      checksum += 1;
    }
  }
  return checksum % 10;
}

/**
 * Проверка валидности двухстрочного набора TLE (Two-Line Element Set)
 * Стратегия: Fail Fast при передаче пользовательских TLE
 */
export function validateTLE(line1: string, line2: string): boolean {
  if (!line1 || !line2) {
    throw new TleValidationError('Строки TLE не могут быть пустыми');
  }

  const cleanL1 = line1.trim();
  const cleanL2 = line2.trim();

  if (cleanL1.length !== 69 || cleanL2.length !== 69) {
    throw new TleValidationError('Неверная длина строки TLE: ожидается ровно 69 символов', {
      l1Length: cleanL1.length,
      l2Length: cleanL2.length
    });
  }

  if (!cleanL1.startsWith('1 ') || !cleanL2.startsWith('2 ')) {
    throw new TleValidationError('Строка 1 должна начинаться с "1 ", а строка 2 — с "2 "');
  }

  const expectedSum1 = parseInt(cleanL1[68], 10);
  const calculatedSum1 = calculateTLEChecksum(cleanL1);
  if (!isNaN(expectedSum1) && expectedSum1 !== calculatedSum1) {
    throw new TleValidationError(`Несовпадение контрольной суммы строки 1: ожидалось ${expectedSum1}, получено ${calculatedSum1}`);
  }

  const expectedSum2 = parseInt(cleanL2[68], 10);
  const calculatedSum2 = calculateTLEChecksum(cleanL2);
  if (!isNaN(expectedSum2) && expectedSum2 !== calculatedSum2) {
    throw new TleValidationError(`Несовпадение контрольной суммы строки 2: ожидалось ${expectedSum2}, получено ${calculatedSum2}`);
  }

  return true;
}

/**
 * Безопасное сохранение данных в LocalStorage с защитой от QuotaExceededError
 * Стратегия: Graceful Degradation
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e: unknown) {
    if (e instanceof DOMException && (
      e.code === 22 ||
      e.code === 1014 ||
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      // Пытаемся освободить место: очищаем временные кэши
      try {
        localStorage.removeItem('orbitwatch_tle_cache_temp');
        localStorage.setItem(key, value);
        return true;
      } catch {
        throw new StorageQuotaError('Превышен лимит хранилища LocalStorage (5MB)', { key });
      }
    }
    return false;
  }
}

export function safeStorageSetItem(key: string, value: string): boolean {
  return safeLocalStorageSet(key, value);
}

export function safeStorageGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
