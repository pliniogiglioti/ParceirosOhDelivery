import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  LogisticsSnapshot,
  PartnerHour,
  PartnerOrder,
  PartnerOrderSettings,
  PartnerStore,
  PaymentMethodItem,
  StoreCourier,
} from '@/types'

interface PartnerDraftStoreState {
  storeOpen: boolean | null
  storeByStoreId: Record<string, PartnerStore>
  storeHoursByStoreId: Record<string, PartnerHour[]>
  ordersByStoreId: Record<string, PartnerOrder[]>
  orderSettingsByStoreId: Record<string, PartnerOrderSettings>
  paymentMethodsByStoreId: Record<string, PaymentMethodItem[]>
  couriersByStoreId: Record<string, StoreCourier[]>
  logisticsByStoreId: Record<string, LogisticsSnapshot>
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
  hydratePaymentMethods: (storeId: string, paymentMethods: PaymentMethodItem[]) => void
  updatePaymentMethods: (storeId: string, paymentMethods: PaymentMethodItem[]) => void
  hydrateCouriers: (storeId: string, couriers: StoreCourier[]) => void
  updateCouriers: (storeId: string, couriers: StoreCourier[]) => void
  hydrateLogistics: (storeId: string, logistics: LogisticsSnapshot) => void
  updateLogistics: (storeId: string, patch: Partial<LogisticsSnapshot>) => void
}

export const usePartnerDraftStore = create<PartnerDraftStoreState>()(
  persist(
    (set, get) => ({
      storeOpen: null,
      storeByStoreId: {},
      storeHoursByStoreId: {},
      ordersByStoreId: {},
      orderSettingsByStoreId: {},
      paymentMethodsByStoreId: {},
      couriersByStoreId: {},
      logisticsByStoreId: {},
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
      hydratePaymentMethods: (storeId, paymentMethods) => {
        const currentPaymentMethods = get().paymentMethodsByStoreId[storeId]
        set((state) => ({
          paymentMethodsByStoreId: {
            ...state.paymentMethodsByStoreId,
            [storeId]: currentPaymentMethods ?? paymentMethods,
          },
        }))
      },
      updatePaymentMethods: (storeId, paymentMethods) => {
        set((state) => ({
          paymentMethodsByStoreId: {
            ...state.paymentMethodsByStoreId,
            [storeId]: paymentMethods,
          },
        }))
      },
      hydrateCouriers: (storeId, couriers) => {
        const currentCouriers = get().couriersByStoreId[storeId]
        set((state) => ({
          couriersByStoreId: {
            ...state.couriersByStoreId,
            [storeId]: currentCouriers ?? couriers,
          },
        }))
      },
      updateCouriers: (storeId, couriers) => {
        set((state) => ({
          couriersByStoreId: {
            ...state.couriersByStoreId,
            [storeId]: couriers,
          },
        }))
      },
      hydrateLogistics: (storeId, logistics) => {
        const currentLogistics = get().logisticsByStoreId[storeId]
        set((state) => ({
          logisticsByStoreId: {
            ...state.logisticsByStoreId,
            [storeId]: currentLogistics ?? logistics,
          },
        }))
      },
      updateLogistics: (storeId, patch) => {
        const currentLogistics = get().logisticsByStoreId[storeId]
        set((state) => ({
          logisticsByStoreId: {
            ...state.logisticsByStoreId,
            [storeId]: {
              ...(currentLogistics ?? {}),
              ...patch,
            } as LogisticsSnapshot,
          },
        }))
      },
    }),
    {
      name: 'partner-oh-drafts',
      partialize: (state) => ({
        storeOpen: state.storeOpen,
        storeByStoreId: state.storeByStoreId,
        storeHoursByStoreId: state.storeHoursByStoreId,
        ordersByStoreId: state.ordersByStoreId,
        orderSettingsByStoreId: state.orderSettingsByStoreId,
        paymentMethodsByStoreId: state.paymentMethodsByStoreId,
        couriersByStoreId: state.couriersByStoreId,
        logisticsByStoreId: state.logisticsByStoreId,
      }),
    }
  )
)
