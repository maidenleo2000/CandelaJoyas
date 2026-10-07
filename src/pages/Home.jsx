import { useState, useMemo, useContext, useEffect, useRef } from 'react';
import ProductCard from '../components/common/ProductCard';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { SettingsContext } from '../contexts/SettingsContext';
import { useSearch } from '../contexts/SearchContext';
import { Filter, ChevronDown } from 'lucide-react';
import VideoSlider from '../components/common/VideoSlider';
import SidebarCarousel from '../components/common/SidebarCarousel';
import { pluralizeEs } from '../utils/labels';
import './Home.css';

export default function Home() {
  const loadMoreRef = useRef(null);
  const productsGridRef = useRef(null);
  const { products, loading } = useProducts();
  const { categories: categoriesData, loading: categoriesLoading } = useCategories();
  const { settings } = useContext(SettingsContext);
  const { searchTerm, setSearchTerm, selectedCategory, setSelectedCategory } = useSearch();
  const [priceSort, setPriceSort] = useState('default');
  const [showOnlyOffers, setShowOnlyOffers] = useState(false);
  const [isGridView, setIsGridView] = useState(true); // true = grid, false = list
  const [selectedColor, setSelectedColor] = useState('All');
  const [selectedSize, setSelectedSize] = useState('All');
  const [visibleCount, setVisibleCount] = useState(4);

  
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
    const baseTitle = settings.siteTitle || 'Candela Joyas';
    if (selectedCategory === 'All') {
      document.title = `${baseTitle} | Brillá en cada momento.`;
    } else {
      document.title = `${selectedCategory} Brilla siempre | ${baseTitle}`;
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
    setVisibleCount(4);
  }, [searchTerm, selectedCategory, priceSort, showOnlyOffers, selectedColor, selectedSize]);

  // Cortar la lista de productos para mostrar solo los visibles
  const displayedProducts = filteredProducts.slice(0, visibleCount);
  const hasActiveFilters = Boolean(searchTerm.trim() || selectedCategory !== 'All' || showOnlyOffers || selectedColor !== 'All' || selectedSize !== 'All');
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setShowOnlyOffers(false);
    setSelectedColor('All');
    setSelectedSize('All');
    setPriceSort('default');
  };

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (loading || visibleCount >= filteredProducts.length || !sentinel) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        const grid = productsGridRef.current;
        const columns = isGridView && grid
          ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length
          : 1;
        setVisibleCount(count => Math.min(count + Math.max(1, columns), filteredProducts.length));
      }
    }, { rootMargin: '0px', threshold: 1 });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, visibleCount, filteredProducts, isGridView]);

  return (
    <div className="home-page animate-fade-in">
      {settings.showSidebarCarousel && settings.sidebarCarouselImages && settings.sidebarCarouselImages.length > 0 && (
        <div className="container" style={{ display: !searchTerm ? 'block' : 'none', paddingTop: '1rem' }}>
          <SidebarCarousel
            images={settings.sidebarCarouselImages}
            heightPx={settings.sidebarCarouselHeight}
            intervalSeconds={settings.sidebarCarouselIntervalSeconds}
          />
        </div>
      )}

      {settings.showHero !== false && (
        <div style={{ display: !searchTerm ? 'block' : 'none' }}>
          <section className="hero">
            <div className="hero-content">
              <h1 style={{ fontSize: `${settings.heroTitleSize || '1.5'}rem` }}>
                {settings.heroTitle || 'Joyas para cada ocasión'}
              </h1>
              <p style={{ fontSize: `${settings.heroSubtitleSize || '1'}rem` }}>
                {settings.heroSubtitle || 'Encontrá joyas para cada ocasión y brillá en cada momento.'}
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
            <div>
              <span className="catalog-eyebrow">Encontrá tu próxima favorita</span>
              <h2>Catálogo de Productos</h2>
            </div>
            {!loading && (
              <p className="catalog-count" role="status">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
              </p>
            )}
          </div>

          <div className="shop-controls">
            
            <div className="filters-bar">
            <div className="filter-group">
              <Filter size={18} className="filter-icon" />
              <div className="select-wrapper">
                <select 
                  value={selectedCategory} 
                  aria-label="Categoría"
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
                  aria-label="Ordenar por precio"
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

            {settings.showColorFilter && (
              <div className="filter-group">
                <div className="select-wrapper">
                  <select
                    value={selectedColor}
                    aria-label={settings.colorLabel || 'Color'}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="sort-select"
                  >
                    <option value="All">Todos los {pluralizeEs(settings.colorLabel || 'Color')}</option>
                    {availableColors.filter(c => c !== 'All').map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="select-arrow" />
                </div>
              </div>
            )}

            {settings.showSizeFilter && (
              <div className="filter-group">
                <div className="select-wrapper">
                  <select
                    value={selectedSize}
                    aria-label={settings.sizeLabel || 'Talle'}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="sort-select"
                  >
                    <option value="All">Todos los {pluralizeEs(settings.sizeLabel || 'Talle')}</option>
                    {availableSizes.filter(s => s !== 'All').map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="select-arrow" />
                </div>
              </div>
            )}


            <div className="filters-toggles">
              <div className="filter-group offers-switch">
                <span className="switch-label">Solo Ofertas</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={showOnlyOffers}
                    aria-label="Solo ofertas"
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
                    aria-label="Vista cuadrícula"
                    onChange={(e) => setIsGridView(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
        </div>

        {hasActiveFilters && (
          <div className="catalog-filter-summary">
            <p>{searchTerm.trim() ? `Resultados para “${searchTerm.trim()}”` : 'Estás viendo un catálogo filtrado'}{selectedCategory !== 'All' ? ` · ${selectedCategory}` : ''}</p>
            <button className="catalog-clear" onClick={clearFilters}>Limpiar filtros</button>
          </div>
        )}

        {loading ? (
          <div className="loading-state flex-center">
            <div className="loader"></div>
            <p>Cargando catálogo...</p>
          </div>
        ) : (
          <>
            <div ref={productsGridRef} className={`products-grid ${isGridView ? 'grid' : 'list'}`}>
              {displayedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            
            {filteredProducts.length > 0 && (
              <div className="catalog-progress">
                {visibleCount < filteredProducts.length && (
                  <div ref={loadMoreRef} className="catalog-scroll-sentinel" aria-hidden="true" />
                )}
                <p role="status">
                  Mostrando {displayedProducts.length} de {filteredProducts.length} productos
                </p>
              </div>
            )}
          </>
        )}

        {!loading && filteredProducts.length === 0 && (
          <div className="empty-state">
            <p>{searchTerm ? `No se encontraron resultados para "${searchTerm}"` : "No se encontraron productos en esta categoría."}</p>
            <button className="btn btn-outline" onClick={clearFilters}>

              Limpiar Filtros
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
