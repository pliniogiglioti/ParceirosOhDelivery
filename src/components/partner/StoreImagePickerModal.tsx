import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { AnimatedModal } from './AnimatedModal'
import { listStoreImages, uploadStoreImage, type StoreImageItem } from '@/services/partner'

const MAX_FILE_SIZE = 1_048_576   // 1 MB
const MAX_DIMENSION = 800         // px

function validateImage(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (file.size > MAX_FILE_SIZE) {
      resolve(`A imagem deve ter no maximo 1 MB (atual: ${(file.size / 1_048_576).toFixed(1)} MB).`)
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
        resolve(`A imagem deve ter no maximo ${MAX_DIMENSION}x${MAX_DIMENSION}px (atual: ${img.width}x${img.height}px).`)
      } else {
        resolve(null)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve('Nao foi possivel ler a imagem.')
    }
    img.src = url
  })
}

type Props = {
  open: boolean
  storeId: string
  slot: 'logo' | 'cover'
  onSelect: (publicUrl: string) => void
  onClose: () => void
}

const SLOT_LABEL: Record<Props['slot'], string> = {
  logo: 'logo da loja',
  cover: 'capa da loja',
}

export function StoreImagePickerModal({ open, storeId, slot, onSelect, onClose }: Props) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [images, setImages] = useState<StoreImageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    listStoreImages(storeId)
      .then(setImages)
      .catch(() => toast.error('Nao foi possivel carregar as imagens.'))
      .finally(() => setLoading(false))
  }, [open, storeId])

  async function handleUploadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''

    const validationError = await validateImage(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setUploading(true)
    try {
      const publicUrl = await uploadStoreImage(storeId, file)
      const newItem: StoreImageItem = {
        name: file.name,
        path: `${storeId}/${file.name}`,
        publicUrl,
        updatedAt: new Date().toISOString(),
      }
      setImages((prev) => [newItem, ...prev])
      toast.success('Imagem enviada.')
    } catch {
      toast.error('Falha ao enviar imagem.')
    } finally {
      setUploading(false)
    }
  }

  function handleSelect(url: string) {
    onSelect(url)
    onClose()
  }

  return (
    <AnimatedModal
      open={open}
      onClose={onClose}
      panelClassName="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-ink-900">Imagens da loja</p>
          <p className="mt-0.5 text-xs text-ink-500">Selecione uma imagem para usar como {SLOT_LABEL[slot]}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Grid de imagens */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-ink-200 border-t-coral-500" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {/* Botao de upload */}
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => void handleUploadFile(e)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => !uploading && uploadInputRef.current?.click()}
              disabled={uploading}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 text-ink-400 transition hover:border-coral-400 hover:bg-coral-50 hover:text-coral-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink-300 border-t-coral-500" />
              ) : (
                <ImagePlus className="h-6 w-6" />
              )}
              <span className="text-[11px] font-semibold">
                {uploading ? 'Enviando...' : 'Nova imagem'}
              </span>
            </button>

            {/* Imagens existentes */}
            {images.map((img) => (
              <button
                key={img.path}
                type="button"
                onClick={() => handleSelect(img.publicUrl)}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-ink-100 bg-ink-50 transition hover:border-coral-400 hover:shadow-md"
              >
                <img
                  src={img.publicUrl}
                  alt={img.name}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                  <span className="scale-0 rounded-full bg-coral-500 px-3 py-1 text-[11px] font-bold text-white transition group-hover:scale-100">
                    Usar
                  </span>
                </div>
              </button>
            ))}

            {images.length === 0 && !loading && (
              <p className="col-span-3 py-8 text-center text-sm text-ink-400 sm:col-span-4">
                Nenhuma imagem ainda. Faca upload acima.
              </p>
            )}
          </div>
        )}
      </div>
    </AnimatedModal>
  )
}
