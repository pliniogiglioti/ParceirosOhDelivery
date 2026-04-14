import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

type AnimatedModalProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  panelClassName?: string
  overlayClassName?: string
  ariaLabelledby?: string
}

type ModalAnimationState = 'opening' | 'open' | 'closing'

const MODAL_ENTER_DURATION_MS = 210
const MODAL_EXIT_DURATION_MS = 210

export function AnimatedModal({
  open,
  onClose,
  children,
  panelClassName,
  overlayClassName,
  ariaLabelledby,
}: AnimatedModalProps) {
  const [shouldRender, setShouldRender] = useState(open)
  const [animationState, setAnimationState] = useState<ModalAnimationState>(open ? 'open' : 'closing')

  useEffect(() => {
    let openTimeoutId = 0
    let closeTimeoutId = 0

    if (open) {
      setShouldRender(true)
      setAnimationState('opening')
      openTimeoutId = window.setTimeout(() => {
        setAnimationState('open')
      }, MODAL_ENTER_DURATION_MS)
    } else if (shouldRender) {
      setAnimationState('closing')
      closeTimeoutId = window.setTimeout(() => {
        setShouldRender(false)
      }, MODAL_EXIT_DURATION_MS)
    }

    return () => {
      window.clearTimeout(openTimeoutId)
      window.clearTimeout(closeTimeoutId)
    }
  }, [open, shouldRender])

  if (!shouldRender) {
    return null
  }

  return createPortal(
    <div
      className={cn(
        'modal-backdrop fixed inset-0 z-[90] flex items-center justify-center p-4',
        animationState === 'opening'
          ? 'modal-backdrop-opening'
          : animationState === 'open'
            ? 'modal-backdrop-open'
            : 'modal-backdrop-closing',
        overlayClassName
      )}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        className={cn(
          'modal-panel',
          animationState === 'opening'
            ? 'modal-panel-opening'
            : animationState === 'open'
              ? 'modal-panel-open'
              : 'modal-panel-closing',
          panelClassName
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
