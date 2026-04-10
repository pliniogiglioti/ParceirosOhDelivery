import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, Check, ChevronDown, Loader2, MapPin } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import toast from 'react-hot-toast'
import { usePartnerAuth } from '@/hooks/usePartnerAuth'
import { getStoreCategories } from '@/services/profile'
import { registerStore } from '@/services/partner'
import type { StoreCategory, StoreRegistrationInput } from '@/types'

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatCnpj(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function formatCep(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 8)
  return d.replace(/(\d{5})(\d)/, '$1-$2')
}

interface CnpjResult {
  razaoSocial: string
  nomeFantasia: string
  situacao: string
  natureza: string
  abertura: string
  atividadePrincipal: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
}

async function fetchCnpj(cnpj: string): Promise<CnpjResult | null> {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return null
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
    if (!res.ok) return null
    const d = (await res.json()) as Record<string, unknown>
    const atividades = d.cnae_fiscal_descricao as string ?? ''
    return {
      razaoSocial: String(d.razao_social ?? ''),
      nomeFantasia: String(d.nome_fantasia ?? ''),
      situacao: String(d.descricao_situacao_cadastral ?? ''),
      natureza: String(d.natureza_juridica ?? ''),
      abertura: String(d.data_inicio_atividade ?? ''),
      atividadePrincipal: atividades,
      cep: String(d.cep ?? '').replace(/\D/g, ''),
      logradouro: String(d.logradouro ?? ''),
      numero: String(d.numero ?? ''),
      complemento: String(d.complemento ?? ''),
      bairro: String(d.bairro ?? ''),
      municipio: String(d.municipio ?? ''),
      uf: String(d.uf ?? ''),
    }
  } catch {
    return null
  }
}

async function fetchViaCEP(cep: string) {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    const data = (await res.json()) as Record<string, string>
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
    const data = (await res.json()) as Array<{ lat: string; lon: string }>
    if (!data.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

const STEPS = ['CNPJ', 'Dados da Loja', 'Endereço', 'Localização', 'Configurações']

function StepperBar({ current }: { current: number }) {
  return (
    <div className="bg-white border-b border-[#ececec] px-4 py-4">
      <div className="mx-auto flex max-w-lg items-center justify-center">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1" style={{ minWidth: 48 }}>
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all ${
                  i < current
                    ? 'bg-[#ea1d2c] text-white'
                    : i === current
                    ? 'bg-[#ea1d2c] text-white ring-4 ring-[#ea1d2c]/15'
                    : 'bg-[#f0f0f0] text-[#aaa]'
                }`}
              >
                {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-semibold whitespace-nowrap leading-tight text-center ${
                  i === current ? 'text-[#ea1d2c]' : i < current ? 'text-[#686868]' : 'text-[#bbb]'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 mb-4 mx-1 transition-all ${i < current ? 'bg-[#ea1d2c]' : 'bg-[#e5e5e5]'}`}
                style={{ width: 20 }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Input helpers ────────────────────────────────────────────────────────────

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

// ─── Map ──────────────────────────────────────────────────────────────────────

function MapPicker({ lat, lng, onChange }: { lat: number | null; lng: number | null; onChange: (lat: number, lng: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const onChangeRef = useRef(onChange)
  const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const initLat = lat ?? -23.5505
    const initLng = lng ?? -46.6333
    const map = L.map(containerRef.current, { zoomControl: true }).setView([initLat, initLng], lat ? 16 : 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    }).addTo(map)
    lastCenterRef.current = { lat: initLat, lng: initLng }
    onChangeRef.current(initLat, initLng)
    map.on('moveend', () => {
      const c = map.getCenter()
      lastCenterRef.current = { lat: c.lat, lng: c.lng }
      onChangeRef.current(c.lat, c.lng)
    })
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mapRef.current || lat === null || lng === null) return
    const last = lastCenterRef.current
    if (last && Math.abs(last.lat - lat) < 0.00001 && Math.abs(last.lng - lng) < 0.00001) return
    lastCenterRef.current = { lat, lng }
    mapRef.current.setView([lat, lng], 16)
  }, [lat, lng])

  return (
    <div className="relative">
      <div ref={containerRef} className="h-[480px] w-full rounded-xl overflow-hidden border border-[#e0e0e0]" />
      {/* Fixed center pin */}
      <div className="pointer-events-none absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -100%)', zIndex: 9999, width: 26, height: 26 }}>
        <div style={{ width: '100%', height: '100%', background: '#ea1d2c', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', border: '3px solid white', boxShadow: '0 2px 10px rgba(0,0,0,0.4)' }} />
      </div>
      <div className="pointer-events-none absolute rounded-full bg-white border-2 border-[#ea1d2c]" style={{ left: '50%', top: '50%', width: 8, height: 8, transform: 'translate(-50%, -50%)', zIndex: 9999 }} />
      <p className="mt-1.5 text-[11px] text-[#8b8b8b]">
        {lat !== null && lng !== null ? `${lat.toFixed(5)}, ${lng.toFixed(5)} — mova o mapa para ajustar` : 'Mova o mapa para posicionar o pino da loja'}
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function StoreRegisterPage() {
  const navigate = useNavigate()
  const { user, profile, selectStore } = usePartnerAuth()

  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [cnpjLoading, setCnpjLoading] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [cnpjResult, setCnpjResult] = useState<CnpjResult | null>(null)

  const [form, setForm] = useState<StoreRegistrationInput>({
    name: '',
    cnpj: '',
    categoryId: '',
    categoryName: '',
    tagline: '',
    addressStreet: '',
    addressNumber: '',
    addressComplement: '',
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

  useEffect(() => { void getStoreCategories().then(setCategories) }, [])

  function set<K extends keyof StoreRegistrationInput>(key: K, value: StoreRegistrationInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleCnpjBlur() {
    const digits = form.cnpj.replace(/\D/g, '')
    if (digits.length !== 14) return
    setCnpjLoading(true)
    setCnpjResult(null)
    try {
      const data = await fetchCnpj(digits)
      if (!data) { toast.error('CNPJ não encontrado ou inválido.'); return }
      setCnpjResult(data)
      // Pré-preenche nome da loja se vazio
      if (!form.name.trim()) {
        const suggested = data.nomeFantasia || data.razaoSocial
        if (suggested) setForm((prev) => ({ ...prev, name: suggested }))
      }
      // Pré-preenche endereço a partir do CNPJ
      if (data.cep) {
        const cepFormatted = data.cep.replace(/(\d{5})(\d{3})/, '$1-$2')
        setForm((prev) => ({
          ...prev,
          addressZip: cepFormatted,
          addressStreet: data.logradouro,
          addressNumber: data.numero,
          addressComplement: data.complemento,
          addressNeighborhood: data.bairro,
          addressCity: data.municipio,
          addressState: data.uf,
        }))
        const query = `${data.logradouro}, ${data.bairro}, ${data.municipio}, ${data.uf}, Brasil`
        const coords = await geocodeAddress(query)
        if (coords) setForm((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }))
      }
    } finally {
      setCnpjLoading(false)
    }
  }

  async function handleCepBlur() {
    const digits = form.addressZip.replace(/\D/g, '')
    if (digits.length !== 8) return
    setCepLoading(true)
    try {
      const data = await fetchViaCEP(digits)
      if (!data) { toast.error('CEP não encontrado.'); return }
      const street = data.logradouro ?? ''
      const neighborhood = data.bairro ?? ''
      const city = data.localidade ?? ''
      const state = data.uf ?? ''
      setForm((prev) => ({ ...prev, addressStreet: street, addressNeighborhood: neighborhood, addressCity: city, addressState: state }))
      const coords = await geocodeAddress(`${street}, ${neighborhood}, ${city}, ${state}, Brasil`)
      if (coords) setForm((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }))
    } finally {
      setCepLoading(false)
    }
  }

  function validateStep(s: number): boolean {
    if (s === 0) {
      if (form.cnpj.replace(/\D/g, '').length !== 14) { toast.error('Informe um CNPJ válido.'); return false }
      if (!cnpjResult) { toast.error('Consulte o CNPJ antes de continuar.'); return false }
    }
    if (s === 1) {
      if (!form.name.trim()) { toast.error('Informe o nome da loja.'); return false }
      if (!form.categoryId) { toast.error('Selecione a categoria.'); return false }
    }
    if (s === 2) {
      if (form.addressZip.replace(/\D/g, '').length !== 8) { toast.error('Informe um CEP válido.'); return false }
      if (!form.addressCity.trim()) { toast.error('CEP não encontrado. Verifique e tente novamente.'); return false }
      if (!form.addressNumber.trim()) { toast.error('Informe o número do endereço.'); return false }
    }
    return true
  }

  async function handleNext() {
    if (!validateStep(step)) return
    if (step === 2 && form.lat === null) {
      setCepLoading(true)
      try {
        const coords = await geocodeAddress(`${form.addressStreet}, ${form.addressNeighborhood}, ${form.addressCity}, ${form.addressState}, Brasil`)
        if (coords) setForm((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }))
      } finally {
        setCepLoading(false)
      }
    }
    setStep((s) => s + 1)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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

  const isLastStep = step === STEPS.length - 1
  const isLoading = cnpjLoading || cepLoading
  const isAtiva = cnpjResult?.situacao.toLowerCase().includes('ativa')

  return (
    <div className="min-h-dvh bg-[#f5f5f5] flex flex-col">
      {/* Stepper como header */}
      <StepperBar current={step} />

      {/* Form centralizado */}
      <main className="flex flex-1 justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-2xl">
          <form onSubmit={(e) => void handleSubmit(e)}>

            {/* Step 0 — CNPJ */}
            {step === 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4 animate-rise">
                <div>
                  <h2 className="text-[16px] font-bold text-[#1d1d1d]">Identificação</h2>
                  <p className="text-[13px] text-[#8b8b8b] mt-0.5">Digite o CNPJ para consultar os dados da empresa</p>
                </div>

                <Field label="CNPJ *">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="00.000.000/0001-00"
                      value={form.cnpj}
                      onChange={(e) => { set('cnpj', formatCnpj(e.target.value)); setCnpjResult(null) }}
                      onBlur={() => void handleCnpjBlur()}
                      className={inputClass}
                      autoFocus
                    />
                    {cnpjLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#ea1d2c]" />}
                  </div>
                </Field>

                {cnpjResult && (
                  <div className={`rounded-xl border px-4 py-4 space-y-3 ${isAtiva ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                    <div className="flex items-center gap-2">
                      <Building2 className={`h-4 w-4 shrink-0 ${isAtiva ? 'text-green-600' : 'text-amber-600'}`} />
                      <span className={`text-[11px] font-bold uppercase tracking-wide ${isAtiva ? 'text-green-700' : 'text-amber-700'}`}>
                        {cnpjResult.situacao}
                      </span>
                    </div>

                    {cnpjResult.nomeFantasia && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b8b8b] mb-0.5">Nome Fantasia</p>
                        <p className="text-[14px] font-semibold text-[#1d1d1d]">{cnpjResult.nomeFantasia}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b8b8b] mb-0.5">Razão Social</p>
                      <p className="text-[13px] text-[#303030]">{cnpjResult.razaoSocial}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {cnpjResult.natureza && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b8b8b] mb-0.5">Natureza Jurídica</p>
                          <p className="text-[12px] text-[#303030]">{cnpjResult.natureza}</p>
                        </div>
                      )}
                      {cnpjResult.abertura && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b8b8b] mb-0.5">Abertura</p>
                          <p className="text-[12px] text-[#303030]">{cnpjResult.abertura}</p>
                        </div>
                      )}
                    </div>

                    {cnpjResult.atividadePrincipal && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b8b8b] mb-0.5">Atividade Principal</p>
                        <p className="text-[12px] text-[#303030]">{cnpjResult.atividadePrincipal}</p>
                      </div>
                    )}

                    {cnpjResult.municipio && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b8b8b] mb-0.5">Endereço Registrado</p>
                        <p className="text-[12px] text-[#303030]">
                          {cnpjResult.logradouro}{cnpjResult.numero ? `, ${cnpjResult.numero}` : ''} — {cnpjResult.bairro}
                        </p>
                        <p className="text-[12px] text-[#686868]">{cnpjResult.municipio}/{cnpjResult.uf} · CEP {cnpjResult.cep.replace(/(\d{5})(\d{3})/, '$1-$2')}</p>
                      </div>
                    )}
                  </div>
                )}

                {!cnpjResult && !cnpjLoading && (
                  <p className="text-[12px] text-[#8b8b8b] text-center">
                    O endereço e dados da empresa serão preenchidos automaticamente.
                  </p>
                )}
              </div>
            )}

            {/* Step 1 — Dados da Loja */}
            {step === 1 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4 animate-rise">
                <div>
                  <h2 className="text-[16px] font-bold text-[#1d1d1d]">Dados da Loja</h2>
                  <p className="text-[13px] text-[#8b8b8b] mt-0.5">Como sua loja vai aparecer para os clientes</p>
                </div>

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
                      onChange={(e) => {
                        const cat = categories.find((c) => c.id === e.target.value)
                        setForm((prev) => ({ ...prev, categoryId: e.target.value, categoryName: cat?.name ?? '' }))
                      }}
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

            {/* Step 2 — Endereço */}
            {step === 2 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4 animate-rise">
                <div>
                  <h2 className="text-[16px] font-bold text-[#1d1d1d]">Endereço</h2>
                  <p className="text-[13px] text-[#8b8b8b] mt-0.5">Confirme o endereço da loja</p>
                </div>

                <Field label="CEP *">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="00000-000"
                      value={form.addressZip}
                      onChange={(e) => {
                        set('addressZip', formatCep(e.target.value))
                        setForm((prev) => ({ ...prev, addressStreet: '', addressNeighborhood: '', addressCity: '', addressState: '' }))
                      }}
                      onBlur={() => void handleCepBlur()}
                      className={inputClass}
                      autoFocus
                    />
                    {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#ea1d2c]" />}
                  </div>
                </Field>

                {form.addressCity ? (
                  <div className="rounded-xl border border-[#e8e8e8] bg-[#f9f9f9] px-4 py-3">
                    <p className="text-[11px] font-semibold text-[#8b8b8b] uppercase tracking-wide mb-1.5">Endereço encontrado</p>
                    <p className="text-[14px] font-medium text-[#1d1d1d]">{form.addressStreet}</p>
                    <p className="text-[13px] text-[#686868]">{form.addressNeighborhood} · {form.addressCity}/{form.addressState}</p>
                  </div>
                ) : (
                  <p className="text-[12px] text-[#8b8b8b] text-center py-1">Digite o CEP para preencher o endereço automaticamente.</p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Número *">
                    <input
                      type="text"
                      placeholder="123"
                      value={form.addressNumber}
                      onChange={(e) => set('addressNumber', e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Complemento">
                    <input
                      type="text"
                      placeholder="Apto, sala…"
                      value={form.addressComplement}
                      onChange={(e) => set('addressComplement', e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            )}

            {/* Step 3 — Localização */}
            {step === 3 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4 animate-rise">
                <div>
                  <h2 className="text-[16px] font-bold text-[#1d1d1d]">Localização</h2>
                  <p className="text-[13px] text-[#8b8b8b] mt-0.5">Mova o mapa até o pino estar sobre o local exato</p>
                </div>

                <MapPicker
                  lat={form.lat}
                  lng={form.lng}
                  onChange={(lat, lng) => setForm((prev) => ({ ...prev, lat, lng }))}
                />

                <div className="rounded-xl border border-[#e8e8e8] bg-[#f9f9f9] px-4 py-3">
                  <p className="text-[11px] font-semibold text-[#8b8b8b] uppercase tracking-wide mb-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-[#ea1d2c]" /> Endereço
                  </p>
                  <p className="text-[13px] text-[#1d1d1d]">
                    {form.addressStreet}{form.addressNumber ? `, ${form.addressNumber}` : ''}{form.addressComplement ? ` — ${form.addressComplement}` : ''}
                  </p>
                  <p className="text-[12px] text-[#686868]">
                    {form.addressNeighborhood} · {form.addressCity}/{form.addressState} · CEP {form.addressZip}
                  </p>
                </div>
              </div>
            )}

            {/* Step 4 — Configurações */}
            {step === 4 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4 animate-rise">
                <div>
                  <h2 className="text-[16px] font-bold text-[#1d1d1d]">Configurações</h2>
                  <p className="text-[13px] text-[#8b8b8b] mt-0.5">Ajuste os valores padrão da sua loja</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Taxa de entrega (R$)">
                    <input type="number" min={0} step={0.5} placeholder="0,00" value={form.deliveryFee} onChange={(e) => set('deliveryFee', Number(e.target.value))} className={inputClass} autoFocus />
                  </Field>
                  <Field label="Pedido mínimo (R$)">
                    <input type="number" min={0} step={1} placeholder="0,00" value={form.minOrderAmount} onChange={(e) => set('minOrderAmount', Number(e.target.value))} className={inputClass} />
                  </Field>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Field label="Entrega mín.">
                    <div className="relative">
                      <input type="number" min={1} placeholder="30" value={form.etaMin} onChange={(e) => set('etaMin', Number(e.target.value))} className={`${inputClass} pr-10`} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#aaa]">min</span>
                    </div>
                  </Field>
                  <Field label="Entrega máx.">
                    <div className="relative">
                      <input type="number" min={1} placeholder="50" value={form.etaMax} onChange={(e) => set('etaMax', Number(e.target.value))} className={`${inputClass} pr-10`} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#aaa]">min</span>
                    </div>
                  </Field>
                  <Field label="Retirada">
                    <div className="relative">
                      <input type="number" min={1} placeholder="15" value={form.pickupEta} onChange={(e) => set('pickupEta', Number(e.target.value))} className={`${inputClass} pr-10`} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#aaa]">min</span>
                    </div>
                  </Field>
                </div>

                <p className="text-[12px] text-[#8b8b8b]">Esses valores podem ser alterados a qualquer momento após a aprovação.</p>
              </div>
            )}

            {/* Navegação */}
            <div className="mt-4 flex gap-3">
              {/* Botão esquerdo: "Voltar ao site" no step 0, "Voltar" nos demais */}
              <button
                type="button"
                onClick={() => step === 0 ? navigate('/lojas') : setStep((s) => s - 1)}
                className="h-[52px] flex-1 rounded-2xl border border-[#d9d9d9] text-[14px] font-semibold text-[#303030] transition hover:bg-[#f5f5f5]"
              >
                {step === 0 ? 'Voltar ao site' : 'Voltar'}
              </button>

              {/* Botão direito: "Próximo" ou "Cadastrar loja" */}
              {!isLastStep ? (
                <button
                  type="button"
                  onClick={() => void handleNext()}
                  disabled={isLoading}
                  className="h-[52px] flex-1 rounded-2xl bg-[#ea1d2c] text-[15px] font-bold text-white transition hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Próximo <ArrowRight className="h-4 w-4" /></>}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-[52px] flex-1 rounded-2xl bg-[#ea1d2c] text-[15px] font-bold text-white transition hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Cadastrando…</> : 'Cadastrar loja'}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
