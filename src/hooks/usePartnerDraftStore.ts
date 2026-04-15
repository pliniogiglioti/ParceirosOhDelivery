import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  LogisticsSnapshot,
  PartnerCategory,
  PartnerHour,
  PartnerOrder,
  PartnerOrderSettings,
  PartnerProduct,
  PartnerStore,
  PaymentMethodItem,
  ReviewItem,
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
  // In-session only — not persisted to localStorage
  categoriesByStoreId: Record<string, PartnerCategory[]>
  productsByStoreId: Record<string, PartnerProduct[]>
  reviewsByStoreId: Record<string, ReviewItem[]>
  newReviewsCountByStoreId: Record<string, number>
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
  hydrateCategories: (storeId: string, categories: PartnerCategory[]) => void
  addCategory: (storeId: string, category: PartnerCategory) => void
  hydrateProducts: (storeId: string, products: PartnerProduct[]) => void
  addProduct: (storeId: string, product: PartnerProduct) => void
  hydrateReviews: (storeId: string, reviews: ReviewItem[]) => void
  addReview: (storeId: string, review: ReviewItem) => void
  updateReview: (storeId: string, reviewId: string, patch: Partial<ReviewItem>) => void
  clearNewReviews: (storeId: string) => void
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
      categoriesByStoreId: {},
      productsByStoreId: {},
      reviewsByStoreId: {},
      newReviewsCountByStoreId: {},
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

        const shouldHydrate =
          !currentHours ||
          currentHours.length === 0 ||
          (hours.length > 0 &&
            (currentHours.length !== hours.length ||
              currentHours.some((hour) => !hours.some((incomingHour) => incomingHour.id === hour.id))))

        if (shouldHydrate) {
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
          return
        }

        // Mescla: adiciona pedidos novos do banco que não existem localmente
        const localIds = new Set(currentOrders.map((o) => o.id))
        const incoming = orders
          .filter((o) => !localIds.has(o.id))
          .map((o) => ({ ...o, stageStartedAt: o.stageStartedAt ?? o.createdAt }))

        if (incoming.length > 0) {
          set((state) => ({
            ordersByStoreId: {
              ...state.ordersByStoreId,
              [storeId]: [...incoming, ...currentOrders],
            },
          }))
        }
      },
      addOrder: (storeId, order) => {
        const currentOrders = get().ordersByStoreId[storeId] ?? []

        if (currentOrders.some((o) => o.id === order.id)) return

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
        set((state) => ({
          paymentMethodsByStoreId: {
            ...state.paymentMethodsByStoreId,
            [storeId]: paymentMethods,
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
        set((state) => ({
          couriersByStoreId: {
            ...state.couriersByStoreId,
            [storeId]: couriers,
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
        set((state) => ({
          logisticsByStoreId: {
            ...state.logisticsByStoreId,
            [storeId]: logistics,
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
      hydrateCategories: (storeId, categories) => {
        if (get().categoriesByStoreId[storeId]) return
        set((state) => ({
          categoriesByStoreId: { ...state.categoriesByStoreId, [storeId]: categories },
        }))
      },
      addCategory: (storeId, category) => {
        const current = get().categoriesByStoreId[storeId] ?? []
        set((state) => ({
          categoriesByStoreId: { ...state.categoriesByStoreId, [storeId]: [...current, category] },
        }))
      },
      hydrateProducts: (storeId, products) => {
        if (get().productsByStoreId[storeId]) return
        set((state) => ({
          productsByStoreId: { ...state.productsByStoreId, [storeId]: products },
        }))
      },
      addProduct: (storeId, product) => {
        const current = get().productsByStoreId[storeId] ?? []
        set((state) => ({
          productsByStoreId: { ...state.productsByStoreId, [storeId]: [...current, product] },
        }))
      },
      hydrateReviews: (storeId, reviews) => {
        set((state) => ({
          reviewsByStoreId: { ...state.reviewsByStoreId, [storeId]: reviews },
        }))
      },
      addReview: (storeId, review) => {
        const current = get().reviewsByStoreId[storeId] ?? []
        if (current.some((r) => r.id === review.id)) return
        const currentCount = get().newReviewsCountByStoreId[storeId] ?? 0
        set((state) => ({
          reviewsByStoreId: {
            ...state.reviewsByStoreId,
            [storeId]: [review, ...current],
          },
          newReviewsCountByStoreId: {
            ...state.newReviewsCountByStoreId,
            [storeId]: currentCount + 1,
          },
        }))
      },
      updateReview: (storeId, reviewId, patch) => {
        const current = get().reviewsByStoreId[storeId] ?? []
        set((state) => ({
          reviewsByStoreId: {
            ...state.reviewsByStoreId,
            [storeId]: current.map((r) => (r.id === reviewId ? { ...r, ...patch } : r)),
          },
        }))
      },
      clearNewReviews: (storeId) => {
        set((state) => ({
          newReviewsCountByStoreId: {
            ...state.newReviewsCountByStoreId,
            [storeId]: 0,
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
