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
  { value: '+10 mil', label: 'lojas parceiras' },
  { value: '98%', label: 'de satisfação' },
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
