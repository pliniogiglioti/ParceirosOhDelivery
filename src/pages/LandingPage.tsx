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
    <div className="min-h-dvh bg-[#111] text-white">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-[68px] items-center justify-between px-6 sm:px-10 lg:px-16"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 100%)' }}
      >
        <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="h-[40px] rounded-xl bg-[#ea1d2c] px-6 text-[14px] font-bold text-white transition hover:brightness-95"
        >
          Entrar
        </button>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-dvh items-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.52) 50%, rgba(0,0,0,0.64) 100%), url('https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1800&q=80')",
          }}
        />

        <div className="relative px-6 sm:px-10 lg:px-16">
          <p className="mb-4 text-[13px] font-bold uppercase tracking-[0.18em] text-[#ea1d2c]">
            Portal do Parceiro
          </p>
          <h1 className="max-w-[14ch] text-[2.6rem] font-bold leading-[1.05] tracking-[-0.04em] sm:text-[3.8rem] lg:text-[4.8rem]">
            Seu negócio merece crescer de verdade.
          </h1>
          <p className="mt-6 max-w-[42ch] text-[16px] leading-[1.7] text-white/70">
            Gerencie seus pedidos, cardápio e finanças em um painel simples e poderoso. Tudo que você precisa para vender mais.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="h-[52px] rounded-xl bg-[#ea1d2c] px-8 text-[15px] font-bold text-white transition hover:brightness-95"
            >
              Entrar no painel
            </button>
            <button
              type="button"
              onClick={() => navigate('/cadastro')}
              className="h-[52px] rounded-xl border border-white/30 px-8 text-[15px] font-semibold text-white transition hover:bg-white/10"
            >
              Cadastrar minha loja
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#0f0f0f] px-6 py-20 sm:px-10 lg:px-16">
        <p className="mb-3 text-center text-[13px] font-bold uppercase tracking-[0.18em] text-[#ea1d2c]">
          Por que ser parceiro?
        </p>
        <h2 className="mb-14 text-center text-[1.9rem] font-bold tracking-[-0.03em] sm:text-[2.4rem]">
          Tudo que você precisa, em um só lugar
        </h2>

        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/5 p-8 transition hover:border-[#ea1d2c]/40 hover:bg-white/8"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ea1d2c]/15 text-[#ea1d2c]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-[17px] font-bold">{title}</h3>
              <p className="text-[14px] leading-[1.7] text-white/60">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0a0a0a] px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <img src="/logo.png" alt="Logo" className="h-6 w-auto object-contain opacity-60" />
          <p className="text-[13px] text-white/40">
            © {new Date().getFullYear()} Oh Delivery. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
