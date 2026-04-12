import { BookOpen, ChevronRight, DollarSign, LayoutGrid, Search, ShoppingBag, Utensils } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchHelpArticles, type HelpArticle } from '@/services/help'

const CATEGORY_META: Record<string, { label: string; icon: typeof BookOpen; color: string; bg: string }> = {
  financeiro: { label: 'Financeiro',  icon: DollarSign,  color: 'text-blue-600',   bg: 'bg-blue-50'   },
  operacao:   { label: 'Operação',    icon: ShoppingBag, color: 'text-coral-600',  bg: 'bg-coral-50'  },
  cardapio:   { label: 'Cardápio',    icon: Utensils,    color: 'text-orange-600', bg: 'bg-orange-50' },
  geral:      { label: 'Geral',       icon: LayoutGrid,  color: 'text-ink-600',    bg: 'bg-ink-100'   },
}

function getCategoryMeta(category: string) {
  return CATEGORY_META[category] ?? CATEGORY_META.geral
}

function ArticleCard({ article }: { article: HelpArticle }) {
  const meta = getCategoryMeta(article.category)
  const Icon = meta.icon

  return (
    <Link
      to={`/ajuda/${article.slug}`}
      className="group flex items-start gap-4 rounded-2xl border border-ink-100 bg-white p-5 transition hover:border-coral-200 hover:shadow-soft"
    >
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.bg} ${meta.color}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink-900 group-hover:text-coral-600 transition">{article.title}</p>
        <p className="mt-1 text-sm leading-5 text-ink-500 line-clamp-2">{article.summary}</p>
        <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.bg} ${meta.color}`}>
          {meta.label}
        </span>
      </div>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-300 transition group-hover:text-coral-400" />
    </Link>
  )
}

export function HelpPage() {
  const [articles, setArticles] = useState<HelpArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    void fetchHelpArticles()
      .then(setArticles)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return articles
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    )
  }, [articles, search])

  const categories = useMemo(() => {
    const seen = new Set<string>()
    return articles.filter((a) => {
      if (seen.has(a.category)) return false
      seen.add(a.category)
      return true
    }).map((a) => a.category)
  }, [articles])

  return (
    <div className="min-h-dvh bg-[#f7f7f7]">
      {/* Header */}
      <header className="bg-white border-b border-ink-100">
        <div className="mx-auto max-w-3xl px-6 py-6 flex items-center justify-between gap-4">
          <Link to="/" className="shrink-0">
            <img src="/logo.png" alt="Oh Delivery" className="h-8 w-auto object-contain" />
          </Link>
          <Link
            to="/login"
            className="rounded-xl bg-coral-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-coral-600"
          >
            Acessar painel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-500 shadow-[0_12px_32px_rgba(255,54,0,0.22)]">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-bold text-ink-900">Central de Ajuda</h1>
          <p className="mt-2 text-ink-500">Respostas para as dúvidas mais comuns dos parceiros Oh Delivery.</p>
        </div>

        {/* Search */}
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-ink-200 bg-white px-4 py-3 shadow-soft focus-within:border-coral-300 transition">
          <Search className="h-4 w-4 shrink-0 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar artigo..."
            className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
          />
        </div>

        {/* Articles */}
        {loading ? (
          <div className="mt-10 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-ink-400">Nenhum artigo encontrado para "{search}".</p>
          </div>
        ) : search ? (
          <div className="mt-8 space-y-3">
            {filtered.map((article) => <ArticleCard key={article.id} article={article} />)}
          </div>
        ) : (
          <div className="mt-10 space-y-10">
            {categories.map((category) => {
              const meta = getCategoryMeta(category)
              const categoryArticles = filtered.filter((a) => a.category === category)
              if (!categoryArticles.length) return null
              return (
                <section key={category}>
                  <h2 className={`mb-4 text-xs font-semibold uppercase tracking-[0.18em] ${meta.color}`}>
                    {meta.label}
                  </h2>
                  <div className="space-y-3">
                    {categoryArticles.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-ink-100 bg-white py-6 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} Oh Delivery · Todos os direitos reservados
      </footer>
    </div>
  )
}
