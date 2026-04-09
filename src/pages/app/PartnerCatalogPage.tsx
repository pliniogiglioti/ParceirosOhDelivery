import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { formatCurrency } from '@/lib/utils'
import { SectionFrame } from '@/components/partner/PartnerUi'

export function PartnerCatalogPage() {
  const { data } = usePartnerPageData()

  return (
    <SectionFrame eyebrow="Cardapio" title="Categorias e produtos">
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="panel-card p-6">
          <h3 className="text-lg font-bold text-ink-900">Categorias</h3>
          <div className="mt-5 space-y-3">
            {data.categories.map((category) => (
              <div key={category.id} className="rounded-3xl bg-ink-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <p className="font-semibold text-ink-900">{category.name}</p>
                      <p className="text-sm text-ink-500">Ordem {category.sortOrder}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-2 text-sm font-bold text-ink-700">{category.productCount}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card p-6">
          <h3 className="text-lg font-bold text-ink-900">Produtos recentes</h3>
          <div className="mt-5 space-y-3">
            {data.products.map((product) => (
              <div key={product.id} className="rounded-3xl border border-ink-100 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink-900">{product.name}</p>
                    <p className="mt-1 text-sm leading-6 text-ink-500">{product.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-ink-900">{formatCurrency(product.price)}</p>
                    <p className="mt-1 text-xs text-ink-500">{product.featured ? 'Destaque' : 'Catalogo'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </SectionFrame>
  )
}
