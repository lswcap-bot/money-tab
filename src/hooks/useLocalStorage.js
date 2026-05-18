import { useState } from 'react';

const PREFIX = 'mt_';

/**
 * useState backed by localStorage. Reads initial value from storage on mount;
 * writes on every set call. Gracefully falls back to `initial` on errors.
 */
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(PREFIX + key);
      return item !== null ? JSON.parse(item) : initial;
    } catch {
      return initial;
    }
  });

  function set(newValue) {
    setValue(newValue);
    try { localStorage.setItem(PREFIX + key, JSON.stringify(newValue)); } catch {}
  }

  return [value, set];
}
