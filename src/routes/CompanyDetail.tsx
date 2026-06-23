import { useParams } from 'react-router-dom'
import { ComingSoon } from '../components/ComingSoon'

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>()
  return <ComingSoon title={`Firma ${id ?? ''}`} />
}
