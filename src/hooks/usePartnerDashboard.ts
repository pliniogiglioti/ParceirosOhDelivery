import { useEffect, useState } from 'react'
import { loadPartnerDashboard } from '@/services/partner'
import type { PartnerDashboardData } from '@/types'

interface PartnerDashboardState {
  data: PartnerDashboardData | null
  source: 'supabase'
  loading: boolean
  error: string | null
}

export function usePartnerDashboard(storeId: string | null) {
  const [state, setState] = useState<PartnerDashboardState>({
    data: null,
    source: 'supabase',
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!storeId) {
      setState({
        data: null,
        source: 'supabase',
        loading: false,
        error: null,
      })
      return
    }

    let active = true

    void (async () => {
      setState((current) => ({ ...current, loading: true, error: null }))

      try {
        const result = await loadPartnerDashboard(storeId)
        if (!active) return

        setState({
          data: result.data,
          source: result.source,
          loading: false,
          error: null,
        })
      } catch {
        if (!active) return

        setState((current) => ({
          ...current,
          loading: false,
          error: 'Nao foi possivel carregar a dashboard do parceiro.',
        }))
      }
    })()

    return () => {
      active = false
    }
  }, [storeId])

  return state
}
