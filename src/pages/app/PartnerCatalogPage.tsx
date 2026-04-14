import {
  ArrowUpDown,
  ChevronDown,
  ChefHat,
  Clock3,
  Copy,
  EllipsisVertical,
  GripVertical,
  LayoutGrid,
  Loader2,
  Package,
  PencilLine,
  Pizza,
  Plus,
  Search,
  Snowflake,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { usePartnerPageDataSafe } from '@/hooks/usePartnerPageData'
import { usePartnerDraftStore } from '@/hooks/usePartnerDraftStore'
import type { PartnerDashboardData } from '@/types'
import { cn, formatCurrency } from '@/lib/utils'
import { AnimatedModal } from '@/components/partner/AnimatedModal'
import { SectionFrame } from '@/components/partner/PartnerUi'
import { StoreImagePickerModal } from '@/components/partner/StoreImagePickerModal'
import type { PartnerCategory } from '@/types'
import { createProduct, createProductCategory, fetchIndustrializados, updateProduct, saveProductComplements, type IndustrializedItem } from '@/services/partner'
import type { PartnerProduct } from '@/types'

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

function formatCurrencyInput(value: string) {
  const digitsOnly = value.replace(/\D/g, '')

  if (!digitsOnly) {
    return ''
  }

  return (Number(digitsOnly) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function parseCurrencyInput(value: string) {
  const normalizedValue = value.replace(/\./g, '').replace(',', '.').trim()

  if (!normalizedValue) {
    return 0
  }

  const parsedValue = Number(normalizedValue)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

type CategoryTemplate = 'padrao' | 'pizza'
type ProductCreationKind = 'industrializado' | 'preparado'
type StandardItemStepTab = 'detalhes' | 'preco' | 'complementos' | 'classificacao' | 'analisar'
type IndustrializedStepTab = 'banco' | 'preco' | 'classificacao' | 'revisao'
type IndustrializedCatalogItem = IndustrializedItem
type ImageBankItem = {
  id: string
  label: string
  image: string
}

type ComplementSource = 'biblioteca' | 'industrializado'

interface ComplementItem {
  id: string
  name: string
  description: string
  price: number
  source: ComplementSource
  imageUrl?: string
}

interface ComplementGroup {
  id: string
  name: string
  required: boolean
  minQty: number
  maxQty: number
  items: ComplementItem[]
}

type DietaryTag = 'organico' | 'vegano' | 'sem_acucar' | 'zero_lactose' | 'vegetariano' | 'gelado'

const dietaryTags: Array<{ id: DietaryTag; label: string; description: string; emoji: string }> = [
  { id: 'organico', label: 'Organico', description: 'Produzido sem agrotoxicos ou fertilizantes quimicos.', emoji: '🌿' },
  { id: 'vegano', label: 'Vegano', description: 'Nenhum ingrediente de origem animal.', emoji: '🌱' },
  { id: 'sem_acucar', label: 'Sem acucar', description: 'Sem adicao de acucares. Perfeito para diabeticos.', emoji: '🚫' },
  { id: 'zero_lactose', label: 'Zero lactose', description: 'Livre de lactose. Indicado para intolerantes ou alergicos a lactose.', emoji: '🥛' },
  { id: 'vegetariano', label: 'Vegetariano', description: 'Nao contem carne, mas pode conter derivados de leite e ovos.', emoji: '🥗' },
  { id: 'gelado', label: 'Gelado', description: 'Do freezer direto para seu cliente.', emoji: '❄️' },
]

type ServesOption = 'nao_aplica' | '1' | '2' | '3' | '4'

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
  { id: 'detalhes', label: 'Detalhes' },
  { id: 'preco', label: 'Preco e Estoque' },
  { id: 'complementos', label: 'Complementos' },
  { id: 'classificacao', label: 'Classificacao' },
  { id: 'analisar', label: 'Analisar e Salvar' },
]

const industrializedStepTabs: Array<{ id: IndustrializedStepTab; label: string }> = [
  { id: 'banco', label: 'Banco de produtos' },
  { id: 'preco', label: 'Preco' },
  { id: 'classificacao', label: 'Classificacao' },
  { id: 'revisao', label: 'Revisao' },
]


const imageBankItems: ImageBankItem[] = [
  {
    id: 'img-1',
    label: 'Pack frontal',
    image: 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'img-2',
    label: 'Geladeira',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'img-3',
    label: 'Mesa de produto',
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'img-4',
    label: 'Close promocional',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80',
  },
]

function getCategoryTemplate(category: PartnerCategory): CategoryTemplate {
  return category.template === 'pizza' ? 'pizza' : 'padrao'
}

export function PartnerCatalogPage({
  externalData,
  embedded,
  onProductsChange,
}: {
  externalData?: PartnerDashboardData
  embedded?: boolean
  onProductsChange?: (products: PartnerDashboardData['products']) => void
} = {}) {
  const pageContext = usePartnerPageDataSafe()
  const data = externalData ?? pageContext?.data
  const { addCategory: draftAddCategory, addProduct: draftAddProduct } = usePartnerDraftStore()
  if (!data) return null
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
  const [standardItemStepTab, setStandardItemStepTab] = useState<StandardItemStepTab>('detalhes')
  const [industrializedStepTab, setIndustrializedStepTab] = useState<IndustrializedStepTab>('banco')
  const [industrializedSearch, setIndustrializedSearch] = useState('')
  const [imageBankSearch, setImageBankSearch] = useState('')
  const [selectedIndustrializedItemId, setSelectedIndustrializedItemId] = useState<string | null>(null)
  const [selectedImageBankItemId, setSelectedImageBankItemId] = useState<string | null>(null)
  const [industrializedName, setIndustrializedName] = useState('')
  const [industrializedBrand, setIndustrializedBrand] = useState('')
  const [industrializedDescription, setIndustrializedDescription] = useState('')
  const [industrializedImage, setIndustrializedImage] = useState('')
  const [industrializedPrice, setIndustrializedPrice] = useState('')
  const [industrializedPromotionPrice, setIndustrializedPromotionPrice] = useState('')
  const [industrializedActive, setIndustrializedActive] = useState(true)
  const [industrializedFeatured, setIndustrializedFeatured] = useState(false)
  const [industrializedManageStock, setIndustrializedManageStock] = useState(false)
  const [industrializedStockQty, setIndustrializedStockQty] = useState('')
  const [industrializedGelada, setIndustrializedGelada] = useState(false)
  const [savingIndustrialized, setSavingIndustrialized] = useState(false)
  const [industrializedCatalogItems, setIndustrializedCatalogItems] = useState<IndustrializedCatalogItem[]>([])

  // Edit product modal (same flow as industrialized: preco → classificacao → revisao)
  const [editProductModalOpen, setEditProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<PartnerProduct | null>(null)
  const [editStepTab, setEditStepTab] = useState<'preco' | 'classificacao' | 'revisao'>('preco')
  const [editPrice, setEditPrice] = useState('')
  const [editPromotionPrice, setEditPromotionPrice] = useState('')
  const [editManageStock, setEditManageStock] = useState(false)
  const [editStockQty, setEditStockQty] = useState('')
  const [editGelada, setEditGelada] = useState(false)
  const [editActive, setEditActive] = useState(true)
  const [editFeatured, setEditFeatured] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  // Preparado product modal
  const [prepName, setPrepName] = useState('')
  const [prepDescription, setPrepDescription] = useState('')
  const [prepImage, setPrepImage] = useState('')
  const [prepPrice, setPrepPrice] = useState('')
  const [prepPromotionPrice, setPrepPromotionPrice] = useState('')
  const [prepManageStock, setPrepManageStock] = useState(false)
  const [prepStockQty, setPrepStockQty] = useState('')
  const [prepActive, setPrepActive] = useState(true)
  const [prepFeatured, setPrepFeatured] = useState(false)
  const [prepGelada, setPrepGelada] = useState(false)
  const [prepComplementGroups, setPrepComplementGroups] = useState<ComplementGroup[]>([])
  const [prepDietaryTags, setPrepDietaryTags] = useState<DietaryTag[]>([])
  const [savingPrep, setSavingPrep] = useState(false)
  // complement group creation
  const [addingGroupName, setAddingGroupName] = useState('')
  const [addingGroupRequired, setAddingGroupRequired] = useState(false)
  const [addingGroupMin, setAddingGroupMin] = useState('1')
  const [addingGroupMax, setAddingGroupMax] = useState('1')
  const [showAddGroupForm, setShowAddGroupForm] = useState(false)
  // complement item picker per group
  const [complementPickerGroupId, setComplementPickerGroupId] = useState<string | null>(null)
  const [complementPickerSource, setComplementPickerSource] = useState<ComplementSource>('biblioteca')
  const [complementPickerSearch, setComplementPickerSearch] = useState('')
  const [newLibItemName, setNewLibItemName] = useState('')
  const [newLibItemDescription, setNewLibItemDescription] = useState('')
  const [newLibItemPrice, setNewLibItemPrice] = useState('')
  const [prepImagePickerOpen, setPrepImagePickerOpen] = useState(false)

  useEffect(() => {
    fetchIndustrializados()
      .then(setIndustrializedCatalogItems)
      .catch((err) => console.error('[industrializados]', err))
  }, [])
  const [expandedByCategoryId, setExpandedByCategoryId] = useState<Record<string, boolean>>({})
  const [activeByCategoryId, setActiveByCategoryId] = useState<Record<string, boolean>>({})
  const [activeByProductId, setActiveByProductId] = useState<Record<string, boolean>>({})
  const [featuredByProductId, setFeaturedByProductId] = useState<Record<string, boolean>>({})
  const [menuOpenCategoryId, setMenuOpenCategoryId] = useState<string | null>(null)
  const [menuOpenProductId, setMenuOpenProductId] = useState<string | null>(null)
  const [productMenuPosition, setProductMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const productMenuRef = useRef<HTMLDivElement>(null)
  const [categoryMenuPosition, setCategoryMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const categoryMenuRef = useRef<HTMLDivElement>(null)
const [showMaxFeaturedModal, setShowMaxFeaturedModal] = useState(false)
  const [catalogProducts, setCatalogProducts] = useState(data.products)

  useEffect(() => {
    setCatalogCategories((current) => {
      if (current.length === 0) return data.categories

      const incomingIds = new Set(data.categories.map((category) => category.id))
      const preservedCustomCategories = current.filter((category) => !incomingIds.has(category.id))
      return [...data.categories, ...preservedCustomCategories]
    })
  }, [data.categories])

  useEffect(() => {
    setCatalogProducts((current) => {
      const incomingIds = new Set(data.products.map((product) => product.id))
      const localOnlyProducts = current.filter((product) => !incomingIds.has(product.id))
      return [...data.products, ...localOnlyProducts]
    })
  }, [data.products])

  useEffect(() => {
    onProductsChange?.(catalogProducts)
  }, [catalogProducts, onProductsChange])

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
    setActiveByProductId((current) =>
      catalogProducts.reduce<Record<string, boolean>>((accumulator, product) => {
        accumulator[product.id] = current[product.id] ?? product.active
        return accumulator
      }, {})
    )

    setFeaturedByProductId((current) =>
      catalogProducts.reduce<Record<string, boolean>>((accumulator, product) => {
        accumulator[product.id] = current[product.id] ?? product.featured
        return accumulator
      }, {})
    )
  }, [catalogProducts])

  useEffect(() => {
    setActiveByCategoryId((current) =>
      catalogCategories.reduce<Record<string, boolean>>((accumulator, category) => {
        const categoryProducts = catalogProducts.filter((product) => product.categoryId === category.id)
        const hasAtLeastOneActiveProduct = categoryProducts.some(
          (product) => activeByProductId[product.id] ?? product.active
        )

        accumulator[category.id] =
          hasAtLeastOneActiveProduct ? current[category.id] ?? true : false

        return accumulator
      }, {})
    )
  }, [activeByProductId, catalogCategories, catalogProducts])

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

  useEffect(() => {
    if (!menuOpenProductId) return
    function handleClickOutside(event: MouseEvent) {
      if (productMenuRef.current && !productMenuRef.current.contains(event.target as Node)) {
        setMenuOpenProductId(null)
        setProductMenuPosition(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpenProductId])

  useEffect(() => {
    if (!menuOpenCategoryId) return
    function handleClickOutside(event: MouseEvent) {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setMenuOpenCategoryId(null)
        setCategoryMenuPosition(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpenCategoryId])

  const featuredCount = useMemo(
    () => Object.values(featuredByProductId).filter(Boolean).length,
    [featuredByProductId]
  )

  const orderedCategories = useMemo(
    () =>
      categoryOrderIds
        .map((categoryId) => catalogCategories.find((category) => category.id === categoryId))
        .filter((category): category is (typeof data.categories)[number] => Boolean(category)),
    [catalogCategories, categoryOrderIds]
  )

  function handleDuplicateProduct(product: (typeof catalogProducts)[number]) {
    const duplicated = {
      ...product,
      id: `${product.id}-dup-${Date.now()}`,
      name: `${product.name} (Duplicado)`,
      active: false,
      featured: false,
    }
    setCatalogProducts((current) => [...current, duplicated])
    setMenuOpenProductId(null)
  }

  function openEditProductModal(product: PartnerProduct) {
    setEditingProduct(product)
    setEditStepTab('preco')
    setEditPrice(
      product.price > 0
        ? product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : ''
    )
    setEditPromotionPrice(
      product.compareAtPrice != null && product.compareAtPrice > 0
        ? product.compareAtPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : ''
    )
    setEditManageStock(product.manageStock)
    setEditStockQty(product.stockQuantity != null ? String(product.stockQuantity) : '')
    setEditGelada(product.gelada)
    setEditActive(product.active)
    setEditFeatured(product.featured)
    setMenuOpenProductId(null)
    setProductMenuPosition(null)
    setEditProductModalOpen(true)
  }

  async function handleSaveEditProduct() {
    if (!editingProduct || !data) return

    if (!editPrice.trim()) {
      toast.error('Preencha o preco principal.')
      return
    }
    if (editPromotionPrice.trim() && editPromotionPriceValue >= editPriceValue) {
      toast.error('O preco promocional deve ser menor que o preco normal.')
      return
    }
    if (editManageStock && !editHasValidStockQty) {
      toast.error('Informe a quantidade em estoque.')
      return
    }

    setSavingEdit(true)
    try {
      const updated = await updateProduct(editingProduct.id, data.store.id, {
        name: editingProduct.name,
        description: editingProduct.description,
        price: editPriceValue,
        compareAtPrice: editPromotionPrice.trim() ? editPromotionPriceValue : null,
        imageUrl: editingProduct.imageUrl,
        manageStock: editManageStock,
        stockQuantity: editManageStock ? editStockQtyValue : null,
        gelada: editGelada,
        active: editActive,
        featured: editFeatured,
        categoryId: editingProduct.categoryId,
      })
      setCatalogProducts((current) =>
        current.map((p) => (p.id === updated.id ? updated : p))
      )
      setActiveByProductId((current) => ({ ...current, [updated.id]: updated.active }))
      setFeaturedByProductId((current) => ({ ...current, [updated.id]: updated.featured }))
      setEditProductModalOpen(false)
      toast.success(`${updated.name} atualizado com sucesso.`)
    } catch {
      toast.error('Nao foi possivel salvar as alteracoes.')
    } finally {
      setSavingEdit(false)
    }
  }

const normalizedSearch = search.trim().toLowerCase()
  const visibleCategories = orderedCategories.filter((category) => {
    if (selectedCategoryId !== 'all' && category.id !== selectedCategoryId) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    const categoryMatches = category.name.toLowerCase().includes(normalizedSearch)
    const categoryProducts = catalogProducts.filter((product) => product.categoryId === category.id)
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

  async function handleCreateCategory() {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) {
      toast.error('Digite o nome da categoria.')
      return
    }

    const selectedTemplate = categoryTemplates.find((template) => template.id === newCategoryTemplate) ?? categoryTemplates[0]

    try {
      const saved = await createProductCategory(data!.store.id, {
        name: trimmedName,
        icon: selectedTemplate.defaultIcon,
        template: selectedTemplate.id,
      })

      draftAddCategory(data!.store.id, saved)
      setCatalogCategories((current) => [...current, saved])
      setCategoryOrderIds((current) => [...current, saved.id])
      setExpandedByCategoryId((current) => ({ ...current, [saved.id]: false }))
      setActiveByCategoryId((current) => ({ ...current, [saved.id]: true }))
      setCreateCategoryModalOpen(false)
      toast.success(`Categoria ${trimmedName} criada com sucesso.`)
    } catch {
      toast.error('Nao foi possivel criar a categoria.')
    }
  }

  function openAddItemModal(category: PartnerCategory) {
    if (getCategoryTemplate(category) === 'pizza') {
      toast('O fluxo de item para categoria Pizza entra na proxima etapa.')
      return
    }

    setAddItemCategoryId(category.id)
    setSelectedProductCreationKind(null)
    setStandardItemStepTab('detalhes')
    setAddItemTypeModalOpen(true)
    setMenuOpenCategoryId(null)
  }

  function handleOpenCategoryItemFlow(kind: ProductCreationKind) {
    setAddItemTypeModalOpen(false)
    setSelectedProductCreationKind(kind)

    if (kind === 'industrializado') {
      setIndustrializedStepTab('banco')
      setIndustrializedSearch('')
      setImageBankSearch('')
      setSelectedIndustrializedItemId(null)
      setSelectedImageBankItemId(null)
      setIndustrializedName('')
      setIndustrializedBrand('')
      setIndustrializedDescription('')
      setIndustrializedImage('')
      setIndustrializedPrice('')
      setIndustrializedPromotionPrice('')
      setIndustrializedActive(true)
      setIndustrializedFeatured(false)
      setIndustrializedManageStock(false)
      setIndustrializedStockQty('')
      setIndustrializedGelada(false)
      setProductKindModalOpen(true)
      return
    }

    // preparado
    setStandardItemStepTab('detalhes')
    setPrepName('')
    setPrepDescription('')
    setPrepImage('')
    setPrepPrice('')
    setPrepPromotionPrice('')
    setPrepManageStock(false)
    setPrepStockQty('')
    setPrepActive(true)
    setPrepFeatured(false)
    setPrepGelada(false)
    setPrepComplementGroups([])
    setPrepDietaryTags([])
    setShowAddGroupForm(false)
    setComplementPickerGroupId(null)
    setProductKindModalOpen(true)
  }

  // ── Preparado helpers ──────────────────────────────────────────────────────
  const prepPriceValue = parseCurrencyInput(prepPrice)
  const prepPromotionPriceValue = parseCurrencyInput(prepPromotionPrice)
  const prepStockQtyValue = Number(prepStockQty)
  const prepHasValidStockQty =
    prepStockQty.trim().length > 0 && Number.isFinite(prepStockQtyValue) && prepStockQtyValue >= 0

  const prepStepTabs = standardItemStepTabs
  const prepCurrentStepIndex = prepStepTabs.findIndex((t) => t.id === standardItemStepTab)

  function handleContinuePrepFlow() {
    if (standardItemStepTab === 'detalhes') {
      if (!prepName.trim()) { toast.error('Informe o nome do produto.'); return }
      setStandardItemStepTab('preco')
      return
    }
    if (standardItemStepTab === 'preco') {
      if (!prepPrice.trim()) { toast.error('Preencha o preco principal.'); return }
      if (prepPromotionPrice.trim() && prepPromotionPriceValue >= prepPriceValue) {
        toast.error('O preco promocional deve ser menor que o preco normal.'); return
      }
      if (prepManageStock && !prepHasValidStockQty) { toast.error('Informe a quantidade em estoque.'); return }
      setStandardItemStepTab('complementos')
      return
    }
    if (standardItemStepTab === 'complementos') {
      setStandardItemStepTab('classificacao')
      return
    }
    if (standardItemStepTab === 'classificacao') {
      setStandardItemStepTab('analisar')
      return
    }
    void handleSavePrepProduct()
  }

  const canContinuePrepFlow =
    standardItemStepTab === 'detalhes' ? Boolean(prepName.trim()) :
    standardItemStepTab === 'preco' ?
      Boolean(prepPrice.trim()) &&
      (!prepPromotionPrice.trim() || prepPromotionPriceValue < prepPriceValue) &&
      (!prepManageStock || prepHasValidStockQty) :
    true

  async function handleSavePrepProduct() {
    if (!addItemCategoryId || !data) return
    setSavingPrep(true)
    try {
      const saved = await createProduct(data.store.id, {
        categoryId: addItemCategoryId,
        name: prepName.trim(),
        description: prepDescription.trim(),
        price: prepPriceValue,
        compareAtPrice: prepPromotionPrice.trim() ? prepPromotionPriceValue : null,
        imageUrl: prepImage || undefined,
        manageStock: prepManageStock,
        stockQuantity: prepManageStock ? prepStockQtyValue : null,
        gelada: prepGelada,
        active: prepActive,
        featured: prepFeatured,
      })

      // Salva grupos de complementos se houver
      if (prepComplementGroups.length > 0) {
        await saveProductComplements(data.store.id, saved.id, prepComplementGroups.map((g) => ({
          name: g.name,
          required: g.required,
          minQty: g.minQty,
          maxQty: g.maxQty,
          items: g.items.map((item) => ({
            source: item.source,
            name: item.name,
            description: item.description,
            price: item.price,
            imageUrl: item.imageUrl,
            libraryItemId: item.source === 'biblioteca' ? item.id : undefined,
            industrializedId: item.source === 'industrializado' ? item.id.replace(/^ind-[^-]+-\d+$/, '').split('-').slice(1, -1).join('-') : undefined,
          })),
        })))
      }

      draftAddProduct(data.store.id, saved)
      setCatalogProducts((current) => [...current, saved])
      setProductKindModalOpen(false)
      toast.success(`${prepName.trim()} adicionado ao cardapio.`)
    } catch {
      toast.error('Nao foi possivel salvar o produto.')
    } finally {
      setSavingPrep(false)
    }
  }

  function handleAddComplementGroup() {
    const name = addingGroupName.trim()
    if (!name) { toast.error('Informe o nome do grupo.'); return }
    const group: ComplementGroup = {
      id: `grp-${Date.now()}`,
      name,
      required: addingGroupRequired,
      minQty: Number(addingGroupMin) || 1,
      maxQty: Number(addingGroupMax) || 1,
      items: [],
    }
    setPrepComplementGroups((c) => [...c, group])
    setAddingGroupName('')
    setAddingGroupRequired(false)
    setAddingGroupMin('1')
    setAddingGroupMax('1')
    setShowAddGroupForm(false)
  }

  function handleAddLibItemToGroup(groupId: string) {
    const name = newLibItemName.trim()
    if (!name) { toast.error('Informe o nome do item.'); return }
    const item: ComplementItem = {
      id: `lib-${Date.now()}`,
      name,
      description: newLibItemDescription.trim(),
      price: parseCurrencyInput(newLibItemPrice),
      source: 'biblioteca',
    }
    setPrepComplementGroups((groups) =>
      groups.map((g) => g.id === groupId ? { ...g, items: [...g.items, item] } : g)
    )
    setNewLibItemName('')
    setNewLibItemDescription('')
    setNewLibItemPrice('')
    setComplementPickerGroupId(null)
  }

  function handleAddIndustrializedToGroup(groupId: string, ind: IndustrializedCatalogItem) {
    const item: ComplementItem = {
      id: `ind-${ind.id}-${Date.now()}`,
      name: ind.name,
      description: ind.description,
      price: 0,
      source: 'industrializado',
      imageUrl: ind.image,
    }
    setPrepComplementGroups((groups) =>
      groups.map((g) => g.id === groupId ? { ...g, items: [...g.items, item] } : g)
    )
    setComplementPickerGroupId(null)
  }

  function removeComplementItem(groupId: string, itemId: string) {
    setPrepComplementGroups((groups) =>
      groups.map((g) => g.id === groupId ? { ...g, items: g.items.filter((i) => i.id !== itemId) } : g)
    )
  }

  function removeComplementGroup(groupId: string) {
    setPrepComplementGroups((groups) => groups.filter((g) => g.id !== groupId))
  }

  // ── Edit helpers ────────────────────────────────────────────────────────────
  const editPriceValue = parseCurrencyInput(editPrice)
  const editPromotionPriceValue = parseCurrencyInput(editPromotionPrice)
  const editStockQtyValue = Number(editStockQty)
  const editHasValidStockQty =
    editStockQty.trim().length > 0 && Number.isFinite(editStockQtyValue) && editStockQtyValue >= 0

  const editStepTabs: Array<{ id: 'preco' | 'classificacao' | 'revisao'; label: string }> = [
    { id: 'preco', label: 'Preco' },
    { id: 'classificacao', label: 'Classificacao' },
    { id: 'revisao', label: 'Revisao' },
  ]
  const editCurrentStepIndex = editStepTabs.findIndex((t) => t.id === editStepTab)

  function handleContinueEditFlow() {
    if (editStepTab === 'preco') {
      if (!editPrice.trim()) { toast.error('Preencha o preco principal.'); return }
      if (editPromotionPrice.trim() && editPromotionPriceValue >= editPriceValue) {
        toast.error('O preco promocional deve ser menor que o preco normal.'); return
      }
      if (editManageStock && !editHasValidStockQty) { toast.error('Informe a quantidade em estoque.'); return }
      setEditStepTab('classificacao')
      return
    }
    if (editStepTab === 'classificacao') {
      setEditStepTab('revisao')
      return
    }
    void handleSaveEditProduct()
  }

  const canContinueEditFlow =
    editStepTab === 'preco'
      ? Boolean(editPrice.trim()) &&
        (!editPromotionPrice.trim() || editPromotionPriceValue < editPriceValue) &&
        (!editManageStock || editHasValidStockQty)
      : true

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
  }, [industrializedSearch, industrializedCatalogItems])

  const filteredImageBankItems = useMemo(() => {
    const normalizedImageBankSearch = imageBankSearch.trim().toLowerCase()

    if (!normalizedImageBankSearch) {
      return imageBankItems
    }

    return imageBankItems.filter((item) => item.label.toLowerCase().includes(normalizedImageBankSearch))
  }, [imageBankSearch])

  function handleSelectIndustrializedItem(item: IndustrializedCatalogItem) {
    setSelectedIndustrializedItemId(item.id)
    setIndustrializedName(item.name)
    setIndustrializedBrand(item.brand)
    setIndustrializedDescription(item.description)
    setIndustrializedImage(item.image)
    setSelectedImageBankItemId(null)
    setIndustrializedPrice('')
    setIndustrializedPromotionPrice('')
    setIndustrializedManageStock(false)
    setIndustrializedStockQty('')
    setIndustrializedGelada(false)
  }

  async function handleSaveIndustrializedItem() {
    if (!selectedIndustrializedItemId || !addItemCategoryId) {
      toast.error('Selecione um produto da lista para continuar.')
      return
    }

    if (!industrializedName.trim() || !industrializedPrice.trim()) {
      toast.error('Preencha o nome e o preco do produto.')
      return
    }

    if (industrializedManageStock && !industrializedHasValidStockQty) {
      toast.error('Informe a quantidade em estoque para continuar.')
      return
    }

    setSavingIndustrialized(true)
    try {
      const saved = await createProduct(data!.store.id, {
        categoryId: addItemCategoryId,
        name: industrializedName.trim(),
        description: industrializedDescription.trim(),
        price: industrializedPriceValue,
        compareAtPrice: industrializedPromotionPrice.trim() ? industrializedPromotionPriceValue : null,
        imageUrl: industrializedImage || undefined,
        manageStock: industrializedManageStock,
        stockQuantity: industrializedManageStock ? industrializedStockQtyValue : null,
        gelada: industrializedGelada,
        active: industrializedActive,
        featured: industrializedFeatured,
      })
      draftAddProduct(data!.store.id, saved)
      setCatalogProducts((current) => [...current, saved])
      setProductKindModalOpen(false)
      toast.success(`${industrializedName.trim()} adicionado ao cardapio.`)
    } catch {
      toast.error('Nao foi possivel salvar o produto.')
    } finally {
      setSavingIndustrialized(false)
    }
  }

  const industrializedPriceValue = parseCurrencyInput(industrializedPrice)
  const industrializedPromotionPriceValue = parseCurrencyInput(industrializedPromotionPrice)
  const industrializedStockQtyValue = Number(industrializedStockQty)
  const industrializedHasValidStockQty =
    industrializedStockQty.trim().length > 0 &&
    Number.isFinite(industrializedStockQtyValue) &&
    industrializedStockQtyValue >= 0

  function handleContinueIndustrializedFlow() {
    if (industrializedStepTab === 'banco') {
      if (!selectedIndustrializedItemId) {
        toast.error('Selecione um produto do banco para continuar.')
        return
      }

      setIndustrializedStepTab('preco')
      return
    }

    if (industrializedStepTab === 'preco') {
      if (!industrializedPrice.trim()) {
        toast.error('Preencha o preco principal do cadastro.')
        return
      }

      if (industrializedPromotionPrice.trim() && industrializedPromotionPriceValue >= industrializedPriceValue) {
        toast.error('O preco promocional deve ser menor que o preco normal.')
        return
      }

      if (industrializedManageStock && !industrializedHasValidStockQty) {
        toast.error('Informe a quantidade em estoque para continuar.')
        return
      }

      setIndustrializedStepTab('classificacao')
      return
    }

    if (industrializedStepTab === 'classificacao') {
      setIndustrializedStepTab('revisao')
      return
    }

    void handleSaveIndustrializedItem()
  }

  const canContinueIndustrializedFlow =
    industrializedStepTab === 'banco'
      ? Boolean(selectedIndustrializedItemId)
      : industrializedStepTab === 'classificacao'
        ? true
        : industrializedStepTab === 'preco'
          ? Boolean(industrializedPrice.trim()) &&
            (!industrializedPromotionPrice.trim() || industrializedPromotionPriceValue < industrializedPriceValue) &&
            (!industrializedManageStock || industrializedHasValidStockQty)
          : true
  const industrializedCurrentStepIndex = industrializedStepTabs.findIndex((tab) => tab.id === industrializedStepTab)

  const catalogCard = (
    <div className={embedded ? 'rounded-2xl bg-white shadow-sm overflow-hidden' : 'panel-card overflow-hidden'}>
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
                  const products = catalogProducts.filter((product) => product.categoryId === category.id)
                  const hasAtLeastOneActiveProduct = products.some(
                    (product) => activeByProductId[product.id] ?? product.active
                  )
                  const isExpanded = expandedByCategoryId[category.id] ?? false
                  const isActive = activeByCategoryId[category.id] ?? true

                  return (
                    <article key={category.id} className="rounded-xl border border-ink-100 bg-white">
                      <div
                        className="flex cursor-pointer flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5"
                        onClick={() =>
                          setExpandedByCategoryId((current) => ({
                            ...current,
                            [category.id]: !isExpanded,
                          }))
                        }
                      >
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-lg font-bold text-ink-900">{category.name}</p>
                            <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">
                              {products.length}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openAddItemModal(category) }}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-coral-200 bg-white px-4 text-sm font-semibold text-coral-600 transition hover:bg-coral-50"
                          >
                            <Plus className="h-4 w-4" />
                            Adicionar item
                          </button>

<div onClick={(e) => e.stopPropagation()} className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-2">
                            <span className="text-sm font-semibold text-ink-700">Ativo</span>
                            <ThemeSwitch
                              checked={isActive}
                              onChange={(nextValue) => {
                                if (nextValue && !hasAtLeastOneActiveProduct) {
                                  toast.error('Ative ao menos 1 produto da categoria antes de ativar a categoria.')
                                  return
                                }

                                setActiveByCategoryId((current) => ({
                                  ...current,
                                  [category.id]: nextValue,
                                }))
                              }}
                              ariaLabel={`Alternar categoria ${category.name}`}
                            />
                          </div>

                          <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 self-end lg:self-auto">
                            <button
                              type="button"
                              onClick={(event) => {
                                if (menuOpenCategoryId === category.id) {
                                  setMenuOpenCategoryId(null)
                                  setCategoryMenuPosition(null)
                                } else {
                                  const rect = event.currentTarget.getBoundingClientRect()
                                  setCategoryMenuPosition({
                                    top: rect.bottom + window.scrollY + 4,
                                    right: window.innerWidth - rect.right,
                                  })
                                  setMenuOpenCategoryId(category.id)
                                }
                              }}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50"
                              aria-label={`Abrir menu da categoria ${category.name}`}
                            >
                              <EllipsisVertical className="h-4 w-4" />
                            </button>

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

                      <div className={cn('grid transition-all duration-300 ease-in-out', isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                        <div className="overflow-hidden">
                        <div className="border-t border-ink-100 px-4 py-4 lg:px-5">
                          {products.length > 0 ? (
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
                                          src={
                                            product.imageUrl ??
                                            'https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/painel-vkbwb8/assets/dykp0g9ghdjn/error.png'
                                          }
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
                                          onChange={(nextValue) => {
                                            if (nextValue && featuredCount >= 6) {
                                              setShowMaxFeaturedModal(true)
                                              return
                                            }
                                            setFeaturedByProductId((current) => ({
                                              ...current,
                                              [product.id]: nextValue,
                                            }))
                                          }}
                                          ariaLabel={`Alternar destaque do produto ${product.name}`}
                                        />
                                      </div>

                                      <div className="flex items-center justify-between gap-3 lg:justify-start">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400 lg:hidden">
                                          Ativo
                                        </span>
                                        <ThemeSwitch
                                          checked={productIsActive}
                                          onChange={(nextValue) =>
                                            setActiveByProductId((current) => ({
                                              ...current,
                                              [product.id]: nextValue,
                                            }))
                                          }
                                          ariaLabel={`Alternar status do produto ${product.name}`}
                                        />
                                      </div>

                                      <div className="flex items-center justify-end lg:justify-center">
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            if (menuOpenProductId === product.id) {
                                              setMenuOpenProductId(null)
                                              setProductMenuPosition(null)
                                            } else {
                                              const rect = event.currentTarget.getBoundingClientRect()
                                              setProductMenuPosition({
                                                top: rect.bottom + window.scrollY + 4,
                                                right: window.innerWidth - rect.right,
                                              })
                                              setMenuOpenProductId(product.id)
                                            }
                                          }}
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
                          ) : (
                            <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50 px-5 py-8 text-center">
                              <p className="text-sm font-semibold text-ink-700">Nenhum item nesta categoria</p>
                              <p className="mt-2 text-sm text-ink-500">Adicione produtos para preencher esta secao do cardapio.</p>
                            </div>
                          )}
                        </div>
                        </div>
                      </div>
                    </article>
                  )
                })}

                {visibleCategories.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-coral-200 bg-white px-5 py-10 text-center">
                    <p className="text-base font-semibold text-ink-800">Você ainda não tem nenhuma categoria cadastrada.</p>
                    <p className="mt-2 text-sm text-ink-500">Comece clicando em "Adicionar categoria" para começar.</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
  )

  return (
    <>
      {embedded ? (
        <div className="flex-1 rounded-2xl bg-white shadow-sm space-y-5 p-6">
          <div>
            <h2 className="text-[18px] font-bold text-[#1d1d1d]">Seu primeiro produto</h2>
            <p className="text-[13px] text-[#8b8b8b] mt-1">Cadastre os produtos do seu cardapio.</p>
          </div>
          {catalogCard}
        </div>
      ) : (
        <SectionFrame eyebrow="Cardapio" title="Gestao por categorias">
          {catalogCard}
        </SectionFrame>
      )}

      <StoreImagePickerModal
        open={prepImagePickerOpen}
        storeId={data.store.id}
        slot="logo"
        onSelect={(url) => { setPrepImage(url); setPrepImagePickerOpen(false) }}
        onClose={() => setPrepImagePickerOpen(false)}
      />

      <AnimatedModal
        open={sortModalOpen}
        onClose={() => setSortModalOpen(false)}
        panelClassName="panel-card w-full max-w-2xl p-6"
        ariaLabelledby="sort-categories-title"
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
      </AnimatedModal>

      <AnimatedModal
        open={createCategoryModalOpen}
        onClose={() => setCreateCategoryModalOpen(false)}
        panelClassName="panel-card w-full max-w-2xl p-6"
        ariaLabelledby="create-category-title"
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
                onClick={() => void handleCreateCategory()}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-coral-500 px-5 text-sm font-semibold text-white transition hover:bg-coral-600"
              >
                Criar categoria
              </button>
            </div>
      </AnimatedModal>

      <AnimatedModal
        open={Boolean(addItemTypeModalOpen && addItemCategory)}
        onClose={() => setAddItemTypeModalOpen(false)}
        panelClassName="panel-card w-full max-w-2xl p-6"
        ariaLabelledby="add-item-type-title"
      >
        {addItemCategory ? (
          <>
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
          </>
        ) : null}
      </AnimatedModal>

      <AnimatedModal
        open={Boolean(productKindModalOpen && addItemCategory && selectedProductCreationKindMeta)}
        onClose={() => setProductKindModalOpen(false)}
        panelClassName="panel-card flex h-[min(88vh,860px)] w-full max-w-5xl flex-col p-6"
        ariaLabelledby="product-kind-title"
      >
        {addItemCategory && selectedProductCreationKindMeta ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">
                  {selectedProductCreationKindMeta.label}
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

            <div className="mt-6 flex min-h-0 flex-1 flex-col">
            {selectedProductCreationKind === 'industrializado' ? (
              <>
                <div className="rounded-2xl border border-ink-100 bg-white px-4 py-3 sm:px-5">
                  <div className="hide-scrollbar flex gap-2 overflow-x-auto">
                    {industrializedStepTabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          const tabIndex = industrializedStepTabs.findIndex((item) => item.id === tab.id)
                          if (tabIndex <= industrializedCurrentStepIndex) {
                            setIndustrializedStepTab(tab.id)
                          }
                        }}
                        disabled={industrializedStepTabs.findIndex((item) => item.id === tab.id) > industrializedCurrentStepIndex}
                        className={cn(
                          'inline-flex shrink-0 items-center rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                          industrializedStepTab === tab.id
                            ? 'border-coral-200 bg-coral-50 text-coral-700'
                            : industrializedStepTabs.findIndex((item) => item.id === tab.id) < industrializedCurrentStepIndex
                              ? 'border-transparent bg-transparent text-ink-500 hover:border-ink-100 hover:bg-ink-50 hover:text-ink-900'
                              : 'border-transparent bg-transparent text-ink-400 opacity-60'
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className={cn(
                    'mt-6 flex-1 pr-1',
                    industrializedStepTab === 'banco' ? 'min-h-0 overflow-hidden' : 'overflow-y-auto'
                  )}
                >
                {industrializedStepTab === 'banco' ? (
                  <div className="flex h-full min-h-0 flex-col rounded-xl border border-ink-100 bg-white p-4">
                    <p className="text-sm font-semibold text-ink-900">Produtos ja cadastrados no banco</p>
                    <p className="mt-2 text-sm leading-6 text-ink-500">
                      Selecione um produto industrializado ja existente para puxar os dados base do cadastro.
                    </p>

                    <div className="mt-4 relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <input
                        type="text"
                        value={industrializedSearch}
                        onChange={(event) => setIndustrializedSearch(event.target.value)}
                        placeholder="Buscar produto do banco"
                        className="h-12 w-full rounded-2xl border border-ink-100 bg-white pl-11 pr-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400"
                      />
                    </div>

                    <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
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
                                <p className="mt-2 text-sm text-ink-500 line-clamp-2">{item.description}</p>
                              </div>
                            </div>
                          </button>
                        )
                      })}

                      {filteredIndustrializedCatalogItems.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50 px-4 py-8 text-center">
                          <p className="text-sm font-semibold text-ink-700">Nenhum produto encontrado</p>
                          <p className="mt-2 text-sm text-ink-500">Ajuste a busca para localizar um item pelo nome.</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {industrializedStepTab === 'preco' ? (
                  <div className="rounded-xl border border-ink-100 bg-white p-4">
                    <p className="text-sm font-semibold text-ink-900">Preco do item</p>
                    <p className="mt-2 text-sm leading-6 text-ink-500">
                      Defina o valor normal e, se quiser, um preco promocional para aparecer riscado no produto.
                    </p>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Preco de venda</span>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-500">
                            R$
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={industrializedPrice}
                            onChange={(event) => setIndustrializedPrice(formatCurrencyInput(event.target.value))}
                            placeholder="0,00"
                            className="h-12 w-full rounded-2xl border border-ink-100 bg-white pl-11 pr-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400"
                          />
                        </div>
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Preco promocional</span>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-500">
                            R$
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={industrializedPromotionPrice}
                            onChange={(event) =>
                              setIndustrializedPromotionPrice(formatCurrencyInput(event.target.value))
                            }
                            placeholder="0,00"
                            className="h-12 w-full rounded-2xl border border-ink-100 bg-white pl-11 pr-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400"
                          />
                        </div>
                      </label>
                    </div>

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
                          onChange={(nextValue) => {
                            if (nextValue && featuredCount >= 6) {
                              setShowMaxFeaturedModal(true)
                              return
                            }
                            setIndustrializedFeatured(nextValue)
                          }}
                          ariaLabel="Alternar item industrializado destaque"
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-ink-900">Controlar estoque?</p>
                          <p className="mt-1 text-sm text-ink-500">
                            {industrializedManageStock
                              ? 'Sim. Vamos salvar a quantidade disponivel para venda.'
                              : 'Nao. O produto sera cadastrado sem controle de estoque.'}
                          </p>
                        </div>
                        <ThemeSwitch
                          checked={industrializedManageStock}
                          onChange={setIndustrializedManageStock}
                          ariaLabel="Alternar controle de estoque"
                        />
                      </div>
                    </div>

                    {industrializedManageStock && (
                      <div className="mt-3">
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-ink-700">Quantidade em estoque</span>
                          <input
                            type="number"
                            min={0}
                            value={industrializedStockQty}
                            onChange={(e) => setIndustrializedStockQty(e.target.value)}
                            className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400"
                            placeholder="Ex: 12"
                          />
                        </label>
                      </div>
                    )}

                  </div>
                ) : null}

                {industrializedStepTab === 'classificacao' ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">Classificacao do produto</p>
                      <p className="mt-1 text-sm text-ink-500">Informe as caracteristicas adicionais deste produto.</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIndustrializedGelada((v) => !v)}
                      className={`flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition ${
                        industrializedGelada
                          ? 'border-coral-400 bg-coral-50'
                          : 'border-ink-100 bg-ink-50 hover:border-ink-200'
                      }`}
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-coral-500">
                        <Snowflake className="h-5 w-5" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-ink-900">Bebida Gelada</p>
                        <p className="mt-0.5 text-sm text-ink-500">Produto servido gelado (refrigerante, cerveja, suco gelado etc.)</p>
                      </div>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          industrializedGelada ? 'border-coral-500 bg-coral-500' : 'border-ink-300 bg-white'
                        }`}
                      >
                        {industrializedGelada && (
                          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    </button>

                    {!industrializedGelada && (
                      <p className="rounded-2xl border border-ink-100 bg-white px-5 py-4 text-sm text-ink-400">
                        Nenhuma classificacao especial selecionada. Produto sera cadastrado como item comum.
                      </p>
                    )}
                  </div>
                ) : null}

                {industrializedStepTab === 'revisao' ? (
                  <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
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
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Imagem</p>
                          <p className="mt-2 text-sm font-bold text-ink-900">{selectedImageBankItemId ? 'Selecionada do banco' : 'Imagem padrao do produto'}</p>
                        </div>
                        <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Preco</p>
                          <p className="mt-2 text-sm font-bold text-ink-900">
                            {industrializedPrice ? formatCurrency(industrializedPriceValue) : 'Nao informado'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Preco promocional</p>
                          <p className="mt-2 text-sm font-bold text-ink-900">
                            {industrializedPromotionPrice
                              ? formatCurrency(industrializedPromotionPriceValue)
                              : 'Sem promocao'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Estoque</p>
                          <p className="mt-2 text-sm font-bold text-ink-900">
                            {industrializedManageStock
                              ? `${industrializedHasValidStockQty ? industrializedStockQtyValue : 0} unidades`
                              : 'Sem controle de estoque'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Classificacao</p>
                          <p className="mt-2 text-sm font-bold text-ink-900">
                            {industrializedGelada ? 'Bebida gelada' : 'Item comum'}
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
                              'https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/painel-vkbwb8/assets/dykp0g9ghdjn/error.png'
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
                                {industrializedPromotionPrice
                                  ? formatCurrency(industrializedPromotionPriceValue)
                                  : industrializedPrice
                                    ? formatCurrency(industrializedPriceValue)
                                    : 'R$ 0,00'}
                              </span>
                              {industrializedPromotionPrice && industrializedPrice ? (
                                <span className="font-bold text-[#9a9a9a] line-through">
                                  {formatCurrency(industrializedPriceValue)}
                                </span>
                              ) : null}
                            </div>
                            <span className="flex items-center gap-1">
                              <Clock3 size={15} className="text-coral-500" />
                              15-20 min
                            </span>
                          </div>
                          <div className="rounded-2xl border border-[#ececec] bg-[#fafafa] px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a8a8a]">Marca</p>
                            <p className="mt-2 text-sm font-bold text-[#202020]">{industrializedBrand || 'Nao informada'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
                </div>

                <div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-ink-100 bg-white pt-4">
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
                    disabled={!canContinueIndustrializedFlow || savingIndustrialized}
                    aria-disabled={!canContinueIndustrializedFlow || savingIndustrialized}
                    className={cn(
                      'inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white transition',
                      canContinueIndustrializedFlow && !savingIndustrialized
                        ? 'bg-coral-500 hover:bg-coral-600'
                        : 'bg-ink-300 text-white/80'
                    )}
                  >
                    {savingIndustrialized
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
                      : industrializedStepTab === 'revisao' ? 'Salvar cadastro' : 'Continuar'
                    }
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* PREPARADO FLOW */}
                <div className="rounded-2xl border border-ink-100 bg-white px-4 py-3 sm:px-5">
                  <div className="hide-scrollbar flex gap-2 overflow-x-auto">
                    {prepStepTabs.map((tab) => {
                      const tabIdx = prepStepTabs.findIndex((t) => t.id === tab.id)
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => { if (tabIdx <= prepCurrentStepIndex) setStandardItemStepTab(tab.id) }}
                          disabled={tabIdx > prepCurrentStepIndex}
                          className={cn(
                            'inline-flex shrink-0 items-center rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                            standardItemStepTab === tab.id
                              ? 'border-coral-200 bg-coral-50 text-coral-700'
                              : tabIdx < prepCurrentStepIndex
                                ? 'border-transparent text-ink-500 hover:border-ink-100 hover:bg-ink-50 hover:text-ink-900'
                                : 'border-transparent text-ink-400 opacity-60'
                          )}
                        >
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">

                  {standardItemStepTab === 'detalhes' ? (
                    <div className="space-y-4">
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Nome do produto <span className="text-coral-500">*</span></span>
                        <input type="text" value={prepName} onChange={(e) => setPrepName(e.target.value)} placeholder="Ex.: X-Burguer Especial"
                          className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400" />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Descricao</span>
                        <textarea value={prepDescription} onChange={(e) => setPrepDescription(e.target.value)} rows={3} placeholder="Descreva os ingredientes e diferenciais..."
                          className="w-full rounded-2xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400 resize-none" />
                      </label>
                      <div>
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Imagem do produto</span>
                        {prepImage ? (
                          <div className="relative">
                            <img src={prepImage} alt="preview" className="h-40 w-full rounded-2xl object-cover" />
                            <button type="button" onClick={() => setPrepImagePickerOpen(true)}
                              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow transition hover:bg-coral-500 hover:text-white">
                              Trocar imagem
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setPrepImagePickerOpen(true)}
                            className="flex h-32 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 text-sm font-semibold text-ink-500 transition hover:border-coral-400 hover:bg-coral-50 hover:text-coral-600">
                            <Plus className="h-5 w-5" /> Selecionar imagem
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {standardItemStepTab === 'preco' ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-ink-100 bg-white p-4">
                        <p className="text-sm font-semibold text-ink-900">Preco do item</p>
                        <p className="mt-1 text-sm text-ink-500">Defina o valor normal e, se quiser, um preco promocional.</p>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <label className="block">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Preco de venda <span className="text-coral-500">*</span></span>
                            <div className="relative">
                              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-500">R$</span>
                              <input type="text" inputMode="numeric" value={prepPrice} onChange={(e) => setPrepPrice(formatCurrencyInput(e.target.value))} placeholder="0,00"
                                className="h-12 w-full rounded-2xl border border-ink-100 bg-white pl-11 pr-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400" />
                            </div>
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Preco promocional</span>
                            <div className="relative">
                              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-500">R$</span>
                              <input type="text" inputMode="numeric" value={prepPromotionPrice} onChange={(e) => setPrepPromotionPrice(formatCurrencyInput(e.target.value))} placeholder="0,00"
                                className="h-12 w-full rounded-2xl border border-ink-100 bg-white pl-11 pr-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400" />
                            </div>
                          </label>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="flex items-center justify-between rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3">
                          <div><p className="text-sm font-semibold text-ink-900">Ativo</p><p className="mt-1 text-sm text-ink-500">Disponivel para venda.</p></div>
                          <ThemeSwitch checked={prepActive} onChange={setPrepActive} ariaLabel="Ativo" />
                        </div>
                        <div className="flex items-center justify-between rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3">
                          <div><p className="text-sm font-semibold text-ink-900">Destaque</p><p className="mt-1 text-sm text-ink-500">Item em evidencia.</p></div>
                          <ThemeSwitch checked={prepFeatured} onChange={(v) => { if (v && featuredCount >= 6) { setShowMaxFeaturedModal(true); return } setPrepFeatured(v) }} ariaLabel="Destaque" />
                        </div>
                        <div className="flex items-center justify-between rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3">
                          <div><p className="text-sm font-semibold text-ink-900">Controlar estoque?</p><p className="mt-1 text-sm text-ink-500">{prepManageStock ? 'Sim, com quantidade.' : 'Nao.'}</p></div>
                          <ThemeSwitch checked={prepManageStock} onChange={setPrepManageStock} ariaLabel="Controlar estoque" />
                        </div>
                      </div>
                      {prepManageStock ? (
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-ink-700">Quantidade em estoque</span>
                          <input type="number" min={0} value={prepStockQty} onChange={(e) => setPrepStockQty(e.target.value)}
                            className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400" placeholder="Ex: 12" />
                        </label>
                      ) : null}
                    </div>
                  ) : null}

                  {standardItemStepTab === 'complementos' ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-ink-900">Grupos de complementos</p>
                        <p className="mt-1 text-sm text-ink-500">Crie grupos e adicione itens da biblioteca ou do banco de industrializados.</p>
                      </div>

                      {prepComplementGroups.map((group) => (
                        <div key={group.id} className="rounded-xl border border-ink-100 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-ink-900">{group.name}</p>
                              <p className="mt-0.5 text-xs text-ink-500">{group.required ? 'Obrigatorio' : 'Opcional'} · min {group.minQty} / max {group.maxQty}</p>
                            </div>
                            <button type="button" onClick={() => removeComplementGroup(group.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-ink-100 text-ink-500 hover:bg-ink-50">
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          {group.items.length > 0 ? (
                            <div className="mt-3 space-y-2">
                              {group.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-ink-50 px-3 py-2">
                                  <div className="flex min-w-0 items-center gap-2">
                                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-8 w-8 rounded-lg object-cover shrink-0" /> : null}
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-ink-900">{item.name}</p>
                                      <p className="text-xs text-ink-500">{item.price > 0 ? `+ ${formatCurrency(item.price)}` : 'Gratis'} · {item.source === 'biblioteca' ? 'Biblioteca' : 'Industrializado'}</p>
                                    </div>
                                  </div>
                                  <button type="button" onClick={() => removeComplementItem(group.id, item.id)}
                                    className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-ink-100 text-ink-400 hover:bg-ink-100">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {complementPickerGroupId === group.id ? (
                            <div className="mt-3 rounded-xl border border-coral-200 bg-coral-50 p-3">
                              <div className="flex gap-2 mb-3">
                                <button type="button" onClick={() => setComplementPickerSource('biblioteca')}
                                  className={cn('rounded-xl border px-3 py-1.5 text-xs font-semibold transition', complementPickerSource === 'biblioteca' ? 'border-coral-300 bg-white text-coral-700' : 'border-transparent text-ink-500 hover:bg-white')}>
                                  Biblioteca
                                </button>
                                <button type="button" onClick={() => setComplementPickerSource('industrializado')}
                                  className={cn('rounded-xl border px-3 py-1.5 text-xs font-semibold transition', complementPickerSource === 'industrializado' ? 'border-coral-300 bg-white text-coral-700' : 'border-transparent text-ink-500 hover:bg-white')}>
                                  Industrializado
                                </button>
                              </div>
                              {complementPickerSource === 'biblioteca' ? (
                                <div className="space-y-2">
                                  <input type="text" value={newLibItemName} onChange={(e) => setNewLibItemName(e.target.value)} placeholder="Nome do item *"
                                    className="h-10 w-full rounded-xl border border-ink-100 bg-white px-3 text-sm outline-none focus:border-coral-400" />
                                  <input type="text" value={newLibItemDescription} onChange={(e) => setNewLibItemDescription(e.target.value)} placeholder="Descricao (opcional)"
                                    className="h-10 w-full rounded-xl border border-ink-100 bg-white px-3 text-sm outline-none focus:border-coral-400" />
                                  <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-400">R$</span>
                                    <input type="text" inputMode="numeric" value={newLibItemPrice} onChange={(e) => setNewLibItemPrice(formatCurrencyInput(e.target.value))} placeholder="0,00"
                                      className="h-10 w-full rounded-xl border border-ink-100 bg-white pl-9 pr-3 text-sm outline-none focus:border-coral-400" />
                                  </div>
                                  <div className="flex gap-2">
                                    <button type="button" onClick={() => setComplementPickerGroupId(null)}
                                      className="h-9 flex-1 rounded-xl border border-ink-100 text-sm font-semibold text-ink-600 hover:bg-white">Cancelar</button>
                                    <button type="button" onClick={() => handleAddLibItemToGroup(group.id)}
                                      className="h-9 flex-1 rounded-xl bg-coral-500 text-sm font-semibold text-white hover:bg-coral-600">Adicionar</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                                    <input type="text" value={complementPickerSearch} onChange={(e) => setComplementPickerSearch(e.target.value)} placeholder="Buscar industrializado..."
                                      className="h-10 w-full rounded-xl border border-ink-100 bg-white pl-9 pr-3 text-sm outline-none focus:border-coral-400" />
                                  </div>
                                  <div className="max-h-48 space-y-1 overflow-y-auto">
                                    {industrializedCatalogItems
                                      .filter((i) => `${i.name} ${i.brand}`.toLowerCase().includes(complementPickerSearch.toLowerCase()))
                                      .map((ind) => (
                                        <button key={ind.id} type="button" onClick={() => handleAddIndustrializedToGroup(group.id, ind)}
                                          className="flex w-full items-center gap-2 rounded-xl border border-ink-100 bg-white p-2 text-left hover:bg-ink-50">
                                          {ind.image ? <img src={ind.image} alt={ind.name} className="h-8 w-8 rounded-lg object-cover shrink-0" /> : null}
                                          <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-ink-900">{ind.name}</p>
                                            <p className="text-xs text-ink-500">{ind.brand}</p>
                                          </div>
                                        </button>
                                      ))}
                                  </div>
                                  <button type="button" onClick={() => setComplementPickerGroupId(null)}
                                    className="h-9 w-full rounded-xl border border-ink-100 text-sm font-semibold text-ink-600 hover:bg-white">Fechar</button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button type="button" onClick={() => { setComplementPickerGroupId(group.id); setComplementPickerSource('biblioteca'); setComplementPickerSearch(''); setNewLibItemName(''); setNewLibItemDescription(''); setNewLibItemPrice('') }}
                              className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl border border-dashed border-coral-300 px-3 text-sm font-semibold text-coral-600 hover:bg-coral-50">
                              <Plus className="h-4 w-4" /> Adicionar item
                            </button>
                          )}
                        </div>
                      ))}

                      {showAddGroupForm ? (
                        <div className="rounded-xl border border-coral-200 bg-coral-50 p-4 space-y-3">
                          <p className="text-sm font-bold text-ink-900">Novo grupo</p>
                          <input type="text" value={addingGroupName} onChange={(e) => setAddingGroupName(e.target.value)} placeholder="Nome do grupo *"
                            className="h-10 w-full rounded-xl border border-ink-100 bg-white px-3 text-sm outline-none focus:border-coral-400" />
                          <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                              <span className="mb-1 block text-xs font-semibold text-ink-500">Min</span>
                              <input type="number" min={0} value={addingGroupMin} onChange={(e) => setAddingGroupMin(e.target.value)}
                                className="h-10 w-full rounded-xl border border-ink-100 bg-white px-3 text-sm outline-none focus:border-coral-400" />
                            </label>
                            <label className="block">
                              <span className="mb-1 block text-xs font-semibold text-ink-500">Max</span>
                              <input type="number" min={1} value={addingGroupMax} onChange={(e) => setAddingGroupMax(e.target.value)}
                                className="h-10 w-full rounded-xl border border-ink-100 bg-white px-3 text-sm outline-none focus:border-coral-400" />
                            </label>
                          </div>
                          <div className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-3 py-2">
                            <p className="text-sm font-semibold text-ink-900">Obrigatorio</p>
                            <ThemeSwitch checked={addingGroupRequired} onChange={setAddingGroupRequired} ariaLabel="Obrigatorio" />
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setShowAddGroupForm(false)}
                              className="h-9 flex-1 rounded-xl border border-ink-100 text-sm font-semibold text-ink-600 hover:bg-white">Cancelar</button>
                            <button type="button" onClick={handleAddComplementGroup}
                              className="h-9 flex-1 rounded-xl bg-coral-500 text-sm font-semibold text-white hover:bg-coral-600">Criar grupo</button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setShowAddGroupForm(true)}
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-coral-300 text-sm font-semibold text-coral-600 hover:bg-coral-50">
                          <Plus className="h-4 w-4" /> Adicionar grupo de complementos
                        </button>
                      )}
                    </div>
                  ) : null}

                  {standardItemStepTab === 'classificacao' ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-ink-900">Restricao alimentar</p>
                      <p className="text-sm text-ink-500">Indique se seu item e adequado a restricoes alimentares diversas.</p>
                      {dietaryTags.map((tag) => {
                        const isSelected = prepDietaryTags.includes(tag.id)
                        return (
                          <button key={tag.id} type="button"
                            onClick={() => setPrepDietaryTags((prev) => isSelected ? prev.filter((t) => t !== tag.id) : [...prev, tag.id])}
                            className={cn('flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition',
                              isSelected ? 'border-coral-400 bg-coral-50' : 'border-ink-100 bg-white hover:border-ink-200')}>
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-xl">{tag.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-ink-900">{tag.label}</p>
                              <p className="mt-0.5 text-sm text-ink-500">{tag.description}</p>
                            </div>
                            <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                              isSelected ? 'border-coral-500 bg-coral-500' : 'border-ink-300 bg-white')}>
                              {isSelected && <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}

                  {standardItemStepTab === 'analisar' ? (
                    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                      <div className="rounded-xl border border-ink-100 bg-white p-5">
                        <p className="text-sm font-semibold text-ink-900">Revisao final</p>
                        <div className="mt-4 grid gap-3">
                          {([
                            { label: 'Nome', value: prepName || 'Nao informado' },
                            { label: 'Preco', value: prepPrice ? formatCurrency(prepPriceValue) : 'Nao informado' },
                            { label: 'Preco promocional', value: prepPromotionPrice ? formatCurrency(prepPromotionPriceValue) : 'Sem promocao' },
                            { label: 'Estoque', value: prepManageStock ? String(prepHasValidStockQty ? prepStockQtyValue : 0) + ' unidades' : 'Sem controle' },
                            { label: 'Grupos de complementos', value: String(prepComplementGroups.length) + ' grupo(s)' },
                            { label: 'Classificacoes', value: prepDietaryTags.length > 0 ? prepDietaryTags.map((t) => dietaryTags.find((d) => d.id === t)?.label ?? t).join(', ') : 'Nenhuma' },
                          ] as Array<{label: string; value: string}>).map(({ label, value }) => (
                            <div key={label} className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">{label}</p>
                              <p className="mt-1 text-sm font-bold text-ink-900">{value}</p>
                            </div>
                          ))}
                          {prepDescription ? (
                            <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Descricao</p>
                              <p className="mt-1 text-sm leading-6 text-ink-700">{prepDescription}</p>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-ink-100 bg-[#f6f7fb] p-4">
                        <p className="text-sm font-semibold text-ink-900">Previa no front-end</p>
                        <div className="mt-4 overflow-hidden rounded-[26px] border border-[#ececec] bg-white">
                          <div className="relative bg-white">
                            <img src={prepImage || 'https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/painel-vkbwb8/assets/dykp0g9ghdjn/error.png'} alt={prepName || 'Produto'} className="h-[220px] w-full object-cover" />
                            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#202020]">
                                <ChevronDown className="h-4 w-4 rotate-90" />
                              </span>
                              {prepFeatured ? <span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-coral-700">Destaque</span> : null}
                            </div>
                          </div>
                          <div className="space-y-3 p-5">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral-600">{data.store.name}</p>
                            <div>
                              <h3 className="text-[24px] font-bold tracking-[-0.04em] text-[#202020]">{prepName || 'Nome do produto'}</h3>
                              <p className="mt-2 text-sm leading-6 text-[#666]">{prepDescription || 'Descricao do produto.'}</p>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="font-bold text-[#202020]">
                                {prepPromotionPrice ? formatCurrency(prepPromotionPriceValue) : prepPrice ? formatCurrency(prepPriceValue) : 'R$ 0,00'}
                              </span>
                              {prepPromotionPrice && prepPrice ? <span className="font-bold text-[#9a9a9a] line-through">{formatCurrency(prepPriceValue)}</span> : null}
                            </div>
                            {prepDietaryTags.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {prepDietaryTags.map((t) => {
                                  const tag = dietaryTags.find((d) => d.id === t)
                                  return tag ? <span key={t} className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-700">{tag.emoji} {tag.label}</span> : null
                                })}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                </div>

                <div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-ink-100 bg-white pt-4">
                  <button type="button" onClick={() => setProductKindModalOpen(false)}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-ink-100 px-5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50">
                    Cancelar
                  </button>
                  <button type="button" onClick={handleContinuePrepFlow} disabled={!canContinuePrepFlow || savingPrep}
                    className={cn('inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white transition',
                      canContinuePrepFlow && !savingPrep ? 'bg-coral-500 hover:bg-coral-600' : 'bg-ink-300 text-white/80')}>
                    {savingPrep ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : standardItemStepTab === 'analisar' ? 'Salvar cadastro' : 'Continuar'}
                  </button>
                </div>
              </>
            )}

            </div>
          </>
        ) : null}
      </AnimatedModal>

      <AnimatedModal
        open={showMaxFeaturedModal}
        onClose={() => setShowMaxFeaturedModal(false)}
        panelClassName="panel-card w-full max-w-md p-6"
        ariaLabelledby="max-featured-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-coral-100 text-coral-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <button
            type="button"
            onClick={() => setShowMaxFeaturedModal(false)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 id="max-featured-title" className="mt-4 text-lg font-bold text-ink-900">
          Limite de destaques atingido
        </h3>
        <p className="mt-2 text-sm leading-6 text-ink-500">
          O cardapio permite no maximo <span className="font-semibold text-ink-800">6 produtos em destaque</span>. Remova o destaque de um produto antes de adicionar outro.
        </p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => setShowMaxFeaturedModal(false)}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-coral-500 px-5 text-sm font-semibold text-white transition hover:bg-coral-600"
          >
            Entendi
          </button>
        </div>
      </AnimatedModal>

      <AnimatedModal
        open={editProductModalOpen && editingProduct !== null}
        onClose={() => setEditProductModalOpen(false)}
        panelClassName="panel-card flex h-[min(88vh,860px)] w-full max-w-5xl flex-col p-6"
        ariaLabelledby="edit-product-title"
      >
        {editingProduct ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Editar produto</p>
              </div>
              <button
                type="button"
                onClick={() => setEditProductModalOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50"
                aria-label="Fechar edicao"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex min-h-0 flex-1 flex-col">
              <div className="rounded-2xl border border-ink-100 bg-white px-4 py-3 sm:px-5">
                <div className="hide-scrollbar flex gap-2 overflow-x-auto">
                  {editStepTabs.map((tab) => {
                    const tabIdx = editStepTabs.findIndex((t) => t.id === tab.id)
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => { if (tabIdx <= editCurrentStepIndex) setEditStepTab(tab.id) }}
                        disabled={tabIdx > editCurrentStepIndex}
                        className={cn(
                          'inline-flex shrink-0 items-center rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                          editStepTab === tab.id
                            ? 'border-coral-200 bg-coral-50 text-coral-700'
                            : tabIdx < editCurrentStepIndex
                              ? 'border-transparent text-ink-500 hover:border-ink-100 hover:bg-ink-50 hover:text-ink-900'
                              : 'border-transparent text-ink-400 opacity-60'
                        )}
                      >
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">

                {editStepTab === 'preco' ? (
                  <div className="rounded-xl border border-ink-100 bg-white p-4">
                    <p className="text-sm font-semibold text-ink-900">Preco do item</p>
                    <p className="mt-2 text-sm leading-6 text-ink-500">
                      Defina o valor normal e, se quiser, um preco promocional para aparecer riscado no produto.
                    </p>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Preco de venda</span>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-500">R$</span>
                          <input type="text" inputMode="numeric" value={editPrice} onChange={(e) => setEditPrice(formatCurrencyInput(e.target.value))} placeholder="0,00"
                            className="h-12 w-full rounded-2xl border border-ink-100 bg-white pl-11 pr-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400" />
                        </div>
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Preco promocional</span>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-500">R$</span>
                          <input type="text" inputMode="numeric" value={editPromotionPrice} onChange={(e) => setEditPromotionPrice(formatCurrencyInput(e.target.value))} placeholder="0,00"
                            className="h-12 w-full rounded-2xl border border-ink-100 bg-white pl-11 pr-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400" />
                        </div>
                      </label>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <div className="flex items-center justify-between rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3">
                        <div><p className="text-sm font-semibold text-ink-900">Ativo</p><p className="mt-1 text-sm text-ink-500">Disponivel para venda no cardapio.</p></div>
                        <ThemeSwitch checked={editActive} onChange={setEditActive} ariaLabel="Alternar ativo" />
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3">
                        <div><p className="text-sm font-semibold text-ink-900">Destaque</p><p className="mt-1 text-sm text-ink-500">Marcar como item em evidencia.</p></div>
                        <ThemeSwitch checked={editFeatured} onChange={(v) => { if (v && !editFeatured && featuredCount >= 6) { setShowMaxFeaturedModal(true); return } setEditFeatured(v) }} ariaLabel="Alternar destaque" />
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-ink-900">Controlar estoque?</p>
                          <p className="mt-1 text-sm text-ink-500">{editManageStock ? 'Sim. Vamos salvar a quantidade disponivel para venda.' : 'Nao. O produto sera cadastrado sem controle de estoque.'}</p>
                        </div>
                        <ThemeSwitch checked={editManageStock} onChange={setEditManageStock} ariaLabel="Alternar controle de estoque" />
                      </div>
                    </div>

                    {editManageStock ? (
                      <div className="mt-3">
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-ink-700">Quantidade em estoque</span>
                          <input type="number" min={0} value={editStockQty} onChange={(e) => setEditStockQty(e.target.value)}
                            className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400" placeholder="Ex: 12" />
                        </label>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {editStepTab === 'classificacao' ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">Classificacao do produto</p>
                      <p className="mt-1 text-sm text-ink-500">Informe as caracteristicas adicionais deste produto.</p>
                    </div>
                    <button type="button" onClick={() => setEditGelada((v) => !v)}
                      className={`flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition ${editGelada ? 'border-coral-400 bg-coral-50' : 'border-ink-100 bg-ink-50 hover:border-ink-200'}`}>
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-coral-500">
                        <Snowflake className="h-5 w-5" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-ink-900">Bebida Gelada</p>
                        <p className="mt-0.5 text-sm text-ink-500">Produto servido gelado (refrigerante, cerveja, suco gelado etc.)</p>
                      </div>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${editGelada ? 'border-coral-500 bg-coral-500' : 'border-ink-300 bg-white'}`}>
                        {editGelada && <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </span>
                    </button>
                    {!editGelada && (
                      <p className="rounded-2xl border border-ink-100 bg-white px-5 py-4 text-sm text-ink-400">
                        Nenhuma classificacao especial selecionada. Produto sera cadastrado como item comum.
                      </p>
                    )}
                  </div>
                ) : null}

                {editStepTab === 'revisao' ? (
                  <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                    <div className="rounded-xl border border-ink-100 bg-white p-5">
                      <p className="text-sm font-semibold text-ink-900">Revisao final do cadastro</p>
                      <div className="mt-4 grid gap-3">
                        <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Produto</p>
                          <p className="mt-2 text-sm font-bold text-ink-900">{editingProduct.name}</p>
                        </div>
                        <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Preco</p>
                          <p className="mt-2 text-sm font-bold text-ink-900">{editPrice ? formatCurrency(editPriceValue) : 'Nao informado'}</p>
                        </div>
                        <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Preco promocional</p>
                          <p className="mt-2 text-sm font-bold text-ink-900">{editPromotionPrice ? formatCurrency(editPromotionPriceValue) : 'Sem promocao'}</p>
                        </div>
                        <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Estoque</p>
                          <p className="mt-2 text-sm font-bold text-ink-900">{editManageStock ? `${editHasValidStockQty ? editStockQtyValue : 0} unidades` : 'Sem controle de estoque'}</p>
                        </div>
                        <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Classificacao</p>
                          <p className="mt-2 text-sm font-bold text-ink-900">{editGelada ? 'Bebida gelada' : 'Item comum'}</p>
                        </div>
                      </div>
                      {editingProduct.description ? (
                        <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Descricao</p>
                          <p className="mt-2 text-sm leading-6 text-ink-700">{editingProduct.description}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-[28px] border border-ink-100 bg-[#f6f7fb] p-4">
                      <p className="text-sm font-semibold text-ink-900">Previa no front-end</p>
                      <p className="mt-2 text-sm leading-6 text-ink-500">Simulacao de como o produto aparece no app.</p>
                      <div className="mt-4 overflow-hidden rounded-[26px] border border-[#ececec] bg-white">
                        <div className="relative bg-white">
                          <img
                            src={editingProduct.imageUrl || 'https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/painel-vkbwb8/assets/dykp0g9ghdjn/error.png'}
                            alt={editingProduct.name}
                            className="h-[260px] w-full object-cover"
                          />
                          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#202020]">
                              <ChevronDown className="h-4 w-4 rotate-90" />
                            </span>
                            {editFeatured ? <span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-coral-700">Destaque</span> : null}
                          </div>
                          <div className="absolute inset-x-0 bottom-0 flex justify-end p-4">
                            <div className="inline-flex max-w-[190px] items-center gap-2 rounded-[16px] bg-white px-2 py-1.5">
                              <img src={data.store.logoImageUrl ?? data.store.coverImageUrl ?? 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=300&q=80'} alt={data.store.name} className="h-9 w-9 rounded-[12px] object-cover" />
                              <div className="min-w-0 text-left">
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-coral-600">Loja</p>
                                <p className="line-clamp-1 text-sm font-bold text-[#202020]">{data.store.name}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3 p-5">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral-600">{data.store.name}</p>
                          <div>
                            <h3 id="edit-product-title" className="text-[28px] font-bold tracking-[-0.04em] text-[#202020]">{editingProduct.name}</h3>
                            <p className="mt-2 text-sm leading-6 text-[#666]">{editingProduct.description || 'Sem descricao.'}</p>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-[#666]">
                            <div className="flex items-baseline gap-2">
                              <span className="font-bold text-[#202020]">
                                {editPromotionPrice ? formatCurrency(editPromotionPriceValue) : editPrice ? formatCurrency(editPriceValue) : 'R$ 0,00'}
                              </span>
                              {editPromotionPrice && editPrice ? <span className="font-bold text-[#9a9a9a] line-through">{formatCurrency(editPriceValue)}</span> : null}
                            </div>
                            <span className="flex items-center gap-1"><Clock3 size={15} className="text-coral-500" /> 15-20 min</span>
                          </div>
                          {editGelada ? (
                            <div className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                              <Snowflake className="h-3 w-3" /> Gelado
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

              </div>

              <div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-ink-100 bg-white pt-4">
                <button type="button" onClick={() => setEditProductModalOpen(false)}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-ink-100 px-5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50">
                  Cancelar
                </button>
                <button type="button" onClick={handleContinueEditFlow} disabled={!canContinueEditFlow || savingEdit}
                  className={cn('inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white transition',
                    canContinueEditFlow && !savingEdit ? 'bg-coral-500 hover:bg-coral-600' : 'bg-ink-300 text-white/80')}>
                  {savingEdit ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : editStepTab === 'revisao' ? 'Salvar alteracoes' : 'Continuar'}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </AnimatedModal>


      {menuOpenCategoryId !== null && categoryMenuPosition !== null &&
        createPortal(
          <div
            ref={categoryMenuRef}
            style={{ top: categoryMenuPosition.top, right: categoryMenuPosition.right }}
            className="fixed z-50 w-44 rounded-xl border border-ink-100 bg-white py-1 shadow-lg"
          >
            {(() => {
              const category = catalogCategories.find((c) => c.id === menuOpenCategoryId)
              if (!category) return null
              return (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      toast.success(`Edicao da categoria ${category.name} em preparacao.`)
                      setMenuOpenCategoryId(null)
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-ink-700 transition hover:bg-ink-50"
                  >
                    <PencilLine className="h-4 w-4 text-ink-400" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toast.success(`Duplicacao da categoria ${category.name} em preparacao.`)
                      setMenuOpenCategoryId(null)
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-ink-700 transition hover:bg-ink-50"
                  >
                    <Copy className="h-4 w-4 text-ink-400" />
                    Duplicar
                  </button>
                </>
              )
            })()}
          </div>,
          document.body
        )}

      {menuOpenProductId !== null && productMenuPosition !== null &&
        createPortal(
          <div
            ref={productMenuRef}
            style={{ top: productMenuPosition.top, right: productMenuPosition.right }}
            className="fixed z-50 w-44 rounded-xl border border-ink-100 bg-white py-1 shadow-lg"
          >
            {(() => {
              const product = catalogProducts.find((p) => p.id === menuOpenProductId)
              if (!product) return null
              return (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      openEditProductModal(product)
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-ink-700 transition hover:bg-ink-50"
                  >
                    <PencilLine className="h-4 w-4 text-ink-400" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateProduct(product)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-ink-700 transition hover:bg-ink-50"
                  >
                    <Copy className="h-4 w-4 text-ink-400" />
                    Duplicar
                  </button>
                </>
              )
            })()}
          </div>,
          document.body
        )}
    </>
  )
}
