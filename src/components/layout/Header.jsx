import { useContext, useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, User, LogOut, X, ArrowLeft, Search, ChevronDown } from 'lucide-react';
import { AuthContext } from '../../contexts/AuthContext';
import { CartContext } from '../../contexts/CartContext';
import { SettingsContext } from '../../contexts/SettingsContext';
import { useSearch } from '../../contexts/SearchContext';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import CartDrawer from './CartDrawer';
import Marquee from '../common/Marquee';
import PendingSalesBanner from '../common/PendingSalesBanner';
import './Header.css';

export default function Header() {
  const { currentUser, logout } = useContext(AuthContext);
  const { cartCount } = useContext(CartContext);
  const { settings } = useContext(SettingsContext);
  const { searchTerm, setSearchTerm, selectedCategory, setSelectedCategory } = useSearch();
  const { products } = useProducts();
  const { categories: categoriesData } = useCategories();
  
  const categories = useMemo(() => {
    if (categoriesData.length > 0) {
      return ['All', ...categoriesData.map(c => c.name)];
    }
    if (!products || products.length === 0) return ['All'];
    const uniqueCategories = [...new Set(products.filter(p => !p.isHidden && p.category).map(p => p.category))];
    return ['All', ...uniqueCategories];
  }, [categoriesData, products]);
  
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileCategoryOpen, setIsMobileCategoryOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const toggleCart = () => setIsCartOpen(!isCartOpen);
  const closeCart = () => setIsCartOpen(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error(error);
    }
  };

  const getLogoStyle = (shape) => ({
    borderRadius: shape === 'rounded' ? '50%' : shape === 'curved' ? '12px' : '0',
    overflow: 'hidden'
  });

  const [logoLoaded, setLogoLoaded] = useState(false);

  const logoElement = (
    <Link 
      to="/" 
      className={`logo ${settings.logoUrl && !logoLoaded ? 'logo-loading' : 'logo-ready'}`} 
      onClick={closeMenu}
    >
      {settings.logoUrl && (
        <img 
          src={settings.logoUrl} 
          alt={settings.siteTitle} 
          className="logo-img" 
          style={getLogoStyle(settings.logoShape)}
          onLoad={() => setLogoLoaded(true)}
        />
      )}
      <div className="logo-text">
        <span className="logo-main">{(settings.siteTitle || 'Genoveva InduStore').split(' ')[0]}</span>
        <span className="logo-accent">{(settings.siteTitle || '').split(' ').slice(1).join(' ')}</span>
      </div>
    </Link>
  );

  return (
    <>
      <Marquee />
      <PendingSalesBanner />
      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu-overlay ${isMenuOpen ? 'active' : ''}`} onClick={closeMenu}>
        <div className="mobile-menu-content" onClick={e => e.stopPropagation()}>
          <div className="mobile-menu-header">
            {logoElement}
            <button className="close-btn" onClick={closeMenu}>
              <X size={28} />
            </button>
          </div>
          
          <nav className="mobile-nav">
            <div className="mobile-nav-group" style={{ marginTop: 0, border: 'none', paddingTop: 0 }}>
              <span className="mobile-nav-label">Categorías</span>
              <div className="mobile-categories-grid">
                {categories.map(cat => (
                  <button 
                    key={cat} 
                    className={`mobile-category-item ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCategory(cat);
                      closeMenu();
                      if (location.pathname !== '/') navigate('/');
                    }}
                  >
                    {cat === 'All' ? 'Todos' : cat}
                  </button>
                ))}
              </div>
            </div>

            {settings.showAbout && (
              <Link to="/nosotras" className="mobile-nav-link" onClick={closeMenu}>Nosotras</Link>
            )}
            <Link to="/como-comprar" className="mobile-nav-link" onClick={closeMenu}>¿Cómo comprar?</Link>
            {currentUser && (
              <Link to="/admin" className="mobile-nav-link admin-mobile-link" onClick={closeMenu}>
                Panel Admin
              </Link>
            )}
          </nav>

          <div className="mobile-menu-footer">
            {currentUser ? (
              <button onClick={() => { handleLogout(); closeMenu(); }} className="btn btn-outline w-full flex-center gap-2">
                <LogOut size={18} /> Cerrar Sesión
              </button>
            ) : (
              <Link to="/admin" className="btn btn-primary w-full flex-center gap-2" onClick={closeMenu}>
                <User size={18} /> Acceso Admin
              </Link>
            )}
          </div>
        </div>
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={closeCart} />

      <header className={`header glass ${settings.showMarquee ? 'with-marquee' : ''}`}>
        <div className="container header-content">
          {isHomePage ? (
            <button 
              className="menu-btn mobile-only" 
              aria-label="Menu" 
              onClick={toggleMenu}
            >
              <Menu size={28} />
            </button>
          ) : (
            <button 
              className="menu-btn mobile-only" 
              onClick={() => navigate('/')}
              aria-label="Volver al catálogo"
            >
              <ArrowLeft size={28} />
            </button>
          )}

          <div className="logo-container">
            {logoElement}
          </div>

          <nav className="main-nav desktop-only">
            <div className="nav-dropdown">
              <button className="nav-link dropdown-trigger">
                Productos <ChevronDown size={14} className="dropdown-icon" />
              </button>
              <div className="dropdown-content">
                {categories.map(cat => (
                  <button 
                    key={cat} 
                    className={`dropdown-item ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCategory(cat);
                      if (location.pathname !== '/') navigate('/');
                    }}
                  >
                    {cat === 'All' ? 'Ver Todo' : cat}
                  </button>
                ))}
              </div>
            </div>

            {settings.showAbout && (
              <Link to="/nosotras" className="nav-link">Nosotras</Link>
            )}
            <Link to="/como-comprar" className="nav-link">Cómo Comprar</Link>
          </nav>

          <div className="header-search">
            <div className="header-search-row">
              <div className="header-search-wrapper">
                <Search className="search-icon" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (location.pathname !== '/') navigate('/');
                  }}
                />
                {searchTerm && (
                  <button className="clear-btn" onClick={() => setSearchTerm('')}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="mobile-products-filter mobile-only" onClick={() => setIsMobileCategoryOpen(!isMobileCategoryOpen)}>
                <span className="mobile-category-label">PRODUCTOS</span>
                <ChevronDown size={14} className={`mobile-select-icon ${isMobileCategoryOpen ? 'open' : ''}`} />
                
                <div className={`mobile-custom-dropdown ${isMobileCategoryOpen ? 'active' : ''}`}>
                  {categories.map(cat => (
                    <button 
                      key={cat}
                      className={`mobile-custom-option ${selectedCategory === cat ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategory(cat);
                        setIsMobileCategoryOpen(false);
                        if (location.pathname !== '/') navigate('/');
                      }}
                    >
                      {cat === 'All' ? 'Ver Todo' : cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <Link to="/admin" className="action-btn" aria-label="Mi Cuenta">
              <User size={20} />
            </Link>

            {currentUser && (
              <button onClick={handleLogout} className="action-btn desktop-only" aria-label="Cerrar sesión">
                <LogOut size={20} />
              </button>
            )}
            
            <button className="action-btn cart-btn" aria-label="Carrito de compras" onClick={toggleCart}>
              <ShoppingCart size={20} />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
