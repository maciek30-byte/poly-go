import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'

import pl from './pl'

void i18n.use(initReactI18next).init({
  resources: { pl },
  lng: 'pl',
  fallbackLng: 'pl',
  supportedLngs: ['pl'],
  defaultNS: 'translation',
  ns: ['translation'],
  // i18next v26 renamed `initImmediate` → `initAsync` (inverted semantics).
  // `false` = resolve on this tick. Required so `t()` is callable immediately
  // after `init()` returns — the layout shell renders before the first event
  // loop turn and must already have translations.
  initAsync: false,
  interpolation: { escapeValue: false },
  returnNull: false,
})

export default i18n
export { useTranslation }
