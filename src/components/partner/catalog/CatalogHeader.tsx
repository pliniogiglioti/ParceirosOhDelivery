import { GripVertical, Plus } from 'lucide-react'

interface CatalogHeaderProps {
  hasPizzaCategory: boolean
  onOpenLibModal: () => void
  onOpenFlavorLib: () => void
  onOpenCreateCategory: () => void
}

export function CatalogHeader({
  hasPizzaCategory,
  onOpenLibModal,
  onOpenFlavorLib,
  onOpenCreateCategory,
}: CatalogHeaderProps) {
  return (
    <div className="border-b border-ink-100 bg-white px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="flex items-center gap-2 text-xs text-ink-400">
          <GripVertical className="h-4 w-4" />
          Arraste as categorias para reordenar
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onOpenLibModal}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-coral-200 bg-white px-4 text-sm font-semibold text-coral-600 transition hover:bg-coral-50"
          >
            Biblioteca de Complementos
          </button>

          {hasPizzaCategory ? (
            <button
              type="button"
              onClick={onOpenFlavorLib}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-coral-200 bg-white px-4 text-sm font-semibold text-coral-600 transition hover:bg-coral-50"
            >
              Biblioteca de Sabores
            </button>
          ) : null}

          <button
            type="button"
            onClick={onOpenCreateCategory}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-coral-500 px-5 text-sm font-semibold text-white transition hover:bg-coral-600"
          >
            <Plus className="h-4 w-4" />
            Adicionar categoria
          </button>
        </div>
      </div>
    </div>
  )
}
