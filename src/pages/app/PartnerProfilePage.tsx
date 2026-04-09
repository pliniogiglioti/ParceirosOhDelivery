import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { SectionFrame } from '@/components/partner/PartnerUi'

export function PartnerProfilePage() {
  const { data } = usePartnerPageData()

  return (
    <SectionFrame eyebrow="Perfil" title="Usuario responsavel">
      <div className="panel-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-coral-50 text-2xl font-bold text-coral-700">
            {data.profile.name.slice(0, 1)}
          </div>
          <div>
            <p className="text-xl font-bold text-ink-900">{data.profile.name}</p>
            <p className="mt-1 text-sm text-ink-500">{data.profile.email}</p>
            <p className="mt-1 text-sm text-ink-500">{data.profile.role}</p>
          </div>
        </div>
      </div>
    </SectionFrame>
  )
}
