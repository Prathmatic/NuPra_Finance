export interface ExchangeRateData {
  base: 'EUR';
  target: 'INR';
  rate: number;
  date: string;
  lastFetched: number;
  source: string;
  isCustom?: boolean;
  customRate?: number;
}

const STORAGE_KEY_RATE_CACHE = 'nupra_exchange_rate_cache_v2';
const STORAGE_KEY_CUSTOM_RATE = 'nupra_custom_rate_override_v2';

// 12-hour cache expiration for standard ECB daily updates
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

// Hardcoded reliable fallback in case first launch is completely offline
const DEFAULT_FALLBACK_RATE: ExchangeRateData = {
  base: 'EUR',
  target: 'INR',
  rate: 108.12,
  date: new Date().toISOString().split('T')[0],
  lastFetched: Date.now(),
  source: 'ECB Reference (Default)',
};

/**
 * Load cached or custom exchange rate data synchronously from localStorage
 */
export const getSavedExchangeRate = (): ExchangeRateData => {
  try {
    const customRateRaw = localStorage.getItem(STORAGE_KEY_CUSTOM_RATE);
    const customRateNum = customRateRaw ? parseFloat(customRateRaw) : NaN;

    const cachedRaw = localStorage.getItem(STORAGE_KEY_RATE_CACHE);
    let baseData: ExchangeRateData = DEFAULT_FALLBACK_RATE;

    if (cachedRaw) {
      try {
        const parsed = JSON.parse(cachedRaw);
        if (parsed && typeof parsed.rate === 'number' && parsed.rate > 0) {
          baseData = parsed;
        }
      } catch (parseErr) {
        console.warn('Failed to parse cached exchange rate:', parseErr);
      }
    }

    if (!isNaN(customRateNum) && customRateNum > 0) {
      return {
        ...baseData,
        rate: customRateNum,
        isCustom: true,
        customRate: customRateNum,
        source: 'Custom Override',
      };
    }

    return baseData;
  } catch {
    return DEFAULT_FALLBACK_RATE;
  }
};

/**
 * Fetch live EUR -> INR exchange rate from official ECB mirror (Frankfurter)
 * with graceful fallback to Open Exchange Rates API.
 */
export const fetchLiveExchangeRate = async (forceRefresh = false): Promise<ExchangeRateData> => {
  const currentSaved = getSavedExchangeRate();

  // If we already have fresh cached data and no force-refresh was requested
  if (!forceRefresh && !currentSaved.isCustom) {
    const isFresh = Date.now() - currentSaved.lastFetched < CACHE_TTL_MS;
    if (isFresh && currentSaved.rate > 0) {
      return currentSaved;
    }
  }

  // 1. Try Frankfurter (Official European Central Bank mirror)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=INR', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const inrRate = data?.rates?.INR;
      if (typeof inrRate === 'number' && inrRate > 0) {
        const newData: ExchangeRateData = {
          base: 'EUR',
          target: 'INR',
          rate: Math.round(inrRate * 100) / 100,
          date: data.date || new Date().toISOString().split('T')[0],
          lastFetched: Date.now(),
          source: 'ECB (Frankfurter)',
        };

        // Persist to cache
        try {
          localStorage.setItem(STORAGE_KEY_RATE_CACHE, JSON.stringify(newData));
        } catch (e) {
          console.warn('Unable to cache exchange rate to localStorage:', e);
        }

        // If user has a custom override set, retain the override in the returned state
        const customRateRaw = localStorage.getItem(STORAGE_KEY_CUSTOM_RATE);
        const customRateNum = customRateRaw ? parseFloat(customRateRaw) : NaN;
        if (!isNaN(customRateNum) && customRateNum > 0) {
          return {
            ...newData,
            rate: customRateNum,
            isCustom: true,
            customRate: customRateNum,
            source: 'Custom Override',
          };
        }

        return newData;
      }
    }
  } catch (err) {
    console.warn('Frankfurter ECB API request failed or timed out, trying fallback API:', err);
  }

  // 2. Fallback to Open Exchange API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('https://open.er-api.com/v6/latest/EUR', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const inrRate = data?.rates?.INR;
      if (typeof inrRate === 'number' && inrRate > 0) {
        const newData: ExchangeRateData = {
          base: 'EUR',
          target: 'INR',
          rate: Math.round(inrRate * 100) / 100,
          date: new Date().toISOString().split('T')[0],
          lastFetched: Date.now(),
          source: 'Open Exchange Rates',
        };

        try {
          localStorage.setItem(STORAGE_KEY_RATE_CACHE, JSON.stringify(newData));
        } catch (e) {
          console.warn('Unable to cache fallback exchange rate:', e);
        }

        const customRateRaw = localStorage.getItem(STORAGE_KEY_CUSTOM_RATE);
        const customRateNum = customRateRaw ? parseFloat(customRateRaw) : NaN;
        if (!isNaN(customRateNum) && customRateNum > 0) {
          return {
            ...newData,
            rate: customRateNum,
            isCustom: true,
            customRate: customRateNum,
            source: 'Custom Override',
          };
        }

        return newData;
      }
    }
  } catch (err) {
    console.warn('Open Exchange Rates fallback API failed:', err);
  }

  // 3. Fallback to cached or default
  return currentSaved;
};

/**
 * Set a manual custom exchange rate override (e.g., user wants to lock 109.50)
 */
export const setCustomRateOverride = (customRate: number): ExchangeRateData => {
  if (customRate <= 0 || isNaN(customRate)) {
    throw new Error('Exchange rate must be a positive number');
  }

  const roundedRate = Math.round(customRate * 100) / 100;
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_RATE, roundedRate.toString());
  } catch (e) {
    console.warn('Unable to save custom rate override to localStorage:', e);
  }

  const cached = getSavedExchangeRate();
  return {
    ...cached,
    rate: roundedRate,
    isCustom: true,
    customRate: roundedRate,
    source: 'Custom Override',
  };
};

/**
 * Clear custom rate override and revert back to live ECB market rate
 */
export const clearCustomRateOverride = (): ExchangeRateData => {
  try {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_RATE);
  } catch (e) {
    console.warn('Unable to clear custom rate override from localStorage:', e);
  }
  return getSavedExchangeRate();
};
