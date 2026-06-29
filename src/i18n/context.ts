import { enUS } from './translations/en-US';

// The app is English (US) only. This module keeps a lightweight `t(key)` lookup
// so existing `t('some.key')` call sites continue to resolve their strings from
// the single English dictionary. There is no multi-language/runtime-switching
// system anymore.

type TranslationDict = Record<string, any>;

function getNestedValue(obj: TranslationDict, path: string): string | undefined {
  if (obj[path] !== undefined && typeof obj[path] === 'string') {
    return obj[path];
  }

  const keys = path.split('.');

  function lookup(currentObj: any, keyIndex: number): string | undefined {
    if (currentObj === undefined || currentObj === null) return undefined;
    if (keyIndex >= keys.length) {
      return typeof currentObj === 'string' ? currentObj : undefined;
    }

    for (let i = keys.length - 1; i >= keyIndex; i--) {
      const combinedKey = keys.slice(keyIndex, i + 1).join('.');
      const val = currentObj[combinedKey];
      if (val !== undefined) {
        if (i === keys.length - 1) {
          if (typeof val === 'string') return val;
        } else {
          const res = lookup(val, i + 1);
          if (res !== undefined) return res;
        }
      }
    }
    return undefined;
  }

  return lookup(obj, 0);
}

/** Resolve a dotted translation key to its English string (or the key itself). */
export function t(key: string): string {
  const value = getNestedValue(enUS, key);
  return value !== undefined ? value : key;
}

/** Hook form kept for compatibility with existing `const t = useT()` call sites. */
export function useT() {
  return t;
}
