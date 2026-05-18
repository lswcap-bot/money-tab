import { useState } from 'react';
import { fmtKRW } from '../utils/taxCalculations.js';

const LS_PREFIX = 'mt_';

/**
 * Manages a numeric input with comma-formatted display.
 * Pass `storageKey` to persist the value in localStorage across sessions.
 * Returns [numericValue, displayString, onChangeHandler]
 */
export function useFormattedNumber(initial = 0, storageKey = null) {
  const initVal = (() => {
    if (!storageKey) return initial;
    try {
      const stored = localStorage.getItem(LS_PREFIX + storageKey);
      return stored !== null ? (Number(stored) || initial) : initial;
    } catch {
      return initial;
    }
  })();

  const [value,   setValue]   = useState(initVal);
  const [display, setDisplay] = useState(initVal > 0 ? fmtKRW(initVal) : '');

  function onChange(e) {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const num = Number(raw) || 0;
    setValue(num);
    if (storageKey) {
      try { localStorage.setItem(LS_PREFIX + storageKey, String(num)); } catch {}
    }
    setDisplay(raw === '' ? '' : fmtKRW(num));
  }

  return [value, display, onChange];
}
