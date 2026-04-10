import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePartnerAuth } from '@/hooks/usePartnerAuth'
import { getStoreCategories } from '@/services/profile'
import { registerStore } from '@/services/partner'
import type { StoreCategory, StoreRegistrationInput } from '@/types'

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-[#4f4f4f]">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'h-[48px] w-full rounded-xl border border-[#d9d9d9] bg-[#fbfbfb] px-4 text-[14px] text-[#1d1d1d] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#ea1d2c] focus:bg-white focus:shadow-[0_0_0_4px_rgba(234,29,44,0.09)]'

export function StoreRegisterPage() {
  const navigate = useNavigate()
  const { user, profile, selectStore } = usePartnerAuth()
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState<StoreRegistrationInput>({
    name: '',
    categoryId: '',
    categoryName: '',
    tagline: '',
    addressStreet: '',
    addressNeighborhood: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
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
    setForm((prev) => ({
      ...prev,
      categoryId,
      categoryName: cat?.name ?? '',
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.name.trim()) {
      toast.error('Informe o nome da loja.')
      return
    }
    if (!form.categoryId) {
      toast.error('Selecione a categoria da loja.')
      return
    }
    if (!form.addressCity.trim()) {
      toast.error('Informe a cidade.')
      return
    }
    if (!user || !profile) {
      toast.error('Sessao invalida. Faca login novamente.')
      return
    }

    setSubmitting(true)

    try {
      const storeId = await registerStore(form, user.id, user.email, profile.name ?? user.name)
      selectStore(storeId)
      toast.success('Loja cadastrada com sucesso!')
      navigate('/app')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Nao foi possivel cadastrar a loja.'
      )
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
            onClick={() => navigate('/lojas')}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f5f5] text-[#686868] transition hover:bg-[#ececec]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="font-bold text-[#1d1d1d]">Cadastrar nova loja</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          {/* Informacoes basicas */}
          <section className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-[#1d1d1d] text-[15px]">Informacoes basicas</h2>

            <Field label="Nome da loja *">
              <input
                type="text"
                placeholder="Ex: Burger do Zé"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className={inputClass}
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
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
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
          </section>

          {/* Endereco */}
          <section className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-[#1d1d1d] text-[15px]">Endereco</h2>

            <div className="grid grid-cols-2 gap-3">
              <Field label="CEP">
                <input
                  type="text"
                  placeholder="00000-000"
                  value={form.addressZip}
                  onChange={(e) => set('addressZip', e.target.value)}
                  className={inputClass}
                />
              </Field>
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
            </div>

            <Field label="Rua">
              <input
                type="text"
                placeholder="Rua das Flores, 123"
                value={form.addressStreet}
                onChange={(e) => set('addressStreet', e.target.value)}
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Bairro">
                <input
                  type="text"
                  placeholder="Centro"
                  value={form.addressNeighborhood}
                  onChange={(e) => set('addressNeighborhood', e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Cidade *">
                <input
                  type="text"
                  placeholder="São Paulo"
                  value={form.addressCity}
                  onChange={(e) => set('addressCity', e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </section>

          {/* Configuracoes de entrega */}
          <section className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-[#1d1d1d] text-[15px]">Configuracoes de entrega</h2>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Taxa de entrega (R$)">
                <input
                  type="number"
                  min={0}
                  step={0.50}
                  placeholder="0,00"
                  value={form.deliveryFee}
                  onChange={(e) => set('deliveryFee', Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
              <Field label="Pedido minimo (R$)">
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0,00"
                  value={form.minOrderAmount}
                  onChange={(e) => set('minOrderAmount', Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="ETA min (min)">
                <input
                  type="number"
                  min={1}
                  placeholder="30"
                  value={form.etaMin}
                  onChange={(e) => set('etaMin', Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
              <Field label="ETA max (min)">
                <input
                  type="number"
                  min={1}
                  placeholder="50"
                  value={form.etaMax}
                  onChange={(e) => set('etaMax', Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
              <Field label="Retirada (min)">
                <input
                  type="number"
                  min={1}
                  placeholder="15"
                  value={form.pickupEta}
                  onChange={(e) => set('pickupEta', Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
            </div>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="h-[52px] w-full rounded-2xl bg-[#ea1d2c] text-[15px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Cadastrando...' : 'Cadastrar loja'}
          </button>
        </form>
      </main>
    </div>
  )
}
