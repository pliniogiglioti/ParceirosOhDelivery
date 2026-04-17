import {
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
import { CatalogSkeleton } from '@/components/partner/catalog/CatalogSkeleton'
import { CatalogHeader } from '@/components/partner/catalog/CatalogHeader'
import { CatalogFilters } from '@/components/partner/catalog/CatalogFilters'
import { CategoryCard } from '@/components/partner/catalog/CategoryCard'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { usePartnerPageDataSafe } from '@/hooks/usePartnerPageData'
import { usePartnerDraftStore } from '@/hooks/usePartnerDraftStore'
import type { PartnerDashboardData } from '@/types'
import { cn, formatCurrency, DEFAULT_PRODUCT_IMAGE } from '@/lib/utils'
import { AnimatedModal } from '@/components/partner/AnimatedModal'
import { SectionFrame } from '@/components/partner/PartnerUi'
import { StoreImagePickerModal } from '@/components/partner/StoreImagePickerModal'
import type { PartnerCategory } from '@/types'
import { createProduct, createProductCategory, fetchIndustrializados, updateProduct, saveProductComplements, fetchProductComplements, fetchComplementLibrary, createComplementLibraryItem, updateComplementLibraryItem, deleteComplementLibraryItem, savePizzaCategory, savePizzaFlavor, fetchPizzaSizes, fetchPizzaFlavors, type IndustrializedItem } from '@/services/partner'
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
  maxQty: number
  source: ComplementSource
  imageUrl?: string
  sourceId?: string // ID original do item na fonte (biblioteca ou industrializado)
}

interface ComplementGroup {
  id: string
  name: string
  required: boolean
  minQty: number
  maxQty: number
  canRepeat: boolean
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

// ── Pizza types ───────────────────────────────────────────────────────────────
interface PizzaSizeDraft {
  id: string
  name: string
  slices: number
  maxFlavors: 1 | 2 | 3 | 4
}

interface PizzaCrustDraft {
  id: string
  name: string
  price: string
}

interface PizzaEdgeDraft {
  id: string
  name: string
  price: string
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
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null)
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null)
  const dragCloneRef = useRef<HTMLDivElement | null>(null)
  const dragWidthRef = useRef(0)
  const dragSourceRef = useRef<string | null>(null)
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
  const [industrializedMaxStepIndex, setIndustrializedMaxStepIndex] = useState(0)
  const [prepMaxStepIndex, setPrepMaxStepIndex] = useState(0)
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

  // Pizza category modal
  type PizzaTab = 'detalhes' | 'tamanhos' | 'massas' | 'bordas'
  const [pizzaModalOpen, setPizzaModalOpen] = useState(false)
  const [pizzaEditingCategoryId, setPizzaEditingCategoryId] = useState<string | null>(null)
  const [pizzaTab, setPizzaTab] = useState<PizzaTab>('detalhes')
  const [pizzaMaxTab, setPizzaMaxTab] = useState(0)
  const [pizzaCategoryName, setPizzaCategoryName] = useState('')
  const [pizzaPricePolicy, setPizzaPricePolicy] = useState<'maior' | 'media' | 'menor'>('maior')
  const [pizzaSizes, setPizzaSizes] = useState<PizzaSizeDraft[]>([])
  const [pizzaCrusts, setPizzaCrusts] = useState<Record<string, PizzaCrustDraft[]>>({})
  const [pizzaEdges, setPizzaEdges] = useState<Record<string, PizzaEdgeDraft[]>>({})
  const [savingPizza, setSavingPizza] = useState(false)
  const pizzaTabList: Array<{ id: PizzaTab; label: string }> = [
    { id: 'detalhes', label: 'Detalhes' },
    { id: 'tamanhos', label: 'Tamanhos' },
    { id: 'massas', label: 'Massas' },
    { id: 'bordas', label: 'Bordas' },
  ]

  // Pizza flavor modal
  const [flavorModalOpen, setFlavorModalOpen] = useState(false)
  const [flavorModalCategoryId, setFlavorModalCategoryId] = useState<string | null>(null)
  const [flavorTab, setFlavorTab] = useState<'detalhes' | 'preco'>('detalhes')
  const [flavorName, setFlavorName] = useState('')
  const [flavorDescription, setFlavorDescription] = useState('')
  const [flavorImage, setFlavorImage] = useState('')
  const [flavorPrices, setFlavorPrices] = useState<Record<string, string>>({})
  const [flavorSizes, setFlavorSizes] = useState<import('@/types').PizzaSize[]>([])
  const [flavorImagePickerOpen, setFlavorImagePickerOpen] = useState(false)
  const [savingFlavor, setSavingFlavor] = useState(false)
  const [editingFlavorId, setEditingFlavorId] = useState<string | null>(null)
  // Pizza flavors per category
  const [flavorsByCategory, setFlavorsByCategory] = useState<Record<string, import('@/types').PizzaFlavor[]>>({})
  const [sizeCountByCategory, setSizeCountByCategory] = useState<Record<string, number>>({})

  function loadFlavorsForCategory(categoryId: string) {
    fetchPizzaFlavors(categoryId).then((flavors) => {
      setFlavorsByCategory((prev) => ({ ...prev, [categoryId]: flavors }))
    }).catch(() => {})
    fetchPizzaSizes(categoryId).then((sizes) => {
      setSizeCountByCategory((prev) => ({ ...prev, [categoryId]: sizes.length }))
    }).catch(() => {})
  }
  const [flavorLibModalOpen, setFlavorLibModalOpen] = useState(false)
  const [flavorLibItems, setFlavorLibItems] = useState<import('@/types').PizzaFlavor[]>([])
  const [flavorLibSearch, setFlavorLibSearch] = useState('')
  const [flavorLibCategoryId, setFlavorLibCategoryId] = useState<string | null>(null)
  const [flavorPickerOpen, setFlavorPickerOpen] = useState(false) // picker inside flavor modal

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
  const [addingGroupCanRepeat, setAddingGroupCanRepeat] = useState(false)
  const [showAddGroupForm, setShowAddGroupForm] = useState(false)
  // complement item picker per group
  const [complementPickerGroupId, setComplementPickerGroupId] = useState<string | null>(null)
  const [complementPickerSource, setComplementPickerSource] = useState<ComplementSource>('biblioteca')
  const [complementPickerSearch, setComplementPickerSearch] = useState('')
  const [newLibItemName, setNewLibItemName] = useState('')
  const [newLibItemDescription, setNewLibItemDescription] = useState('')
  const [newLibItemPrice, setNewLibItemPrice] = useState('')
  const [newLibItemImage, setNewLibItemImage] = useState('')
  const [libImagePickerOpen, setLibImagePickerOpen] = useState(false)
  const [libItems, setLibItems] = useState<import('@/services/partner').ComplementLibraryItem[]>([])
  const [libItemsLoaded, setLibItemsLoaded] = useState(false)
  const [showNewLibForm, setShowNewLibForm] = useState(false)
  const [libSearch, setLibSearch] = useState('')
  // Biblioteca modal (standalone)
  const [libModalOpen, setLibModalOpen] = useState(false)
  const [libModalSearch, setLibModalSearch] = useState('')
  const [libModalEditingId, setLibModalEditingId] = useState<string | null>(null)
  const [libModalEditName, setLibModalEditName] = useState('')
  const [libModalEditDescription, setLibModalEditDescription] = useState('')
  const [libModalEditPrice, setLibModalEditPrice] = useState('')
  const [libModalEditImage, setLibModalEditImage] = useState('')
  const [libModalImagePickerOpen, setLibModalImagePickerOpen] = useState(false)
  const [libModalNewForm, setLibModalNewForm] = useState(false)
  const [libModalSaving, setLibModalSaving] = useState(false)
  const [newIndItemPrice, setNewIndItemPrice] = useState('')
  const [selectedIndItem, setSelectedIndItem] = useState<IndustrializedCatalogItem | null>(null)
  const [prepImagePickerOpen, setPrepImagePickerOpen] = useState(false)
  // Edição inline de grupo e item de complemento
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')
  const [editingGroupRequired, setEditingGroupRequired] = useState(false)
  const [editingGroupMin, setEditingGroupMin] = useState('0')
  const [editingGroupMax, setEditingGroupMax] = useState('1')
  const [editingGroupCanRepeat, setEditingGroupCanRepeat] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemPrice, setEditingItemPrice] = useState('')

  useEffect(() => {
    fetchIndustrializados()
      .then(setIndustrializedCatalogItems)
      .catch((err) => console.error('[industrializados]', err))
  }, [])

  // Load pizza sizes and flavors whenever pizza categories change
  useEffect(() => {
    const pizzaCats = catalogCategories.filter((c) => getCategoryTemplate(c) === 'pizza')
    pizzaCats.forEach((c) => {
      fetchPizzaSizes(c.id).then((sizes) => {
        setSizeCountByCategory((prev) => ({ ...prev, [c.id]: sizes.length }))
      }).catch(() => {})
      fetchPizzaFlavors(c.id).then((flavors) => {
        setFlavorsByCategory((prev) => ({ ...prev, [c.id]: flavors }))
      }).catch(() => {})
    })
  }, [catalogCategories])
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
  const [renamingCategory, setRenamingCategory] = useState<{ id: string; name: string } | null>(null)
  const [renameCategoryInput, setRenameCategoryInput] = useState('')
  const [savingRenameCategory, setSavingRenameCategory] = useState(false)
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
        // Always use the real active value from DB on first load, preserve local changes after
        accumulator[category.id] = current[category.id] ?? category.active
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
        // Pizza categories are not controlled by products — preserve current state
        if (getCategoryTemplate(category) === 'pizza') {
          accumulator[category.id] = current[category.id] ?? false
          return accumulator
        }

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
    if (!createCategoryModalOpen && !addItemTypeModalOpen && !standardItemStepsModalOpen && !productKindModalOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
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
  }, [createCategoryModalOpen, addItemTypeModalOpen, standardItemStepsModalOpen, productKindModalOpen])

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
    () => catalogProducts.filter((p) => featuredByProductId[p.id] ?? p.featured).length,
    [featuredByProductId, catalogProducts]
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

    if (product.kind === 'preparado') {
      // Abre o fluxo de preparado preenchido com os dados atuais
      setAddItemCategoryId(product.categoryId)
      setSelectedProductCreationKind('preparado')
      setStandardItemStepTab('detalhes')
      setPrepMaxStepIndex(4)
      setPrepName(product.name)
      setPrepDescription(product.description)
      setPrepImage(product.imageUrl ?? '')
      setPrepPrice(
        product.price > 0
          ? product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : ''
      )
      setPrepPromotionPrice(
        product.compareAtPrice != null && product.compareAtPrice > 0
          ? product.compareAtPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : ''
      )
      setPrepManageStock(product.manageStock)
      setPrepStockQty(product.stockQuantity != null ? String(product.stockQuantity) : '')
      setPrepGelada(product.gelada)
      setPrepActive(product.active)
      setPrepFeatured(product.featured)
      setPrepComplementGroups([])
      setPrepDietaryTags([])
      setShowAddGroupForm(false)
      setComplementPickerGroupId(null)
      setMenuOpenProductId(null)
      setProductMenuPosition(null)
      setProductKindModalOpen(true)
      // Carrega complementos do banco em background
      fetchProductComplements(product.id).then((groups) => {
        setPrepComplementGroups(groups.map((g) => ({
          id: g.id,
          name: g.name,
          required: g.required,
          minQty: g.minQty,
          maxQty: g.maxQty,
          canRepeat: g.canRepeat,
          items: g.items.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            maxQty: item.maxQty ?? 1,
            source: item.source,
            imageUrl: item.imageUrl,
          })),
        })))
      }).catch(() => {})
      return
    }

    // Industrializado — fluxo de edição simples
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

    if (selectedTemplate.id === 'pizza') {
      // Abre o modal de pizza em vez de criar direto
      setPizzaCategoryName(trimmedName)
      setPizzaPricePolicy('maior')
      setPizzaTab('detalhes')
      setPizzaMaxTab(0)
      setPizzaSizes([])
      setPizzaCrusts({})
      setPizzaEdges({})
      setCreateCategoryModalOpen(false)
      setPizzaModalOpen(true)
      return
    }

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
      setIndustrializedMaxStepIndex(0)
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
    setPrepMaxStepIndex(0)
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

  useEffect(() => {
    if (!complementPickerGroupId || !data || libItemsLoaded) return
    fetchComplementLibrary(data.store.id)
      .then((items) => { setLibItems(items); setLibItemsLoaded(true) })
      .catch(() => {})
  }, [complementPickerGroupId, data, libItemsLoaded])

  useEffect(() => {
    if (libModalOpen && data && !libItemsLoaded) {
      fetchComplementLibrary(data.store.id)
        .then((items) => { setLibItems(items); setLibItemsLoaded(true) })
        .catch(() => {})
    }
  }, [libModalOpen, data, libItemsLoaded])

  // Reset lib loaded when picker closes
  useEffect(() => {
    if (!complementPickerGroupId) {
      setShowNewLibForm(false)
      setNewLibItemName('')
      setNewLibItemDescription('')
      setNewLibItemPrice('')
      setNewLibItemImage('')
      setLibSearch('')
    }
  }, [complementPickerGroupId])
  const prepPriceValue = parseCurrencyInput(prepPrice)
  const prepPromotionPriceValue = parseCurrencyInput(prepPromotionPrice)
  const prepStockQtyValue = Number(prepStockQty)
  const prepHasValidStockQty =
    prepStockQty.trim().length > 0 && Number.isFinite(prepStockQtyValue) && prepStockQtyValue >= 0

  const prepStepTabs = standardItemStepTabs
  const prepCurrentStepIndex = prepMaxStepIndex

  function handleContinuePrepFlow() {
    if (standardItemStepTab === 'detalhes') {
      if (!prepName.trim()) { toast.error('Informe o nome do produto.'); return }
      setStandardItemStepTab('preco')
      setPrepMaxStepIndex((m) => Math.max(m, 1))
      return
    }
    if (standardItemStepTab === 'preco') {
      if (!prepPrice.trim()) { toast.error('Preencha o preco principal.'); return }
      if (prepPromotionPrice.trim() && prepPromotionPriceValue >= prepPriceValue) {
        toast.error('O preco promocional deve ser menor que o preco normal.'); return
      }
      if (prepManageStock && !prepHasValidStockQty) { toast.error('Informe a quantidade em estoque.'); return }
      setStandardItemStepTab('complementos')
      setPrepMaxStepIndex((m) => Math.max(m, 2))
      return
    }
    if (standardItemStepTab === 'complementos') {
      setStandardItemStepTab('classificacao')
      setPrepMaxStepIndex((m) => Math.max(m, 3))
      return
    }
    if (standardItemStepTab === 'classificacao') {
      setStandardItemStepTab('analisar')
      setPrepMaxStepIndex((m) => Math.max(m, 4))
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
      let saved: PartnerProduct

      if (editingProduct?.kind === 'preparado') {
        // Editando preparado existente
        saved = await updateProduct(editingProduct.id, data.store.id, {
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
          categoryId: editingProduct.categoryId,
        })
        setCatalogProducts((current) => current.map((p) => (p.id === saved.id ? saved : p)))
        setActiveByProductId((current) => ({ ...current, [saved.id]: saved.active }))
        setFeaturedByProductId((current) => ({ ...current, [saved.id]: saved.featured }))
        toast.success(`${prepName.trim()} atualizado com sucesso.`)
      } else {
        // Criando novo preparado
        saved = await createProduct(data.store.id, {
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
          kind: 'preparado',
        })
        draftAddProduct(data.store.id, saved)
        setCatalogProducts((current) => [...current, saved])
        toast.success(`${prepName.trim()} adicionado ao cardapio.`)
      }

      if (prepComplementGroups.length > 0 || editingProduct?.kind === 'preparado') {
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
            maxQty: g.canRepeat ? g.maxQty : 1,
            imageUrl: item.imageUrl,
            libraryItemId: item.source === 'biblioteca' && item.sourceId && !item.sourceId.startsWith('lib-') ? item.sourceId : undefined,
            industrializedId: item.source === 'industrializado' ? item.sourceId : undefined,
          })),
        })))
      }

      setEditingProduct(null)
      setProductKindModalOpen(false)
    } catch {
      toast.error('Nao foi possivel salvar o produto.')
    } finally {
      setSavingPrep(false)
    }
  }

  function handleAddComplementGroup() {
    const name = addingGroupName.trim()
    if (!name) { toast.error('Informe o nome do grupo.'); return }
    const min = Number(addingGroupMin)
    const max = Number(addingGroupMax) || 1
    if (min > max) { toast.error('O minimo nao pode ser maior que o maximo.'); return }
    const group: ComplementGroup = {
      id: `grp-${Date.now()}`,
      name,
      required: Number(addingGroupMin) >= 1,
      minQty: min,
      maxQty: max,
      canRepeat: addingGroupCanRepeat,
      items: [],
    }
    setPrepComplementGroups((c) => [...c, group])
    setAddingGroupName('')
    setAddingGroupRequired(false)
    setAddingGroupMin('1')
    setAddingGroupMax('1')
    setAddingGroupCanRepeat(false)
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
      maxQty: 1,
      source: 'biblioteca',
      imageUrl: newLibItemImage || undefined,
    }
    setPrepComplementGroups((groups) =>
      groups.map((g) => g.id === groupId ? { ...g, items: [...g.items, item] } : g)
    )
    setNewLibItemName('')
    setNewLibItemDescription('')
    setNewLibItemPrice('')
    setNewLibItemImage('')
    setShowNewLibForm(false)
    // Salva na biblioteca em background para reutilização futura
    if (data) {
      createComplementLibraryItem(data.store.id, {
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
      }).then((saved) => {
        setLibItems((prev) => [saved, ...prev])
        // Atualiza o sourceId do item recém adicionado
        setPrepComplementGroups((groups) =>
          groups.map((g) => ({
            ...g,
            items: g.items.map((i) => i.id === item.id ? { ...i, sourceId: saved.id } : i),
          }))
        )
      }).catch(() => {})
    }
  }

  function handleAddIndustrializedToGroup(groupId: string, ind: IndustrializedCatalogItem) {
    const item: ComplementItem = {
      id: `ind-${ind.id}-${Date.now()}`,
      name: ind.name,
      description: ind.description,
      price: parseCurrencyInput(newIndItemPrice),
      maxQty: 1,
      source: 'industrializado',
      imageUrl: ind.image,
      sourceId: String(ind.id),
    }
    setPrepComplementGroups((groups) =>
      groups.map((g) => g.id === groupId ? { ...g, items: [...g.items, item] } : g)
    )
    setSelectedIndItem(null)
    setNewIndItemPrice('')
    setComplementPickerGroupId(null)
  }

  function removeComplementItem(groupId: string, itemId: string) {
    setPrepComplementGroups((groups) =>
      groups.map((g) => g.id === groupId ? { ...g, items: g.items.filter((i) => i.id !== itemId) } : g)
    )
  }

  function handleSelectLibItem(groupId: string, libItem: import('@/services/partner').ComplementLibraryItem) {
    const item: ComplementItem = {
      id: `lib-${Date.now()}`,
      name: libItem.name,
      description: libItem.description,
      price: libItem.price,
      maxQty: 1,
      source: 'biblioteca',
      sourceId: libItem.id,
      imageUrl: libItem.imageUrl,
    }
    setPrepComplementGroups((groups) =>
      groups.map((g) => g.id === groupId ? { ...g, items: [...g.items, item] } : g)
    )
    setComplementPickerGroupId(null)
  }

  async function handleLibModalSave() {
    if (!data) return
    const name = libModalEditName.trim()
    if (!name) { toast.error('Informe o nome do item.'); return }
    setLibModalSaving(true)
    try {
      if (libModalEditingId) {
        // Update
        const updated = await updateComplementLibraryItem(libModalEditingId, data.store.id, {
          name,
          description: libModalEditDescription.trim(),
          price: parseCurrencyInput(libModalEditPrice),
          imageUrl: libModalEditImage || undefined,
        })
        setLibItems((prev) => prev.map((i) => i.id === updated.id ? updated : i))
        toast.success(`${name} atualizado.`)
      } else {
        // Create
        const saved = await createComplementLibraryItem(data.store.id, {
          name,
          description: libModalEditDescription.trim(),
          price: parseCurrencyInput(libModalEditPrice),
          imageUrl: libModalEditImage || undefined,
        })
        setLibItems((prev) => [saved, ...prev])
        setLibItemsLoaded(true)
        toast.success(`${name} adicionado a biblioteca.`)
      }
      setLibModalNewForm(false)
      setLibModalEditingId(null)
      setLibModalEditName('')
      setLibModalEditDescription('')
      setLibModalEditPrice('')
      setLibModalEditImage('')
    } catch {
      toast.error('Nao foi possivel salvar.')
    } finally {
      setLibModalSaving(false)
    }
  }

  async function handleLibModalDelete(itemId: string) {
    if (!data) return
    try {
      await deleteComplementLibraryItem(itemId, data.store.id)
      setLibItems((prev) => prev.filter((i) => i.id !== itemId))
      toast.success('Item removido da biblioteca.')
    } catch {
      toast.error('Nao foi possivel remover.')
    }
  }

  function removeComplementGroup(groupId: string) {
    setPrepComplementGroups((groups) => groups.filter((g) => g.id !== groupId))
  }

  function saveEditingGroup() {
    if (!editingGroupId || !editingGroupName.trim()) return
    const min = Number(editingGroupMin)
    const max = Number(editingGroupMax) || 1
    if (min > max) { toast.error('O minimo nao pode ser maior que o maximo.'); return }
    setPrepComplementGroups((groups) =>
      groups.map((g) => g.id === editingGroupId ? {
        ...g,
        name: editingGroupName.trim(),
        required: Number(editingGroupMin) >= 1,
        minQty: min,
        maxQty: max,
        canRepeat: editingGroupCanRepeat,
      } : g)
    )
    setEditingGroupId(null)
  }

  function saveEditingItem(groupId: string) {
    if (!editingItemId) return
    setPrepComplementGroups((groups) =>
      groups.map((g) => g.id === groupId ? {
        ...g,
        items: g.items.map((i) => i.id === editingItemId ? {
          ...i,
          price: parseCurrencyInput(editingItemPrice),
        } : i),
      } : g)
    )
    setEditingItemId(null)
    setEditingItemPrice('')
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
  const editCurrentStepIndex = editStepTabs.length - 1 // todas as abas sempre liberadas na edicao

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

  // ── Pizza helpers ─────────────────────────────────────────────────────────
  function openPizzaEditModal(category: PartnerCategory) {
    setPizzaEditingCategoryId(category.id)
    setPizzaCategoryName(category.name)
    setPizzaPricePolicy('maior')
    setPizzaTab('detalhes')
    setPizzaMaxTab(3) // all tabs unlocked for editing
    setPizzaSizes([])
    setPizzaCrusts({})
    setPizzaEdges({})
    setMenuOpenCategoryId(null)
    setCategoryMenuPosition(null)
    // Load existing sizes/crusts/edges
    fetchPizzaSizes(category.id).then((sizes) => {
      const sizeDrafts: PizzaSizeDraft[] = sizes.map((s) => ({
        id: s.id,
        name: s.name,
        slices: s.slices,
        maxFlavors: s.maxFlavors,
      }))
      setPizzaSizes(sizeDrafts)
      const crustMap: Record<string, PizzaCrustDraft[]> = {}
      const edgeMap: Record<string, PizzaEdgeDraft[]> = {}
      sizes.forEach((s) => {
        crustMap[s.id] = s.crusts.map((c) => ({
          id: c.id,
          name: c.name,
          price: c.price > 0 ? c.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
        }))
        edgeMap[s.id] = s.edges.map((e) => ({
          id: e.id,
          name: e.name,
          price: e.price > 0 ? e.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
        }))
      })
      setPizzaCrusts(crustMap)
      setPizzaEdges(edgeMap)
    }).catch(() => {})
    setPizzaModalOpen(true)
  }

  const pizzaTabIndex = pizzaTabList.findIndex((t) => t.id === pizzaTab)

  function addPizzaSize() {
    if (pizzaSizes.length >= 3) { toast.error('Maximo de 3 tamanhos.'); return }
    const id = `sz-${Date.now()}`
    setPizzaSizes((prev) => [...prev, { id, name: '', slices: 8, maxFlavors: 1 }])
    setPizzaCrusts((prev) => ({ ...prev, [id]: [] }))
    setPizzaEdges((prev) => ({ ...prev, [id]: [] }))
  }

  function removePizzaSize(id: string) {
    setPizzaSizes((prev) => prev.filter((s) => s.id !== id))
    setPizzaCrusts((prev) => { const n = { ...prev }; delete n[id]; return n })
    setPizzaEdges((prev) => { const n = { ...prev }; delete n[id]; return n })
  }

  function updatePizzaSize(id: string, patch: Partial<PizzaSizeDraft>) {
    setPizzaSizes((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s))
  }

  function addCrust(sizeId: string) {
    setPizzaCrusts((prev) => ({ ...prev, [sizeId]: [...(prev[sizeId] ?? []), { id: `cr-${Date.now()}`, name: '', price: '' }] }))
  }

  function removeCrust(sizeId: string, crustId: string) {
    setPizzaCrusts((prev) => ({ ...prev, [sizeId]: (prev[sizeId] ?? []).filter((c) => c.id !== crustId) }))
  }

  function updateCrust(sizeId: string, crustId: string, patch: Partial<PizzaCrustDraft>) {
    setPizzaCrusts((prev) => ({ ...prev, [sizeId]: (prev[sizeId] ?? []).map((c) => c.id === crustId ? { ...c, ...patch } : c) }))
  }

  function addEdge(sizeId: string) {
    setPizzaEdges((prev) => ({ ...prev, [sizeId]: [...(prev[sizeId] ?? []), { id: `ed-${Date.now()}`, name: '', price: '' }] }))
  }

  function removeEdge(sizeId: string, edgeId: string) {
    setPizzaEdges((prev) => ({ ...prev, [sizeId]: (prev[sizeId] ?? []).filter((e) => e.id !== edgeId) }))
  }

  function updateEdge(sizeId: string, edgeId: string, patch: Partial<PizzaEdgeDraft>) {
    setPizzaEdges((prev) => ({ ...prev, [sizeId]: (prev[sizeId] ?? []).map((e) => e.id === edgeId ? { ...e, ...patch } : e) }))
  }

  function handleContinuePizzaFlow() {
    if (pizzaTab === 'detalhes') {
      if (!pizzaCategoryName.trim()) { toast.error('Informe o nome da categoria.'); return }
      setPizzaTab('tamanhos'); setPizzaMaxTab((m) => Math.max(m, 1)); return
    }
    if (pizzaTab === 'tamanhos') {
      if (pizzaSizes.length === 0) { toast.error('Adicione ao menos um tamanho.'); return }
      if (pizzaSizes.some((s) => !s.name.trim())) { toast.error('Preencha o nome de todos os tamanhos.'); return }
      setPizzaTab('massas'); setPizzaMaxTab((m) => Math.max(m, 2)); return
    }
    if (pizzaTab === 'massas') {
      setPizzaTab('bordas'); setPizzaMaxTab((m) => Math.max(m, 3)); return
    }
    void handleSavePizzaCategory()
  }

  const canContinuePizza =
    pizzaTab === 'detalhes' ? Boolean(pizzaCategoryName.trim()) :
    pizzaTab === 'tamanhos' ? pizzaSizes.length > 0 && pizzaSizes.every((s) => s.name.trim()) :
    true

  async function handleSavePizzaCategory() {
    if (!data) return
    setSavingPizza(true)
    try {
      let saved: PartnerCategory

      if (pizzaEditingCategoryId) {
        // Update existing category name
        const { error } = await (await import('@/lib/supabase')).supabase!
          .from('product_categories')
          .update({ name: pizzaCategoryName.trim(), updated_at: new Date().toISOString() })
          .eq('id', pizzaEditingCategoryId)
          .eq('store_id', data.store.id)
        if (error) throw error
        saved = catalogCategories.find((c) => c.id === pizzaEditingCategoryId)!
        saved = { ...saved, name: pizzaCategoryName.trim() }
        setCatalogCategories((prev) => prev.map((c) => c.id === pizzaEditingCategoryId ? saved : c))
      } else {
        saved = await createProductCategory(data.store.id, {
          name: pizzaCategoryName.trim(),
          icon: 'PZ',
          template: 'pizza',
          pricePolicy: pizzaPricePolicy,
        } as Parameters<typeof createProductCategory>[1] & { pricePolicy: string })
        draftAddCategory(data.store.id, saved)
        setCatalogCategories((prev) => [...prev, saved])
        setCategoryOrderIds((prev) => [...prev, saved.id])
        setExpandedByCategoryId((prev) => ({ ...prev, [saved.id]: false }))
        setActiveByCategoryId((prev) => ({ ...prev, [saved.id]: false }))
      }

      const categoryId = pizzaEditingCategoryId ?? saved.id
      await savePizzaCategory(data.store.id, categoryId, pizzaSizes.map((s, i) => ({
        name: s.name,
        slices: s.slices,
        maxFlavors: s.maxFlavors,
        sortOrder: i,
        crusts: (pizzaCrusts[s.id] ?? []).filter((c) => c.name.trim()).map((c, j) => ({
          name: c.name, price: parseCurrencyInput(c.price), sortOrder: j,
        })),
        edges: (pizzaEdges[s.id] ?? []).filter((e) => e.name.trim()).map((e, j) => ({
          name: e.name, price: parseCurrencyInput(e.price), sortOrder: j,
        })),
      })))

      setPizzaModalOpen(false)
      setPizzaEditingCategoryId(null)
      // Refresh size count
      setSizeCountByCategory((prev) => ({ ...prev, [categoryId]: pizzaSizes.length }))
      toast.success(`Categoria ${pizzaCategoryName.trim()} ${pizzaEditingCategoryId ? 'atualizada' : 'criada'} com sucesso.`)
    } catch {
      toast.error('Nao foi possivel salvar a categoria pizza.')
    } finally {
      setSavingPizza(false)
    }
  }

  // ── Pizza Flavor helpers ───────────────────────────────────────────────────
  function openFlavorModal(categoryId: string, flavor?: import('@/types').PizzaFlavor) {
    setFlavorModalCategoryId(categoryId)
    setFlavorTab('detalhes')
    setFlavorName(flavor?.name ?? '')
    setFlavorDescription(flavor?.description ?? '')
    setFlavorImage(flavor?.imageUrl ?? '')
    setEditingFlavorId(flavor?.id ?? null)
    // Load sizes for this category
    fetchPizzaSizes(categoryId).then(setFlavorSizes).catch(() => {})
    // Init prices
    if (flavor) {
      const priceMap: Record<string, string> = {}
      Object.entries(flavor.prices).forEach(([sizeId, price]) => {
        priceMap[sizeId] = price > 0 ? price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
      })
      setFlavorPrices(priceMap)
    } else {
      setFlavorPrices({})
    }
    setFlavorModalOpen(true)
  }

  async function handleSaveFlavor() {
    if (!data || !flavorModalCategoryId) return
    if (!flavorName.trim()) { toast.error('Informe o nome do sabor.'); return }
    setSavingFlavor(true)
    try {
      const prices: Record<string, number> = {}
      flavorSizes.forEach((s) => {
        prices[s.id] = parseCurrencyInput(flavorPrices[s.id] ?? '')
      })
      await savePizzaFlavor(data.store.id, {
        id: editingFlavorId ?? undefined,
        categoryId: flavorModalCategoryId,
        name: flavorName.trim(),
        description: flavorDescription.trim(),
        imageUrl: flavorImage || undefined,
        prices,
      })
      // Refresh flavor list for this category
      fetchPizzaFlavors(flavorModalCategoryId).then((flavors) => {
        setFlavorsByCategory((prev) => ({ ...prev, [flavorModalCategoryId]: flavors }))
        if (flavorLibCategoryId === flavorModalCategoryId) setFlavorLibItems(flavors)
      }).catch(() => {})
      setFlavorModalOpen(false)
      toast.success(`${flavorName.trim()} ${editingFlavorId ? 'atualizado' : 'adicionado'} com sucesso.`)
    } catch {
      toast.error('Nao foi possivel salvar o sabor.')
    } finally {
      setSavingFlavor(false)
    }
  }

  function openFlavorLibModal(categoryId: string) {
    setFlavorLibCategoryId(categoryId)
    setFlavorLibSearch('')
    fetchPizzaFlavors(categoryId).then(setFlavorLibItems).catch(() => {})
    setFlavorLibModalOpen(true)
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
      setIndustrializedMaxStepIndex((m) => Math.max(m, 1))
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
      setIndustrializedMaxStepIndex((m) => Math.max(m, 2))
      return
    }

    if (industrializedStepTab === 'classificacao') {
      setIndustrializedStepTab('revisao')
      setIndustrializedMaxStepIndex((m) => Math.max(m, 3))
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
  const industrializedCurrentStepIndex = industrializedMaxStepIndex

  const isInitialLoad = catalogCategories.length === 0 && data.categories.length === 0

  const catalogCard = (
    <div className={embedded ? 'rounded-2xl bg-white shadow-sm overflow-hidden' : 'panel-card overflow-hidden'}>
      <CatalogHeader
        hasPizzaCategory={catalogCategories.some((c) => c.template === 'pizza')}
        onOpenLibModal={() => { setLibModalOpen(true); setLibModalSearch('') }}
        onOpenFlavorLib={() => {
          const pizzaCats = catalogCategories.filter((c) => c.template === 'pizza')
          if (pizzaCats.length > 0) openFlavorLibModal(pizzaCats[0].id)
        }}
        onOpenCreateCategory={openCreateCategoryModal}
      />

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <CatalogFilters
          categories={orderedCategories}
          selectedCategoryId={selectedCategoryId}
          search={search}
          onCategoryChange={setSelectedCategoryId}
          onSearchChange={setSearch}
          onClear={handleClearFilters}
        />

        {isInitialLoad ? (
          <CatalogSkeleton />
        ) : (
          <div className="rounded-xl border border-ink-100 bg-ink-50 p-3 sm:p-4">
            <div className="space-y-3">
              {visibleCategories.map((category) => {
                const products = catalogProducts.filter((product) => product.categoryId === category.id)
                const isExpanded = expandedByCategoryId[category.id] ?? false
                const isActive = activeByCategoryId[category.id] ?? true

                return (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    products={products}
                    isExpanded={isExpanded}
                    isActive={isActive}
                    dragOverCategoryId={dragOverCategoryId}
                    draggingCategoryId={draggingCategoryId}
                    menuOpenCategoryId={menuOpenCategoryId}
                    activeByProductId={activeByProductId}
                    featuredByProductId={featuredByProductId}
                    menuOpenProductId={menuOpenProductId}
                    flavorsByCategory={flavorsByCategory}
                    sizeCountByCategory={sizeCountByCategory}
                    featuredCount={featuredCount}
                    storeId={data.store.id}
                    storeData={data.store}
                    setFlavorsByCategory={setFlavorsByCategory}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (category.id !== dragSourceRef.current) {
                        setDragOverCategoryId(category.id)
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverCategoryId(null)
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const from = dragSourceRef.current
                      if (!from || from === category.id) return
                      const nextOrder = reorderCategoryIds(categoryOrderIds, from, category.id)
                      setCategoryOrderIds(nextOrder)
                      setDraggingCategoryId(null)
                      setDragOverCategoryId(null)
                      dragSourceRef.current = null
                      if (dragCloneRef.current) {
                        document.body.removeChild(dragCloneRef.current)
                        dragCloneRef.current = null
                      }
                      if (data) {
                        import('@/lib/supabase').then(({ supabase }) => {
                          if (!supabase) return
                          Promise.all(
                            nextOrder.map((catId, idx) =>
                              supabase.from('product_categories')
                                .update({ sort_order: idx })
                                .eq('id', catId)
                                .eq('store_id', data.store.id)
                            )
                          ).catch(() => toast.error('Nao foi possivel salvar a ordem.'))
                        })
                      }
                    }}
                    onDragStart={(e) => {
                      dragSourceRef.current = category.id
                      setDraggingCategoryId(category.id)
                      e.dataTransfer.effectAllowed = 'move'
                      const article = e.currentTarget.closest('article') as HTMLElement
                      if (article) {
                        e.dataTransfer.setDragImage(article, article.offsetWidth / 2, 30)
                      }
                    }}
                    onDragEnd={() => {
                      setDraggingCategoryId(null)
                      setDragOverCategoryId(null)
                      dragSourceRef.current = null
                    }}
                    onToggleExpand={() => {
                      setExpandedByCategoryId((current) => ({
                        ...current,
                        [category.id]: !isExpanded,
                      }))
                      if (!isExpanded && category.template === 'pizza') {
                        loadFlavorsForCategory(category.id)
                      }
                    }}
                    onToggleCategoryActive={(nextValue) => {
                      setActiveByCategoryId((current) => ({
                        ...current,
                        [category.id]: nextValue,
                      }))
                      if (data) {
                        import('@/lib/supabase').then(({ supabase }) => {
                          supabase?.from('product_categories')
                            .update({ active: nextValue })
                            .eq('id', category.id)
                            .eq('store_id', data.store.id)
                            .then(({ error }) => {
                              if (error) {
                                setActiveByCategoryId((current) => ({ ...current, [category.id]: !nextValue }))
                                toast.error('Nao foi possivel atualizar a categoria.')
                              }
                            })
                        })
                      }
                    }}
                    onOpenCategoryMenu={(event) => {
                      if (menuOpenCategoryId === category.id) {
                        setMenuOpenCategoryId(null)
                        setCategoryMenuPosition(null)
                      } else {
                        const rect = event.currentTarget.getBoundingClientRect()
                        const menuHeight = 120
                        const spaceBelow = window.innerHeight - rect.bottom
                        const top = spaceBelow >= menuHeight
                          ? rect.bottom + 4
                          : rect.top - menuHeight - 4
                        setCategoryMenuPosition({
                          top,
                          right: window.innerWidth - rect.right,
                        })
                        setMenuOpenCategoryId(category.id)
                      }
                    }}
                    onAddItem={() => openAddItemModal(category)}
                    onAddFlavor={() => openFlavorModal(category.id)}
                    onToggleProductActive={(productId, nextValue) =>
                      setActiveByProductId((current) => ({ ...current, [productId]: nextValue }))
                    }
                    onToggleProductFeatured={(productId, nextValue) => {
                      if (nextValue && featuredCount >= 6) {
                        setShowMaxFeaturedModal(true)
                        return
                      }
                      setFeaturedByProductId((current) => ({ ...current, [productId]: nextValue }))
                    }}
                    onOpenProductMenu={(event, productId) => {
                      if (menuOpenProductId === productId) {
                        setMenuOpenProductId(null)
                        setProductMenuPosition(null)
                      } else {
                        const rect = event.currentTarget.getBoundingClientRect()
                        const menuHeight = 160
                        const spaceBelow = window.innerHeight - rect.bottom
                        const top = spaceBelow >= menuHeight
                          ? rect.bottom + 4
                          : rect.top - menuHeight - 4
                        setProductMenuPosition({
                          top,
                          right: window.innerWidth - rect.right,
                        })
                        setMenuOpenProductId(productId)
                      }
                    }}
                    onEditFlavor={(flavor) => openFlavorModal(category.id, flavor)}
                  />
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
        )}
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
        overlayClassName="z-[200]"
        onSelect={(url) => { setPrepImage(url); setPrepImagePickerOpen(false) }}
        onClose={() => setPrepImagePickerOpen(false)}
      />

      <StoreImagePickerModal
        open={libImagePickerOpen}
        storeId={data.store.id}
        slot="logo"
        overlayClassName="z-[200]"
        onSelect={(url) => { setNewLibItemImage(url); setLibImagePickerOpen(false) }}
        onClose={() => setLibImagePickerOpen(false)}
      />

      <StoreImagePickerModal
        open={libModalImagePickerOpen}
        storeId={data.store.id}
        slot="logo"
        overlayClassName="z-[200]"
        onSelect={(url) => { setLibModalEditImage(url); setLibModalImagePickerOpen(false) }}
        onClose={() => setLibModalImagePickerOpen(false)}
      />

      <AnimatedModal
        open={libModalOpen}
        onClose={() => { if (!libModalImagePickerOpen) { setLibModalOpen(false); setLibModalNewForm(false) } }}
        panelClassName="panel-card flex h-[min(88vh,700px)] w-full max-w-2xl flex-col p-6"
        ariaLabelledby="lib-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Cardapio</p>
            <h3 id="lib-modal-title" className="mt-1 text-xl font-bold text-ink-900">Biblioteca de Complementos</h3>
            <p className="mt-1 text-sm text-ink-500">Itens reutilizaveis em grupos de complementos de qualquer produto.</p>
          </div>
          <button type="button" onClick={() => { setLibModalOpen(false); setLibModalNewForm(false) }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        {libModalNewForm ? (
          <div className="mt-6 flex min-h-0 flex-1 flex-col">
            <p className="text-sm font-semibold text-ink-900">{libModalEditingId ? 'Editar item' : 'Novo item'}</p>
            <div className="mt-4 grid grid-cols-[88px_minmax(0,1fr)] gap-4">
              <div>
                {libModalEditImage ? (
                  <div className="relative">
                    <img src={libModalEditImage} alt="preview" className="h-[88px] w-full rounded-2xl object-cover" />
                    <button type="button" onClick={() => setLibModalImagePickerOpen(true)}
                      className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30 text-xs font-bold text-white opacity-0 hover:opacity-100 transition">Trocar</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setLibModalImagePickerOpen(true)}
                    className="flex h-[88px] w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 text-xs font-semibold text-ink-400 hover:border-coral-400 hover:text-coral-600">
                    <Plus className="h-5 w-5" />
                    Foto
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input type="text" value={libModalEditName} onChange={(e) => setLibModalEditName(e.target.value)} placeholder="Nome do item *"
                  className="h-10 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm outline-none focus:border-coral-400" />
                <input type="text" value={libModalEditDescription} onChange={(e) => setLibModalEditDescription(e.target.value)} placeholder="Descricao (opcional)"
                  className="h-10 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm outline-none focus:border-coral-400" />
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-400">R$</span>
                  <input type="text" inputMode="numeric" value={libModalEditPrice} onChange={(e) => setLibModalEditPrice(formatCurrencyInput(e.target.value))} placeholder="0,00"
                    className="h-10 w-full rounded-2xl border border-ink-100 bg-white pl-10 pr-4 text-sm outline-none focus:border-coral-400" />
                </div>
              </div>
            </div>
            <div className="mt-auto flex justify-end gap-3 pt-6">
              <button type="button" onClick={() => setLibModalNewForm(false)}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-ink-100 px-5 text-sm font-semibold text-ink-700 hover:bg-ink-50">Cancelar</button>
              <button type="button" onClick={() => void handleLibModalSave()} disabled={libModalSaving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-coral-500 px-5 text-sm font-semibold text-white hover:bg-coral-600 disabled:opacity-60">
                {libModalSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex min-h-0 flex-1 flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input type="text" value={libModalSearch} onChange={(e) => setLibModalSearch(e.target.value)} placeholder="Buscar na biblioteca..."
                className="h-12 w-full rounded-2xl border border-ink-100 bg-white pl-11 pr-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400" />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1">
              {libItems.filter((i) => `${i.name} ${i.description ?? ''}`.toLowerCase().includes(libModalSearch.toLowerCase())).length > 0 ? (
                libItems
                  .filter((i) => `${i.name} ${i.description ?? ''}`.toLowerCase().includes(libModalSearch.toLowerCase()))
                  .map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-sm font-bold text-ink-500">
                          {item.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink-900">{item.name}</p>
                        <p className="text-xs text-ink-500">{item.price > 0 ? formatCurrency(item.price) : 'Gratis'}{item.description ? ` · ${item.description}` : ''}</p>
                      </div>
                      <button type="button"
                        onClick={() => {
                          setLibModalEditingId(item.id)
                          setLibModalEditName(item.name)
                          setLibModalEditDescription(item.description)
                          setLibModalEditPrice(item.price > 0 ? item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '')
                          setLibModalEditImage(item.imageUrl ?? '')
                          setLibModalNewForm(true)
                        }}
                        className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-100 text-ink-500 hover:bg-ink-50">
                        <PencilLine className="h-4 w-4" />
                      </button>
                      <button type="button"
                        onClick={() => void handleLibModalDelete(item.id)}
                        className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 text-red-400 hover:bg-red-50">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
              ) : (
                <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 px-5 py-10 text-center">
                  <p className="text-sm font-semibold text-ink-700">{libModalSearch ? 'Nenhum resultado.' : 'Nenhum item na biblioteca ainda.'}</p>
                  <p className="mt-1 text-sm text-ink-500">Clique em "+ Novo item" para comecar.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button type="button"
                onClick={() => { setLibModalNewForm(true); setLibModalEditingId(null); setLibModalEditName(''); setLibModalEditDescription(''); setLibModalEditPrice(''); setLibModalEditImage('') }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-coral-500 px-5 text-sm font-semibold text-white hover:bg-coral-600">
                <Plus className="h-4 w-4" /> Novo item
              </button>
            </div>
          </div>
        )}
      </AnimatedModal>

      <AnimatedModal
        open={pizzaModalOpen}
        onClose={() => { setPizzaModalOpen(false); setPizzaEditingCategoryId(null) }}
        panelClassName="panel-card flex h-[min(88vh,860px)] w-full max-w-5xl flex-col p-6"
        ariaLabelledby="pizza-modal-title"
      >
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Pizza</p>
              <h3 id="pizza-modal-title" className="mt-1 text-xl font-bold text-ink-900">
                {pizzaEditingCategoryId ? `Editar: ${pizzaCategoryName}` : (pizzaCategoryName || 'Nova categoria pizza')}
              </h3>
            </div>
            <button type="button" onClick={() => setPizzaModalOpen(false)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 flex min-h-0 flex-1 flex-col">
            {/* Tabs */}
            <div className="rounded-2xl border border-ink-100 bg-white px-4 py-3 sm:px-5">
              <div className="hide-scrollbar flex gap-2 overflow-x-auto">
                {pizzaTabList.map((tab) => {
                  const idx = pizzaTabList.findIndex((t) => t.id === tab.id)
                  const visited = idx <= pizzaMaxTab
                  return (
                    <button key={tab.id} type="button"
                      onClick={() => { if (visited) setPizzaTab(tab.id) }}
                      disabled={!visited}
                      className={cn('inline-flex shrink-0 items-center rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                        pizzaTab === tab.id ? 'border-coral-200 bg-coral-50 text-coral-700'
                          : visited ? 'border-transparent text-ink-500 hover:border-ink-100 hover:bg-ink-50 hover:text-ink-900'
                          : 'border-transparent text-ink-400 opacity-60')}>
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">

              {/* ── DETALHES ── */}
              {pizzaTab === 'detalhes' ? (
                <div className="space-y-5">
                  <div className="rounded-xl border border-ink-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Modelo</p>
                    <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Pizza className="h-5 w-5 text-coral-500" />
                        <span className="text-sm font-semibold text-ink-900">Pizza</span>
                      </div>
                      {!pizzaEditingCategoryId ? (
                        <button type="button" onClick={() => { setPizzaModalOpen(false); setCreateCategoryModalOpen(true) }}
                          className="text-sm font-semibold text-coral-500 hover:text-coral-600">Alterar</button>
                      ) : null}
                    </div>
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-ink-900">Nome da categoria</span>
                    <input type="text" value={pizzaCategoryName} onChange={(e) => setPizzaCategoryName(e.target.value.slice(0, 40))}
                      placeholder="Ex: Pizza Grande 8 pedaços"
                      className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400" />
                    <p className="mt-1 text-right text-xs text-ink-400">{pizzaCategoryName.length}/40</p>
                  </label>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-ink-900">Política de preço com múltiplos sabores</p>
                    <p className="mb-3 text-xs text-ink-500">Define como calcular o preço quando o cliente escolhe mais de um sabor.</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {([
                        { id: 'maior', label: 'Maior preço', description: 'Cobra o preço do sabor mais caro.' },
                        { id: 'media', label: 'Média', description: 'Cobra a média dos preços dos sabores.' },
                        { id: 'menor', label: 'Menor preço', description: 'Cobra o preço do sabor mais barato.' },
                      ] as const).map((policy) => (
                        <button key={policy.id} type="button" onClick={() => setPizzaPricePolicy(policy.id)}
                          className={cn('rounded-xl border p-4 text-left transition',
                            pizzaPricePolicy === policy.id
                              ? 'border-coral-300 bg-coral-50 text-coral-700'
                              : 'border-ink-100 bg-white text-ink-900 hover:bg-ink-50')}>
                          <p className="text-sm font-bold">{policy.label}</p>
                          <p className={cn('mt-1 text-xs', pizzaPricePolicy === policy.id ? 'text-coral-600' : 'text-ink-500')}>{policy.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* ── TAMANHOS ── */}
              {pizzaTab === 'tamanhos' ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">Tamanhos</p>
                    <p className="mt-1 text-sm text-ink-500">Indique os tamanhos, pedaços e quantos sabores cada um aceita. Maximo 3 tamanhos.</p>
                  </div>

                  {pizzaSizes.map((size) => (
                    <div key={size.id} className="rounded-xl border border-ink-100 bg-white p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="block w-36 shrink-0">
                          <span className="mb-1 block text-xs font-semibold text-ink-500">Tamanho</span>
                          <input type="text" value={size.name} onChange={(e) => updatePizzaSize(size.id, { name: e.target.value })}
                            placeholder="Ex: Grande"
                            className="h-10 w-full rounded-xl border border-ink-100 bg-white px-3 text-sm outline-none focus:border-coral-400" />
                        </label>
                        <label className="block w-20 shrink-0">
                          <span className="mb-1 block text-xs font-semibold text-ink-500">Pedaços</span>
                          <input type="number" min={1} value={size.slices} onChange={(e) => updatePizzaSize(size.id, { slices: Number(e.target.value) || 8 })}
                            className="h-10 w-full rounded-xl border border-ink-100 bg-white px-3 text-sm outline-none focus:border-coral-400" />
                        </label>
                        <div className="flex-1">
                          <span className="mb-1 block text-xs font-semibold text-ink-500">Sabores</span>
                          <div className="flex gap-1">
                            {([1, 2, 3, 4] as const).map((n) => (
                              <button key={n} type="button" onClick={() => updatePizzaSize(size.id, { maxFlavors: n })}
                                className={cn('h-10 w-10 rounded-xl border text-sm font-bold transition',
                                  size.maxFlavors === n ? 'border-coral-400 bg-coral-50 text-coral-700' : 'border-ink-100 bg-white text-ink-600 hover:bg-ink-50')}>
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button type="button" onClick={() => removePizzaSize(size.id)}
                          className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl border border-red-100 px-3 text-xs font-semibold text-red-500 hover:bg-red-50">
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}

                  {pizzaSizes.length < 3 ? (
                    <button type="button" onClick={addPizzaSize}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl border border-dashed border-coral-300 px-4 text-sm font-semibold text-coral-600 hover:bg-coral-50">
                      <Plus className="h-4 w-4" /> Adicionar tamanho
                    </button>
                  ) : null}

                  {/* Preview */}
                  {pizzaSizes.some((s) => s.name.trim()) ? (
                    <div>
                      <p className="text-sm font-semibold text-ink-900">O que o cliente verá</p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {pizzaSizes.filter((s) => s.name.trim()).map((size) => (
                          <div key={size.id} className="flex h-28 w-28 flex-col items-center justify-center rounded-2xl border-2 border-ink-200 bg-white p-3 text-center">
                            <p className="text-sm font-bold text-ink-900">{size.name}</p>
                            <p className="mt-1 text-xs text-ink-500">Cortada em {size.slices} pedaços</p>
                            <p className="text-xs text-ink-500">Aceita {size.maxFlavors} sabor{size.maxFlavors > 1 ? 'es' : ''}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* ── MASSAS ── */}
              {pizzaTab === 'massas' ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">Massas</p>
                    <p className="mt-1 text-sm text-ink-500">Defina as opcoes de massa para cada tamanho. Deixe em branco para nao oferecer escolha de massa.</p>
                  </div>
                  {pizzaSizes.map((size) => (
                    <div key={size.id} className="rounded-xl border border-ink-100 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Para o tamanho: <span className="text-ink-900">{size.name || 'Sem nome'}</span></p>
                      <div className="mt-3 space-y-2">
                        {(pizzaCrusts[size.id] ?? []).map((crust) => (
                          <div key={crust.id} className="flex items-center gap-2">
                            <input type="text" value={crust.name} onChange={(e) => updateCrust(size.id, crust.id, { name: e.target.value })}
                              placeholder="Escolha o nome"
                              className="h-10 flex-1 rounded-xl border border-ink-100 bg-white px-3 text-sm outline-none focus:border-coral-400" />
                            <div className="relative w-36 shrink-0">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-400">R$</span>
                              <input type="text" inputMode="numeric" value={crust.price} onChange={(e) => updateCrust(size.id, crust.id, { price: formatCurrencyInput(e.target.value) })}
                                placeholder="0,00"
                                className="h-10 w-full rounded-xl border border-ink-100 bg-white pl-8 pr-3 text-sm outline-none focus:border-coral-400" />
                            </div>
                            <button type="button" onClick={() => removeCrust(size.id, crust.id)}
                              className="inline-flex h-10 items-center gap-1 rounded-xl border border-red-100 px-3 text-xs font-semibold text-red-500 hover:bg-red-50">
                              Excluir
                            </button>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => addCrust(size.id)}
                        className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-coral-300 px-3 text-xs font-semibold text-coral-600 hover:bg-coral-50">
                        <Plus className="h-3.5 w-3.5" /> Adicionar massa
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* ── BORDAS ── */}
              {pizzaTab === 'bordas' ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">Bordas</p>
                    <p className="mt-1 text-sm text-ink-500">Defina as opcoes de borda para cada tamanho. Deixe em branco para nao oferecer escolha de borda.</p>
                  </div>
                  {pizzaSizes.map((size) => (
                    <div key={size.id} className="rounded-xl border border-ink-100 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Para o tamanho: <span className="text-ink-900">{size.name || 'Sem nome'}</span></p>
                      <div className="mt-3 space-y-2">
                        {(pizzaEdges[size.id] ?? []).map((edge) => (
                          <div key={edge.id} className="flex items-center gap-2">
                            <input type="text" value={edge.name} onChange={(e) => updateEdge(size.id, edge.id, { name: e.target.value })}
                              placeholder="Escolha o nome"
                              className="h-10 flex-1 rounded-xl border border-ink-100 bg-white px-3 text-sm outline-none focus:border-coral-400" />
                            <div className="relative w-36 shrink-0">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-400">R$</span>
                              <input type="text" inputMode="numeric" value={edge.price} onChange={(e) => updateEdge(size.id, edge.id, { price: formatCurrencyInput(e.target.value) })}
                                placeholder="0,00"
                                className="h-10 w-full rounded-xl border border-ink-100 bg-white pl-8 pr-3 text-sm outline-none focus:border-coral-400" />
                            </div>
                            <button type="button" onClick={() => removeEdge(size.id, edge.id)}
                              className="inline-flex h-10 items-center gap-1 rounded-xl border border-red-100 px-3 text-xs font-semibold text-red-500 hover:bg-red-50">
                              Excluir
                            </button>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => addEdge(size.id)}
                        className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-coral-300 px-3 text-xs font-semibold text-coral-600 hover:bg-coral-50">
                        <Plus className="h-3.5 w-3.5" /> Adicionar borda
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

            </div>

            <div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-ink-100 bg-white pt-4">
              <button type="button" onClick={() => setPizzaModalOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-ink-100 px-5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50">
                Cancelar
              </button>
              <button type="button" onClick={handleContinuePizzaFlow} disabled={!canContinuePizza || savingPizza}
                className={cn('inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white transition',
                  canContinuePizza && !savingPizza ? 'bg-coral-500 hover:bg-coral-600' : 'bg-ink-300 text-white/80')}>
                {savingPizza ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : pizzaTab === 'bordas' ? 'Salvar categoria' : 'Continuar'}
              </button>
            </div>
          </div>
        </>
      </AnimatedModal>

      <StoreImagePickerModal
        open={flavorImagePickerOpen}
        storeId={data.store.id}
        slot="logo"
        overlayClassName="z-[200]"
        onSelect={(url) => { setFlavorImage(url); setFlavorImagePickerOpen(false) }}
        onClose={() => setFlavorImagePickerOpen(false)}
      />

      {/* ── Modal de sabor ── */}
      <AnimatedModal
        open={flavorModalOpen}
        onClose={() => { if (!flavorImagePickerOpen) setFlavorModalOpen(false) }}
        panelClassName="panel-card flex h-[min(88vh,700px)] w-full max-w-3xl flex-col p-6"
        ariaLabelledby="flavor-modal-title"
      >
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Pizza</p>
              <h3 id="flavor-modal-title" className="mt-1 text-xl font-bold text-ink-900">
                {editingFlavorId ? flavorName || 'Editar sabor' : 'Novo sabor'}
              </h3>
              <p className="mt-1 text-sm text-ink-500">Configure o sabor da pizza</p>
            </div>
            <button type="button" onClick={() => setFlavorModalOpen(false)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-5 rounded-2xl border border-ink-100 bg-white px-4 py-3">
            <div className="flex gap-2">
              {(['detalhes', 'preco'] as const).map((tab) => (
                <button key={tab} type="button"
                  onClick={() => setFlavorTab(tab)}
                  className={cn('inline-flex shrink-0 items-center rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                    flavorTab === tab ? 'border-coral-200 bg-coral-50 text-coral-700'
                      : 'border-transparent text-ink-500 hover:border-ink-100 hover:bg-ink-50 hover:text-ink-900')}>
                  {tab === 'detalhes' ? 'Detalhes' : 'Preço'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">

            {/* ── DETALHES ── */}
            {flavorTab === 'detalhes' ? (
              <div className="space-y-4">
                {/* Botão escolher da biblioteca */}
                {(flavorsByCategory[flavorModalCategoryId ?? ''] ?? []).length > 0 ? (
                  <div>
                    {flavorPickerOpen ? (
                      <div className="rounded-xl border border-coral-200 bg-coral-50 p-3 space-y-2">
                        <p className="text-xs font-semibold text-ink-700">Escolher da biblioteca</p>
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                          <input type="text" value={flavorLibSearch} onChange={(e) => setFlavorLibSearch(e.target.value)}
                            placeholder="Buscar sabor..."
                            className="h-9 w-full rounded-xl border border-ink-100 bg-white pl-9 pr-3 text-sm outline-none focus:border-coral-400" />
                        </div>
                        <div className="max-h-44 space-y-1 overflow-y-auto">
                          {(flavorsByCategory[flavorModalCategoryId ?? ''] ?? [])
                            .filter((f) => f.name.toLowerCase().includes(flavorLibSearch.toLowerCase()))
                            .map((f) => (
                              <button key={f.id} type="button"
                                onClick={() => {
                                  setFlavorName(f.name)
                                  setFlavorDescription(f.description)
                                  setFlavorImage(f.imageUrl ?? '')
                                  setFlavorPickerOpen(false)
                                  setFlavorLibSearch('')
                                }}
                                className="flex w-full items-center gap-2 rounded-xl border border-ink-100 bg-white p-2 text-left hover:bg-ink-50">
                                {f.imageUrl ? <img src={f.imageUrl} alt={f.name} className="h-8 w-8 rounded-lg object-cover shrink-0" /> : null}
                                <p className="truncate text-sm font-semibold text-ink-900">{f.name}</p>
                              </button>
                            ))}
                        </div>
                        <button type="button" onClick={() => setFlavorPickerOpen(false)}
                          className="h-8 w-full rounded-xl border border-ink-100 text-xs font-semibold text-ink-600 hover:bg-white">Fechar</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setFlavorPickerOpen(true); setFlavorLibSearch('') }}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-coral-200 px-3 text-sm font-semibold text-coral-600 hover:bg-coral-50">
                        Escolher da biblioteca
                      </button>
                    )}
                  </div>
                ) : null}

                <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
                {/* Imagem */}
                <div className="flex flex-col gap-2">
                  <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Imagem do item</span>
                  <p className="text-xs text-ink-400">Aparece na listagem e no detalhe do prato</p>
                  {flavorImage ? (
                    <div className="relative">
                      <img src={flavorImage} alt="preview" className="h-44 w-full rounded-2xl object-cover" />
                      <button type="button" onClick={() => setFlavorImagePickerOpen(true)}
                        className="absolute right-2 top-2 rounded-xl bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 shadow transition hover:bg-coral-500 hover:text-white">
                        Trocar
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setFlavorImagePickerOpen(true)}
                      className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 text-sm font-semibold text-ink-400 hover:border-coral-400 hover:bg-coral-50 hover:text-coral-600">
                      <Plus className="h-6 w-6" />
                      Selecionar imagem
                    </button>
                  )}
                </div>

                {/* Nome e descrição */}
                <div className="flex flex-col gap-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-ink-900">Sabor <span className="text-coral-500">*</span></span>
                    <input type="text" value={flavorName} onChange={(e) => setFlavorName(e.target.value.slice(0, 80))}
                      placeholder="Sabor da pizza"
                      className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400" />
                    <p className="mt-1 text-right text-xs text-ink-400">{flavorName.length}/80</p>
                  </label>
                  <label className="block flex-1">
                    <span className="mb-2 block text-sm font-semibold text-ink-900">Descrição</span>
                    <textarea value={flavorDescription} onChange={(e) => setFlavorDescription(e.target.value.slice(0, 100))}
                      rows={4} placeholder="Pizza artesanal, base com molho de tomate..."
                      className="w-full rounded-2xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400 resize-none" />
                    <p className="mt-1 text-right text-xs text-ink-400">{flavorDescription.length}/100</p>
                  </label>
                </div>
              </div>
              </div>
            ) : null}

            {/* ── PREÇO ── */}
            {flavorTab === 'preco' ? (
              <div className="space-y-4">
                {flavorSizes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 px-5 py-10 text-center">
                    <p className="text-sm font-semibold text-ink-700">Nenhum tamanho cadastrado nesta categoria.</p>
                    <p className="mt-1 text-sm text-ink-500">Edite a categoria pizza para adicionar tamanhos primeiro.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {flavorSizes.map((size) => (
                      <div key={size.id} className="rounded-2xl border border-ink-100 bg-white p-4">
                        <p className="text-xs font-semibold text-ink-500">Preço para o tamanho</p>
                        <p className="mt-0.5 text-sm font-bold text-ink-900">{size.name}</p>
                        <div className="relative mt-3">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-400">R$</span>
                          <input type="text" inputMode="numeric"
                            value={flavorPrices[size.id] ?? ''}
                            onChange={(e) => setFlavorPrices((prev) => ({ ...prev, [size.id]: formatCurrencyInput(e.target.value) }))}
                            placeholder="0,00"
                            className="h-12 w-full rounded-2xl border border-ink-100 bg-white pl-11 pr-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

          </div>

          <div className="mt-5 flex justify-end gap-3 border-t border-ink-100 pt-4">
            <button type="button" onClick={() => setFlavorModalOpen(false)}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-ink-100 px-5 text-sm font-semibold text-ink-700 hover:bg-ink-50">
              Cancelar
            </button>
            {flavorTab === 'detalhes' ? (
              <button type="button" onClick={() => setFlavorTab('preco')} disabled={!flavorName.trim()}
                className={cn('inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold text-white transition',
                  flavorName.trim() ? 'bg-coral-500 hover:bg-coral-600' : 'bg-ink-300 text-white/80')}>
                Próximo
              </button>
            ) : (
              <button type="button" onClick={() => void handleSaveFlavor()} disabled={savingFlavor}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-coral-500 px-5 text-sm font-semibold text-white hover:bg-coral-600 disabled:opacity-60">
                {savingFlavor ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar sabor
              </button>
            )}
          </div>
        </>
      </AnimatedModal>

      {/* ── Modal biblioteca de sabores ── */}
      <AnimatedModal
        open={flavorLibModalOpen}
        onClose={() => setFlavorLibModalOpen(false)}
        panelClassName="panel-card flex h-[min(88vh,700px)] w-full max-w-2xl flex-col p-6"
        ariaLabelledby="flavor-lib-title"
      >
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Pizza</p>
              <h3 id="flavor-lib-title" className="mt-1 text-xl font-bold text-ink-900">Biblioteca de Sabores</h3>
              <p className="mt-1 text-sm text-ink-500">Sabores cadastrados nesta categoria.</p>
            </div>
            <button type="button" onClick={() => setFlavorLibModalOpen(false)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 flex min-h-0 flex-1 flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input type="text" value={flavorLibSearch} onChange={(e) => setFlavorLibSearch(e.target.value)}
                placeholder="Buscar sabor..."
                className="h-12 w-full rounded-2xl border border-ink-100 bg-white pl-11 pr-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400" />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1">
              {flavorLibItems.filter((f) => `${f.name} ${f.description}`.toLowerCase().includes(flavorLibSearch.toLowerCase())).length > 0 ? (
                flavorLibItems
                  .filter((f) => `${f.name} ${f.description}`.toLowerCase().includes(flavorLibSearch.toLowerCase()))
                  .map((flavor) => (
                    <div key={flavor.id} className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3">
                      {flavor.imageUrl ? (
                        <img src={flavor.imageUrl} alt={flavor.name} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-sm font-bold text-ink-500">
                          {flavor.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink-900">{flavor.name}</p>
                        {flavor.description ? <p className="truncate text-xs text-ink-500">{flavor.description}</p> : null}
                      </div>
                      <button type="button"
                        onClick={() => { setFlavorLibModalOpen(false); if (flavorLibCategoryId) openFlavorModal(flavorLibCategoryId, flavor) }}
                        className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-100 text-ink-500 hover:bg-ink-50">
                        <PencilLine className="h-4 w-4" />
                      </button>
                    </div>
                  ))
              ) : (
                <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 px-5 py-10 text-center">
                  <p className="text-sm font-semibold text-ink-700">{flavorLibSearch ? 'Nenhum resultado.' : 'Nenhum sabor cadastrado ainda.'}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button type="button"
                onClick={() => { setFlavorLibModalOpen(false); if (flavorLibCategoryId) openFlavorModal(flavorLibCategoryId) }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-coral-500 px-5 text-sm font-semibold text-white hover:bg-coral-600">
                <Plus className="h-4 w-4" /> Novo sabor
              </button>
            </div>
          </div>
        </>
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
        onClose={() => { if (!prepImagePickerOpen && !libImagePickerOpen) { setProductKindModalOpen(false); setEditingProduct(null) } }}
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
                {selectedProductCreationKind === 'preparado' && prepName.trim() ? (
                  <h3 id="product-kind-title" className="mt-1 text-xl font-bold text-ink-900 truncate max-w-sm">{prepName}</h3>
                ) : (
                  <h3 id="product-kind-title" className="mt-1 text-xl font-bold text-ink-400">
                    {selectedProductCreationKind === 'preparado' ? 'Novo produto preparado' : selectedProductCreationKindMeta.label}
                  </h3>
                )}
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
                    {industrializedStepTabs.map((tab) => {
                      const tabIndex = industrializedStepTabs.findIndex((item) => item.id === tab.id)
                      const isVisited = tabIndex <= industrializedCurrentStepIndex
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => { if (isVisited) setIndustrializedStepTab(tab.id) }}
                          disabled={!isVisited}
                          className={cn(
                            'inline-flex shrink-0 items-center rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                            industrializedStepTab === tab.id
                              ? 'border-coral-200 bg-coral-50 text-coral-700'
                              : isVisited
                                ? 'border-transparent bg-transparent text-ink-500 hover:border-ink-100 hover:bg-ink-50 hover:text-ink-900'
                                : 'border-transparent bg-transparent text-ink-400 opacity-60'
                          )}
                        >
                          {tab.label}
                        </button>
                      )
                    })}
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
                              DEFAULT_PRODUCT_IMAGE
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
                    <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
                      {/* Coluna esquerda — imagem */}
                      <div className="flex flex-col gap-2">
                        <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Imagem do produto</span>
                        {prepImage ? (
                          <div className="relative">
                            <img src={prepImage} alt="preview" className="h-48 w-full rounded-2xl object-cover md:h-full md:min-h-[200px]" />
                            <button type="button" onClick={() => setPrepImagePickerOpen(true)}
                              className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 shadow transition hover:bg-coral-500 hover:text-white">
                              Trocar
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setPrepImagePickerOpen(true)}
                            className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 text-sm font-semibold text-ink-500 transition hover:border-coral-400 hover:bg-coral-50 hover:text-coral-600 md:h-full md:min-h-[200px]">
                            <Plus className="h-6 w-6" />
                            Selecionar imagem
                          </button>
                        )}
                      </div>

                      {/* Coluna direita — nome e descrição */}
                      <div className="flex flex-col gap-4">
                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Nome do produto <span className="text-coral-500">*</span></span>
                          <input type="text" value={prepName} onChange={(e) => setPrepName(e.target.value)} placeholder="Ex.: X-Burguer Especial"
                            className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400" />
                        </label>
                        <label className="block flex-1">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Descricao</span>
                          <textarea value={prepDescription} onChange={(e) => setPrepDescription(e.target.value)} rows={5} placeholder="Descreva os ingredientes e diferenciais..."
                            className="w-full rounded-2xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400 resize-none" />
                        </label>
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
                          {editingGroupId === group.id ? (
                            <div className="space-y-2">
                              <input type="text" value={editingGroupName} onChange={(e) => setEditingGroupName(e.target.value)} placeholder="Nome do grupo *"
                                className="h-9 w-full rounded-xl border border-ink-100 bg-white px-3 text-sm outline-none focus:border-coral-400" />
                              <div className="grid grid-cols-2 gap-2">
                                <label className="block">
                                  <span className="mb-1 block text-xs font-semibold text-ink-500">Mínimo</span>
                                  <input type="number" min={0} value={editingGroupMin} onChange={(e) => setEditingGroupMin(e.target.value)}
                                    className="h-9 w-full rounded-xl border border-ink-100 bg-white px-3 text-sm outline-none focus:border-coral-400" />
                                </label>
                                <label className="block">
                                  <span className="mb-1 block text-xs font-semibold text-ink-500">Máximo</span>
                                  <input type="number" min={1} value={editingGroupMax} onChange={(e) => setEditingGroupMax(e.target.value)}
                                    className="h-9 w-full rounded-xl border border-ink-100 bg-white px-3 text-sm outline-none focus:border-coral-400" />
                                </label>
                              </div>
                              <button type="button" onClick={() => setEditingGroupCanRepeat((v) => !v)}
                                className={cn('flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold transition',
                                  editingGroupCanRepeat ? 'border-coral-300 bg-coral-50 text-coral-700' : 'border-ink-100 bg-white text-ink-600')}>
                                <span>Pode repetir quantidade</span>
                                <span className={cn('h-5 w-9 rounded-full transition-colors', editingGroupCanRepeat ? 'bg-coral-500' : 'bg-ink-200')} />
                              </button>
                              <p className={cn('rounded-xl px-3 py-2 text-xs font-semibold',
                                Number(editingGroupMin) >= 1
                                  ? 'bg-coral-100 text-coral-700'
                                  : 'bg-ink-100 text-ink-500'
                              )}>
                                {Number(editingGroupMin) >= 1
                                  ? '✓ Obrigatorio — o cliente deve escolher ao menos ' + editingGroupMin + ' item(s).'
                                  : 'Opcional — o cliente pode ignorar este grupo.'}
                              </p>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => setEditingGroupId(null)}
                                  className="h-8 flex-1 rounded-xl border border-ink-100 text-xs font-semibold text-ink-600 hover:bg-ink-50">Cancelar</button>
                                <button type="button" onClick={saveEditingGroup}
                                  className="h-8 flex-1 rounded-xl bg-coral-500 text-xs font-semibold text-white hover:bg-coral-600">Salvar</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-ink-900">{group.name}</p>
                                <p className="mt-0.5 text-xs text-ink-500">{group.required ? 'Obrigatorio' : 'Opcional'} · min {group.minQty} / max {group.maxQty}{group.canRepeat ? ' · pode repetir' : ''}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => {
                                  setEditingGroupId(group.id)
                                  setEditingGroupName(group.name)
                                  setEditingGroupRequired(group.required)
                                  setEditingGroupMin(String(group.minQty))
                                  setEditingGroupMax(String(group.maxQty))
                                  setEditingGroupCanRepeat(group.canRepeat ?? false)
                                }}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-ink-100 text-ink-500 hover:bg-ink-50">
                                  <PencilLine className="h-3.5 w-3.5" />
                                </button>
                                <button type="button" onClick={() => removeComplementGroup(group.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-ink-100 text-ink-500 hover:bg-ink-50">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}

                          {group.items.length > 0 ? (
                            <div className="mt-3 space-y-2">
                              {group.items.map((item) => (
                                <div key={item.id} className="rounded-xl border border-ink-100 bg-ink-50 px-3 py-2">
                                  {editingItemId === item.id ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <div className="flex min-w-0 flex-1 items-center gap-2">
                                          {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-7 w-7 rounded-lg object-cover shrink-0" /> : null}
                                          <p className="truncate text-sm font-semibold text-ink-900">{item.name}</p>
                                        </div>
                                        <div className="relative w-28 shrink-0">
                                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-400">R$</span>
                                          <input type="text" inputMode="numeric" value={editingItemPrice} onChange={(e) => setEditingItemPrice(formatCurrencyInput(e.target.value))} placeholder="0,00" autoFocus
                                            className="h-7 w-full rounded-lg border border-coral-300 bg-white pl-7 pr-2 text-xs outline-none" />
                                        </div>
                                        <button type="button" onClick={() => saveEditingItem(group.id)}
                                          className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-coral-500 text-white hover:bg-coral-600">
                                          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        </button>
                                        <button type="button" onClick={() => { setEditingItemId(null); setEditingItemPrice('') }}
                                          className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-ink-100 text-ink-400 hover:bg-ink-100">
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                      {/* Max por item — só exibe quando o grupo permite múltiplos */}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex min-w-0 items-center gap-2">
                                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-8 w-8 rounded-lg object-cover shrink-0" /> : null}
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-semibold text-ink-900">{item.name}</p>
                                          <p className="text-xs text-ink-500">
                                            {item.price > 0 ? `+ ${formatCurrency(item.price)}` : 'Gratis'}
                                            {' · '}{item.source === 'biblioteca' ? 'Biblioteca' : 'Industrializado'}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => {
                                          setEditingItemId(item.id)
                                          setEditingItemPrice(item.price > 0 ? item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '')
                                        }}
                                          className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-ink-100 text-ink-400 hover:bg-ink-100">
                                          <PencilLine className="h-3 w-3" />
                                        </button>
                                        <button type="button" onClick={() => removeComplementItem(group.id, item.id)}
                                          className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-ink-100 text-ink-400 hover:bg-ink-100">
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
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
                                  {showNewLibForm ? (
                                    <>
                                      <p className="text-xs font-semibold text-ink-700">Novo item na biblioteca</p>
                                      <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
                                        <div>
                                          {newLibItemImage ? (
                                            <div className="relative">
                                              <img src={newLibItemImage} alt="preview" className="h-[88px] w-full rounded-xl object-cover" />
                                              <button type="button" onClick={() => setLibImagePickerOpen(true)}
                                                className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 text-[10px] font-bold text-white opacity-0 hover:opacity-100 transition">Trocar</button>
                                            </div>
                                          ) : (
                                            <button type="button" onClick={() => setLibImagePickerOpen(true)}
                                              className="flex h-[88px] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-ink-200 bg-white text-[10px] font-semibold text-ink-400 hover:border-coral-400 hover:text-coral-600">
                                              <Plus className="h-4 w-4" />
                                              Foto
                                            </button>
                                          )}
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                          <input type="text" value={newLibItemName} onChange={(e) => setNewLibItemName(e.target.value)} placeholder="Nome do item *"
                                            className="h-9 w-full rounded-xl border border-ink-100 bg-white px-3 text-sm outline-none focus:border-coral-400" />
                                          <input type="text" value={newLibItemDescription} onChange={(e) => setNewLibItemDescription(e.target.value)} placeholder="Descricao (opcional)"
                                            className="h-9 w-full rounded-xl border border-ink-100 bg-white px-3 text-sm outline-none focus:border-coral-400" />
                                          <div className="relative">
                                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-400">R$</span>
                                            <input type="text" inputMode="numeric" value={newLibItemPrice} onChange={(e) => setNewLibItemPrice(formatCurrencyInput(e.target.value))} placeholder="0,00"
                                              className="h-9 w-full rounded-xl border border-ink-100 bg-white pl-9 pr-3 text-sm outline-none focus:border-coral-400" />
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <button type="button" onClick={() => setShowNewLibForm(false)}
                                          className="h-9 flex-1 rounded-xl border border-ink-100 text-sm font-semibold text-ink-600 hover:bg-white">Voltar</button>
                                        <button type="button" onClick={() => handleAddLibItemToGroup(group.id)}
                                          className="h-9 flex-1 rounded-xl bg-coral-500 text-sm font-semibold text-white hover:bg-coral-600">Adicionar</button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                                        <input type="text" value={libSearch} onChange={(e) => setLibSearch(e.target.value)} placeholder="Buscar na biblioteca..."
                                          className="h-9 w-full rounded-xl border border-ink-100 bg-white pl-9 pr-3 text-sm outline-none focus:border-coral-400" />
                                      </div>
                                      {libItems.filter((i) => `${i.name} ${i.description ?? ''}`.toLowerCase().includes(libSearch.toLowerCase())).length > 0 ? (
                                        <div className="max-h-44 space-y-1 overflow-y-auto">
                                          {libItems
                                            .filter((i) => `${i.name} ${i.description ?? ''}`.toLowerCase().includes(libSearch.toLowerCase()))
                                            .map((libItem) => (
                                              <button key={libItem.id} type="button" onClick={() => handleSelectLibItem(group.id, libItem)}
                                                className="flex w-full items-center gap-2 rounded-xl border border-ink-100 bg-white p-2 text-left hover:bg-ink-50">
                                                {libItem.imageUrl ? (
                                                  <img src={libItem.imageUrl} alt={libItem.name} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                                                ) : (
                                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-xs font-bold text-ink-500">
                                                    {libItem.name.slice(0, 1).toUpperCase()}
                                                  </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                  <p className="truncate text-sm font-semibold text-ink-900">{libItem.name}</p>
                                                  <p className="text-xs text-ink-500">{libItem.price > 0 ? formatCurrency(libItem.price) : 'Gratis'}{libItem.description ? ` · ${libItem.description}` : ''}</p>
                                                </div>
                                              </button>
                                            ))}
                                        </div>
                                      ) : (
                                        <p className="rounded-xl border border-dashed border-ink-200 bg-white px-3 py-3 text-center text-xs text-ink-400">
                                          {libSearch ? 'Nenhum resultado.' : 'Nenhum item na biblioteca ainda.'}
                                        </p>
                                      )}
                                      <div className="flex gap-2">
                                        <button type="button" onClick={() => setComplementPickerGroupId(null)}
                                          className="h-9 flex-1 rounded-xl border border-ink-100 text-sm font-semibold text-ink-600 hover:bg-white">Fechar</button>
                                        <button type="button" onClick={() => { setShowNewLibForm(true); setNewLibItemName(''); setNewLibItemDescription(''); setNewLibItemPrice(''); setNewLibItemImage('') }}
                                          className="h-9 flex-1 rounded-xl bg-coral-500 text-sm font-semibold text-white hover:bg-coral-600">+ Novo item</button>
                                      </div>
                                    </>
                                  )}
                                </div>

                              ) : (
                                <div className="space-y-2">
                                  {selectedIndItem ? (
                                    <>
                                      <div className="flex items-center gap-2 rounded-xl border border-coral-200 bg-coral-50 p-2">
                                        {selectedIndItem.image ? <img src={selectedIndItem.image} alt={selectedIndItem.name} className="h-8 w-8 rounded-lg object-cover shrink-0" /> : null}
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-sm font-semibold text-ink-900">{selectedIndItem.name}</p>
                                          <p className="text-xs text-ink-500">{selectedIndItem.brand}</p>
                                        </div>
                                        <button type="button" onClick={() => { setSelectedIndItem(null); setNewIndItemPrice('') }}
                                          className="shrink-0 text-ink-400 hover:text-ink-700"><X className="h-4 w-4" /></button>
                                      </div>
                                      <div className="relative">
                                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-400">R$</span>
                                        <input type="text" inputMode="numeric" value={newIndItemPrice} onChange={(e) => setNewIndItemPrice(formatCurrencyInput(e.target.value))} placeholder="0,00"
                                          className="h-10 w-full rounded-xl border border-ink-100 bg-white pl-9 pr-3 text-sm outline-none focus:border-coral-400" />
                                      </div>
                                      <div className="flex gap-2">
                                        <button type="button" onClick={() => setComplementPickerGroupId(null)}
                                          className="h-9 flex-1 rounded-xl border border-ink-100 text-sm font-semibold text-ink-600 hover:bg-white">Cancelar</button>
                                        <button type="button" onClick={() => handleAddIndustrializedToGroup(group.id, selectedIndItem)}
                                          className="h-9 flex-1 rounded-xl bg-coral-500 text-sm font-semibold text-white hover:bg-coral-600">Adicionar</button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                                        <input type="text" value={complementPickerSearch} onChange={(e) => setComplementPickerSearch(e.target.value)} placeholder="Buscar industrializado..."
                                          className="h-10 w-full rounded-xl border border-ink-100 bg-white pl-9 pr-3 text-sm outline-none focus:border-coral-400" />
                                      </div>
                                      <div className="max-h-48 space-y-1 overflow-y-auto">
                                        {industrializedCatalogItems
                                          .filter((i) => `${i.name} ${i.brand}`.toLowerCase().includes(complementPickerSearch.toLowerCase()))
                                          .map((ind) => (
                                            <button key={ind.id} type="button" onClick={() => { setSelectedIndItem(ind); setNewIndItemPrice('') }}
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
                                    </>
                                  )}
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
                              <span className="mb-1 block text-xs font-semibold text-ink-500">Mínimo</span>
                              <input type="number" min={0} value={addingGroupMin} onChange={(e) => setAddingGroupMin(e.target.value)}
                                className="h-10 w-full rounded-xl border border-ink-100 bg-white px-3 text-sm outline-none focus:border-coral-400" />
                            </label>
                            <label className="block">
                              <span className="mb-1 block text-xs font-semibold text-ink-500">Máximo</span>
                              <input type="number" min={1} value={addingGroupMax} onChange={(e) => setAddingGroupMax(e.target.value)}
                                className="h-10 w-full rounded-xl border border-ink-100 bg-white px-3 text-sm outline-none focus:border-coral-400" />
                            </label>
                          </div>
                          <button type="button" onClick={() => setAddingGroupCanRepeat((v) => !v)}
                            className={cn('flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                              addingGroupCanRepeat ? 'border-coral-300 bg-coral-50 text-coral-700' : 'border-ink-100 bg-white text-ink-600')}>
                            <span>Pode repetir quantidade</span>
                            <span className={cn('h-5 w-9 rounded-full transition-colors', addingGroupCanRepeat ? 'bg-coral-500' : 'bg-ink-200')} />
                          </button>
                          <p className={cn('rounded-xl px-3 py-2 text-xs font-semibold',
                            Number(addingGroupMin) >= 1
                              ? 'bg-coral-100 text-coral-700'
                              : 'bg-ink-100 text-ink-500'
                          )}>
                            {Number(addingGroupMin) >= 1
                              ? '✓ Obrigatorio — o cliente deve escolher ao menos ' + addingGroupMin + ' item(s).'
                              : 'Opcional — o cliente pode ignorar este grupo.'}
                          </p>
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
                            <img src={prepImage || DEFAULT_PRODUCT_IMAGE} alt={prepName || 'Produto'} className="h-[220px] w-full object-cover" />
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
                            src={editingProduct.imageUrl || DEFAULT_PRODUCT_IMAGE}
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


      {/* ── Modal renomear categoria ── */}
      <AnimatedModal
        open={renamingCategory !== null}
        onClose={() => { if (!savingRenameCategory) setRenamingCategory(null) }}
        panelClassName="panel-card w-full max-w-sm p-6"
        ariaLabelledby="rename-category-title"
      >
        <div className="flex items-center justify-between gap-4">
          <h3 id="rename-category-title" className="text-lg font-bold text-ink-900">Renomear categoria</h3>
          <button
            type="button"
            onClick={() => setRenamingCategory(null)}
            disabled={savingRenameCategory}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-100 bg-white text-ink-600 transition hover:bg-ink-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Nome</label>
          <input
            autoFocus
            type="text"
            value={renameCategoryInput}
            onChange={(e) => setRenameCategoryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.form?.requestSubmit()
            }}
            className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-coral-400 focus:ring-2 focus:ring-coral-100"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setRenamingCategory(null)}
            disabled={savingRenameCategory}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={savingRenameCategory || !renameCategoryInput.trim() || renameCategoryInput.trim() === renamingCategory?.name}
            onClick={async () => {
              if (!renamingCategory) return
              const newName = renameCategoryInput.trim()
              if (!newName || newName === renamingCategory.name) return
              setSavingRenameCategory(true)
              const { supabase } = await import('@/lib/supabase')
              const { error } = await supabase!.from('product_categories')
                .update({ name: newName })
                .eq('id', renamingCategory.id)
                .eq('store_id', data.store.id)
              setSavingRenameCategory(false)
              if (error) {
                toast.error('Nao foi possivel atualizar.')
              } else {
                setCatalogCategories((prev) => prev.map((c) => c.id === renamingCategory.id ? { ...c, name: newName } : c))
                toast.success('Categoria atualizada.')
                setRenamingCategory(null)
              }
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-coral-500 px-5 text-sm font-semibold text-white transition hover:bg-coral-600 disabled:bg-ink-300"
          >
            {savingRenameCategory ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar'}
          </button>
        </div>
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
                      if (getCategoryTemplate(category) === 'pizza') {
                        openPizzaEditModal(category)
                      } else {
                        setRenamingCategory({ id: category.id, name: category.name })
                        setRenameCategoryInput(category.name)
                        setMenuOpenCategoryId(null)
                        setCategoryMenuPosition(null)
                      }
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
                  {category.productCount === 0 && (flavorsByCategory[category.id] ?? []).length === 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Deletar a categoria "${category.name}"?`)) {
                          import('@/lib/supabase').then(({ supabase }) => {
                            supabase?.from('product_categories')
                              .delete()
                              .eq('id', category.id)
                              .eq('store_id', data.store.id)
                              .then(({ error }) => {
                                if (error) {
                                  toast.error('Nao foi possivel deletar.')
                                } else {
                                  setCatalogCategories((prev) => prev.filter((c) => c.id !== category.id))
                                  setCategoryOrderIds((prev) => prev.filter((id) => id !== category.id))
                                  toast.success('Categoria deletada.')
                                }
                              })
                          })
                          setMenuOpenCategoryId(null)
                        }
                      }}
                      className="flex w-full items-center gap-2 border-t border-ink-100 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                      Deletar
                    </button>
                  ) : null}
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
