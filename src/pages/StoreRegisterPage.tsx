import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CircleDollarSign,
  Loader2,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { usePartnerAuth } from '@/hooks/usePartnerAuth'
import { getStoreCategories } from '@/services/profile'
import { registerStore } from '@/services/partner'
import { MapPicker } from '@/components/MapPicker'
import type { StoreCategory, StoreRegistrationInput } from '@/types'

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return digits.replace(/(\d{5})(\d)/, '$1-$2')
}

async function fetchViaCEP(cep: string) {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    const data = (await response.json()) as Record<string, string>
    if (data.erro) return null
    return data
  } catch {
    return null
  }
}

async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const params = new URLSearchParams({ q: query, format: 'json', limit: '1', countrycodes: 'br' })
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'OhDelivery/1.0' },
    })
    const data = (await response.json()) as Array<{ lat: string; lon: string }>
    if (!data.length) return null
    return { lat: Number.parseFloat(data[0].lat), lng: Number.parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

const STEPS = ['CNPJ', 'Dados da Loja', 'Endereco', 'Localizacao', 'Configuracoes', 'Plano']

const PLAN_FEATURES = [
  'Mais visibilidade para sua loja no app',
  'Gestao de pedidos e cardapio em um unico painel',
  'Ferramentas de campanhas e promocoes',
  'Acompanhamento simples da operacao da loja',
]

function StepperBar({ current }: { current: number }) {
  return (
    <div className="border-b border-[#ececec] bg-white px-4">
      <div className="mx-auto flex max-w-5xl gap-2">
        {STEPS.map((label, index) => (
          <div key={label} className="flex-1 py-4">
            <div
              className={[
                'h-[6px] rounded-full transition-all',
                index <= current ? 'bg-[#ea1d2c]' : 'bg-[#d9d9d9]',
              ].join(' ')}
            />
            <p
              className={[
                'mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em]',
                index === current ? 'text-[#ea1d2c]' : index < current ? 'text-[#666]' : 'text-[#bbb]',
              ].join(' ')}
            >
              {label}
            </p>
          </div>
        ))}
      </div>
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

export function StoreRegisterPage() {
  const navigate = useNavigate()
  const { user, profile, selectStore } = usePartnerAuth()

  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [registrationCompleted, setRegistrationCompleted] = useState(false)

  const [form, setForm] = useState<StoreRegistrationInput>({
    name: '',
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    responsavelNome: '',
    responsavelCpf: '',
    categoryId: '',
    categoryName: '',
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

  useEffect(() => {
    void getStoreCategories().then(setCategories)
  }, [])

  function setField<K extends keyof StoreRegistrationInput>(key: K, value: StoreRegistrationInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleCepBlur() {
    const digits = form.addressZip.replace(/\D/g, '')
    if (digits.length !== 8) return

    setCepLoading(true)

    try {
      const data = await fetchViaCEP(digits)
      if (!data) {
        toast.error('CEP nao encontrado.')
        return
      }

      const street = data.logradouro ?? ''
      const neighborhood = data.bairro ?? ''
      const city = data.localidade ?? ''
      const state = data.uf ?? ''

      setForm((current) => ({
        ...current,
        addressStreet: street,
        addressNeighborhood: neighborhood,
        addressCity: city,
        addressState: state,
      }))

      const coords = await geocodeAddress(`${street}, ${neighborhood}, ${city}, ${state}, Brasil`)
      if (coords) {
        setForm((current) => ({ ...current, lat: coords.lat, lng: coords.lng }))
      }
    } finally {
      setCepLoading(false)
    }
  }

  function validateStep(currentStep: number) {
    if (currentStep === 0) {
      if (form.cnpj.replace(/\D/g, '').length !== 14) {
        toast.error('Informe um CNPJ valido.')
        return false
      }
      if (!form.razaoSocial.trim()) {
        toast.error('Informe a razao social.')
        return false
      }
      if (!form.responsavelNome.trim()) {
        toast.error('Informe o nome do responsavel.')
        return false
      }
      if (form.responsavelCpf.replace(/\D/g, '').length !== 11) {
        toast.error('Informe um CPF valido.')
        return false
      }
    }

    if (currentStep === 1) {
      if (!form.name.trim()) {
        toast.error('Informe o nome da loja.')
        return false
      }
      if (!form.categoryId) {
        toast.error('Selecione a categoria.')
        return false
      }
    }

    if (currentStep === 2) {
      if (form.addressZip.replace(/\D/g, '').length !== 8) {
        toast.error('Informe um CEP valido.')
        return false
      }
      if (!form.addressCity.trim()) {
        toast.error('CEP nao encontrado. Verifique e tente novamente.')
        return false
      }
      if (!form.addressNumber.trim()) {
        toast.error('Informe o numero do endereco.')
        return false
      }
    }

    return true
  }

  async function handleNext() {
    if (!validateStep(step)) return

    try {
      if (step === 2 && form.lat === null) {
        setCepLoading(true)
        try {
          const coords = await geocodeAddress(
            `${form.addressStreet}, ${form.addressNeighborhood}, ${form.addressCity}, ${form.addressState}, Brasil`
          )
          if (coords) {
            setForm((current) => ({ ...current, lat: coords.lat, lng: coords.lng }))
          }
        } finally {
          setCepLoading(false)
        }
      }

      setStep((current) => current + 1)
    } catch (error) {
      setCepLoading(false)
      toast.error(error instanceof Error ? error.message : 'Erro ao avancar.')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step !== STEPS.length - 1) return
    if (!user || !profile) {
      toast.error('Sessao invalida.')
      return
    }

    setSubmitting(true)

    try {
      const storeId = await registerStore(form, user.id, user.email, profile.name ?? user.name)
      selectStore(storeId)
      toast.success('Loja cadastrada com sucesso.')
      setRegistrationCompleted(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel cadastrar a loja.')
    } finally {
      setSubmitting(false)
    }
  }

  const isLastStep = step === STEPS.length - 1

  if (registrationCompleted) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#f5f5f5]">
        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-2xl rounded-[32px] border border-[#e8e8e8] bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#dff4e8] text-[#2fa866]">
                <BadgeCheck className="h-10 w-10" />
              </div>

              <p className="mt-6 text-[30px] font-bold leading-tight text-[#1d1d1d]">
                Estamos confirmando os dados do seu CNPJ
              </p>
              <p className="mt-3 max-w-xl text-[15px] leading-7 text-[#666]">
                Seu cadastro foi enviado com sucesso. Agora nosso time vai validar as informacoes da empresa e essa
                etapa pode levar ate 48 horas.
              </p>
            </div>

            <div className="mt-8 rounded-[28px] border border-[#ededed] bg-[#fafafa] p-6">
              <p className="text-[15px] font-bold text-[#1d1d1d]">O que acontece agora?</p>
              <div className="mt-5 space-y-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eaf7ef] text-[#2fa866]">
                    <Check className="h-4 w-4" />
                  </div>
                  <p className="text-[14px] leading-6 text-[#555]">
                    Estamos consultando os dados do seu CNPJ online e validando as informacoes principais do cadastro.
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eaf7ef] text-[#2fa866]">
                    <Check className="h-4 w-4" />
                  </div>
                  <p className="text-[14px] leading-6 text-[#555]">
                    Assim que essa etapa terminar, voce recebe no e-mail os proximos passos para seguir com a ativacao.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={() => navigate('/lojas')}
                className="inline-flex h-[52px] items-center justify-center rounded-2xl bg-[#ea1d2c] px-8 text-[15px] font-bold text-white transition hover:brightness-95"
              >
                Sair
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#f5f5f5]">
      <StepperBar current={step} />

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-4xl">
          <form onSubmit={(event) => void handleSubmit(event)}>
            {step === 0 ? (
              <div className="rounded-2xl bg-white p-8 shadow-sm space-y-5 animate-rise">
                <div>
                  <h2 className="text-[18px] font-bold text-[#1d1d1d]">Dados da Empresa</h2>
                  <p className="mt-1 text-[13px] text-[#8b8b8b]">
                    Informacoes do CNPJ e do responsavel pela loja
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="CNPJ *">
                    <input
                      type="text"
                      placeholder="00.000.000/0001-00"
                      value={form.cnpj}
                      onChange={(event) => setField('cnpj', formatCnpj(event.target.value))}
                      className={inputClass}
                      autoFocus
                    />
                  </Field>

                  <Field label="Nome Fantasia">
                    <input
                      type="text"
                      placeholder="Como e conhecida no mercado"
                      value={form.nomeFantasia}
                      onChange={(event) => setField('nomeFantasia', event.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Razao Social *">
                  <input
                    type="text"
                    placeholder="Razao social conforme CNPJ"
                    value={form.razaoSocial}
                    onChange={(event) => setField('razaoSocial', event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <div className="border-t border-[#f0f0f0] pt-4">
                  <p className="mb-4 text-[13px] font-bold text-[#1d1d1d]">Responsavel pela loja</p>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Nome completo *">
                      <input
                        type="text"
                        placeholder="Nome do responsavel"
                        value={form.responsavelNome}
                        onChange={(event) => setField('responsavelNome', event.target.value)}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="CPF *">
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={form.responsavelCpf}
                        onChange={(event) => setField('responsavelCpf', formatCpf(event.target.value))}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="rounded-2xl bg-white p-8 shadow-sm space-y-5 animate-rise">
                <div>
                  <h2 className="text-[18px] font-bold text-[#1d1d1d]">Dados da Loja</h2>
                  <p className="mt-1 text-[13px] text-[#8b8b8b]">
                    Como sua loja vai aparecer para os clientes
                  </p>
                </div>

                <Field label="Nome da loja *">
                  <input
                    type="text"
                    placeholder="Ex: Burger do Ze"
                    value={form.name}
                    onChange={(event) => setField('name', event.target.value)}
                    className={inputClass}
                    autoFocus
                  />
                </Field>

                <Field label="Categoria *">
                  <div className="relative">
                    <select
                      value={form.categoryId}
                      onChange={(event) => {
                        const category = categories.find((item) => item.id === event.target.value)
                        setForm((current) => ({
                          ...current,
                          categoryId: event.target.value,
                          categoryName: category?.name ?? '',
                        }))
                      }}
                      className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8b8b]" />
                  </div>
                </Field>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="rounded-2xl bg-white p-8 shadow-sm space-y-5 animate-rise">
                <div>
                  <h2 className="text-[18px] font-bold text-[#1d1d1d]">Endereco</h2>
                  <p className="mt-1 text-[13px] text-[#8b8b8b]">Onde sua loja esta localizada</p>
                </div>

                <Field label="CEP *">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="00000-000"
                      value={form.addressZip}
                      onChange={(event) => {
                        setField('addressZip', formatCep(event.target.value))
                        setForm((current) => ({
                          ...current,
                          addressStreet: '',
                          addressNeighborhood: '',
                          addressCity: '',
                          addressState: '',
                        }))
                      }}
                      onBlur={() => void handleCepBlur()}
                      className={inputClass}
                      autoFocus
                    />
                    {cepLoading ? (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#ea1d2c]" />
                    ) : null}
                  </div>
                </Field>

                {form.addressCity ? (
                  <div className="rounded-xl border border-[#e8e8e8] bg-[#f9f9f9] px-4 py-3">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8b8b8b]">
                      Endereco encontrado
                    </p>
                    <p className="text-[14px] font-medium text-[#1d1d1d]">{form.addressStreet}</p>
                    <p className="text-[13px] text-[#686868]">
                      {form.addressNeighborhood} · {form.addressCity}/{form.addressState}
                    </p>
                  </div>
                ) : (
                  <p className="py-1 text-center text-[12px] text-[#8b8b8b]">
                    Digite o CEP para preencher o endereco automaticamente.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Numero *">
                    <input
                      type="text"
                      placeholder="123"
                      value={form.addressNumber}
                      onChange={(event) => setField('addressNumber', event.target.value)}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Complemento">
                    <input
                      type="text"
                      placeholder="Apto, sala..."
                      value={form.addressComplement}
                      onChange={(event) => setField('addressComplement', event.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="rounded-2xl bg-white p-8 shadow-sm space-y-5 animate-rise">
                <div>
                  <h2 className="text-[18px] font-bold text-[#1d1d1d]">Localizacao</h2>
                  <p className="mt-1 text-[13px] text-[#8b8b8b]">
                    Mova o mapa ate o pino estar sobre o local exato da loja
                  </p>
                </div>

                <MapPicker
                  lat={form.lat}
                  lng={form.lng}
                  onChange={(lat, lng) => setForm((current) => ({ ...current, lat, lng }))}
                />

                <div className="rounded-xl border border-[#e8e8e8] bg-[#f9f9f9] px-4 py-3">
                  <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#8b8b8b]">
                    <MapPin className="h-3 w-3 text-[#ea1d2c]" />
                    Endereco
                  </p>
                  <p className="text-[13px] text-[#1d1d1d]">
                    {form.addressStreet}
                    {form.addressNumber ? `, ${form.addressNumber}` : ''}
                    {form.addressComplement ? ` - ${form.addressComplement}` : ''}
                  </p>
                  <p className="text-[12px] text-[#686868]">
                    {form.addressNeighborhood} · {form.addressCity}/{form.addressState} · CEP {form.addressZip}
                  </p>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="rounded-2xl bg-white p-8 shadow-sm space-y-5 animate-rise">
                <div>
                  <h2 className="text-[18px] font-bold text-[#1d1d1d]">Configuracoes</h2>
                  <p className="mt-1 text-[13px] text-[#8b8b8b]">Ajuste os valores padrao da sua loja</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Taxa de entrega (R$)">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="0,00"
                      value={form.deliveryFee}
                      onChange={(event) => setField('deliveryFee', Number(event.target.value))}
                      className={inputClass}
                      autoFocus
                    />
                  </Field>

                  <Field label="Pedido minimo (R$)">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0,00"
                      value={form.minOrderAmount}
                      onChange={(event) => setField('minOrderAmount', Number(event.target.value))}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Field label="Entrega min.">
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        placeholder="30"
                        value={form.etaMin}
                        onChange={(event) => setField('etaMin', Number(event.target.value))}
                        className={`${inputClass} pr-10`}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#aaa]">
                        min
                      </span>
                    </div>
                  </Field>

                  <Field label="Entrega max.">
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        placeholder="50"
                        value={form.etaMax}
                        onChange={(event) => setField('etaMax', Number(event.target.value))}
                        className={`${inputClass} pr-10`}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#aaa]">
                        min
                      </span>
                    </div>
                  </Field>

                  <Field label="Retirada">
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        placeholder="15"
                        value={form.pickupEta}
                        onChange={(event) => setField('pickupEta', Number(event.target.value))}
                        className={`${inputClass} pr-10`}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#aaa]">
                        min
                      </span>
                    </div>
                  </Field>
                </div>

                <p className="text-[12px] text-[#8b8b8b]">
                  Esses valores podem ser alterados a qualquer momento apos a aprovacao.
                </p>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="rounded-[32px] bg-white p-8 shadow-sm animate-rise">
                <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8b8b8b]">
                      Contratacao de plano
                    </p>
                    <h2 className="mt-3 text-[36px] font-bold leading-tight text-[#1d1d1d]">
                      Veja o plano disponivel
                    </h2>
                    <p className="mt-3 max-w-xl text-[15px] leading-7 text-[#666]">
                      Montei uma primeira versao no estilo da plataforma, mas adaptada para o seu projeto. Depois voce
                      ajusta textos, beneficios e detalhes finos do jeito que quiser.
                    </p>

                    <div className="mt-8 rounded-[28px] border-2 border-[#ea1d2c] bg-white p-6 shadow-[0_16px_40px_rgba(234,29,44,0.08)]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1f2] text-[#ea1d2c]">
                            <ShieldCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[26px] font-bold text-[#1d1d1d]">Basico</p>
                            <p className="mt-1 text-[14px] text-[#686868]">Entrega feita pela loja</p>
                          </div>
                        </div>

                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ea1d2c] text-white">
                          <Check className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="mt-8 space-y-6">
                        <div>
                          <p className="text-[34px] font-bold text-[#1d1d1d]">
                            R$ 50
                            <span className="text-[18px] font-semibold text-[#666]">/mes</span>
                          </p>
                          <p className="mt-1 text-[13px] font-semibold text-[#0f8a43]">
                            Mensalidade enxuta para comecar a operar
                          </p>
                        </div>

                        <div>
                          <p className="text-[34px] font-bold text-[#1d1d1d]">
                            5
                            <span className="text-[18px] font-semibold text-[#666]">% por pedido</span>
                          </p>
                          <p className="mt-1 text-[13px] font-semibold text-[#0f8a43]">
                            Comissao aplicada sobre os pedidos da plataforma
                          </p>
                        </div>

                        <div className="rounded-2xl bg-[#f7fbf8] px-4 py-3 text-[13px] leading-6 text-[#276749]">
                          Esse bloco e a base visual inicial do plano. Depois voce pode trocar regras, observacoes e
                          condicoes comerciais sem problema.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-[28px] border border-[#ececec]">
                      {PLAN_FEATURES.map((feature, index) => (
                        <div
                          key={feature}
                          className={`grid grid-cols-[1fr_74px] ${
                            index !== PLAN_FEATURES.length - 1 ? 'border-b border-[#ececec]' : ''
                          }`}
                        >
                          <div className="bg-[#fafafa] px-5 py-5 text-[14px] leading-6 text-[#4a4a4a]">
                            {feature}
                          </div>
                          <div className="flex items-center justify-center bg-white text-[#0f8a43]">
                            <Check className="h-6 w-6" />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-[22px] border border-[#dff2e6] bg-[#effaf3] px-5 py-4 text-[13px] leading-6 text-[#276749]">
                      A mensalidade fica em R$ 50 por mes e a comissao em 5% por pedido, exatamente como voce pediu
                      para essa primeira versao.
                    </div>

                    <div className="rounded-[26px] border border-[#ededed] bg-white p-5">
                      <p className="text-[14px] font-bold text-[#1d1d1d]">Plano escolhido</p>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1f2] text-[#ea1d2c]">
                          <CircleDollarSign className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold text-[#1d1d1d]">Basico</p>
                          <p className="text-[13px] text-[#686868]">R$ 50 por mes e 5% por pedido</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => (step === 0 ? navigate('/') : setStep((current) => current - 1))}
                className="h-[52px] flex-1 rounded-2xl border border-[#d9d9d9] text-[14px] font-semibold text-[#303030] transition hover:bg-[#f5f5f5]"
              >
                {step === 0 ? 'Voltar ao site' : 'Voltar'}
              </button>

              {!isLastStep ? (
                <button
                  type="button"
                  onClick={() => void handleNext()}
                  disabled={step === 2 && cepLoading}
                  className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#ea1d2c] text-[15px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {step === 2 && cepLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Proximo
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#ea1d2c] text-[15px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    'Continuar'
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
