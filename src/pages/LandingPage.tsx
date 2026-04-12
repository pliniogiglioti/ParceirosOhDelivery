import { useEffect, useState } from 'react'
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

const SOCIAL_LINKS = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/ohdelivery',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://facebook.com/ohdelivery',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/company/ohdelivery',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com/@ohdelivery',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
]

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
  { value: 'Painel', label: 'com controle da sua operacao' },
  { value: 'Suporte', label: 'para acompanhar sua loja' },
]

const HERO_AUDIENCES = [
  'restaurante',
  'sorveteria',
  'hamburgueria',
  'pizzaria',
  'cafeteria',
  'padaria',
  'lanchonete',
  'doceria',
  'pastelaria',
  'rotisseria',
]

function RotatingAudienceBadge() {
  const [audienceIndex, setAudienceIndex] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setAudienceIndex((current) => (current + 1) % HERO_AUDIENCES.length)
    }, 2000)

    return () => window.clearInterval(interval)
  }, [])

  const audience = HERO_AUDIENCES[audienceIndex]

  return (
    <span className="hero-rotating-badge mb-5 inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full px-4 py-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#ff3600]">
      <span className="text-[#ff3600]/70">Para donos de</span>
      <span className="hero-rotating-word-shell text-left">
        <span key={audience} className="hero-rotating-word inline-block text-[#ff3600]">
          {audience}
        </span>
      </span>
    </span>
  )
}

export function LandingPage() {
  const navigate = useNavigate()

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  function goToLogin() {
    navigate('/login')
  }

  return (
    <div className="min-h-dvh bg-white text-[#1d1d1d]">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-[#ececec] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[64px] max-w-6xl items-center justify-between gap-6 px-6">
          <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />

          <nav className="hidden items-center gap-7 text-[14px] font-medium text-[#555] md:flex">
            <button type="button" onClick={() => scrollTo('como-funciona')} className="transition hover:text-[#ff3600]">
              Como funciona
            </button>
            <button type="button" onClick={() => scrollTo('beneficios')} className="transition hover:text-[#ff3600]">
              Benefícios
            </button>
            <button type="button" onClick={() => scrollTo('taxa')} className="transition hover:text-[#ff3600]">
              Taxa
            </button>
            <button type="button" onClick={() => scrollTo('comece-agora')} className="transition hover:text-[#ff3600]">
              Comece agora
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="hidden h-[38px] rounded-xl border border-[#d9d9d9] px-5 text-[14px] font-semibold text-[#303030] transition hover:border-[#ff3600] hover:text-[#ff3600] sm:block"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={goToLogin}
              className="h-[38px] rounded-xl bg-[#ff3600] px-5 text-[14px] font-bold text-white transition hover:brightness-95"
            >
              Seja parceiro
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-[#f0f0f0] bg-[#fafafa] py-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <RotatingAudienceBadge />
          <h1 className="mx-auto max-w-[18ch] text-[2.6rem] font-bold leading-[1.08] tracking-[-0.035em] sm:text-[3.6rem]">
            Venda mais. Gerencie melhor. Cresça de verdade.
          </h1>
          <p className="mx-auto mt-6 max-w-[52ch] text-[17px] leading-[1.75] text-[#666]">
            O Oh Delivery coloca a sua loja na frente de milhares de clientes e te dá um painel completo para gerenciar cada detalhe do seu negócio.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={goToLogin}
              className="flex h-[52px] items-center gap-2 rounded-xl bg-[#ff3600] px-8 text-[15px] font-bold text-white transition hover:brightness-95"
            >
              Cadastrar minha loja <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollTo('como-funciona')}
              className="h-[52px] rounded-xl border border-[#d9d9d9] px-8 text-[15px] font-semibold text-[#303030] transition hover:border-[#ff3600] hover:text-[#ff3600]"
            >
              Como funciona
            </button>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-6 border-t border-[#ececec] pt-12">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="text-[1.9rem] font-bold tracking-[-0.03em] text-[#ff3600]">{value}</p>
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
            <span className="mb-3 inline-block text-[12px] font-bold uppercase tracking-[0.16em] text-[#ff3600]">
              Simples e rápido
            </span>
            <h2 className="text-[2rem] font-bold tracking-[-0.03em] sm:text-[2.4rem]">
              Comece a vender em 3 passos
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map(({ step, title, description }) => (
              <div key={step} className="relative">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff1ee]">
                  <span className="text-[1.1rem] font-black text-[#ff3600]">{step}</span>
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
            <span className="mb-3 inline-block text-[12px] font-bold uppercase tracking-[0.16em] text-[#ff3600]">
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
                className="rounded-2xl border border-[#e8e8e8] bg-white p-7 transition hover:border-[#ff3600]/30 hover:shadow-sm"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff1ee] text-[#ff3600]">
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
              <span className="mb-3 inline-block text-[12px] font-bold uppercase tracking-[0.16em] text-[#ff3600]">
                Transparência total
              </span>
              <h2 className="mb-5 text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[2.4rem]">
                Só <span className="text-[#ff3600]">5%</span> de taxa.<br />Sem surpresas.
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
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff3600]">
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
                <div className="bg-[#ff3600] px-8 py-8 text-center text-white">
                  <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-white/70">Taxa por pedido</p>
                  <p className="mt-2 text-[5rem] font-black leading-none tracking-[-0.04em]">5%</p>
                  <p className="mt-2 text-[14px] text-white/80">somente checkout no app</p>
                </div>
                <div className="px-8 py-7">
                  <ul className="space-y-3 text-[14px] text-[#555]">
                    <li className="flex items-center gap-2">
                      <span className="text-[#ff3600]">✓</span> Sem mensalidade
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#ff3600]">✓</span> Sem taxa de adesão
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#ff3600]">✓</span> Repasse automático
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#ff3600]">✓</span> Extrato em tempo real
                    </li>
                  </ul>
                  <button
                    type="button"
                    onClick={goToLogin}
                    className="mt-7 flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#ff3600] text-[15px] font-bold text-white transition hover:brightness-95"
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
          <div className="overflow-hidden rounded-3xl bg-[#ff3600] px-10 py-16 text-center text-white">
            <h2 className="mx-auto max-w-[20ch] text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[2.6rem]">
              Pronto para colocar sua loja no mapa?
            </h2>
            <p className="mx-auto mt-5 max-w-[46ch] text-[16px] leading-[1.75] text-white/80">
              Cadastre sua loja agora e comece a receber pedidos. É rápido, gratuito para começar e sem burocracia.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={goToLogin}
                className="flex h-[52px] items-center gap-2 rounded-xl bg-white px-8 text-[15px] font-bold text-[#ff3600] transition hover:brightness-95"
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
      <footer className="border-t border-[#ececec] bg-[#fafafa]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Marca */}
            <div className="lg:col-span-1">
              <img src="/logo.png" alt="Logo" className="mb-4 h-8 w-auto object-contain" />
              <p className="text-[14px] leading-[1.7] text-[#777]">
                A plataforma completa para restaurantes e lojas venderem mais pelo delivery.
              </p>
              <div className="mt-5 flex items-center gap-3">
                {SOCIAL_LINKS.map(({ label, href, icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e0e0e0] bg-white text-[#555] transition hover:border-[#ff3600] hover:text-[#ff3600]"
                  >
                    {icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Plataforma */}
            <div>
              <p className="mb-4 text-[13px] font-bold uppercase tracking-[0.1em] text-[#333]">Plataforma</p>
              <ul className="space-y-3 text-[14px] text-[#666]">
                <li><button type="button" onClick={() => scrollTo('como-funciona')} className="transition hover:text-[#ff3600]">Como funciona</button></li>
                <li><button type="button" onClick={() => scrollTo('beneficios')} className="transition hover:text-[#ff3600]">Benefícios</button></li>
                <li><button type="button" onClick={() => scrollTo('taxa')} className="transition hover:text-[#ff3600]">Taxa e repasse</button></li>
                <li><button type="button" onClick={goToLogin} className="transition hover:text-[#ff3600]">Cadastrar minha loja</button></li>
              </ul>
            </div>

            {/* Acesso */}
            <div>
              <p className="mb-4 text-[13px] font-bold uppercase tracking-[0.1em] text-[#333]">Acesso</p>
              <ul className="space-y-3 text-[14px] text-[#666]">
                <li><button type="button" onClick={() => navigate('/login')} className="transition hover:text-[#ff3600]">Entrar no painel</button></li>
                <li><button type="button" onClick={goToLogin} className="transition hover:text-[#ff3600]">Seja parceiro</button></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="mb-4 text-[13px] font-bold uppercase tracking-[0.1em] text-[#333]">Legal</p>
              <ul className="space-y-3 text-[14px] text-[#666]">
                <li><a href="#" className="transition hover:text-[#ff3600]">Termos de uso</a></li>
                <li><a href="#" className="transition hover:text-[#ff3600]">Política de privacidade</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[#e8e8e8] pt-8 sm:flex-row">
            <p className="text-[13px] text-[#aaa]">
              © {new Date().getFullYear()} Oh Delivery. Todos os direitos reservados.
            </p>
            <p className="text-[13px] text-[#ccc]">CNPJ 62.622.102/0001-04</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
