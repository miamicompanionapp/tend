import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { Lang } from "../types";
import { translations, type Strings } from "./translations";

const LANG_KEY = "tend.language";

export function loadLang(): Lang | null {
  const raw = localStorage.getItem(LANG_KEY);
  return raw === "en" || raw === "tr" ? raw : null;
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Strings;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => loadLang() ?? "en");

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(LANG_KEY, l);
  }, []);

  const value: LanguageContextValue = { lang, setLang, t: translations[lang] };
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
