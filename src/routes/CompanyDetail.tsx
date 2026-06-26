import { type JSX } from 'react'
import { useParams } from 'react-router-dom'
import CompanyProfile from '../components/CompanyProfile'
import { useCompanyProfile } from '../lib/use-company-profile'
import './CompanyDetail.css'

export default function CompanyDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const state = useCompanyProfile(id)

  if (state.status === 'loading') {
    return <CompanyProfileSkeleton />
  }

  if (state.status === 'notFound') {
    return (
      <div className="cd-empty">
        <h1>Nie znaleziono firmy</h1>
        <p>Firma o tym identyfikatorze nie istnieje lub nie jest dostępna.</p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="cd-empty">
        <h1>Nie udało się wczytać profilu</h1>
        <p>Spróbuj odświeżyć stronę.</p>
      </div>
    )
  }

  return <CompanyProfile data={state.data} />
}

function CompanyProfileSkeleton(): JSX.Element {
  return (
    <div className="cd-skeleton" aria-busy="true" aria-label="Ładowanie profilu firmy">
      <div className="cd-skeleton-hero">
        <div className="cd-skeleton-logo" />
        <div className="cd-skeleton-lines">
          <div className="cd-skeleton-line cd-skeleton-line--sm" />
          <div className="cd-skeleton-line cd-skeleton-line--lg" />
          <div className="cd-skeleton-line cd-skeleton-line--md" />
        </div>
      </div>
      <div className="cd-skeleton-block" />
      <div className="cd-skeleton-block" />
    </div>
  )
}
