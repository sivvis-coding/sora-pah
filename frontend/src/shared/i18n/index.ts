import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Shared (default namespace)
import sharedEn from './locales/en.json';
import sharedEs from './locales/es.json';

// Feature namespaces — each feature owns its translations
import authEn from '../../features/auth/i18n/en.json';
import authEs from '../../features/auth/i18n/es.json';
import productsEn from '../../features/products/i18n/en.json';
import productsEs from '../../features/products/i18n/es.json';
import usersEn from '../../features/users/i18n/en.json';
import usersEs from '../../features/users/i18n/es.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    defaultNS: 'shared',
    ns: ['shared', 'auth', 'products', 'users'],
    resources: {
      en: {
        shared: sharedEn,
        auth: authEn,
        products: productsEn,
        users: usersEn,
      },
      es: {
        shared: sharedEs,
        auth: authEs,
        products: productsEs,
        users: usersEs,
      },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'sora_lang',
    },
  });

export default i18n;
