import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { formatDateTime } from '@/lib/utils'
import { MetricCard, SectionFrame } from '@/components/partner/PartnerUi'

export function PartnerSupportPage() {
  const { data } = usePartnerPageData()

  return (
    <SectionFrame eyebrow="Suporte" title="Atendimento e conversas">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Conversas abertas" value={String(data.support.openChats)} helper="Baseado em chat_sessions quando disponivel." />
        <MetricCard label="Mensagens pendentes" value={String(data.support.unreadMessages)} helper="Contagem de mensagens do cliente." />
        <MetricCard label="Ultima atualizacao" value={formatDateTime(data.support.lastUpdateAt)} helper="Ajuda a priorizar retorno rapido." />
      </div>
    </SectionFrame>
  )
}
