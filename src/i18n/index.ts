import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import common from '@/locales/pl/common.json'
import auth from '@/locales/pl/auth.json'
import company from '@/locales/pl/company.json'
import profile from '@/locales/pl/profile.json'
import validation from '@/locales/pl/validation.json'
import media from '@/locales/pl/media.json'
import errors from '@/locales/pl/errors.json'

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
