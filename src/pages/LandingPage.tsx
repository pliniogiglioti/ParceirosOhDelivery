import { useNavigate } from 'react-router-dom'
import { ShoppingBag, BarChart2, Clock } from 'lucide-react'

const FEATURES = [
  {
    icon: ShoppingBag,
    title: 'Mais pedidos',
    description: 'Alcance milhares de clientes na sua região e aumente suas vendas todos os dias.',
  },
  {
    icon: BarChart2,
    title: 'Gestão completa',
    description: 'Controle pedidos, cardápio, financeiro e muito mais em um só lugar.',
  },
  {
    icon: Clock,
    title: 'Suporte dedicado',
    description: 'Nossa equipe está pronta para te ajudar a crescer a qualquer momento.',
  },
]

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh bg-white text-[#1d1d1d]">
      {/* Navbar */}
      <header className="border-b border-[#ececec] bg-white">
        <div className="mx-auto flex h-[64px] max-w-5xl items-center justify-between px-6">
          <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="h-[38px] rounded-xl bg-[#ea1d2c] px-5 text-[14px] font-bold text-white transition hover:brightness-95"
          >
            Entrar
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <span className="mb-4 inline-block rounded-full bg-[#fff1f2] px-4 py-1 text-[12px] font-bold uppercase tracking-[0.16em] text-[#ea1d2c]">
          Portal do Parceiro
        </span>
        <h1 className="mx-auto max-w-[16ch] text-[2.4rem] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[3.2rem]">
          Seu negócio merece crescer de verdade.
        </h1>
        <p className="mx-auto mt-5 max-w-[48ch] text-[16px] leading-[1.75] text-[#686868]">
          Gerencie seus pedidos, cardápio e finanças em um painel simples e poderoso. Tudo que você precisa para vender mais.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="h-[48px] rounded-xl bg-[#ea1d2c] px-7 text-[15px] font-bold text-white transition hover:brightness-95"
          >
            Entrar no painel
          </button>
          <button
            type="button"
            onClick={() => navigate('/cadastro')}
            className="h-[48px] rounded-xl border border-[#d9d9d9] px-7 text-[15px] font-semibold text-[#303030] transition hover:border-[#ea1d2c] hover:text-[#ea1d2c]"
          >
            Cadastrar minha loja
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[#f0f0f0] bg-[#fafafa] py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-12 text-center text-[1.6rem] font-bold tracking-[-0.025em] sm:text-[2rem]">
            Por que ser parceiro?
          </h2>

          <div className="grid gap-6 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-[#ececec] bg-white p-7 transition hover:border-[#ea1d2c]/30 hover:shadow-sm"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff1f2] text-[#ea1d2c]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-[16px] font-bold">{title}</h3>
                <p className="text-[14px] leading-[1.7] text-[#686868]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#ececec] bg-white px-6 py-7">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 sm:flex-row">
          <img src="/logo.png" alt="Logo" className="h-6 w-auto object-contain opacity-50" />
          <p className="text-[13px] text-[#aaaaaa]">
            © {new Date().getFullYear()} Oh Delivery. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
