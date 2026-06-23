import { useParams } from 'react-router-dom'
import { ComingSoon } from '../components/ComingSoon'

export default function Chat() {
  const { companyId } = useParams<{ companyId: string }>()
  return <ComingSoon title={`Chat ${companyId ?? ''}`} />
}
