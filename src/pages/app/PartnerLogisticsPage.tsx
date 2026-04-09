import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { MetricCard, SectionFrame } from '@/components/partner/PartnerUi'

export function PartnerLogisticsPage() {
  const { data } = usePartnerPageData()

  return (
    <SectionFrame eyebrow="Logistica" title="Execucao operacional">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Preparo medio" value={data.logistics.averagePrepTime} helper="Acompanha a rapidez da cozinha." />
        <MetricCard label="Pontualidade" value={data.logistics.onTimeRate} helper="Pedidos dentro da janela prometida." />
        <MetricCard label="Modo de entrega" value={data.logistics.courierMode} helper="Estrutura atual de distribuicao." />
      </div>
    </SectionFrame>
  )
}
