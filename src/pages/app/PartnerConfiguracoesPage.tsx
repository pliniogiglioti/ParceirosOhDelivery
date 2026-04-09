import { PartnerOrderSettingsPanel } from '@/components/partner/PartnerOrderSettingsPanel'
import { SectionFrame } from '@/components/partner/PartnerUi'

export function PartnerConfiguracoesPage() {
  return (
    <SectionFrame eyebrow="Configuracoes" title="Ajustes operacionais">
      <PartnerOrderSettingsPanel />
    </SectionFrame>
  )
}
