import { createContext, useContext, useEffect, useState } from 'react';
import { type Language, type Translations, TRANSLATIONS } from './translations';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): Language {
  const stored = localStorage.getItem('language') as Language | null;
  if (stored === 'en' || stored === 'es') return stored;
  // Auto-detect from browser locale
  return navigator.language.startsWith('es') ? 'es' : 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  }

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: TRANSLATIONS[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used inside LanguageProvider');
  return ctx;
}
