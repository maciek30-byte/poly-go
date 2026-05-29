import type pl from './pl'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: typeof pl
  }
}
