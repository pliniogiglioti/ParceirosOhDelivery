import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { PartnerLayout } from '@/components/partner/PartnerLayout'
import { LoadingScreen } from '@/components/partner/LoadingScreen'
import { useMinimumLoading } from '@/hooks/useMinimumLoading'
import { usePartnerAuth } from '@/hooks/usePartnerAuth'
import { usePartnerDashboard } from '@/hooks/usePartnerDashboard'
import { PartnerFirstAccessPage } from '@/pages/PartnerFirstAccessPage'
import { PartnerContractPage } from '@/pages/PartnerContractPage'
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
import { LandingPage } from '@/pages/LandingPage'
import { StoreRejectedPage } from '@/pages/StoreRejectedPage'
import { StoreSelectionPage } from '@/pages/StoreSelectionPage'
import { StoreRegisterPage } from '@/pages/StoreRegisterPage'

function LoginRoute() {
  const auth = usePartnerAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const from = (location.state as { from?: string } | null)?.from
  const targetAfterLogin = from === '/cadastro' ? '/lojas' : from ?? '/lojas'

  return (
    <HomePage
      loading={auth.loading}
      codeSent={auth.codeSent}
      sending={auth.sending}
      verifying={auth.verifying}
      pendingEmail={auth.pendingEmail}
      loggedInName={auth.user?.name}
      loggedInEmail={auth.user?.email}
      onSendCode={auth.sendCode}
      onVerifyCode={auth.verifyCode}
      onEnterPanel={() => navigate(targetAfterLogin)}
      onSignOut={() => void auth.signOut()}
    />
  )
}

function StoreSelectionRoute() {
  const auth = usePartnerAuth()
  const showLoading = useMinimumLoading(auth.loading)

  if (showLoading) {
    return <LoadingScreen />
  }

  if (!auth.user) {
    return <Navigate to="/login" replace />
  }

  return <StoreSelectionPage />
}

function StoreRegisterRoute() {
  const auth = usePartnerAuth()
  const location = useLocation()

  if (auth.loading) {
    return <LoadingScreen />
  }

  if (!auth.user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <StoreRegisterPage />
}

function ProtectedLayoutRoute() {
  const auth = usePartnerAuth()
  const { data, loading } = usePartnerDashboard(auth.selectedStoreId)

  if (auth.loading || loading) {
    return <LoadingScreen />
  }

  if (!auth.user) {
    return <Navigate to="/login" replace />
  }

  if (!auth.selectedStoreId) {
    return <Navigate to="/lojas" replace />
  }

  if (!data) {
    return <Navigate to="/lojas" replace />
  }

  if (data.store.registrationStatus === 'rejeitado') {
    return <Navigate to="/cadastro-rejeitado" replace />
  }

  if (!data.store.contract) {
    return <Navigate to="/contrato" replace />
  }

  if (!data.store.firstAccess) {
    return <Navigate to="/primeiro-acesso" replace />
  }

  return <PartnerLayout onSignOut={() => void auth.signOut()} />
}

function AppIndexRoute() {
  return <PartnerOverviewPage />
}

function ContractRoute() {
  const auth = usePartnerAuth()
  const { data, loading } = usePartnerDashboard(auth.selectedStoreId)
  const showLoading = useMinimumLoading(auth.loading || loading)

  if (showLoading) {
    return <LoadingScreen />
  }

  if (!auth.user) {
    return <Navigate to="/login" state={{ from: '/contrato' }} replace />
  }

  if (!auth.selectedStoreId) {
    return <Navigate to="/lojas" replace />
  }

  if (!data) {
    return <Navigate to="/lojas" replace />
  }

  if (data.store.registrationStatus === 'rejeitado') {
    return <Navigate to="/cadastro-rejeitado" replace />
  }

  if (data.store.contract) {
    return <Navigate to={data.store.firstAccess ? '/app' : '/primeiro-acesso'} replace />
  }

  return <PartnerContractPage data={data} />
}

function FirstAccessRoute() {
  const auth = usePartnerAuth()
  const { data, loading } = usePartnerDashboard(auth.selectedStoreId)
  const showLoading = useMinimumLoading(auth.loading || loading)

  if (showLoading) {
    return <LoadingScreen />
  }

  if (!auth.user) {
    return <Navigate to="/login" state={{ from: '/primeiro-acesso' }} replace />
  }

  if (!auth.selectedStoreId) {
    return <Navigate to="/lojas" replace />
  }

  if (!data) {
    return <Navigate to="/lojas" replace />
  }

  if (data.store.registrationStatus === 'rejeitado') {
    return <Navigate to="/cadastro-rejeitado" replace />
  }

  if (!data.store.contract) {
    return <Navigate to="/contrato" replace />
  }

  return <PartnerFirstAccessPage />
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/lojas" element={<StoreSelectionRoute />} />
        <Route path="/cadastro" element={<StoreRegisterRoute />} />
        <Route path="/cadastro-rejeitado" element={<StoreRejectedPage />} />
        <Route path="/contrato" element={<ContractRoute />} />
        <Route path="/primeiro-acesso" element={<FirstAccessRoute />} />
        <Route path="/app" element={<ProtectedLayoutRoute />}>
          <Route index element={<AppIndexRoute />} />
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
