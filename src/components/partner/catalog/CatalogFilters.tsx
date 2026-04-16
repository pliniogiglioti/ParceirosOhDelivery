import { Search, X } from 'lucide-react'
import type { PartnerCategory } from '@/types'

interface CatalogFiltersProps {
  categories: PartnerCategory[]
  selectedCategoryId: string
  search: string
  onCategoryChange: (id: string) => void
  onSearchChange: (value: string) => void
  onClear: () => void
}

export function CatalogFilters({
  categories,
  selectedCategoryId,
  search,
  onCategoryChange,
  onSearchChange,
  onClear,
}: CatalogFiltersProps) {
  return (
    <div className="grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)_auto]">
      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
          Categorias
        </span>
        <select
          value={selectedCategoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm font-medium text-ink-900 outline-none transition focus:border-coral-400"
        >
          <option value="all">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
          Buscar produto
        </span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar produto ou categoria"
            className="h-12 w-full rounded-2xl border border-ink-100 bg-white pl-11 pr-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-coral-400"
          />
        </div>
      </label>

      <div className="flex items-end">
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-coral-200 bg-white px-5 text-sm font-semibold text-coral-600 transition hover:bg-coral-50"
        >
          <X className="h-4 w-4" />
          Limpar filtros
        </button>
      </div>
    </div>
  )
}
