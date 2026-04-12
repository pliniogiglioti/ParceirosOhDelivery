import { useNavigate } from 'react-router-dom'
import {
  LayoutGrid,
  ShoppingBag,
  BarChart2,
  MapPin,
  Clock,
  Star,
  CreditCard,
  Headphones,
  Truck,
  ChevronRight,
} from 'lucide-react'

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Cadastre sua loja',
    description: 'Preencha os dados do seu negócio, endereço e configurações de entrega em poucos minutos.',
  },
  {
    step: '02',
    title: 'Configure tudo',
    description: 'Monte seu cardápio, defina suas áreas de entrega, horários e formas de pagamento.',
  },
  {
    step: '03',
    title: 'Comece a vender',
    description: 'Receba pedidos em tempo real e gerencie tudo pelo seu painel. Simples assim.',
  },
]

const FEATURES = [
  {
    icon: LayoutGrid,
    title: 'Painel em tempo real',
    description: 'Acompanhe receita, pedidos e ticket médio do dia, semana ou mês em um dashboard completo.',
  },
  {
    icon: ShoppingBag,
    title: 'Gestão de pedidos',
    description: 'Quadro kanban visual para aceitar, preparar e despachar pedidos com arrastar e soltar.',
  },
  {
    icon: BarChart2,
    title: 'Controle financeiro',
    description: 'Extrato de repasses, breakdown por forma de pagamento e previsão do próximo depósito.',
  },
  {
    icon: ShoppingBag,
    title: 'Cardápio digital',
    description: 'Crie categorias, adicione produtos com fotos e preços, ative ou pause itens na hora.',
  },
  {
    icon: MapPin,
    title: 'Áreas de entrega',
    description: 'Defina raios de cobertura no mapa com taxas diferentes para cada zona.',
  },
  {
    icon: Truck,
    title: 'Entregadores próprios',
    description: 'Cadastre sua equipe de entrega e monitore o desempenho logístico da sua loja.',
  },
  {
    icon: Clock,
    title: 'Horários flexíveis',
    description: 'Configure o funcionamento da sua loja por dia da semana com abertura e fechamento.',
  },
  {
    icon: CreditCard,
    title: 'Formas de pagamento',
    description: 'Aceite crédito, débito e PIX. Escolha as bandeiras que você quer habilitar.',
  },
  {
    icon: Star,
    title: 'Avaliações dos clientes',
    description: 'Veja o feedback dos seus clientes, sua nota média e acompanhe sua reputação.',
  },
  {
    icon: Headphones,
    title: 'Suporte dedicado',
    description: 'Central de atendimento integrada para abrir chamados e resolver dúvidas rapidamente.',
  },
]

const STATS = [
  { value: '5%', label: 'de taxa por pedido' },
  { value: '+10 mil', label: 'lojas parceiras' },
  { value: '24h', label: 'para ativar sua loja' },
]

export function LandingPage() {
  const navigate = useNavigate()

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-dvh bg-white text-[#1d1d1d]">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-[#ececec] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[64px] max-w-6xl items-center justify-between gap-6 px-6">
          <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />

          <nav className="hidden items-center gap-7 text-[14px] font-medium text-[#555] md:flex">
            <button type="button" onClick={() => scrollTo('como-funciona')} className="transition hover:text-[#ea1d2c]">
              Como funciona
            </button>
            <button type="button" onClick={() => scrollTo('beneficios')} className="transition hover:text-[#ea1d2c]">
              Benefícios
            </button>
            <button type="button" onClick={() => scrollTo('taxa')} className="transition hover:text-[#ea1d2c]">
              Taxa
            </button>
            <button type="button" onClick={() => scrollTo('comece-agora')} className="transition hover:text-[#ea1d2c]">
              Comece agora
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="hidden h-[38px] rounded-xl border border-[#d9d9d9] px-5 text-[14px] font-semibold text-[#303030] transition hover:border-[#ea1d2c] hover:text-[#ea1d2c] sm:block"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => navigate('/cadastro')}
              className="h-[38px] rounded-xl bg-[#ea1d2c] px-5 text-[14px] font-bold text-white transition hover:brightness-95"
            >
              Seja parceiro
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-[#f0f0f0] bg-[#fafafa] py-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <span className="mb-5 inline-block rounded-full bg-[#fff1f2] px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-[#ea1d2c]">
            Para donos de restaurante
          </span>
          <h1 className="mx-auto max-w-[18ch] text-[2.6rem] font-bold leading-[1.08] tracking-[-0.035em] sm:text-[3.6rem]">
            Venda mais. Gerencie melhor. Cresça de verdade.
          </h1>
          <p className="mx-auto mt-6 max-w-[52ch] text-[17px] leading-[1.75] text-[#666]">
            O Oh Delivery coloca a sua loja na frente de milhares de clientes e te dá um painel completo para gerenciar cada detalhe do seu negócio.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/cadastro')}
              className="flex h-[52px] items-center gap-2 rounded-xl bg-[#ea1d2c] px-8 text-[15px] font-bold text-white transition hover:brightness-95"
            >
              Cadastrar minha loja <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollTo('como-funciona')}
              className="h-[52px] rounded-xl border border-[#d9d9d9] px-8 text-[15px] font-semibold text-[#303030] transition hover:border-[#ea1d2c] hover:text-[#ea1d2c]"
            >
              Como funciona
            </button>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-6 border-t border-[#ececec] pt-12">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="text-[1.9rem] font-bold tracking-[-0.03em] text-[#ea1d2c]">{value}</p>
                <p className="mt-1 text-[13px] text-[#888]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block text-[12px] font-bold uppercase tracking-[0.16em] text-[#ea1d2c]">
              Simples e rápido
            </span>
            <h2 className="text-[2rem] font-bold tracking-[-0.03em] sm:text-[2.4rem]">
              Comece a vender em 3 passos
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map(({ step, title, description }) => (
              <div key={step} className="relative">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff1f2]">
                  <span className="text-[1.1rem] font-black text-[#ea1d2c]">{step}</span>
                </div>
                <h3 className="mb-2 text-[18px] font-bold">{title}</h3>
                <p className="text-[15px] leading-[1.7] text-[#666]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios / Features */}
      <section id="beneficios" className="border-y border-[#f0f0f0] bg-[#fafafa] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block text-[12px] font-bold uppercase tracking-[0.16em] text-[#ea1d2c]">
              Tudo em um só lugar
            </span>
            <h2 className="text-[2rem] font-bold tracking-[-0.03em] sm:text-[2.4rem]">
              Um painel completo para o seu negócio
            </h2>
            <p className="mx-auto mt-4 max-w-[50ch] text-[16px] leading-[1.7] text-[#666]">
              Do pedido ao repasse, do cardápio ao suporte — tudo que você precisa para operar e crescer.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-[#e8e8e8] bg-white p-7 transition hover:border-[#ea1d2c]/30 hover:shadow-sm"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff1f2] text-[#ea1d2c]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-[16px] font-bold">{title}</h3>
                <p className="text-[14px] leading-[1.7] text-[#666]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Taxa de repasse */}
      <section id="taxa" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-start lg:gap-20">
            {/* Texto */}
            <div className="flex-1">
              <span className="mb-3 inline-block text-[12px] font-bold uppercase tracking-[0.16em] text-[#ea1d2c]">
                Transparência total
              </span>
              <h2 className="mb-5 text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[2.4rem]">
                Só <span className="text-[#ea1d2c]">5%</span> de taxa.<br />Sem surpresas.
              </h2>
              <p className="max-w-[46ch] text-[16px] leading-[1.75] text-[#666]">
                Cobramos apenas <strong className="text-[#1d1d1d]">5% sobre o valor de cada pedido</strong> pago pelo app. Sem mensalidade, sem taxa de adesão, sem letras miúdas.
              </p>
              <p className="mt-4 max-w-[46ch] text-[16px] leading-[1.75] text-[#666]">
                Os repasses são realizados de forma automática e você acompanha tudo em tempo real pelo painel financeiro.
              </p>

              <div className="mt-8 flex flex-col gap-3">
                {[
                  'Apenas pedidos com checkout no app',
                  'Sem cobrança sobre pedidos cancelados',
                  'Extrato completo de cada repasse',
                  'Previsão do próximo depósito no painel',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ea1d2c]">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[15px] text-[#444]">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card destaque */}
            <div className="w-full max-w-[340px] shrink-0">
              <div className="overflow-hidden rounded-3xl border border-[#f0f0f0] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
                <div className="bg-[#ea1d2c] px-8 py-8 text-center text-white">
                  <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-white/70">Taxa por pedido</p>
                  <p className="mt-2 text-[5rem] font-black leading-none tracking-[-0.04em]">5%</p>
                  <p className="mt-2 text-[14px] text-white/80">somente checkout no app</p>
                </div>
                <div className="px-8 py-7">
                  <ul className="space-y-3 text-[14px] text-[#555]">
                    <li className="flex items-center gap-2">
                      <span className="text-[#ea1d2c]">✓</span> Sem mensalidade
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#ea1d2c]">✓</span> Sem taxa de adesão
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#ea1d2c]">✓</span> Repasse automático
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#ea1d2c]">✓</span> Extrato em tempo real
                    </li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => navigate('/cadastro')}
                    className="mt-7 flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#ea1d2c] text-[15px] font-bold text-white transition hover:brightness-95"
                  >
                    Começar agora <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section id="comece-agora" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="overflow-hidden rounded-3xl bg-[#ea1d2c] px-10 py-16 text-center text-white">
            <h2 className="mx-auto max-w-[20ch] text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[2.6rem]">
              Pronto para colocar sua loja no mapa?
            </h2>
            <p className="mx-auto mt-5 max-w-[46ch] text-[16px] leading-[1.75] text-white/80">
              Cadastre sua loja agora e comece a receber pedidos. É rápido, gratuito para começar e sem burocracia.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/cadastro')}
                className="flex h-[52px] items-center gap-2 rounded-xl bg-white px-8 text-[15px] font-bold text-[#ea1d2c] transition hover:brightness-95"
              >
                Cadastrar minha loja <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="h-[52px] rounded-xl border border-white/40 px-8 text-[15px] font-semibold text-white transition hover:bg-white/10"
              >
                Já tenho cadastro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#ececec] bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <img src="/logo.png" alt="Logo" className="h-6 w-auto object-contain opacity-50" />
          <p className="text-[13px] text-[#aaa]">
            © {new Date().getFullYear()} Oh Delivery. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
