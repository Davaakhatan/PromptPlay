/**
 * useLocalization Hook
 * React hook for internationalization
 */

import { useState, useEffect, useCallback } from 'react';
import { i18n, Locale, LocaleInfo, SUPPORTED_LOCALES } from '../services/LocalizationService';

export function useLocalization() {
  const [locale, setLocaleState] = useState<Locale>(i18n.getLocale());

  useEffect(() => {
    const unsubscribe = i18n.subscribe((newLocale) => {
      setLocaleState(newLocale);
    });
    return unsubscribe;
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return i18n.t(key, params);
  }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLocale = useCallback((newLocale: Locale) => {
    i18n.setLocale(newLocale);
  }, []);

  const getLocaleInfo = useCallback((): LocaleInfo => {
    return i18n.getLocaleInfo();
  }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    t,
    locale,
    setLocale,
    localeInfo: getLocaleInfo(),
    supportedLocales: SUPPORTED_LOCALES,
  };
}

export default useLocalization;
