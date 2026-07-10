import { type JSX } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CompanyProfile from '@/shared/components/CompanyProfile'
import { useCompanyProfile } from '@/shared/data/company/use-company-profile'
import { Skeleton } from '@/shared/ui/skeleton'

export default function CompanyDetail(): JSX.Element {
  const { t } = useTranslation('company')
  const { id } = useParams<{ id: string }>()
  const state = useCompanyProfile(id)

  if (state.status === 'loading') {
    return <CompanyProfileSkeleton />
  }

  if (state.status === 'notFound') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-18 text-center">
        <h1 className="text-heading text-text-strong">{t('detail.notFoundTitle')}</h1>
        <p className="text-text-muted">{t('detail.notFoundBody')}</p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-18 text-center">
        <h1 className="text-heading text-text-strong">{t('detail.errorTitle')}</h1>
        <p className="text-text-muted">{t('detail.errorBody')}</p>
      </div>
    )
  }

  return <CompanyProfile data={state.data} />
}

function CompanyProfileSkeleton(): JSX.Element {
  const { t } = useTranslation('company')
  return (
    <div className="p-10 max-md:px-5 max-md:py-6" aria-busy="true" aria-label={t('detail.loadingAria')}>
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
