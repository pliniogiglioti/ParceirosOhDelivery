import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { PaymentMethodsEditor } from '@/components/partner/PaymentMethodsEditor'
import { SectionFrame } from '@/components/partner/PartnerUi'
import { usePartnerDraftStore } from '@/hooks/usePartnerDraftStore'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { saveStorePaymentMethods } from '@/services/partner'
import type { PaymentMethodItem } from '@/types'

function serializeMethods(methods: PaymentMethodItem[]) {
  return JSON.stringify(
    methods.map((method) => ({
      id: method.id,
      active: method.active,
      brands: (method.brands ?? []).map((brand) => ({
        id: brand.id,
        active: brand.active,
      })),
    }))
  )
}

export function PartnerPaymentsPage() {
  const { data } = usePartnerPageData()
  const { updatePaymentMethods } = usePartnerDraftStore()
  const [methods, setMethods] = useState<PaymentMethodItem[]>(data.paymentMethods)
  const [savedMethods, setSavedMethods] = useState<PaymentMethodItem[]>(data.paymentMethods)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMethods(data.paymentMethods)
    setSavedMethods(data.paymentMethods)
  }, [data.paymentMethods, data.store.id])

  const hasChanges = serializeMethods(methods) !== serializeMethods(savedMethods)

  async function handleSave() {
    setSaving(true)

    try {
      const nextMethods = await saveStorePaymentMethods(data.store.id, methods)
      setMethods(nextMethods)
      setSavedMethods(nextMethods)
      updatePaymentMethods(data.store.id, nextMethods)
      toast.success('Formas de pagamento salvas.')
    } catch (err) {
      console.error('[PartnerPaymentsPage] Erro ao salvar formas de pagamento:', err)
      toast.error('Nao foi possivel salvar as formas de pagamento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionFrame eyebrow="Pagamentos" title="Formas de pagamento">
      <div className="space-y-4">
        <PaymentMethodsEditor
          methods={methods}
          onChange={setMethods}
          helperText="Ative apenas os meios que sua loja realmente aceita hoje. Voce pode ajustar as bandeiras a qualquer momento."
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!hasChanges || saving}
            className={[
              'inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-8 text-sm font-semibold text-white transition',
              hasChanges && !saving
                ? 'bg-coral-500 hover:bg-coral-600'
                : 'cursor-not-allowed bg-ink-200 text-ink-500',
            ].join(' ')}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar alteracoes'
            )}
          </button>
        </div>
      </div>
    </SectionFrame>
  )
}
