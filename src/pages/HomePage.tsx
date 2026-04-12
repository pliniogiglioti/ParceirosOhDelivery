import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

type HomePageProps = {
  loading: boolean
  codeSent: boolean
  sending: boolean
  verifying: boolean
  pendingEmail: string
  loggedInName?: string
  loggedInEmail?: string
  onSendCode: (email: string) => Promise<void>
  onVerifyCode: (email: string, code: string) => Promise<void>
  onEnterPanel?: () => void
  onSignOut?: () => void
}

function EmailField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="mt-6 block">
      <span className="mb-2 block text-[13px] font-semibold text-[#4f4f4f]">Email</span>
      <div className="group flex h-[56px] items-center gap-3 rounded-xl border border-[#d9d9d9] bg-[#fbfbfb] px-4 transition focus-within:border-[#ff3600] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(255,54,0,0.09)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff1ee] text-[#ff3600]">
          <Mail className="h-4 w-4" />
        </div>
        <input
          type="email"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="nome@empresa.com"
          className="h-full w-full border-0 bg-transparent text-[15px] text-[#1d1d1d] outline-none placeholder:text-[#9a9a9a]"
        />
      </div>
    </label>
  )
}

function VerificationCodeField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? '')
  const activeIndex = Math.min(value.length, 5)

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#4f4f4f]">Codigo de acesso</span>
        <span className="text-[12px] text-[#8b8b8b]">6 digitos</span>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.focus()}
        className="relative block w-full"
        aria-label="Digitar codigo de 6 digitos"
      >
        <div className="grid grid-cols-6 gap-2 sm:gap-3">
          {digits.map((digit, index) => {
            const isFilled = digit !== ''
            const isActive = !isFilled && index === activeIndex

            return (
              <span
                key={index}
                className={[
                  'flex h-[58px] items-center justify-center rounded-xl border text-[22px] font-bold tracking-[0.02em] transition',
                  isFilled
                    ? 'border-[#ff3600] bg-[#fff2ee] text-[#1d1d1d]'
                    : 'border-[#d9d9d9] bg-[#fbfbfb] text-[#b3b3b3]',
                  isActive ? 'shadow-[0_0_0_4px_rgba(255,54,0,0.09)]' : '',
                ].join(' ')}
              >
                {digit || '-'}
              </span>
            )
          })}
        </div>

        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
          className="absolute left-0 top-0 h-px w-px opacity-0"
        />
      </button>
    </div>
  )
}

function RegisterLink({ label = 'Cadastre sua loja', to = '/cadastro' }: { label?: string; to?: string }) {
  const navigate = useNavigate()

  function handleClick() {
    if (to === '/cadastro') {
      toast('Entre com o email para cadastrar sua loja.')
      navigate('/login', { state: { from: '/cadastro' } })
      return
    }

    navigate(to)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="font-medium text-[#ff3600] underline underline-offset-2"
    >
      {label}
    </button>
  )
}

function LoggedInCard({
  name,
  email,
  onEnterPanel,
  onSignOut,
}: {
  name: string
  email: string
  onEnterPanel: () => void
  onSignOut?: () => void
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[0_18px_50px_rgba(0,0,0,0.32)]">
      <div className="px-8 pb-7 pt-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[1.3rem] font-bold text-[#181818]">Bem-vindo de volta</h2>
            <p className="mt-2 text-[14px] leading-6 text-[#686868]">
              Voce ja esta conectado como
            </p>
          </div>
          <div className="rounded-full bg-[#fff1ee] px-3 py-1 text-[12px] font-bold uppercase tracking-[0.16em] text-[#ff3600]">
            Parceiro
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#e8e8e8] bg-[#f9f9f9] px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ff3600] text-[13px] font-bold text-white">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-[#1d1d1d]">{name}</p>
            <p className="truncate text-[12px] text-[#8b8b8b]">{email}</p>
          </div>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="shrink-0 rounded-lg border border-[#e0e0e0] px-3 py-1.5 text-[12px] font-semibold text-[#686868] transition hover:border-[#ff3600] hover:text-[#ff3600]"
            >
              Sair
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onEnterPanel}
          className="mt-5 h-[50px] w-full rounded-xl bg-[#ff3600] text-[15px] font-bold text-white transition hover:brightness-95"
        >
          Entrar no painel
        </button>
      </div>

      <div className="border-t border-[#ececec] px-6 py-5 text-center text-[13px] text-[#2f2f2f]">
        Nao e voce?{' '}
        <RegisterLink label="Usar outra conta" to="/login" />
      </div>
    </div>
  )
}

function AuthSkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[0_18px_50px_rgba(0,0,0,0.32)]">
      <div className="animate-pulse px-8 pb-7 pt-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="h-6 w-44 rounded-full bg-[#ededed]" />
            <div className="h-4 w-36 rounded-full bg-[#f2f2f2]" />
          </div>
          <div className="h-7 w-24 rounded-full bg-[#fff1ee]" />
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#e8e8e8] bg-[#f9f9f9] px-4 py-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-[#ffd0bf]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-32 rounded-full bg-[#e6e6e6]" />
            <div className="h-3 w-44 rounded-full bg-[#efefef]" />
          </div>
        </div>

        <div className="mt-5 h-[50px] w-full rounded-xl bg-[#ffbfae]" />
      </div>

      <div className="border-t border-[#ececec] px-6 py-5">
        <div className="mx-auto h-4 w-40 animate-pulse rounded-full bg-[#efefef]" />
      </div>
    </div>
  )
}

function AuthCard({
  codeSent,
  sending,
  verifying,
  email,
  code,
  onEmailChange,
  onCodeChange,
  onSend,
  onVerify,
  onResend,
}: {
  codeSent: boolean
  sending: boolean
  verifying: boolean
  email: string
  code: string
  onEmailChange: (value: string) => void
  onCodeChange: (value: string) => void
  onSend: (event: FormEvent<HTMLFormElement>) => Promise<void>
  onVerify: (event: FormEvent<HTMLFormElement>) => Promise<void>
  onResend: () => Promise<void>
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[0_18px_50px_rgba(0,0,0,0.32)]">
      {!codeSent ? (
        <form onSubmit={onSend}>
          <div className="px-8 pb-7 pt-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[1.3rem] font-bold text-[#181818]">Portal do Parceiro</h2>
                <p className="mt-2 max-w-[26ch] text-[14px] leading-6 text-[#686868]">
                  Entre com seu email para receber o codigo de acesso.
                </p>
              </div>
              <div className="rounded-full bg-[#fff1ee] px-3 py-1 text-[12px] font-bold uppercase tracking-[0.16em] text-[#ff3600]">
                Login
              </div>
            </div>

            <EmailField value={email} onChange={onEmailChange} />

            <button
              type="submit"
              disabled={sending}
              className="mt-6 h-[50px] w-full rounded-xl bg-[#ff3600] text-[15px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {sending ? 'Enviando...' : 'Receber codigo'}
            </button>
          </div>

          <div className="border-t border-[#ececec] px-6 py-5 text-center text-[13px] text-[#2f2f2f]">
            Ainda nao tem cadastro?{' '}
            <RegisterLink />
          </div>
        </form>
      ) : (
        <form onSubmit={onVerify}>
          <div className="px-8 pb-7 pt-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[1.3rem] font-bold text-[#181818]">Digite o codigo</h2>
                <p className="mt-2 max-w-[28ch] text-[14px] leading-6 text-[#686868]">
                  Enviamos o codigo para <span className="font-semibold text-[#343434]">{email}</span>
                </p>
              </div>
              <div className="rounded-full bg-[#fff7ed] px-3 py-1 text-[12px] font-bold uppercase tracking-[0.16em] text-[#c2410c]">
                Confirmar
              </div>
            </div>

            <VerificationCodeField value={code} onChange={onCodeChange} />

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={verifying}
                className="h-[50px] flex-1 rounded-xl bg-[#ff3600] text-[15px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {verifying ? 'Validando...' : 'Entrar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onCodeChange('')
                  void onResend()
                }}
                disabled={sending}
                className="h-[50px] flex-1 rounded-xl border border-[#dddddd] text-[14px] font-semibold text-[#303030] transition hover:bg-[#f7f7f7] disabled:cursor-not-allowed disabled:opacity-70"
              >
                Reenviar
              </button>
            </div>
          </div>

          <div className="border-t border-[#ececec] px-6 py-5 text-center text-[13px] text-[#2f2f2f]">
            Nao recebeu? Confira spam ou tente reenviar em alguns segundos.
          </div>
        </form>
      )}
    </div>
  )
}

export function HomePage({
  loading,
  codeSent,
  sending,
  verifying,
  pendingEmail,
  loggedInName,
  loggedInEmail,
  onSendCode,
  onVerifyCode,
  onEnterPanel,
  onSignOut,
}: HomePageProps) {
  const [email, setEmail] = useState(pendingEmail)
  const [code, setCode] = useState('')

  useEffect(() => {
    if (pendingEmail) {
      setEmail(pendingEmail)
    }
  }, [pendingEmail])

  const filledCode = code.replace(/\D/g, '').slice(0, 6)

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim()) {
      toast.error('Informe um email para continuar.')
      return
    }

    await onSendCode(email)
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (filledCode.length !== 6) {
      toast.error('Digite os 6 digitos do codigo.')
      return
    }

    await onVerifyCode(email, filledCode)
  }

  async function handleResend() {
    if (!email.trim()) {
      toast.error('Informe um email para continuar.')
      return
    }

    await onSendCode(email)
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#181310]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.48) 38%, rgba(0,0,0,0.58) 100%), url('https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1800&q=80')",
        }}
      />

      <div className="relative flex min-h-dvh flex-col px-6 py-8 sm:px-10 lg:px-14">
        <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-between gap-10">
          <section className="max-w-[460px] pt-6">
            <h1 className="text-[2.45rem] font-bold leading-[1.06] tracking-[-0.04em] text-white sm:text-[3.45rem]">
              Voce faz tudo pelo
              <br />
              seu negocio.
              <br />
              O iFood tambem!
            </h1>
          </section>

          <section className="hidden w-full max-w-[462px] lg:block">
            {loading ? (
              <AuthSkeletonCard />
            ) : loggedInName && loggedInEmail && onEnterPanel ? (
              <LoggedInCard name={loggedInName} email={loggedInEmail} onEnterPanel={onEnterPanel} onSignOut={onSignOut} />
            ) : (
              <AuthCard
                codeSent={codeSent}
                sending={sending}
                verifying={verifying}
                email={email}
                code={filledCode}
                onEmailChange={setEmail}
                onCodeChange={setCode}
                onSend={handleSend}
                onVerify={handleVerify}
                onResend={handleResend}
              />
            )}
          </section>
        </div>

        <div className="pointer-events-none absolute bottom-8 left-6 sm:left-10 lg:left-14">
          <div className="flex overflow-hidden rounded-xl shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
            <div className="flex h-[72px] w-[88px] items-center justify-center bg-white">
              <span className="text-[1.9rem] font-black italic tracking-[-0.08em] text-[#ff3600]">ifood</span>
            </div>
            <div className="flex h-[72px] w-[136px] items-center bg-[#cc2b00] px-4 text-left">
              <p className="text-[12px] font-semibold leading-[1.15] text-white">
                Faz tudo
                <br />
                para o seu
                <br />
                negocio
                <br />
                crescer
              </p>
            </div>
          </div>
        </div>

        <section className="mt-auto block pt-10 lg:hidden">
          <div className="mx-auto w-full max-w-[462px]">
            {loading ? (
              <AuthSkeletonCard />
            ) : loggedInName && loggedInEmail && onEnterPanel ? (
              <LoggedInCard name={loggedInName} email={loggedInEmail} onEnterPanel={onEnterPanel} onSignOut={onSignOut} />
            ) : (
              <AuthCard
                codeSent={codeSent}
                sending={sending}
                verifying={verifying}
                email={email}
                code={filledCode}
                onEmailChange={setEmail}
                onCodeChange={setCode}
                onSend={handleSend}
                onVerify={handleVerify}
                onResend={handleResend}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
