import { useMemo, useState } from 'react'
import { FileSignature, Loader2, LogOut, ScrollText, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { usePartnerAuth } from '@/hooks/usePartnerAuth'
import { saveStore } from '@/services/partner'
import type { PartnerDashboardData } from '@/types'

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

export function PartnerContractPage({ data }: { data: PartnerDashboardData }) {
  const navigate = useNavigate()
  const { signOut } = usePartnerAuth()
  const [signatureCpf, setSignatureCpf] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const responsibleCpf = useMemo(
    () => formatCpf(data.store.responsavelCpf ?? ''),
    [data.store.responsavelCpf]
  )

  async function handleSignContract() {
    if (!responsibleCpf) {
      toast.error('Nao encontramos o CPF do responsavel desta loja.')
      return
    }

    if (!acceptTerms) {
      toast.error('Confirme que voce leu e concorda com o contrato.')
      return
    }

    if (signatureCpf.replace(/\D/g, '') !== responsibleCpf.replace(/\D/g, '')) {
      toast.error('Digite o mesmo CPF do responsavel para assinar o contrato.')
      return
    }

    setSubmitting(true)

    try {
      await saveStore(data.store.id, { contract: true })
      toast.success('Contrato assinado com sucesso.')
      navigate(data.store.firstAccess ? '/app' : '/primeiro-acesso', { replace: true })
    } catch {
      toast.error('Nao foi possivel concluir a assinatura do contrato.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f5]">
      <header className="border-b border-[#ececec] bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-[1.4rem] font-black italic tracking-[-0.06em] text-[#ea1d2c]">
            ohdelivery
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-[#686868] transition hover:bg-[#f5f5f5]"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100dvh-81px)] max-w-5xl items-center px-4 py-10 sm:px-6">
        <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[28px] border border-[#ececec] bg-white p-7 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff1f2] text-[#ea1d2c]">
                <ScrollText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#ea1d2c]">
                  Assinatura de contrato
                </p>
                <h1 className="mt-1 text-[28px] font-black tracking-[-0.03em] text-[#1d1d1d]">
                  Revise e assine o contrato da loja
                </h1>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-[14px] leading-7 text-[#555]">
              <div className="rounded-3xl border border-[#ececec] bg-[#fafafa] p-5">
                <p className="font-bold text-[#1d1d1d]">Partes do contrato</p>
                <p className="mt-2">
                  Loja: <span className="font-semibold text-[#1d1d1d]">{data.store.name}</span>
                </p>
                <p>
                  Responsavel: <span className="font-semibold text-[#1d1d1d]">{data.store.responsavelNome || 'Nao informado'}</span>
                </p>
              </div>

              <div className="rounded-3xl border border-[#ececec] p-5">
                <p className="font-bold text-[#1d1d1d]">Resumo</p>
                <p className="mt-2">
                  Este contrato autoriza o uso da plataforma Oh Delivery para recebimento, gerenciamento e acompanhamento de pedidos da loja cadastrada.
                </p>
                <p className="mt-2">
                  A loja se compromete a manter os dados cadastrais corretos, operar dentro das regras da plataforma e responder pelos pedidos e informacoes publicados.
                </p>
                <p className="mt-2">
                  A assinatura digital abaixo confirma a concordancia do responsavel legal com as condicoes comerciais e operacionais vigentes.
                </p>
              </div>
            </div>
          </section>

          <aside className="rounded-[28px] border border-[#ececec] bg-white p-7 shadow-sm sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0fdf4] text-[#16a34a]">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-[22px] font-black tracking-[-0.02em] text-[#1d1d1d]">
              Confirmar assinatura
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-[#686868]">
              Para assinar, digite o mesmo CPF do responsavel cadastrado pela loja.
            </p>

            <div className="mt-6 rounded-3xl border border-[#ececec] bg-[#fafafa] p-5">
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#8b8b8b]">
                CPF do responsavel
              </p>
              <p className="mt-2 text-[20px] font-black tracking-[-0.02em] text-[#1d1d1d]">
                {responsibleCpf || 'Nao informado'}
              </p>
            </div>

            <label className="mt-5 block">
              <span className="mb-1.5 block text-[13px] font-semibold text-[#4f4f4f]">
                Digite o CPF para assinar
              </span>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={signatureCpf}
                  onChange={(event) => setSignatureCpf(formatCpf(event.target.value))}
                  placeholder="000.000.000-00"
                  className="h-[48px] w-full rounded-xl border border-[#d9d9d9] bg-[#fbfbfb] px-4 pr-12 text-[14px] text-[#1d1d1d] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#ea1d2c] focus:bg-white focus:shadow-[0_0_0_4px_rgba(234,29,44,0.09)]"
                />
                <FileSignature className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a9a]" />
              </div>
            </label>

            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-[#ececec] bg-[#fafafa] px-4 py-4">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[#cfcfcf] text-[#ea1d2c] focus:ring-[#ea1d2c]"
              />
              <span className="text-[13px] leading-6 text-[#555]">
                Confirmo que li e concordo com este contrato e que sou o responsavel autorizado pela loja.
              </span>
            </label>

            <button
              type="button"
              onClick={() => void handleSignContract()}
              disabled={submitting}
              className="mt-6 flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[#ea1d2c] text-[14px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assinando...
                </>
              ) : (
                'Assinar contrato'
              )}
            </button>
          </aside>
        </div>
      </main>
    </div>
  )
}
