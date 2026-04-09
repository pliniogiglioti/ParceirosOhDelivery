import {
  ArrowUpDown,
  ChevronDown,
  ChefHat,
  Clock3,
  EllipsisVertical,
  GripVertical,
  LayoutGrid,
  Package,
  PencilLine,
  Pizza,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { cn, formatCurrency } from '@/lib/utils'
import { SectionFrame } from '@/components/partner/PartnerUi'
import type { PartnerCategory } from '@/types'

function ThemeSwitch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: (nextValue: boolean) => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={[
        'inline-flex h-8 w-14 items-center rounded-[16px] px-1 transition',
        checked ? 'bg-coral-500' : 'bg-ink-200',
      ].join(' ')}
    >
      <span
        className={[
          'h-6 w-6 rounded-[14px] bg-white transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

function reorderCategoryIds(categoryIds: string[], fromCategoryId: string, toCategoryId: string) {
  if (fromCategoryId === toCategoryId) return categoryIds

  const nextCategoryIds = [...categoryIds]
  const fromIndex = nextCategoryIds.indexOf(fromCategoryId)
  const toIndex = nextCategoryIds.indexOf(toCategoryId)

  if (fromIndex === -1 || toIndex === -1) {
    return categoryIds
  }

  const [movedCategoryId] = nextCategoryIds.splice(fromIndex, 1)
  nextCategoryIds.splice(toIndex, 0, movedCategoryId)
  return nextCategoryIds
}

type CategoryTemplate = 'padrao' | 'pizza'
type ProductCreationKind = 'industrializado' | 'preparado'
type StandardItemStepTab = 'dados' | 'detalhes' | 'revisao'
type IndustrializedStepTab = 'banco' | 'cadastro' | 'revisao'
type IndustrializedCatalogItem = {
  id: string
  name: string
  brand: string
  ean: string
  description: string
  image: string
  suggestedPrice: number
}

const categoryTemplates: Array<{
  id: CategoryTemplate
  label: string
  description: string
  icon: typeof LayoutGrid
  defaultIcon: string
}> = [
  {
    id: 'padrao',
    label: 'Padrao',
    description: 'Categoria comum para lanches, bebidas, sobremesas e combos.',
    icon: LayoutGrid,
    defaultIcon: 'CT',
  },
  {
    id: 'pizza',
    label: 'Pizza',
    description: 'Modelo pensado para sabores, bordas e organizacao de pizzas.',
    icon: Pizza,
    defaultIcon: 'PZ',
  },
]

const productCreationKinds: Array<{
  id: ProductCreationKind
  label: string
  description: string
  icon: typeof Package
}> = [
  {
    id: 'industrializado',
    label: 'Industrializado',
    description: 'Para produtos prontos, embalados ou vendidos sem preparo da cozinha.',
    icon: Package,
  },
  {
    id: 'preparado',
    label: 'Preparado',
    description: 'Para itens montados ou feitos pela operacao, como lanches, pratos e porcoes.',
    icon: ChefHat,
  },
]

const standardItemStepTabs: Array<{ id: StandardItemStepTab; label: string }> = [
  { id: 'dados', label: 'Dados do produto' },
  { id: 'detalhes', label: 'Detalhes' },
  { id: 'revisao', label: 'Revisao' },
]

const industrializedStepTabs: Array<{ id: IndustrializedStepTab; label: string }> = [
  { id: 'banco', label: 'Banco de produtos' },
  { id: 'cadastro', label: 'Cadastro comum' },
  { id: 'revisao', label: 'Revisao' },
]

const industrializedCatalogItems: IndustrializedCatalogItem[] = [
  {
    id: 'ind-1',
    name: 'Coca-Cola Lata 350ml',
    brand: 'Coca-Cola',
    ean: '7894900011517',
    description: 'Refrigerante lata 350ml pronto para venda unitara.',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=900&q=80',
    suggestedPrice: 6.5,
  },
  {
    id: 'ind-2',
    name: 'Guarana Antarctica Lata 350ml',
    brand: 'Guarana Antarctica',
    ean: '7891991011024',
    description: 'Refrigerante lata 350ml com cadastro de mercado.',
    image: 'https://images.unsplash.com/photo-1605548230624-8d2d0419c517?auto=format&fit=crop&w=900&q=80',
    suggestedPrice: 6,
  },
  {
    id: 'ind-3',
    name: 'Agua Mineral sem Gas 500ml',
    brand: 'Minalba',
    ean: '7896062800220',
    description: 'Agua mineral sem gas para venda unitara.',
    image: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=900&q=80',
    suggestedPrice: 4,
  },
  {
    id: 'ind-4',
    name: 'Brownie Embalado 80g',
    brand: 'Doce Casa',
    ean: '7898937612458',
    description: 'Brownie individual embalado pronto para consumo.',
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80',
    suggestedPrice: 8.9,
  },
]

function getCategoryTemplate(category: PartnerCategory): CategoryTemplate {
  return category.template === 'pizza' ? 'pizza' : 'padrao'
}

export function PartnerCatalogPage() {
  const { data } = usePartnerPageData()
  const [catalogCategories, setCatalogCategories] = useState<PartnerCategory[]>(data.categories)
  const [selectedCategoryId, setSelectedCategoryId] = useState('all')
  const [search, setSearch] = useState('')
  const [categoryOrderIds, setCategoryOrderIds] = useState<string[]>([])
  const [sortModalOpen, setSortModalOpen] = useState(false)
  const [draftCategoryOrderIds, setDraftCategoryOrderIds] = useState<string[]>([])
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null)
  const [createCategoryModalOpen, setCreateCategoryModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryTemplate, setNewCategoryTemplate] = useState<CategoryTemplate>('padrao')
  const [addItemTypeModalOpen, setAddItemTypeModalOpen] = useState(false)
  const [standardItemStepsModalOpen, setStandardItemStepsModalOpen] = useState(false)
  const [productKindModalOpen, setProductKindModalOpen] = useState(false)
  const [addItemCategoryId, setAddItemCategoryId] = useState<string | null>(null)
  const [selectedProductCreationKind, setSelectedProductCreationKind] = useState<ProductCreationKind | null>(null)
  const [standardItemStepTab, setStandardItemStepTab] = useState<StandardItemStepTab>('dados')
  const [industrializedStepTab, setIndustrializedStepTab] = useState<IndustrializedStepTab>('banco')
  const [industrializedSearch, setIndustrializedSearch] = useState('')
  const [selectedIndustrializedItemId, setSelectedIndustrializedItemId] = useState<string | null>(null)
  const [industrializedName, setIndustrializedName] = useState('')
  const [industrializedBrand, setIndustrializedBrand] = useState('')
  const [industrializedEan, setIndustrializedEan] = useState('')
  const [industrializedDescription, setIndustrializedDescription] = useState('')
  const [industrializedImage, setIndustrializedImage] = useState('')
  const [industrializedPrice, setIndustrializedPrice] = useState('')
  const [industrializedActive, setIndustrializedActive] = useState(true)
  const [industrializedFeatured, setIndustrializedFeatured] = useState(false)
  const [expandedByCategoryId, setExpandedByCategoryId] = useState<Record<string, boolean>>({})
  const [activeByCategoryId, setActiveByCategoryId] = useState<Record<string, boolean>>({})
  const [menuOpenCategoryId, setMenuOpenCategoryId] = useState<string | null>(null)

  useEffect(() => {
    setCatalogCategories((current) => {
      if (current.length === 0) return data.categories

      const incomingIds = new Set(data.categories.map((category) => category.id))
      const preservedCustomCategories = current.filter((category) => !incomingIds.has(category.id))
      return [...data.categories, ...preservedCustomCategories]
    })
  }, [data.categories])

  useEffect(() => {
    const defaultOrderIds = [...catalogCategories]
      .sort((firstCategory, secondCategory) => firstCategory.sortOrder - secondCategory.sortOrder)
      .map((category) => category.id)

    setCategoryOrderIds((current) => {
      if (current.length === 0) {
        return defaultOrderIds
      }

      const validIds = new Set(defaultOrderIds)
      const preservedIds = current.filter((categoryId) => validIds.has(categoryId))
      const missingIds = defaultOrderIds.filter((categoryId) => !preservedIds.includes(categoryId))
      return [...preservedIds, ...missingIds]
    })

    setExpandedByCategoryId((current) =>
      catalogCategories.reduce<Record<string, boolean>>((accumulator, category) => {
        accumulator[category.id] = current[category.id] ?? false
        return accumulator
      }, {})
    )

    setActiveByCategoryId((current) =>
      catalogCategories.reduce<Record<string, boolean>>((accumulator, category) => {
        accumulator[category.id] = current[category.id] ?? category.productCount > 0
        return accumulator
      }, {})
    )
  }, [catalogCategories])

  useEffect(() => {
    if (!sortModalOpen && !createCategoryModalOpen && !addItemTypeModalOpen && !standardItemStepsModalOpen && !productKindModalOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSortModalOpen(false)
        setCreateCategoryModalOpen(false)
        setAddItemTypeModalOpen(false)
        setStandardItemStepsModalOpen(false)
        setProductKindModalOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [sortModalOpen, createCategoryModalOpen, addItemTypeModalOpen, standardItemStepsModalOpen, productKindModalOpen])

  const orderedCategories = useMemo(
    () =>
      categoryOrderIds
        .map((categoryId) => catalogCategories.find((category) => category.id === categoryId))
        .filter((category): category is (typeof data.categories)[number] => Boolean(category)),
    [catalogCategories, categoryOrderIds]
  )

  const normalizedSearch = search.trim().toLowerCase()
  const visibleCategories = orderedCategories.filter((category) => {
    if (selectedCategoryId !== 'all' && category.id !== selectedCategoryId) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    const categoryMatches = category.name.toLowerCase().includes(normalizedSearch)
    const categoryProducts = data.products.filter((product) => product.categoryId === category.id)
    const productMatches = categoryProducts.some((product) => {
      const haystack = `${product.name} ${product.description}`.toLowerCase()
      return haystack.includes(normalizedSearch)
    })

    return categoryMatches || productMatches
  })

  function handleClearFilters() {
    setSelectedCategoryId('all')
    setSearch('')
  }

  function openSortModal() {
    setDraftCategoryOrderIds(categoryOrderIds)
    setDraggingCategoryId(null)
    setSortModalOpen(true)
    setMenuOpenCategoryId(null)
  }

  function openCreateCategoryModal() {
    setNewCategoryName('')
    setNewCategoryTemplate('padrao')
    setMenuOpenCategoryId(null)
    setCreateCategoryModalOpen(true)
  }

  function handleCreateCategory() {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) {
      toast.error('Digite o nome da categoria.')
      return
    }

    const selectedTemplate = categoryTemplates.find((template) => template.id === newCategoryTemplate) ?? categoryTemplates[0]
    const nextCategory: PartnerCategory = {
      id: `category-${Date.now()}`,
      name: trimmedName,
      icon: selectedTemplate.defaultIcon,
      template: selectedTemplate.id,
      sortOrder: categoryOrderIds.length,
      productCount: 0,
    }

    setCatalogCategories((current) => [...current, nextCategory])
    setCategoryOrderIds((current) => [...current, nextCategory.id])
    setExpandedByCategoryId((current) => ({ ...current, [nextCategory.id]: false }))
    setActiveByCategoryId((current) => ({ ...current, [nextCategory.id]: true }))
    setCreateCategoryModalOpen(false)
    toast.success(`Categoria ${trimmedName} criada com sucesso.`)
  }

  function openAddItemModal(category: PartnerCategory) {
    if (getCategoryTemplate(category) === 'pizza') {
      toast('O fluxo de item para categoria Pizza entra na proxima etapa.')
      return
    }

    setAddItemCategoryId(category.id)
    setSelectedProductCreationKind(null)
    setStandardItemStepTab('dados')
    setAddItemTypeModalOpen(true)
    setMenuOpenCategoryId(null)
  }

  function handleOpenCategoryItemFlow(kind: ProductCreationKind) {
    setAddItemTypeModalOpen(false)
    setSelectedProductCreationKind(kind)

    if (kind === 'industrializado') {
      setIndustrializedStepTab('banco')
      setIndustrializedSearch('')
      setSelectedIndustrializedItemId(null)
      setIndustrializedName('')
      setIndustrializedBrand('')
      setIndustrializedEan('')
      setIndustrializedDescription('')
      setIndustrializedImage('')
      setIndustrializedPrice('')
      setIndustrializedActive(true)
      setIndustrializedFeatured(false)
      setProductKindModalOpen(true)
      return
    }

    setStandardItemStepsModalOpen(true)
  }

  function handleContinueStandardItemFlow() {
    if (standardItemStepTab === 'dados') {
      setStandardItemStepTab('detalhes')
      return
    }

    if (standardItemStepTab === 'detalhes') {
      setStandardItemStepTab('revisao')
      return
    }

    setStandardItemStepsModalOpen(false)
    toast.success(`Fluxo de item preparado iniciado para ${addItemCategory?.name ?? 'a categoria'}.`)
  }

  const addItemCategory =
    addItemCategoryId ? catalogCategories.find((category) => category.id === addItemCategoryId) ?? null : null
  const selectedProductCreationKindMeta =
    selectedProductCreationKind
      ? productCreationKinds.find((kind) => kind.id === selectedProductCreationKind) ?? null
      : null
  const filteredIndustrializedCatalogItems = useMemo(() => {
    const normalizedIndustrializedSearch = industrializedSearch.trim().toLowerCase()

    if (!normalizedIndustrializedSearch) {
      return industrializedCatalogItems
    }

    return industrializedCatalogItems.filter((item) => {
      const haystack = `${item.name} ${item.brand} ${item.ean}`.toLowerCase()
      return haystack.includes(normalizedIndustrializedSearch)
    })
  }, [industrializedSearch])

  function handleSelectIndustrializedItem(item: IndustrializedCatalogItem) {
    setSelectedIndustrializedItemId(item.id)
    setIndustrializedName(item.name)
    setIndustrializedBrand(item.brand)
    setIndustrializedEan(item.ean)
    setIndustrializedDescription(item.description)
    setIndustrializedImage(item.image)
    setIndustrializedPrice(String(item.suggestedPrice))
  }

  function handleSaveIndustrializedItem() {
    if (!selectedIndustrializedItemId) {
      toast.error('Selecione um produto da lista para continuar.')
      return
    }

    if (!industrializedName.trim() || !industrializedEan.trim() || !industrializedPrice.trim()) {
      toast.error('Preencha os campos principais do cadastro.')
      return
    }

    setProductKindModalOpen(false)
    toast.success(`Item industrializado ${industrializedName.trim()} pronto para cadastro.`)
  }

  function handleContinueIndustrializedFlow() {
    if (industrializedStepTab === 'banco') {
      if (!selectedIndustrializedItemId) {
        toast.error('Selecione um produto do banco para continuar.')
        return
      }

      setIndustrializedStepTab('cadastro')
      return
    }

    if (industrializedStepTab === 'cadastro') {
      if (!industrializedName.trim() || !industrializedEan.trim() || !industrializedPrice.trim()) {
        toast.error('Preencha os campos principais do cadastro.')
        return
      }

      setIndustrializedStepTab('revisao')
      return
    }

    handleSaveIndustrializedItem()
  }

  return (
    <>
      <SectionFrame eyebrow="Cardapio" title="Gestao por categorias">
        <div className="panel-card overflow-hidden">
          <div className="border-b border-ink-100 bg-white px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <button
                type="button"
                onClick={openSortModal}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-coral-200 bg-white px-4 text-sm font-semibold text-coral-600 transition hover:bg-coral-50"
              >
                <ArrowUpDown className="h-4 w-4" />
                Ordenar categorias
              </button>

              <button
                type="button"
                onClick={openCreateCategoryModal}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-coral-500 px-5 text-sm font-semibold text-white transition hover:bg-coral-600"
              >
                <Plus className="h-4 w-4" />
                Adicionar categoria
              </button>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div className="grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)_auto]">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Categorias</span>
                <select
                  value={selectedCategoryId}
                  onChange={(event) => setSelectedCategoryId(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm font-medium text-ink-900 outline-none transition focus:border-coral-400"
                >
                  <option value="all">Todas as categorias</option>
                  {orderedCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Buscar produto</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar produto ou categoria"
                    className="h-12 w-full rounded-2xl border border-ink-100 bg-white pl-11 pr-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400"
                  />
                </div>
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-coral-200 bg-white px-5 text-sm font-semibold text-coral-600 transition hover:bg-coral-50"
                >
                  <X className="h-4 w-4" />
                  Limpar filtros
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-ink-100 bg-ink-50 p-3 sm:p-4">
              <div className="space-y-3">
                {visibleCategories.map((category) => {
                  const products = data.products.filter((product) => product.categoryId === category.id)
                  const isExpanded = expandedByCategoryId[category.id] ?? false
                  const isActive = activeByCategoryId[category.id] ?? true

                  return (
                    <article key={category.id} className="rounded-xl border border-ink-100 bg-white">
                      <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-bold text-ink-900">{category.name}</p>
                          <p className="mt-1 text-sm text-ink-500">
                            {products.length} {products.length === 1 ? 'item' : 'itens'} cadastrados
                          </p>
                        </div>

                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                          <button
                            type="button"
                            onClick={() => openAddItemModal(category)}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-coral-200 bg-white px-4 text-sm font-semibold text-coral-600 transition hover:bg-coral-50"
                          >
                            <Plus className="h-4 w-4" />
                            Adicionar item
                          </button>

                          <button
                            type="button"
                            onClick={() => toast.success(`Edicao da categoria ${category.name} em preparacao.`)}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-ink-100 bg-ink-50 px-4 text-sm font-semibold text-ink-700 transition hover:bg-ink-100"
                          >
                            <PencilLine className="h-4 w-4" />
                            Editar categoria
                          </button>

                          <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-2">
                            <span className="text-sm font-semibold text-ink-700">Ativo</span>
                            <ThemeSwitch
                              checked={isActive}
                              onChange={(nextValue) =>
                                setActiveByCategoryId((current) => ({
                                  ...current,
                                  [category.id]: nextValue,
                                }))
                              }
                              ariaLabel={`Alternar categoria ${category.name}`}
                            />
                          </div>

                          <div className="relative flex items-center gap-2 self-end lg:self-auto">
                            <button
                              type="button"
                              onClick={() =>
                                setMenuOpenCategoryId((current) => (current === category.id ? null : category.id))
                              }
                              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50"
                              aria-label={`Abrir menu da categoria ${category.name}`}
                            >
                              <EllipsisVertical className="h-4 w-4" />
                            </button>

                            {menuOpenCategoryId === category.id ? (
                              <div className="absolute right-14 top-0 z-10 min-w-[190px] rounded-xl border border-ink-100 bg-white p-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuOpenCategoryId(null)
                                    toast('Duplicacao de categoria em preparacao.')
                                  }}
                                  className="flex w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-ink-700 transition hover:bg-ink-50"
                                >
                                  Duplicar categoria
                                </button>
                                <button
                                  type="button"
                                  onClick={openSortModal}
                                  className="flex w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-ink-700 transition hover:bg-ink-50"
                                >
                                  Mover categoria
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuOpenCategoryId(null)
                                    toast('Remocao de categoria em preparacao.')
                                  }}
                                  className="flex w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-coral-600 transition hover:bg-coral-50"
                                >
                                  Excluir categoria
                                </button>
                              </div>
                            ) : null}

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedByCategoryId((current) => ({
                                  ...current,
                                  [category.id]: !isExpanded,
                                }))
                              }
                              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50"
                              aria-label={isExpanded ? `Recolher ${category.name}` : `Expandir ${category.name}`}
                            >
                              <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="border-t border-ink-100 px-4 py-4 lg:px-5">
                          {products.length > 0 ? (
                            <div className="grid gap-3">
                              {products.map((product) => (
                                <div key={product.id} className="rounded-xl border border-ink-100 bg-ink-50/60 p-4">
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-base font-bold text-ink-900">{product.name}</p>
                                        {product.featured ? (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-coral-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-coral-700">
                                            <Sparkles className="h-3 w-3" />
                                            Destaque
                                          </span>
                                        ) : null}
                                        {!product.active ? (
                                          <span className="rounded-full bg-ink-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-600">
                                            Inativo
                                          </span>
                                        ) : null}
                                      </div>
                                      <p className="mt-2 text-sm leading-6 text-ink-500">{product.description}</p>
                                    </div>

                                    <div className="shrink-0 rounded-2xl bg-white px-4 py-3 text-right">
                                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">Preco</p>
                                      <p className="mt-1 text-base font-bold text-ink-900">{formatCurrency(product.price)}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50 px-5 py-8 text-center">
                              <p className="text-sm font-semibold text-ink-700">Nenhum item nesta categoria</p>
                              <p className="mt-2 text-sm text-ink-500">Adicione produtos para preencher esta secao do cardapio.</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="border-t border-ink-100 px-5 py-5 text-center text-sm font-medium text-ink-400">
                          Visualizacao recolhida
                        </div>
                      )}
                    </article>
                  )
                })}

                {visibleCategories.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-coral-200 bg-white px-5 py-10 text-center">
                    <p className="text-base font-semibold text-ink-800">Nenhuma categoria encontrada</p>
                    <p className="mt-2 text-sm text-ink-500">Ajuste os filtros para encontrar categorias e produtos do cardapio.</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </SectionFrame>

      {sortModalOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-900/45 p-4"
          onClick={() => setSortModalOpen(false)}
        >
          <div
            className="panel-card w-full max-w-2xl p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sort-categories-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Ordenar categorias</p>
                <h3 id="sort-categories-title" className="mt-2 text-xl font-bold text-ink-900">
                  Arraste e solte para reorganizar
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-500">
                  A ordem salva aqui passa a valer no cardapio e no filtro de categorias.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSortModalOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50"
                aria-label="Fechar ordenacao"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {draftCategoryOrderIds.map((categoryId, index) => {
                const category = catalogCategories.find((item) => item.id === categoryId)
                if (!category) return null

                return (
                  <div
                    key={category.id}
                    draggable
                    onDragStart={() => setDraggingCategoryId(category.id)}
                    onDragEnd={() => setDraggingCategoryId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (!draggingCategoryId) return
                      setDraftCategoryOrderIds((current) =>
                        reorderCategoryIds(current, draggingCategoryId, category.id)
                      )
                      setDraggingCategoryId(null)
                    }}
                    className={cn(
                      'flex items-center gap-4 rounded-xl border border-ink-100 bg-white px-4 py-4 transition',
                      draggingCategoryId === category.id && 'border-coral-300 bg-coral-50'
                    )}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-ink-500">
                      <GripVertical className="h-4 w-4" />
                    </div>

                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-ink-900">{category.name}</p>
                        <p className="mt-1 text-sm text-ink-500">
                          Posicao {index + 1} de {draftCategoryOrderIds.length}
                        </p>
                      </div>

                      <div className="rounded-xl bg-ink-50 px-3 py-2 text-sm font-semibold text-ink-600">
                        {category.productCount} {category.productCount === 1 ? 'item' : 'itens'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSortModalOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-ink-100 px-5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setCategoryOrderIds(draftCategoryOrderIds)
                  setSortModalOpen(false)
                  toast.success('Categorias reordenadas com sucesso.')
                }}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-coral-500 px-5 text-sm font-semibold text-white transition hover:bg-coral-600"
              >
                Salvar ordem
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {createCategoryModalOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-900/45 p-4"
          onClick={() => setCreateCategoryModalOpen(false)}
        >
          <div
            className="panel-card w-full max-w-2xl p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-category-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Nova categoria</p>
                <h3 id="create-category-title" className="mt-2 text-xl font-bold text-ink-900">
                  Escolha o modelo da categoria
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-500">
                  Defina o nome e selecione o tipo para criar a nova categoria do cardapio.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCreateCategoryModalOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50"
                aria-label="Fechar criacao de categoria"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-6 block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Nome da categoria</span>
              <input
                type="text"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="Ex.: Pizzas especiais"
                className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400"
              />
            </label>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Tipo de categoria</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {categoryTemplates.map((template) => {
                  const Icon = template.icon
                  const isSelected = newCategoryTemplate === template.id

                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setNewCategoryTemplate(template.id)}
                      className={cn(
                        'rounded-xl border p-5 text-left transition',
                        isSelected
                          ? 'border-coral-300 bg-coral-50 text-coral-700'
                          : 'border-ink-100 bg-white text-ink-900 hover:bg-ink-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-xl',
                            isSelected ? 'bg-coral-100 text-coral-600' : 'bg-ink-50 text-ink-600'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-base font-bold">{template.label}</p>
                          <p className={cn('mt-1 text-sm', isSelected ? 'text-coral-700/80' : 'text-ink-500')}>
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreateCategoryModalOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-ink-100 px-5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateCategory}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-coral-500 px-5 text-sm font-semibold text-white transition hover:bg-coral-600"
              >
                Criar categoria
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {addItemTypeModalOpen && addItemCategory ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-900/45 p-4"
          onClick={() => setAddItemTypeModalOpen(false)}
        >
          <div
            className="panel-card w-full max-w-2xl p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-item-type-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Adicionar item</p>
                <h3 id="add-item-type-title" className="mt-2 text-xl font-bold text-ink-900">
                  Escolha o modelo do cadastro
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-500">
                  Categoria {addItemCategory.name}. Primeiro definimos se o item sera Preparado ou Industrializado.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAddItemTypeModalOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50"
                aria-label="Fechar escolha de modelo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6">
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {productCreationKinds.map((kind) => {
                  const Icon = kind.icon

                  return (
                    <button
                      key={kind.id}
                      type="button"
                      onClick={() => handleOpenCategoryItemFlow(kind.id)}
                      className={cn(
                        'rounded-xl border border-ink-100 bg-white p-5 text-left text-ink-900 transition hover:bg-ink-50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-ink-600"
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-base font-bold">{kind.label}</p>
                          <p className="mt-1 text-sm leading-6 text-ink-500">{kind.description}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAddItemTypeModalOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-ink-100 px-5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {standardItemStepsModalOpen && addItemCategory ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-900/45 p-4"
          onClick={() => setStandardItemStepsModalOpen(false)}
        >
          <div
            className="panel-card w-full max-w-3xl p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="standard-item-steps-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Adicionar item Preparado</p>
                <h3 id="standard-item-steps-title" className="mt-2 text-xl font-bold text-ink-900">
                  Cadastro em etapas
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-500">
                  Categoria {addItemCategory.name}. O fluxo segue o modelo Preparado com abas por etapa.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStandardItemStepsModalOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50"
                aria-label="Fechar etapas do item"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-ink-100 bg-white px-4 py-3 sm:px-5">
              <div className="hide-scrollbar flex gap-2 overflow-x-auto">
                {standardItemStepTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStandardItemStepTab(tab.id)}
                    className={cn(
                      'inline-flex shrink-0 items-center rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                      standardItemStepTab === tab.id
                        ? 'border-coral-200 bg-coral-50 text-coral-700'
                        : 'border-transparent bg-transparent text-ink-500 hover:border-ink-100 hover:bg-ink-50 hover:text-ink-900'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {standardItemStepTab === 'dados' ? (
              <div className="mt-6">
                <div className="rounded-xl border border-ink-100 bg-ink-50 px-5 py-5">
                  <p className="text-sm font-semibold text-ink-800">Dados do produto preparado</p>
                  <p className="mt-2 text-sm leading-6 text-ink-500">
                    Aqui entram os campos principais do item, como nome, descricao e foto, dentro do fluxo em abas.
                  </p>
                </div>
              </div>
            ) : null}

            {standardItemStepTab === 'detalhes' ? (
              <div className="mt-6">
                <div className="rounded-xl border border-ink-100 bg-ink-50 px-5 py-5">
                  <p className="text-sm font-semibold text-ink-800">Detalhes do item</p>
                  <p className="mt-2 text-sm leading-6 text-ink-500">
                    Nesta etapa entram preco, disponibilidade, destaque e demais configuracoes do produto preparado.
                  </p>
                </div>
              </div>
            ) : null}

            {standardItemStepTab === 'revisao' ? (
              <div className="mt-6">
                <div className="rounded-xl border border-ink-100 bg-ink-50 px-5 py-5">
                  <p className="text-sm font-semibold text-ink-800">Revisao final</p>
                  <p className="mt-2 text-sm leading-6 text-ink-500">
                    Aqui fica a conferencia final antes de salvar o item preparado no cardapio.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStandardItemStepsModalOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-ink-100 px-5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleContinueStandardItemFlow}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-coral-500 px-5 text-sm font-semibold text-white transition hover:bg-coral-600"
              >
                {standardItemStepTab === 'revisao' ? 'Concluir' : 'Continuar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {productKindModalOpen && addItemCategory && selectedProductCreationKindMeta ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-900/45 p-4"
          onClick={() => setProductKindModalOpen(false)}
        >
          <div
            className="panel-card w-full max-w-5xl p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-kind-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">
                  {selectedProductCreationKindMeta.label}
                </p>
                <h3 id="product-kind-title" className="mt-2 text-xl font-bold text-ink-900">
                  Modal de {selectedProductCreationKindMeta.label.toLowerCase()}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-500">
                  Categoria {addItemCategory.name}. Esse e o proximo modal do fluxo {selectedProductCreationKindMeta.label.toLowerCase()}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setProductKindModalOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50"
                aria-label="Fechar modal do tipo de produto"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selectedProductCreationKind === 'industrializado' ? (
              <>
                <div className="mt-6 rounded-2xl border border-ink-100 bg-white px-4 py-3 sm:px-5">
                  <div className="hide-scrollbar flex gap-2 overflow-x-auto">
                    {industrializedStepTabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setIndustrializedStepTab(tab.id)}
                        className={cn(
                          'inline-flex shrink-0 items-center rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                          industrializedStepTab === tab.id
                            ? 'border-coral-200 bg-coral-50 text-coral-700'
                            : 'border-transparent bg-transparent text-ink-500 hover:border-ink-100 hover:bg-ink-50 hover:text-ink-900'
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {industrializedStepTab === 'banco' ? (
                  <div className="mt-6 rounded-xl border border-ink-100 bg-white p-4">
                    <p className="text-sm font-semibold text-ink-900">Produtos ja cadastrados no banco</p>
                    <p className="mt-2 text-sm leading-6 text-ink-500">
                      Busque por nome, marca ou EAN para selecionar um item industrializado de teste.
                    </p>

                    <div className="mt-4 relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <input
                        type="text"
                        value={industrializedSearch}
                        onChange={(event) => setIndustrializedSearch(event.target.value)}
                        placeholder="Buscar por nome ou EAN"
                        className="h-12 w-full rounded-2xl border border-ink-100 bg-white pl-11 pr-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400"
                      />
                    </div>

                    <div className="mt-4 space-y-3">
                      {filteredIndustrializedCatalogItems.map((item) => {
                        const isSelected = selectedIndustrializedItemId === item.id

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectIndustrializedItem(item)}
                            className={cn(
                              'w-full rounded-xl border p-4 text-left transition',
                              isSelected
                                ? 'border-coral-300 bg-coral-50'
                                : 'border-ink-100 bg-ink-50 hover:bg-white'
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-3">
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-ink-900">{item.name}</p>
                                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">
                                    {item.brand}
                                  </p>
                                  <p className="mt-2 text-sm text-ink-500">EAN {item.ean}</p>
                                </div>
                              </div>
                              <div className="shrink-0 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-ink-700">
                                {formatCurrency(item.suggestedPrice)}
                              </div>
                            </div>
                          </button>
                        )
                      })}

                      {filteredIndustrializedCatalogItems.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50 px-4 py-8 text-center">
                          <p className="text-sm font-semibold text-ink-700">Nenhum produto encontrado</p>
                          <p className="mt-2 text-sm text-ink-500">Ajuste a busca para localizar um item pelo EAN ou nome.</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {industrializedStepTab === 'cadastro' ? (
                  <div className="mt-6 rounded-xl border border-ink-100 bg-white p-4">
                    <p className="text-sm font-semibold text-ink-900">Cadastro comum do item</p>
                    <p className="mt-2 text-sm leading-6 text-ink-500">
                      Depois de selecionar um produto do banco, voce conclui o cadastro normalmente para o cardapio.
                    </p>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <label className="block md:col-span-2">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Imagem do produto</span>
                        <input
                          type="text"
                          value={industrializedImage}
                          onChange={(event) => setIndustrializedImage(event.target.value)}
                          placeholder="https://..."
                          className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Nome</span>
                        <input
                          type="text"
                          value={industrializedName}
                          onChange={(event) => setIndustrializedName(event.target.value)}
                          placeholder="Nome do produto"
                          className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Marca</span>
                        <input
                          type="text"
                          value={industrializedBrand}
                          onChange={(event) => setIndustrializedBrand(event.target.value)}
                          placeholder="Marca"
                          className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">EAN</span>
                        <input
                          type="text"
                          value={industrializedEan}
                          onChange={(event) => setIndustrializedEan(event.target.value)}
                          placeholder="Codigo EAN"
                          className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Preco de venda</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={industrializedPrice}
                          onChange={(event) => setIndustrializedPrice(event.target.value)}
                          placeholder="0,00"
                          className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400"
                        />
                      </label>
                    </div>

                    <label className="mt-4 block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Descricao</span>
                      <textarea
                        value={industrializedDescription}
                        onChange={(event) => setIndustrializedDescription(event.target.value)}
                        rows={4}
                        placeholder="Descricao do item"
                        className="w-full rounded-2xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400"
                      />
                    </label>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <div className="flex items-center justify-between rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-ink-900">Ativo</p>
                          <p className="mt-1 text-sm text-ink-500">Disponivel para venda no cardapio.</p>
                        </div>
                        <ThemeSwitch
                          checked={industrializedActive}
                          onChange={setIndustrializedActive}
                          ariaLabel="Alternar item industrializado ativo"
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-ink-900">Destaque</p>
                          <p className="mt-1 text-sm text-ink-500">Marcar como item em evidencia.</p>
                        </div>
                        <ThemeSwitch
                          checked={industrializedFeatured}
                          onChange={setIndustrializedFeatured}
                          ariaLabel="Alternar item industrializado destaque"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {industrializedStepTab === 'revisao' ? (
                  <div className="mt-6 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                    <div className="rounded-xl border border-ink-100 bg-white p-5">
                      <p className="text-sm font-semibold text-ink-900">Revisao final do cadastro</p>
                      <div className="mt-4 grid gap-3">
                        <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Produto</p>
                          <p className="mt-2 text-sm font-bold text-ink-900">{industrializedName || 'Nao informado'}</p>
                        </div>
                        <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Marca</p>
                          <p className="mt-2 text-sm font-bold text-ink-900">{industrializedBrand || 'Nao informada'}</p>
                        </div>
                        <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">EAN</p>
                          <p className="mt-2 text-sm font-bold text-ink-900">{industrializedEan || 'Nao informado'}</p>
                        </div>
                        <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Preco</p>
                          <p className="mt-2 text-sm font-bold text-ink-900">
                            {industrializedPrice ? formatCurrency(Number(industrializedPrice)) : 'Nao informado'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Descricao</p>
                        <p className="mt-2 text-sm leading-6 text-ink-700">{industrializedDescription || 'Sem descricao.'}</p>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-ink-100 bg-[#f6f7fb] p-4">
                      <p className="text-sm font-semibold text-ink-900">Previa no front-end</p>
                      <p className="mt-2 text-sm leading-6 text-ink-500">
                        Simulacao baseada na pagina de produto do repositorio `OhDelivery`.
                      </p>

                      <div className="mt-4 overflow-hidden rounded-[26px] border border-[#ececec] bg-white">
                        <div className="relative bg-white">
                          <img
                            src={
                              industrializedImage ||
                              'https://images.unsplash.com/photo-1543253539-6b8d4c3b7a56?auto=format&fit=crop&w=900&q=80'
                            }
                            alt={industrializedName || 'Produto'}
                            className="h-[260px] w-full object-cover"
                          />

                          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#202020]">
                              <ChevronDown className="h-4 w-4 rotate-90" />
                            </span>
                            {industrializedFeatured ? (
                              <span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-coral-700">
                                Destaque
                              </span>
                            ) : null}
                          </div>

                          <div className="absolute inset-x-0 bottom-0 flex justify-end p-4">
                            <div className="inline-flex max-w-[190px] items-center gap-2 rounded-[16px] bg-white px-2 py-1.5">
                              <img
                                src={
                                  data.store.logoImageUrl ??
                                  data.store.coverImageUrl ??
                                  (industrializedImage ||
                                    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=300&q=80')
                                }
                                alt={data.store.name}
                                className="h-9 w-9 rounded-[12px] object-cover"
                              />
                              <div className="min-w-0 text-left">
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-coral-600">
                                  Loja
                                </p>
                                <p className="line-clamp-1 text-sm font-bold text-[#202020]">{data.store.name}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 p-5">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral-600">{data.store.name}</p>
                          <div>
                            <h3 className="text-[28px] font-bold tracking-[-0.04em] text-[#202020]">
                              {industrializedName || 'Nome do produto'}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-[#666]">
                              {industrializedDescription || 'Descricao do produto para mostrar como ele apareceria na tela do app.'}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-[#666]">
                            <div className="flex items-baseline gap-2">
                              <span className="font-bold text-[#202020]">
                                {industrializedPrice ? formatCurrency(Number(industrializedPrice)) : 'R$ 0,00'}
                              </span>
                            </div>
                            <span className="flex items-center gap-1">
                              <Clock3 size={15} className="text-coral-500" />
                              15-20 min
                            </span>
                          </div>
                          <div className="rounded-2xl border border-[#ececec] bg-[#fafafa] px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a8a8a]">EAN</p>
                            <p className="mt-2 text-sm font-bold text-[#202020]">{industrializedEan || 'Nao informado'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setProductKindModalOpen(false)}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-ink-100 px-5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueIndustrializedFlow}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-coral-500 px-5 text-sm font-semibold text-white transition hover:bg-coral-600"
                  >
                    {industrializedStepTab === 'revisao' ? 'Salvar cadastro' : 'Continuar'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mt-6 rounded-xl border border-ink-100 bg-ink-50 px-5 py-5">
                  <p className="text-sm font-semibold text-ink-800">Fluxo iniciado</p>
                  <p className="mt-2 text-sm leading-6 text-ink-500">
                    Aqui entra a proxima etapa do cadastro de item {selectedProductCreationKindMeta.label.toLowerCase()}.
                  </p>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setProductKindModalOpen(false)}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-coral-500 px-5 text-sm font-semibold text-white transition hover:bg-coral-600"
                  >
                    Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
