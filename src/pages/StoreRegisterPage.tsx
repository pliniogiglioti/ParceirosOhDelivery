import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Loader2, MapPin } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import toast from 'react-hot-toast'
import { usePartnerAuth } from '@/hooks/usePartnerAuth'
import { getStoreCategories } from '@/services/profile'
import { registerStore } from '@/services/partner'
import type { StoreCategory, StoreRegistrationInput } from '@/types'

// Pin customizado na cor da marca
function createPin() {
  return L.divIcon({
    html: `<div style="width:22px;height:22px;background:#ea1d2c;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    className: '',
  })
}

function MapPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const initLat = lat ?? -23.5505
    const initLng = lng ?? -46.6333

    const map = L.map(containerRef.current, { zoomControl: true }).setView([initLat, initLng], lat ? 16 : 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    }).addTo(map)

    const marker = L.marker([initLat, initLng], { draggable: true, icon: createPin() }).addTo(map)

    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      onChangeRef.current(pos.lat, pos.lng)
    })

    map.on('click', (e) => {
      marker.setLatLng(e.latlng)
      onChangeRef.current(e.latlng.lat, e.latlng.lng)
    })

    mapRef.current = map
    markerRef.current = marker

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || lat === null || lng === null) return
    const latlng = L.latLng(lat, lng)
    markerRef.current.setLatLng(latlng)
    mapRef.current.setView(latlng, 16)
  }, [lat, lng])

  return (
    <div>
      <div ref={containerRef} className="h-[260px] w-full rounded-xl overflow-hidden border border-[#e0e0e0]" />
      <p className="mt-1.5 text-[11px] text-[#8b8b8b]">
        {lat && lng
          ? `Pino em ${lat.toFixed(5)}, ${lng.toFixed(5)} — arraste ou clique no mapa para ajustar`
          : 'Clique no mapa para posicionar o pino da loja'}
      </p>
    </div>
  )
}

const STEPS = ['Informações', 'Localização', 'Configurações']

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`h-9 w-9 rounded-full flex items-center justify-center text-[13px] font-bold transition-all ${
                i < current
                  ? 'bg-[#ea1d2c] text-white'
                  : i === current
                  ? 'bg-[#ea1d2c] text-white ring-4 ring-[#ea1d2c]/20'
                  : 'bg-[#f0f0f0] text-[#9a9a9a]'
              }`}
            >
              {i < current ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`text-[11px] font-semibold whitespace-nowrap ${
                i <= current ? 'text-[#1d1d1d]' : 'text-[#9a9a9a]'
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 mb-4 transition-all ${
                i < current ? 'bg-[#ea1d2c]' : 'bg-[#e5e5e5]'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

const inputClass =
  'h-[48px] w-full rounded-xl border border-[#d9d9d9] bg-[#fbfbfb] px-4 text-[14px] text-[#1d1d1d] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#ea1d2c] focus:bg-white focus:shadow-[0_0_0_4px_rgba(234,29,44,0.09)]'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-[#4f4f4f]">{label}</span>
      {children}
    </label>
  )
}

async function fetchViaCEP(cep: string) {
  const clean = cep.replace(/\D/g, '')
  if (clean.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
    const data = await res.json() as Record<string, string>
    if (data.erro) return null
    return data
  } catch {
    return null
  }
}

async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const params = new URLSearchParams({ q: query, format: 'json', limit: '1', countrycodes: 'br' })
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'OhDelivery/1.0' },
    })
    const data = await res.json() as Array<{ lat: string; lon: string }>
    if (!data.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

export function StoreRegisterPage() {
  const navigate = useNavigate()
  const { user, profile, selectStore } = usePartnerAuth()
  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)

  const [form, setForm] = useState<StoreRegistrationInput>({
    name: '',
    categoryId: '',
    categoryName: '',
    tagline: '',
    addressStreet: '',
    addressNumber: '',
    addressNeighborhood: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    lat: null,
    lng: null,
    deliveryFee: 0,
    etaMin: 30,
    etaMax: 50,
    pickupEta: 15,
    minOrderAmount: 0,
  })

  useEffect(() => {
    void getStoreCategories().then(setCategories)
  }, [])

  function set<K extends keyof StoreRegistrationInput>(key: K, value: StoreRegistrationInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleCategoryChange(categoryId: string) {
    const cat = categories.find((c) => c.id === categoryId)
    setForm((prev) => ({ ...prev, categoryId, categoryName: cat?.name ?? '' }))
  }

  async function handleCepBlur() {
    const cep = form.addressZip.replace(/\D/g, '')
    if (cep.length !== 8) return

    setCepLoading(true)
    try {
      const data = await fetchViaCEP(cep)
      if (!data) {
        toast.error('CEP não encontrado.')
        return
      }

      const street = data.logradouro ?? ''
      const neighborhood = data.bairro ?? ''
      const city = data.localidade ?? ''
      const state = data.uf ?? ''

      setForm((prev) => ({
        ...prev,
        addressStreet: street,
        addressNeighborhood: neighborhood,
        addressCity: city,
        addressState: state,
      }))

      // Geocodifica para posicionar o pino
      const query = `${street}, ${neighborhood}, ${city}, ${state}, Brasil`
      const coords = await geocodeAddress(query)
      if (coords) {
        setForm((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }))
      }
    } finally {
      setCepLoading(false)
    }
  }

  function validateStep(s: number): boolean {
    if (s === 0) {
      if (!form.name.trim()) { toast.error('Informe o nome da loja.'); return false }
      if (!form.categoryId) { toast.error('Selecione a categoria.'); return false }
    }
    if (s === 1) {
      if (!form.addressCity.trim()) { toast.error('Informe a cidade.'); return false }
    }
    return true
  }

  function handleNext() {
    if (!validateStep(step)) return
    setStep((s) => s + 1)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validateStep(2)) return
    if (!user || !profile) { toast.error('Sessão inválida.'); return }

    setSubmitting(true)
    try {
      const storeId = await registerStore(form, user.id, user.email, profile.name ?? user.name)
      selectStore(storeId)
      toast.success('Loja cadastrada! Aguarde a aprovação.')
      navigate('/lojas')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível cadastrar a loja.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f5]">
      <header className="bg-white border-b border-[#ececec] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <button
            type="button"
            onClick={() => step > 0 ? setStep((s) => s - 1) : navigate('/lojas')}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f5f5] text-[#686868] transition hover:bg-[#ececec]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="font-bold text-[#1d1d1d]">Cadastrar nova loja</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Stepper current={step} />

        <form onSubmit={(e) => void handleSubmit(e)}>
          {/* Step 1 — Informações básicas */}
          {step === 0 && (
            <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4 animate-rise">
              <Field label="Nome da loja *">
                <input
                  type="text"
                  placeholder="Ex: Burger do Zé"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className={inputClass}
                  autoFocus
                />
              </Field>

              <Field label="Categoria *">
                <div className="relative">
                  <select
                    value={form.categoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b8b8b]" />
                </div>
              </Field>

              <Field label="Slogan (opcional)">
                <input
                  type="text"
                  placeholder="Ex: O melhor burger da cidade"
                  value={form.tagline}
                  onChange={(e) => set('tagline', e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          )}

          {/* Step 2 — Localização */}
          {step === 1 && (
            <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4 animate-rise">
              <Field label="CEP *">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="00000-000"
                    value={form.addressZip}
                    onChange={(e) => set('addressZip', e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9))}
                    onBlur={() => void handleCepBlur()}
                    className={inputClass}
                    autoFocus
                  />
                  {cepLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#ea1d2c]" />
                  )}
                </div>
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Field label="Rua">
                    <input
                      type="text"
                      placeholder="Preenchido pelo CEP"
                      value={form.addressStreet}
                      onChange={(e) => set('addressStreet', e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Field label="Número">
                  <input
                    type="text"
                    placeholder="123"
                    value={form.addressNumber}
                    onChange={(e) => set('addressNumber', e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Bairro">
                  <input
                    type="text"
                    placeholder="Preenchido pelo CEP"
                    value={form.addressNeighborhood}
                    onChange={(e) => set('addressNeighborhood', e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Cidade *">
                  <input
                    type="text"
                    placeholder="Preenchido pelo CEP"
                    value={form.addressCity}
                    onChange={(e) => set('addressCity', e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Estado">
                <input
                  type="text"
                  placeholder="SP"
                  maxLength={2}
                  value={form.addressState}
                  onChange={(e) => set('addressState', e.target.value.toUpperCase())}
                  className={inputClass}
                />
              </Field>

              <Field label={<span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#ea1d2c]" />Localização no mapa</span> as unknown as string}>
                <MapPicker
                  lat={form.lat}
                  lng={form.lng}
                  onChange={(lat, lng) => setForm((prev) => ({ ...prev, lat, lng }))}
                />
              </Field>
            </div>
          )}

          {/* Step 3 — Configurações */}
          {step === 2 && (
            <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4 animate-rise">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Taxa de entrega (R$)">
                  <input
                    type="number" min={0} step={0.5} placeholder="0,00"
                    value={form.deliveryFee}
                    onChange={(e) => set('deliveryFee', Number(e.target.value))}
                    className={inputClass}
                    autoFocus
                  />
                </Field>
                <Field label="Pedido mínimo (R$)">
                  <input
                    type="number" min={0} step={1} placeholder="0,00"
                    value={form.minOrderAmount}
                    onChange={(e) => set('minOrderAmount', Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Entrega mín. (min)">
                  <input
                    type="number" min={1} placeholder="30"
                    value={form.etaMin}
                    onChange={(e) => set('etaMin', Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Entrega máx. (min)">
                  <input
                    type="number" min={1} placeholder="50"
                    value={form.etaMax}
                    onChange={(e) => set('etaMax', Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Retirada (min)">
                  <input
                    type="number" min={1} placeholder="15"
                    value={form.pickupEta}
                    onChange={(e) => set('pickupEta', Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Navegação entre steps */}
          <div className="mt-5 flex gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="h-[52px] flex-1 rounded-2xl border border-[#d9d9d9] text-[14px] font-semibold text-[#303030] transition hover:bg-[#f5f5f5]"
              >
                Voltar
              </button>
            )}
            {step < 2 ? (
              <button
                type="button"
                onClick={handleNext}
                className="h-[52px] flex-1 rounded-2xl bg-[#ea1d2c] text-[15px] font-bold text-white transition hover:brightness-95 flex items-center justify-center gap-2"
              >
                Próximo <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="h-[52px] flex-1 rounded-2xl bg-[#ea1d2c] text-[15px] font-bold text-white transition hover:brightness-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submitting ? 'Cadastrando...' : 'Cadastrar loja'}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  )
}
