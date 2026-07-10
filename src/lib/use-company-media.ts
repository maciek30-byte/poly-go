import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from './supabase'
import type { Database } from './database.types'

type CompanyMediaRow = Database['public']['Tables']['company_media']['Row']
type MediaType = Database['public']['Enums']['media_type_enum']

const BUCKET = 'company-media'
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_PER_TYPE = 5
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const PDF_TYPE = 'application/pdf'

export type UploadKind = 'logo' | 'photo' | 'document'

export type CompanyMediaApi = {
  uploading: boolean
  // Zwraca true przy sukcesie; przy błędzie zwraca false i ustawia `error`.
  upload: (kind: UploadKind, file: File, currentCount: number) => Promise<boolean>
  remove: (media: CompanyMediaRow) => Promise<boolean>
  removeLogo: (logoUrl: string | null) => Promise<boolean>
  error: string | null
}

type ValidationProblem =
  | { key: 'tooLarge' | 'notPdf' | 'notImage' }
  | { key: 'limitReached'; params: { max: number } }

// Walidacja klienta — bucket i tak wymusza typ/rozmiar, ale lokalna walidacja
// daje czytelny komunikat zanim poleci request.
function validate(kind: UploadKind, file: File, currentCount: number): ValidationProblem | null {
  if (file.size > MAX_BYTES) return { key: 'tooLarge' }
  if (kind === 'document') {
    if (file.type !== PDF_TYPE) return { key: 'notPdf' }
  } else if (!IMAGE_TYPES.includes(file.type)) {
    return { key: 'notImage' }
  }
  if (kind !== 'logo' && currentCount >= MAX_PER_TYPE) {
    return { key: 'limitReached', params: { max: MAX_PER_TYPE } }
  }
  return null
}

// Wyciąga ścieżkę obiektu w buckecie z public URL (do usunięcia ze Storage).
// Public URL ma postać .../object/public/company-media/{path}.
function pathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  return i === -1 ? null : url.slice(i + marker.length)
}

export function useCompanyMedia(companyId: string): CompanyMediaApi {
  const { t } = useTranslation('media')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(kind: UploadKind, file: File, currentCount: number): Promise<boolean> {
    setError(null)
    const problem = validate(kind, file, currentCount)
    if (problem) {
      setError('params' in problem ? t(problem.key, problem.params) : t(problem.key))
      return false
    }

    setUploading(true)
    try {
      // Ścieżka zaczyna się od {company_id} — pierwszy folder steruje polityką
      // Storage (zapis tylko do własnego prefiksu). Nazwa unikalna przez timestamp.
      const safeName = file.name.replace(/[^\w.-]+/g, '_')
      const folder = kind === 'logo' ? 'logo' : kind === 'photo' ? 'photos' : 'documents'
      const path = `${companyId}/${folder}/${Date.now()}_${safeName}`

      const up = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
      if (up.error) {
        setError(t('uploadFailed'))
        return false
      }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const fileUrl = pub.publicUrl

      if (kind === 'logo') {
        const updated = await supabase.from('companies').update({ logo_url: fileUrl }).eq('id', companyId)
        if (updated.error) {
          setError(t('logoSetFailed'))
          return false
        }
      } else {
        const mediaType: MediaType = kind === 'photo' ? 'PHOTO' : 'DOCUMENT'
        const inserted = await supabase.from('company_media').insert({
          company_id: companyId,
          media_type: mediaType,
          file_url: fileUrl,
          file_name: file.name,
        })
        if (inserted.error) {
          setError(t('entrySaveFailed'))
          return false
        }
      }

      return true
    } finally {
      setUploading(false)
    }
  }

  async function remove(media: CompanyMediaRow): Promise<boolean> {
    setError(null)
    const del = await supabase.from('company_media').delete().eq('id', media.id)
    if (del.error) {
      setError(t('deleteFailed'))
      return false
    }
    const path = pathFromPublicUrl(media.file_url)
    if (path) {
      // Best-effort: wiersz już usunięty; błąd kasowania obiektu nie blokuje.
      await supabase.storage.from(BUCKET).remove([path])
    }
    return true
  }

  async function removeLogo(logoUrl: string | null): Promise<boolean> {
    setError(null)
    const updated = await supabase.from('companies').update({ logo_url: null }).eq('id', companyId)
    if (updated.error) {
      setError(t('logoDeleteFailed'))
      return false
    }
    const path = logoUrl ? pathFromPublicUrl(logoUrl) : null
    if (path) {
      await supabase.storage.from(BUCKET).remove([path])
    }
    return true
  }

  return { uploading, upload, remove, removeLogo, error }
}
