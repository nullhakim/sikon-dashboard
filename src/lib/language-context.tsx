import React, { createContext, useContext, useEffect, useState } from "react";
import { translations, type Language, type TranslationKey } from "./i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "sikon_language_preference";

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("id");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem(STORAGE_KEY) as Language;
      if (savedLang === "id" || savedLang === "en") {
        setLanguageState(savedLang);
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    const dict = translations[language] || translations["id"];
    const text = dict[key];
    if (text) return text;
    // Fallback to ID dictionary if not found in current language
    const idText = translations.id[key];
    if (idText) return idText;
    return fallback ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Provide safe fallback if used outside provider
    return {
      language: "id",
      setLanguage: () => {},
      t: (key: TranslationKey, fallback?: string) => translations.id[key] ?? fallback ?? key,
    };
  }
  return context;
};
