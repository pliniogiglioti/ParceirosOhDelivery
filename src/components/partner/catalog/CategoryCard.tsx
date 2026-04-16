import {
  ChevronDown,
  EllipsisVertical,
  GripVertical,
  PencilLine,
  Plus,
  Snowflake,
  Sparkles,
} from 'lucide-react'
import { cn, formatCurrency, DEFAULT_PRODUCT_IMAGE } from '@/lib/utils'
import type { PartnerCategory, PartnerProduct } from '@/types'
import type { PizzaFlavor } from '@/types'
import { savePizzaFlavor } from '@/services/partner'
import toast from 'react-hot-toast'

interface ThemeSwitchProps {
  checked: boolean
  onChange: (nextValue: boolean) => void
  ariaLabel: string
}

function ThemeSwitch({ checked, onChange, ariaLabel }: ThemeSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={[
        'inline-flex h-5 w-9 items-center rounded-full px-0.5 transition',
        checked ? 'bg-coral-500' : 'bg-ink-200',
      ].join(' ')}
    >
      <span
        className={[
          'h-4 w-4 rounded-full bg-white transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

interface CategoryCardProps {
  category: PartnerCategory
  products: PartnerProduct[]
  isExpanded: boolean
  isActive: boolean
  dragOverCategoryId: string | null
  draggingCategoryId: string | null
  menuOpenCategoryId: string | null
  activeByProductId: Record<string, boolean>
  featuredByProductId: Record<string, boolean>
  menuOpenProductId: string | null
  flavorsByCategory: Record<string, PizzaFlavor[]>
  sizeCountByCategory: Record<string, number>
  featuredCount: number
  storeId: string
  storeData: { id: string; name: string; logoImageUrl?: string | null; coverImageUrl?: string | null }
  onDragOver: (e: React.DragEvent<HTMLElement>) => void
  onDragLeave: (e: React.DragEvent<HTMLElement>) => void
  onDrop: (e: React.DragEvent<HTMLElement>) => void
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
  onToggleExpand: () => void
  onToggleCategoryActive: (nextValue: boolean) => void
  onOpenCategoryMenu: (e: React.MouseEvent<HTMLButtonElement>) => void
  onAddItem: () => void
  onAddFlavor: () => void
  onToggleProductActive: (productId: string, nextValue: boolean) => void
  onToggleProductFeatured: (productId: string, nextValue: boolean) => void
  onOpenProductMenu: (e: React.MouseEvent<HTMLButtonElement>, productId: string) => void
  onToggleFlavorActive?: (categoryId: string, flavorId: string, nextValue: boolean) => void
  onEditFlavor: (flavor: PizzaFlavor) => void
  setFlavorsByCategory: React.Dispatch<React.SetStateAction<Record<string, PizzaFlavor[]>>>
}

function getCategoryTemplate(category: PartnerCategory): 'pizza' | 'padrao' {
  return category.template === 'pizza' ? 'pizza' : 'padrao'
}

export function CategoryCard({
  category,
  products,
  isExpanded,
  isActive,
  dragOverCategoryId,
  draggingCategoryId,
  activeByProductId,
  featuredByProductId,
  flavorsByCategory,
  sizeCountByCategory,
  storeData,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  onToggleExpand,
  onToggleCategoryActive,
  onOpenCategoryMenu,
  onAddItem,
  onAddFlavor,
  onToggleProductActive,
  onToggleProductFeatured,
  onOpenProductMenu,
  onEditFlavor,
  setFlavorsByCategory,
}: CategoryCardProps) {
  const isPizza = getCategoryTemplate(category) === 'pizza'
  const hasAtLeastOneActiveProduct = isPizza
    ? (flavorsByCategory[category.id] ?? []).some((f) => f.active)
    : products.some((p) => activeByProductId[p.id] ?? p.active)

  return (
    <article
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'rounded-xl border bg-white transition-colors duration-150',
        dragOverCategoryId === category.id && draggingCategoryId !== category.id
          ? 'border-coral-400 ring-2 ring-coral-200'
          : 'border-ink-100'
      )}
    >
      {/* Header row */}
      <div
        className="flex cursor-grab flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5"
        onClick={onToggleExpand}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="cursor-grab active:cursor-grabbing touch-none shrink-0 p-1 text-ink-300 hover:text-ink-500"
          >
            <GripVertical className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="truncate text-lg font-bold text-ink-900">{category.name}</p>
              {isPizza ? (
                <>
                  <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">
                    {(flavorsByCategory[category.id] ?? []).length} sabores
                  </span>
                  <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">
                    {sizeCountByCategory[category.id] ?? 0} tamanhos
                  </span>
                </>
              ) : (
                <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">
                  {products.length} {products.length === 1 ? 'item' : 'itens'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {isPizza ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAddFlavor() }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-coral-200 bg-white px-4 text-sm font-semibold text-coral-600 transition hover:bg-coral-50"
            >
              <Plus className="h-4 w-4" />
              Adicionar sabor
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAddItem() }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-coral-200 bg-white px-4 text-sm font-semibold text-coral-600 transition hover:bg-coral-50"
            >
              <Plus className="h-4 w-4" />
              Adicionar item
            </button>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-2"
          >
            <span className="text-sm font-semibold text-ink-700">Ativo</span>
            <ThemeSwitch
              checked={isActive}
              onChange={(nextValue) => {
                if (nextValue && !hasAtLeastOneActiveProduct && !isPizza) {
                  toast.error('Ative ao menos 1 produto da categoria antes de ativar a categoria.')
                  return
                }
                onToggleCategoryActive(nextValue)
              }}
              ariaLabel={`Alternar categoria ${category.name}`}
            />
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 self-end lg:self-auto"
          >
            <button
              type="button"
              onClick={onOpenCategoryMenu}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50"
              aria-label={`Abrir menu da categoria ${category.name}`}
            >
              <EllipsisVertical className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onToggleExpand}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50"
              aria-label={isExpanded ? `Recolher ${category.name}` : `Expandir ${category.name}`}
            >
              <ChevronDown
                className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable content */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-ink-100 px-4 py-4 lg:px-5">
            {isPizza ? (
              <PizzaFlavorsContent
                category={category}
                flavorsByCategory={flavorsByCategory}
                storeData={storeData}
                onEditFlavor={onEditFlavor}
                setFlavorsByCategory={setFlavorsByCategory}
              />
            ) : (
              <StandardProductsContent
                category={category}
                products={products}
                activeByProductId={activeByProductId}
                featuredByProductId={featuredByProductId}
                onToggleProductActive={onToggleProductActive}
                onToggleProductFeatured={onToggleProductFeatured}
                onOpenProductMenu={onOpenProductMenu}
              />
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

// ── Pizza flavors sub-component ───────────────────────────────────────────────

interface PizzaFlavorsContentProps {
  category: PartnerCategory
  flavorsByCategory: Record<string, PizzaFlavor[]>
  storeData: { id: string }
  onEditFlavor: (flavor: PizzaFlavor) => void
  setFlavorsByCategory: React.Dispatch<React.SetStateAction<Record<string, PizzaFlavor[]>>>
}

function PizzaFlavorsContent({
  category,
  flavorsByCategory,
  storeData,
  onEditFlavor,
  setFlavorsByCategory,
}: PizzaFlavorsContentProps) {
  const flavors = flavorsByCategory[category.id] ?? []

  if (flavors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50 px-5 py-8 text-center">
        <p className="text-sm font-semibold text-ink-700">Nenhum sabor cadastrado</p>
        <p className="mt-2 text-sm text-ink-500">Clique em "Adicionar sabor" para comecar.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
      <div className="hidden grid-cols-[44px_88px_minmax(0,1fr)_160px_140px_100px_44px] items-center gap-4 border-b border-ink-100 bg-ink-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-500 lg:grid">
        <span />
        <span>Sabores</span>
        <span />
        <span>Tamanho</span>
        <span>Preço</span>
        <span>Ativo</span>
        <span />
      </div>
      <div className="divide-y divide-ink-100">
        {flavors.map((flavor) => {
          const sizeCount = Object.keys(flavor.prices).length
          const prices = Object.values(flavor.prices).filter((p) => p > 0)
          const minPrice = prices.length > 0 ? Math.min(...prices) : null

          return (
            <div
              key={flavor.id}
              className="grid gap-4 px-4 py-4 lg:grid-cols-[44px_88px_minmax(0,1fr)_160px_140px_100px_44px] lg:items-center"
            >
              <div className="hidden lg:flex items-center justify-center text-ink-300">
                <GripVertical className="h-4 w-4" />
              </div>
              <div>
                <img
                  src={flavor.imageUrl ?? DEFAULT_PRODUCT_IMAGE}
                  alt={flavor.name}
                  className="h-16 w-16 rounded-xl object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink-900">{flavor.name}</p>
                {flavor.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-500">{flavor.description}</p>
                ) : null}
              </div>
              <div>
                <p className="text-xs text-ink-400">Disponível em</p>
                <p className="text-sm font-bold text-ink-900">
                  {sizeCount} tamanho{sizeCount !== 1 ? 's' : ''}
                </p>
              </div>
              <div>
                {minPrice !== null ? (
                  <>
                    <p className="text-xs text-ink-400">A partir de</p>
                    <p className="text-sm font-bold text-ink-900">{formatCurrency(minPrice)}</p>
                  </>
                ) : (
                  <p className="text-sm text-ink-400">Sem preço</p>
                )}
              </div>
              <div>
                <ThemeSwitch
                  checked={flavor.active}
                  onChange={(next) => {
                    setFlavorsByCategory((prev) => ({
                      ...prev,
                      [category.id]: (prev[category.id] ?? []).map((f) =>
                        f.id === flavor.id ? { ...f, active: next } : f
                      ),
                    }))
                    savePizzaFlavor(storeData.id, {
                      id: flavor.id,
                      categoryId: flavor.categoryId,
                      name: flavor.name,
                      description: flavor.description,
                      imageUrl: flavor.imageUrl,
                      active: next,
                      prices: flavor.prices,
                    }).catch(() => toast.error('Nao foi possivel atualizar.'))
                  }}
                  ariaLabel={`Ativo ${flavor.name}`}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onEditFlavor(flavor)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50"
                >
                  <PencilLine className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Standard products sub-component ──────────────────────────────────────────

interface StandardProductsContentProps {
  category: PartnerCategory
  products: PartnerProduct[]
  activeByProductId: Record<string, boolean>
  featuredByProductId: Record<string, boolean>
  onToggleProductActive: (productId: string, nextValue: boolean) => void
  onToggleProductFeatured: (productId: string, nextValue: boolean) => void
  onOpenProductMenu: (e: React.MouseEvent<HTMLButtonElement>, productId: string) => void
}

function StandardProductsContent({
  products,
  activeByProductId,
  featuredByProductId,
  onToggleProductActive,
  onToggleProductFeatured,
  onOpenProductMenu,
}: StandardProductsContentProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50 px-5 py-8 text-center">
        <p className="text-sm font-semibold text-ink-700">Nenhum item nesta categoria</p>
        <p className="mt-2 text-sm text-ink-500">
          Adicione produtos para preencher esta secao do cardapio.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
      <div className="hidden grid-cols-[88px_minmax(0,1.8fr)_140px_160px_128px_120px_44px] items-center gap-4 border-b border-ink-100 bg-ink-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-500 lg:grid">
        <span>Foto</span>
        <span>Nome</span>
        <span>Preco</span>
        <span>Estoque</span>
        <span>Destaque</span>
        <span>Ativo</span>
        <span />
      </div>

      <div className="divide-y divide-ink-100">
        {products.map((product) => {
          const productIsActive = activeByProductId[product.id] ?? product.active
          const productIsFeatured = featuredByProductId[product.id] ?? product.featured

          return (
            <div
              key={product.id}
              className="grid gap-4 px-4 py-4 lg:grid-cols-[88px_minmax(0,1.8fr)_140px_160px_128px_120px_44px] lg:items-center"
            >
              <div className="flex items-center gap-3 lg:block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400 lg:hidden">
                  Foto
                </span>
                <img
                  src={product.imageUrl ?? DEFAULT_PRODUCT_IMAGE}
                  alt={product.name}
                  className="h-16 w-16 rounded-xl object-cover"
                />
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400 lg:hidden">
                  Nome
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-bold text-ink-900">{product.name}</p>
                  {productIsFeatured ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-coral-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-coral-700">
                      <Sparkles className="h-3 w-3" />
                      Destaque
                    </span>
                  ) : null}
                  {product.gelada ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                      <Snowflake className="h-3 w-3" />
                      Gelada
                    </span>
                  ) : null}
                  {!productIsActive ? (
                    <span className="rounded-full bg-ink-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-600">
                      Inativo
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-500">{product.description}</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400 lg:hidden">
                  Preco
                </p>
                <p className="text-sm font-bold text-ink-900">{formatCurrency(product.price)}</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400 lg:hidden">
                  Estoque
                </p>
                <p className="text-sm font-semibold text-ink-900">
                  {product.manageStock ? product.stockQuantity ?? 0 : 'Sem controle'}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 lg:justify-start">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400 lg:hidden">
                  Destaque
                </span>
                <ThemeSwitch
                  checked={productIsFeatured}
                  onChange={(nextValue) => onToggleProductFeatured(product.id, nextValue)}
                  ariaLabel={`Alternar destaque do produto ${product.name}`}
                />
              </div>

              <div className="flex items-center justify-between gap-3 lg:justify-start">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400 lg:hidden">
                  Ativo
                </span>
                <ThemeSwitch
                  checked={productIsActive}
                  onChange={(nextValue) => onToggleProductActive(product.id, nextValue)}
                  ariaLabel={`Alternar status do produto ${product.name}`}
                />
              </div>

              <div className="flex items-center justify-end lg:justify-center">
                <button
                  type="button"
                  onClick={(e) => onOpenProductMenu(e, product.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50"
                  aria-label={`Acoes do produto ${product.name}`}
                >
                  <EllipsisVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
