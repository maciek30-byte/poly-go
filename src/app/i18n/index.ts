import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import common from '@/shared/locales/pl/common.json'
import validation from '@/shared/locales/pl/validation.json'
import errors from '@/shared/locales/pl/errors.json'
import auth from '@/features/auth/locales/pl/auth.json'
import company from '@/features/company/locales/pl/company.json'
import media from '@/features/company/locales/pl/media.json'
import profile from '@/features/profile/locales/pl/profile.json'

export const defaultNS = 'common'

export const resources = {
  pl: { common, auth, company, profile, validation, media, errors },
} as const

void i18n.use(initReactI18next).init({
  resources,
  lng: 'pl',
  fallbackLng: 'pl',
  defaultNS,
  ns: ['common', 'auth', 'company', 'profile', 'validation', 'media', 'errors'],
  interpolation: { escapeValue: false },
})

export default i18n
