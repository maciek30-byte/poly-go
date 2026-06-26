import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from './supabase'
import { useAuthStore } from './auth-store'

export type FavoriteState = {
  isFavorite: boolean
  toggle: () => void
  pending: boolean
}

// Czy bieżący user ma daną firmę w ulubionych + przełączanie z optimistic UI.
// RLS (`favorites_own`) sam zawęża SELECT/INSERT/DELETE do `user_id = auth.uid()`,
// więc nie podajemy user_id jawnie przy odczycie; przy zapisie podajemy go z sesji.
export function useFavorite(companyId: string | undefined): FavoriteState {
  const userId = useAuthStore((s) => s.user?.id ?? null)

  const [isFavorite, setIsFavorite] = useState(false)
  const [pending, setPending] = useState(false)

  // Token sekwencji chroni przed wyścigiem przy zmianie firmy/usera — starsza
  // odpowiedź, która dojedzie później, nie nadpisze świeższego stanu
  // (wzorzec z auth-store.ts / use-company-profile.ts).
  useEffect(() => {
    let active = true

    void (async () => {
      if (!companyId || !userId) {
        if (active) setIsFavorite(false)
        return
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('company_id', companyId)
        .maybeSingle()

      if (!active) return
      // Błąd odczytu = traktujemy jak "nie ulubione" (reset stanu po zmianie firmy).
      setIsFavorite(!error && data != null)
    })()

    return () => {
      active = false
    }
  }, [companyId, userId])

  function toggle(): void {
    if (!companyId || !userId || pending) return

    const next = !isFavorite
    setIsFavorite(next) // optimistic flip
    setPending(true)

    void (async () => {
      const { error } = next
        ? await supabase
            .from('favorites')
            .upsert({ user_id: userId, company_id: companyId }, { onConflict: 'user_id,company_id' })
        : await supabase.from('favorites').delete().eq('company_id', companyId)

      setPending(false)

      if (error) {
        setIsFavorite(!next) // rollback do poprzedniego stanu
        toast.error('Nie udało się zapisać ulubionych. Spróbuj ponownie.')
      }
    })()
  }

  return { isFavorite, toggle, pending }
}
