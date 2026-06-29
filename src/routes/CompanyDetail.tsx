import { type JSX } from 'react'
import { useParams } from 'react-router-dom'
import CompanyProfile from '../components/CompanyProfile'
import { useCompanyProfile } from '../lib/use-company-profile'
import { Skeleton } from '@/components/ui/skeleton'

export default function CompanyDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const state = useCompanyProfile(id)

  if (state.status === 'loading') {
    return <CompanyProfileSkeleton />
  }

  if (state.status === 'notFound') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-18 text-center">
        <h1 className="text-heading text-text-strong">Nie znaleziono firmy</h1>
        <p className="text-text-muted">Firma o tym identyfikatorze nie istnieje lub nie jest dostępna.</p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-18 text-center">
        <h1 className="text-heading text-text-strong">Nie udało się wczytać profilu</h1>
        <p className="text-text-muted">Spróbuj odświeżyć stronę.</p>
      </div>
    )
  }

  return <CompanyProfile data={state.data} />
}

function CompanyProfileSkeleton(): JSX.Element {
  return (
    <div className="p-10 max-md:px-5 max-md:py-6" aria-busy="true" aria-label="Ładowanie profilu firmy">
      <div className="flex items-start gap-5 mb-10">
        <Skeleton className="size-20 rounded-xl shrink-0" />
        <div className="flex flex-1 flex-col gap-3 max-w-[480px]">
          <Skeleton className="h-4 w-[30%] rounded-sm" />
          <Skeleton className="h-7 w-[80%] rounded-sm" />
          <Skeleton className="h-4 w-[55%] rounded-sm" />
        </div>
      </div>
      <Skeleton className="h-[140px] rounded-lg mb-4" />
      <Skeleton className="h-[140px] rounded-lg mb-4" />
    </div>
  )
}
