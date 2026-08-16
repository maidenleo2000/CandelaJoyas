import { useState, useMemo, useContext, useEffect, useRef } from 'react';
import ProductCard from '../components/common/ProductCard';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { SettingsContext } from '../contexts/SettingsContext';
import { useSearch } from '../contexts/SearchContext';
import { Filter, ChevronDown } from 'lucide-react';
import VideoSlider from '../components/common/VideoSlider';
import SidebarCarousel from '../components/common/SidebarCarousel';
import './Home.css';

export default function Home() {
  const isFirstRender = useRef(true);
  const { products, loading } = useProducts();
  const { categories: categoriesData, loading: categoriesLoading } = useCategories();
  const { settings } = useContext(SettingsContext);
  const { searchTerm, setSearchTerm, selectedCategory, setSelectedCategory } = useSearch();
  const [priceSort, setPriceSort] = useState('default');
  const [showOnlyOffers, setShowOnlyOffers] = useState(false);
  const [isGridView, setIsGridView] = useState(true); // true = grid, false = list
  const [selectedColor, setSelectedColor] = useState('All');
  const [selectedSize, setSelectedSize] = useState('All');
  const [visibleCount, setVisibleCount] = useState(12); // Paginación inicial de 12 productos

  
  // Obtenemos las categorías desde Firestore, o las derivamos de los productos si no hay (retrocompatibilidad)
  const categories = useMemo(() => {

    if (categoriesData.length > 0) {
      return ['All', ...categoriesData.map(c => c.name)];
    }
    return ['All', ...new Set(products.map(p => p.category))];
  }, [categoriesData, products]);
  
  // Extraemos todos los colores disponibles de la lista de productos
  const availableColors = useMemo(() => {

    const colors = new Set();
    products.forEach(p => {
      if (p.colors && Array.isArray(p.colors)) {
        p.colors.forEach(c => colors.add(c));
      }
    });
    return ['All', ...Array.from(colors).sort()];
  }, [products]);

  // Extraemos todos los talles disponibles de la lista de productos
  const availableSizes = useMemo(() => {

    const sizes = new Set();
    products.forEach(p => {
      if (p.sizes && Array.isArray(p.sizes)) {
        p.sizes.forEach(s => sizes.add(s));
      }
    });
    return ['All', ...Array.from(sizes).sort()];
  }, [products]);


  const filteredProducts = useMemo(() => {
    let result = products.filter(p => !p.isHidden);

    if (selectedCategory !== 'All') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Sales filter
    if (showOnlyOffers) {
      result = result.filter(p => p.isOnSale === true);
    }

    // Color filter
    if (selectedColor !== 'All') {
      result = result.filter(p => p.colors && p.colors.includes(selectedColor));
    }

    // Size filter
    if (selectedSize !== 'All') {
      result = result.filter(p => p.sizes && p.sizes.includes(selectedSize));
    }


    // Search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(term) || 
        (p.description && p.description.toLowerCase().includes(term)) ||
        p.category.toLowerCase().includes(term)
      );
    }

    // Sort
    if (priceSort === 'asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (priceSort === 'desc') {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [products, selectedCategory, priceSort, showOnlyOffers, searchTerm, selectedColor, selectedSize]);

  // SEO: Actualizamos el título de la pestaña según la categoría seleccionada
  useEffect(() => {
    const baseTitle = settings.siteTitle || 'Genoveva InduStore';
    if (selectedCategory === 'All') {
      document.title = `${baseTitle} | Moda Inclusiva en Talles Reales`;
    } else {
      document.title = `${selectedCategory} en Talles Reales | ${baseTitle}`;
    }
  }, [selectedCategory, settings.siteTitle]);
  
  const handleScrollToShop = (e, behavior = 'smooth') => {
    if (e && e.preventDefault) e.preventDefault();
    const anchor = document.getElementById('shop-results-anchor');
    const header = document.querySelector('.header');
    if (anchor && header) {
      const headerHeight = header.offsetHeight;
      const elementPosition = anchor.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - headerHeight - 20;

      window.scrollTo({
        top: offsetPosition,
        behavior: behavior
      });
    }
  };

  const prevSearchTerm = useRef('');
  const prevCategory = useRef(selectedCategory);

  // Lógica de Scroll Automático al buscar o cambiar de categoría
  useEffect(() => {
    const searchChanged = searchTerm !== prevSearchTerm.current;
    const categoryChanged = selectedCategory !== prevCategory.current;

    if (searchChanged || categoryChanged) {
      if (searchTerm.trim().length > 0 || (categoryChanged && selectedCategory !== 'All')) {
        // Estamos buscando algo o filtrando - scroll suave
        const timer = setTimeout(() => handleScrollToShop(null, 'smooth'), 300);
        prevSearchTerm.current = searchTerm;
        prevCategory.current = selectedCategory;
        return () => clearTimeout(timer);
      } else if (searchTerm === '' && prevSearchTerm.current !== '') {
        // Se acaba de borrar una búsqueda - forzamos posición INSTANTÁNEA
        handleScrollToShop(null, 'auto');
      }
    }
    prevSearchTerm.current = searchTerm;
    prevCategory.current = selectedCategory;
  }, [searchTerm, selectedCategory]);

  // Reiniciar la paginación cada vez que cambien los filtros
  useEffect(() => {
    setVisibleCount(12);
  }, [searchTerm, selectedCategory, priceSort, showOnlyOffers, selectedColor, selectedSize]);

  // Cortar la lista de productos para mostrar solo los visibles
  const displayedProducts = filteredProducts.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount(prevCount => prevCount + 12);
  };

  return (
    <div className="home-page animate-fade-in">
      {settings.showSidebarCarousel && settings.sidebarCarouselImages && settings.sidebarCarouselImages.length > 0 && (
        <div className="container" style={{ display: !searchTerm ? 'block' : 'none', paddingTop: '1rem' }}>
          <SidebarCarousel images={settings.sidebarCarouselImages} />
        </div>
      )}

      {settings.showHero !== false && (
        <div style={{ display: !searchTerm ? 'block' : 'none' }}>
          <section className="hero">
            <div className="hero-content">
              <h1 style={{ fontSize: `${settings.heroTitleSize || '1.5'}rem` }}>
                {settings.heroTitle || 'Moda Inclusiva en Talles Reales'}
              </h1>
              <p style={{ fontSize: `${settings.heroSubtitleSize || '1'}rem` }}>
                {settings.heroSubtitle || 'Descubre diseños exclusivos pensados para realzar tu belleza.'}
              </p>
              <button 
                className="btn btn-primary"
                onClick={handleScrollToShop}
                style={{ cursor: 'pointer' }}
              >
                Ver Catálogo
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Main Shop Area */}
      <section id="shop" className="container shop-section">
        {settings.showVideoSlider && settings.videoUrls && settings.videoUrls.length > 0 && (
          <div style={{ display: !searchTerm ? 'block' : 'none' }}>
            <VideoSlider videoUrls={settings.videoUrls} />
          </div>
        )}

        <div className="shop-header" style={{ position: 'relative' }}>
          <div id="shop-results-anchor" style={{ position: 'absolute', top: '0' }}></div>
          <div className="shop-header-top">
            <h2>Catálogo de Productos</h2>
          </div>

          <div className="shop-controls">
            
            <div className="filters-bar">
            <div className="filter-group">
              <Filter size={18} className="filter-icon" />
              <div className="select-wrapper">
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="category-select"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'All' ? 'Todas las Categorías' : cat}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="select-arrow" />
              </div>
            </div>

            <div className="filter-group">
              <div className="select-wrapper">
                <select 
                  value={priceSort} 
                  onChange={(e) => setPriceSort(e.target.value)}
                  className="sort-select"
                >
                  <option value="default">Relevancia</option>
                  <option value="asc">Menor a Mayor Precio</option>
                  <option value="desc">Mayor a Menor Precio</option>
                </select>
                <ChevronDown size={16} className="select-arrow" />
              </div>
            </div>

            <div className="filter-group">
              <div className="select-wrapper">
                <select 
                  value={selectedColor} 
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="sort-select"
                >
                  <option value="All">Todos los Colores</option>
                  {availableColors.filter(c => c !== 'All').map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="select-arrow" />
              </div>
            </div>

            <div className="filter-group">
              <div className="select-wrapper">
                <select 
                  value={selectedSize} 
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="sort-select"
                >
                  <option value="All">Todos los Talles</option>
                  {availableSizes.filter(s => s !== 'All').map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="select-arrow" />
              </div>
            </div>


            <div className="filter-group offers-switch">
              <span className="switch-label">Solo Ofertas</span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={showOnlyOffers}
                  onChange={(e) => setShowOnlyOffers(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="filter-group view-toggle-switch">
              <span className="switch-label">Vista Cuadrícula</span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={isGridView}
                  onChange={(e) => setIsGridView(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>
        </div>

        {loading ? (
          <div className="loading-state flex-center">
            <div className="loader"></div>
            <p>Cargando catálogo...</p>
          </div>
        ) : (
          <>
            <div className={`products-grid ${isGridView ? 'grid' : 'list'}`}>
              {displayedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            
            {!loading && visibleCount < filteredProducts.length && (
              <div style={{ textAlign: 'center', marginTop: '3rem', marginBottom: '2rem' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={handleLoadMore}
                  style={{ padding: '0.8rem 2.5rem', fontSize: '1rem', borderRadius: '50px', cursor: 'pointer', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                >
                  Cargar más productos
                </button>
                <p style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Mostrando {displayedProducts.length} de {filteredProducts.length} productos
                </p>
              </div>
            )}
          </>
        )}

        {!loading && filteredProducts.length === 0 && (
          <div className="empty-state">
            <p>{searchTerm ? `No se encontraron resultados para "${searchTerm}"` : "No se encontraron productos en esta categoría."}</p>
            <button className="btn btn-outline" onClick={() => { 
              setSelectedCategory('All'); 
              setShowOnlyOffers(false); 
              setSearchTerm(''); 
              setSelectedColor('All');
              setSelectedSize('All');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}>

              Limpiar Filtros
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
