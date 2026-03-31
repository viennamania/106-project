"use client";

import { useEffect } from "react";

import { localeCookieName, type Locale } from "@/lib/i18n";

export function LocaleSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.cookie = `${localeCookieName}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);

  return null;
}
