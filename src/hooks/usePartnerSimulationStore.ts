import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PartnerHour, PartnerOrder, PartnerOrderSettings, PartnerStore } from '@/types'

interface PartnerSimulationStoreState {
  storeOpen: boolean | null
  storeByStoreId: Record<string, PartnerStore>
  storeHoursByStoreId: Record<string, PartnerHour[]>
  ordersByStoreId: Record<string, PartnerOrder[]>
  orderSettingsByStoreId: Record<string, PartnerOrderSettings>
  setStoreOpen: (value: boolean) => void
  hydrateStoreOpen: (value: boolean) => void
  hydrateStore: (store: PartnerStore) => void
  updateStore: (storeId: string, patch: Partial<PartnerStore>) => void
  hydrateStoreHours: (storeId: string, hours: PartnerHour[]) => void
  updateStoreHour: (storeId: string, hourId: string, patch: Partial<PartnerHour>) => void
  hydrateOrders: (storeId: string, orders: PartnerOrder[]) => void
  addOrder: (storeId: string, order: PartnerOrder) => void
  updateOrder: (storeId: string, orderId: string, patch: Partial<PartnerOrder>) => void
  hydrateOrderSettings: (storeId: string, settings: PartnerOrderSettings) => void
  updateOrderSettings: (storeId: string, patch: Partial<PartnerOrderSettings>) => void
}

export const usePartnerSimulationStore = create<PartnerSimulationStoreState>()(
  persist(
    (set, get) => ({
      storeOpen: null,
      storeByStoreId: {},
      storeHoursByStoreId: {},
      ordersByStoreId: {},
      orderSettingsByStoreId: {},
      setStoreOpen: (storeOpen) => set({ storeOpen }),
      hydrateStoreOpen: (value) => {
        if (get().storeOpen == null) {
          set({ storeOpen: value })
        }
      },
      hydrateStore: (store) => {
        const currentStore = get().storeByStoreId[store.id]

        set((state) => ({
          storeByStoreId: {
            ...state.storeByStoreId,
            [store.id]: currentStore ? { ...store, ...currentStore } : store,
          },
        }))
      },
      updateStore: (storeId, patch) => {
        const currentStore = get().storeByStoreId[storeId]
        if (!currentStore) return

        set((state) => ({
          storeByStoreId: {
            ...state.storeByStoreId,
            [storeId]: {
              ...currentStore,
              ...patch,
            },
          },
        }))
      },
      hydrateStoreHours: (storeId, hours) => {
        const currentHours = get().storeHoursByStoreId[storeId]

        if (!currentHours) {
          set((state) => ({
            storeHoursByStoreId: {
              ...state.storeHoursByStoreId,
              [storeId]: hours,
            },
          }))
        }
      },
      updateStoreHour: (storeId, hourId, patch) => {
        const currentHours = get().storeHoursByStoreId[storeId] ?? []

        set((state) => ({
          storeHoursByStoreId: {
            ...state.storeHoursByStoreId,
            [storeId]: currentHours.map((hour) => (hour.id === hourId ? { ...hour, ...patch } : hour)),
          },
        }))
      },
      hydrateOrders: (storeId, orders) => {
        const currentOrders = get().ordersByStoreId[storeId]

        if (!currentOrders) {
          set((state) => ({
            ordersByStoreId: {
              ...state.ordersByStoreId,
              [storeId]: orders.map((order) => ({
                ...order,
                stageStartedAt: order.stageStartedAt ?? order.createdAt,
              })),
            },
          }))
        }
      },
      addOrder: (storeId, order) => {
        const currentOrders = get().ordersByStoreId[storeId] ?? []

        set((state) => ({
          ordersByStoreId: {
            ...state.ordersByStoreId,
            [storeId]: [
              {
                ...order,
                stageStartedAt: order.stageStartedAt ?? order.createdAt,
              },
              ...currentOrders,
            ],
          },
        }))
      },
      updateOrder: (storeId, orderId, patch) => {
        const currentOrders = get().ordersByStoreId[storeId] ?? []

        set((state) => ({
          ordersByStoreId: {
            ...state.ordersByStoreId,
            [storeId]: currentOrders.map((order) => (order.id === orderId ? { ...order, ...patch } : order)),
          },
        }))
      },
      hydrateOrderSettings: (storeId, settings) => {
        const currentSettings = get().orderSettingsByStoreId[storeId]
        set((state) => ({
          orderSettingsByStoreId: {
            ...state.orderSettingsByStoreId,
            [storeId]: currentSettings ? { ...settings, ...currentSettings } : settings,
          },
        }))
      },
      updateOrderSettings: (storeId, patch) => {
        const currentSettings = get().orderSettingsByStoreId[storeId]

        set((state) => ({
          orderSettingsByStoreId: {
            ...state.orderSettingsByStoreId,
            [storeId]: {
              ...(currentSettings ?? {}),
              ...patch,
            } as PartnerOrderSettings,
          },
        }))
      },
    }),
    {
      name: 'partner-oh-simulation',
      partialize: (state) => ({
        storeOpen: state.storeOpen,
        storeByStoreId: state.storeByStoreId,
        storeHoursByStoreId: state.storeHoursByStoreId,
        ordersByStoreId: state.ordersByStoreId,
        orderSettingsByStoreId: state.orderSettingsByStoreId,
      }),
    }
  )
)
