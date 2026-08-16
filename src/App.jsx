import { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import BackToTop from './components/common/BackToTop';
import ScrollToTop from './components/common/ScrollToTop';
import BackButtonHandler from './components/common/BackButtonHandler';
import MaintenancePage from './components/common/MaintenancePage';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import AdminDashboard from './pages/AdminDashboard';
import Nosotras from './pages/Nosotras';
import HowToBuy from './pages/HowToBuy';
import AdminGuide from './pages/AdminGuide';
import SuccessPage from './pages/SuccessPage';
import AuthProvider, { AuthContext } from './contexts/AuthContext';
import CartProvider from './contexts/CartContext';
import SettingsProvider, { SettingsContext } from './contexts/SettingsContext';
import { SearchProvider } from './contexts/SearchContext';
import { useMaintenanceStatus } from './hooks/useMaintenanceStatus';
import './App.css';

function AppShell() {
  const { settings } = useContext(SettingsContext);
  const { userRole } = useContext(AuthContext);
  const location = useLocation();
  const { active: maintenanceActive } = useMaintenanceStatus(settings);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAdmin = userRole === 'admin';

  if (maintenanceActive && !isAdminRoute && !isAdmin) {
    return <MaintenancePage />;
  }

  return (
    <div className={`app-container ${settings.showMarquee ? 'has-marquee' : ''}`}>
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/admin/guia" element={<AdminGuide />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/nosotras" element={<Nosotras />} />
          <Route path="/como-comprar" element={<HowToBuy />} />
          <Route path="/success" element={<SuccessPage />} />
        </Routes>
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}

function AppContent() {
  return (
    <Router>
      <ScrollToTop />
      <BackButtonHandler />
      <AppShell />

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#2B2D42',
            color: '#fff',
            fontFamily: 'Inter',
            borderRadius: '8px'
          }
        }}
      />
    </Router>
  );
}

function App() {
  return (
    <SettingsProvider>
      <SearchProvider>
        <CartProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </CartProvider>
      </SearchProvider>
    </SettingsProvider>
  );
}

export default App;
