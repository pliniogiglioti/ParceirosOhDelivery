import { MapPin, Navigation } from 'lucide-react'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { cn, formatCurrency } from '@/lib/utils'
import { SectionFrame } from '@/components/partner/PartnerUi'

const STORE_ADDRESS = {
  street: 'Rua das Flores, 142',
  neighborhood: 'Vila Mariana',
  city: 'São Paulo',
  state: 'SP',
  zip: '04110-000',
}

function SimulatedMap() {
  const cx = 260
  const cy = 210

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#e8edf2]" style={{ height: 340 }}>
      <svg
        viewBox="0 0 520 340"
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width="520" height="340" fill="#e8edf2" />

        {/* Blocks */}
        <rect x="20"  y="20"  width="110" height="80"  rx="4" fill="#d6dde6" />
        <rect x="150" y="20"  width="80"  height="55"  rx="4" fill="#d6dde6" />
        <rect x="250" y="20"  width="100" height="60"  rx="4" fill="#d6dde6" />
        <rect x="370" y="20"  width="130" height="90"  rx="4" fill="#d6dde6" />
        <rect x="20"  y="120" width="70"  height="100" rx="4" fill="#d6dde6" />
        <rect x="110" y="110" width="90"  height="70"  rx="4" fill="#d6dde6" />
        <rect x="220" y="100" width="60"  height="80"  rx="4" fill="#d6dde6" />
        <rect x="330" y="120" width="80"  height="60"  rx="4" fill="#d6dde6" />
        <rect x="430" y="130" width="90"  height="75"  rx="4" fill="#d6dde6" />
        <rect x="20"  y="240" width="90"  height="80"  rx="4" fill="#d6dde6" />
        <rect x="130" y="250" width="110" height="70"  rx="4" fill="#d6dde6" />
        <rect x="300" y="230" width="90"  height="90"  rx="4" fill="#d6dde6" />
        <rect x="410" y="240" width="110" height="80"  rx="4" fill="#d6dde6" />

        {/* Roads */}
        {/* Horizontal */}
        <rect x="0"   y="108" width="520" height="10" fill="#ffffff" opacity="0.9" />
        <rect x="0"   y="228" width="520" height="10" fill="#ffffff" opacity="0.9" />
        <rect x="0"   y="80"  width="520" height="6"  fill="#f0f3f7" />
        {/* Vertical */}
        <rect x="100" y="0"   width="10"  height="340" fill="#ffffff" opacity="0.9" />
        <rect x="210" y="0"   width="10"  height="340" fill="#ffffff" opacity="0.9" />
        <rect x="320" y="0"   width="10"  height="340" fill="#ffffff" opacity="0.9" />
        <rect x="420" y="0"   width="8"   height="340" fill="#f0f3f7" />
        {/* Diagonal avenue */}
        <line x1="0" y1="340" x2="200" y2="108" stroke="#ffffff" strokeWidth="9" opacity="0.8" />

        {/* Delivery area circle */}
        <circle
          cx={cx}
          cy={cy}
          r="140"
          fill="rgba(59,130,246,0.12)"
          stroke="rgba(59,130,246,0.55)"
          strokeWidth="2"
          strokeDasharray="8 4"
        />

        {/* Store pin shadow */}
        <ellipse cx={cx} cy={cy + 20} rx="10" ry="4" fill="rgba(0,0,0,0.15)" />

        {/* Store pin */}
        <circle cx={cx} cy={cy} r="12" fill="#EA1D2C" />
        <circle cx={cx} cy={cy} r="5"  fill="#ffffff" />

        {/* Road labels */}
        <text x="106" y="105" fontSize="7" fill="#9ba8b5" fontFamily="sans-serif">Av. Paulista</text>
        <text x="216" y="105" fontSize="7" fill="#9ba8b5" fontFamily="sans-serif">R. das Flores</text>
        <text x="50"  y="120" fontSize="7" fill="#9ba8b5" fontFamily="sans-serif" transform="rotate(-90,50,120)">Rua Verde</text>
      </svg>

      {/* Zoom hint */}
      <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-xl bg-white/80 px-2.5 py-1.5 text-[11px] font-medium text-ink-600 backdrop-blur-sm">
        <Navigation className="h-3 w-3 text-blue-500" />
        Simulação de área
      </span>
    </div>
  )
}

export function PartnerDeliveryAreasPage() {
  const { data } = usePartnerPageData()

  return (
    <SectionFrame eyebrow="Areas" title="Cobertura de entrega">
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">

        {/* Map */}
        <div className="panel-card overflow-hidden p-0">
          <SimulatedMap />

          {/* Areas list below map */}
          <div className="grid grid-cols-2 gap-px border-t border-ink-100 bg-ink-100 sm:grid-cols-3">
            {data.deliveryAreas.map((area) => (
              <div key={area.id} className="flex flex-col gap-1 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-ink-900">{area.name}</p>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      area.active ? 'bg-mint-100 text-mint-700' : 'bg-coral-100 text-coral-700'
                    )}
                  >
                    {area.active ? 'Ativa' : 'Pausada'}
                  </span>
                </div>
                <p className="text-xs text-ink-400">{area.etaLabel}</p>
                <p className="text-sm font-bold text-ink-900">{formatCurrency(area.fee)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Address panel */}
        <div className="flex flex-col gap-4">
          <div className="panel-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Loja</p>
            <p className="mt-2 font-display text-base font-bold text-ink-900">{data.store.name}</p>

            <div className="mt-4 flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-coral-500" />
              <div className="text-sm text-ink-600 leading-relaxed">
                <p className="font-medium text-ink-900">{STORE_ADDRESS.street}</p>
                <p>{STORE_ADDRESS.neighborhood}</p>
                <p>{STORE_ADDRESS.city} – {STORE_ADDRESS.state}</p>
                <p className="mt-1 text-xs text-ink-400">CEP {STORE_ADDRESS.zip}</p>
              </div>
            </div>
          </div>

          <div className="panel-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Cobertura</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-blue-400 bg-blue-100" />
              <p className="text-sm text-ink-600">Raio de entrega ativo</p>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-ink-900">
              {data.deliveryAreas.filter((a) => a.active).length}
              <span className="ml-1.5 text-base font-medium text-ink-400">
                / {data.deliveryAreas.length} zonas
              </span>
            </p>
            <p className="mt-1 text-xs text-ink-400">zonas ativas no momento</p>
          </div>
        </div>
      </div>
    </SectionFrame>
  )
}
