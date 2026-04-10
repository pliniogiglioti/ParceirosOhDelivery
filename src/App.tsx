import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PartnerLayout } from '@/components/partner/PartnerLayout'
import { LoadingScreen } from '@/components/partner/LoadingScreen'
import { usePartnerAuth } from '@/hooks/usePartnerAuth'
import { PartnerCatalogPage } from '@/pages/app/PartnerCatalogPage'
import { PartnerDeliveryAreasPage } from '@/pages/app/PartnerDeliveryAreasPage'
import { PartnerFinancePage } from '@/pages/app/PartnerFinancePage'
import { PartnerHoursPage } from '@/pages/app/PartnerHoursPage'
import { PartnerLogisticsPage } from '@/pages/app/PartnerLogisticsPage'
import { PartnerOrdersPage } from '@/pages/app/PartnerOrdersPage'
import { PartnerOverviewPage } from '@/pages/app/PartnerOverviewPage'
import { PartnerPaymentsPage } from '@/pages/app/PartnerPaymentsPage'
import { PartnerConfiguracoesPage } from '@/pages/app/PartnerConfiguracoesPage'
import { PartnerProfilePage } from '@/pages/app/PartnerProfilePage'
import { PartnerReviewsPage } from '@/pages/app/PartnerReviewsPage'
import { PartnerMarketingPage } from '@/pages/app/PartnerMarketingPage'
import { PartnerMessagesPage } from '@/pages/app/PartnerMessagesPage'
import { PartnerNotificationsPage } from '@/pages/app/PartnerNotificationsPage'
import { PartnerStorePage } from '@/pages/app/PartnerStorePage'
import { PartnerSupportPage } from '@/pages/app/PartnerSupportPage'
import { HomePage } from '@/pages/HomePage'
import { StoreSelectionPage } from '@/pages/StoreSelectionPage'
import { StoreRegisterPage } from '@/pages/StoreRegisterPage'

function LoginRoute() {
  const auth = usePartnerAuth()

  if (auth.loading) {
    return <LoadingScreen />
  }

  if (auth.user) {
    return <Navigate to="/lojas" replace />
  }

  return (
    <HomePage
      loading={auth.loading}
      codeSent={auth.codeSent}
      sending={auth.sending}
      verifying={auth.verifying}
      pendingEmail={auth.pendingEmail}
      onSendCode={auth.sendCode}
      onVerifyCode={auth.verifyCode}
    />
  )
}

function StoreSelectionRoute() {
  const auth = usePartnerAuth()

  if (auth.loading) {
    return <LoadingScreen />
  }

  if (!auth.user) {
    return <Navigate to="/" replace />
  }

  return <StoreSelectionPage />
}

function StoreRegisterRoute() {
  const auth = usePartnerAuth()

  if (auth.loading) {
    return <LoadingScreen />
  }

  if (!auth.user) {
    return <Navigate to="/" replace />
  }

  return <StoreRegisterPage />
}

function ProtectedLayoutRoute() {
  const auth = usePartnerAuth()

  if (auth.loading) {
    return <LoadingScreen />
  }

  if (!auth.user) {
    return <Navigate to="/" replace />
  }

  if (!auth.selectedStoreId) {
    return <Navigate to="/lojas" replace />
  }

  return <PartnerLayout onSignOut={() => void auth.signOut()} />
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginRoute />} />
        <Route path="/lojas" element={<StoreSelectionRoute />} />
        <Route path="/cadastro" element={<StoreRegisterRoute />} />
        <Route path="/app" element={<ProtectedLayoutRoute />}>
          <Route index element={<PartnerOverviewPage />} />
          <Route path="pedidos" element={<PartnerOrdersPage />} />
          <Route path="financeiro" element={<PartnerFinancePage />} />
          <Route path="cardapio" element={<PartnerCatalogPage />} />
          <Route path="areas" element={<PartnerDeliveryAreasPage />} />
          <Route path="logistica" element={<PartnerLogisticsPage />} />
          <Route path="horarios" element={<PartnerHoursPage />} />
          <Route path="pagamentos" element={<PartnerPaymentsPage />} />
          <Route path="avaliacoes" element={<PartnerReviewsPage />} />
          <Route path="marketing" element={<PartnerMarketingPage />} />
          <Route path="mensagens" element={<PartnerMessagesPage />} />
          <Route path="notificacoes" element={<PartnerNotificationsPage />} />
          <Route path="suporte" element={<PartnerSupportPage />} />
          <Route path="loja" element={<PartnerStorePage />} />
          <Route path="perfil" element={<PartnerProfilePage />} />
          <Route path="configuracoes" element={<PartnerConfiguracoesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
