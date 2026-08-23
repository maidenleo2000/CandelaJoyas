import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ArrowLeft, ShoppingBag, ChevronLeft, ChevronRight, Maximize2, X as CloseIcon, ZoomIn, ZoomOut } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { CartContext } from '../contexts/CartContext';
import { SettingsContext } from '../contexts/SettingsContext';
import { toast } from 'react-hot-toast';
import { getStockKey, hasVariantSelected } from '../utils/stock';
import { getInstallmentPrice, getCashPrice } from '../utils/pricing';
import './ProductDetail.css';

export default function ProductDetail() {
  const { id } = useParams();
  const { products, loading } = useProducts();
  const { addToCart } = useContext(CartContext);
  const { settings } = useContext(SettingsContext);
  const [product, setProduct] = useState(null);
  
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialDistance, setInitialDistance] = useState(null);

  useEffect(() => {
    if (isLightboxOpen) {
      document.body.classList.add('lightbox-open');
    } else {
      document.body.classList.remove('lightbox-open');
    }
    return () => document.body.classList.remove('lightbox-open');
  }, [isLightboxOpen]);

  const resetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleZoomIn = (e) => {
    if (e) e.stopPropagation();
    setZoomScale(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = (e) => {
    if (e) e.stopPropagation();
    setZoomScale(prev => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleDragStart = (e) => {
    if (zoomScale === 1) return;
    setIsDragging(true);
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
  };

  const handleDragMove = (e) => {
    if (!isDragging || zoomScale === 1) return;
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    setPanOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleWheelZoom = (e) => {
    if (!isLightboxOpen) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.25 : 0.25;
    setZoomScale(prev => {
      const next = Math.min(Math.max(prev + delta, 1), 4);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  useEffect(() => {
    if (products.length > 0) {
      const found = products.find(p => p.id === id && !p.isHidden);
      if (found && found.id !== product?.id) {
        setProduct(found);
        if (found.sizes?.length) setSelectedSize(found.sizes[0]);
        if (found.colors?.length) setSelectedColor(found.colors[0]);
        
        // Determinar el índice inicial: si hay una imagen principal, usar su índice
        const mainImgIndex = found.images?.findIndex(img => img.isMain) || 0;
        setActiveIndex(mainImgIndex >= 0 ? mainImgIndex : 0);
      }
    }
  }, [id, products, product]);
  
  // SEO: Update page title with product name
  useEffect(() => {
    if (product) {
      const baseTitle = settings.siteTitle || 'Candela Joyas';
      document.title = `${product.name} - Talles Reales | ${baseTitle}`;
    }
  }, [product, settings.siteTitle]);

  // Cambiar imagen al seleccionar color
  useEffect(() => {
    if (product && selectedColor && mediaItems.length > 0) {
      // Buscar la primera imagen que coincida con el color seleccionado
      const colorImageIndex = mediaItems.findIndex(item => item.color === selectedColor);
      
      if (colorImageIndex !== -1) {
        setActiveIndex(colorImageIndex);
      }
    }
  }, [selectedColor, product]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(price);
  };

  const handleAddToCart = () => {
    addToCart(product, { 
      color: selectedColor, 
      size: selectedSize,
      quantity: quantity 
    });
  };

  const getYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (loading) return <div className="loading-state flex-center"><div className="loader"></div></div>;
  if (!product) return <div className="container empty-state"><h3>Producto no encontrado</h3><Link to="/" className="btn btn-outline">Volver a inicio</Link></div>;

  const videoId = getYoutubeId(product.videoUrl);
  
  // Combine images and video for the gallery
  const mediaItems = [
    ...(product.images || []),
    ...(videoId ? [{ type: 'video', videoId }] : [])
  ];

  const nextImage = () => {
    if (mediaItems.length <= 1) return;
    resetZoom();
    setActiveIndex((prev) => (prev + 1) % mediaItems.length);
  };

  const prevImage = () => {
    if (mediaItems.length <= 1) return;
    resetZoom();
    setActiveIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  const handleTouchStart = (e) => {
    if (e.targetTouches.length === 1) {
      setTouchStart(e.targetTouches[0].clientX);
      if (zoomScale > 1) {
        handleDragStart(e);
      }
    } else if (e.targetTouches.length === 2 && isLightboxOpen) {
      const dist = Math.hypot(
        e.targetTouches[0].pageX - e.targetTouches[1].pageX,
        e.targetTouches[0].pageY - e.targetTouches[1].pageY
      );
      setInitialDistance(dist);
    }
  };

  const handleTouchMove = (e) => {
    if (e.targetTouches.length === 1) {
      setTouchEnd(e.targetTouches[0].clientX);
      if (zoomScale > 1) {
        handleDragMove(e);
      }
    } else if (e.targetTouches.length === 2 && initialDistance && isLightboxOpen) {
      const dist = Math.hypot(
        e.targetTouches[0].pageX - e.targetTouches[1].pageX,
        e.targetTouches[0].pageY - e.targetTouches[1].pageY
      );
      
      const sensitivity = 0.007; // Ajuste de sensibilidad
      const delta = (dist - initialDistance) * sensitivity;
      setZoomScale(prev => {
        const next = Math.min(Math.max(prev + delta, 1), 4);
        if (next === 1) setPanOffset({ x: 0, y: 0 });
        return next;
      });
      setInitialDistance(dist);
    }
  };

  const handleTouchEnd = (e) => {
    setInitialDistance(null);
    
    // Si todavía hay un dedo apoyado (ej. terminó el pinch), no disparamos el swipe
    if (e.targetTouches.length > 0) return;

    if (zoomScale === 1) {
      if (!touchStart || !touchEnd) {
        setTouchStart(0);
        setTouchEnd(0);
        return;
      }
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > 50;
      const isRightSwipe = distance < -50;

      if (isLeftSwipe) {
        nextImage();
      } else if (isRightSwipe) {
        prevImage();
      }
    } else {
      handleDragEnd();
    }
    
    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <div className="container product-detail-page animate-fade-in">
      <Link to="/" className="back-link">
        <ArrowLeft size={20} />
        Volver al catálogo
      </Link>

      <div className="product-detail-layout">
        <div className="product-image-side">
          <div 
            className="main-image-container glass"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => {
              if (mediaItems[activeIndex]?.type !== 'video') {
                setIsLightboxOpen(true);
              }
            }}
            style={{ cursor: mediaItems[activeIndex]?.type === 'video' ? 'default' : 'zoom-in' }}
          >
            <div 
              className="slider-track" 
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {mediaItems.length > 0 ? (
                mediaItems.map((item, idx) => (
                  <div key={idx} className="slider-item">
                    {item.type === 'video' ? (
                      <div className="video-wrapper">
                        <iframe
                          src={`https://www.youtube.com/embed/${item.videoId}?autoplay=0&rel=0`}
                          title="Product Video"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    ) : (
                      <img 
                        src={item.url} 
                        alt={`${product.name} - ${idx + 1}`} 
                        className="slider-image" 
                      />
                    )}
                  </div>
                ))
              ) : (
                <div className="slider-item">
                  <img src={product.imageUrl} alt={product.name} className="slider-image" />
                </div>
              )}
            </div>
            
            {mediaItems.length > 1 && (
              <>
                <button className="slider-arrow prev" onClick={(e) => { e.stopPropagation(); prevImage(); }} aria-label="Anterior">
                  <ChevronLeft size={24} />
                </button>
                <button className="slider-arrow next" onClick={(e) => { e.stopPropagation(); nextImage(); }} aria-label="Siguiente">
                  <ChevronRight size={24} />
                </button>
                <div className="image-counter">
                  {activeIndex + 1} / {mediaItems.length}
                </div>
              </>
            )}

            {mediaItems[activeIndex]?.type !== 'video' && (
              <div className="zoom-hint main-image-hint">
                <Maximize2 size={16} />
                <span className="zoom-hint-text">Click para ampliar</span>
              </div>
            )}
          </div>

          {mediaItems.length > 1 && (
            <div className="product-thumbnails-gallery custom-scrollbar">
              {mediaItems.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`thumbnail-item ${activeIndex === idx ? 'active' : ''} ${item.type === 'video' ? 'video-thumb' : ''}`}
                  onClick={() => setActiveIndex(idx)}
                >
                  {item.type === 'video' ? (
                    <div className="video-thumb-preview">
                      <img src={`https://img.youtube.com/vi/${item.videoId}/0.jpg`} alt="Video thumbnail" />
                      <div className="play-icon-overlay">
                        <svg viewBox="0 0 24 24" fill="white" width="24" height="24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <img src={item.thumbnailUrl || item.url} alt={`${product.name} view ${idx + 1}`} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="product-info-side">
          <div className="breadcrumbs">{product.category}</div>
          <h1>{product.name}</h1>
          <div className="product-price-section">
            {product.isOnSale && (
              <div className="price-wrapper">
                <span className="old-price">{formatPrice(product.oldPrice)}</span>
                <span className="discount-tag">{product.discountPercentage}% OFF</span>
              </div>
            )}
            {settings.featuredPriceMode === 'cash' ? (
              <>
                <p className="price">
                  {formatPrice(getCashPrice(product))}
                  <span className="price-label">Efectivo / Transferencia</span>
                </p>
                <p className="price-secondary">
                  {formatPrice(getInstallmentPrice(product))}
                  <span className="price-label">3 cuotas sin interés</span>
                </p>
              </>
            ) : (
              <>
                <p className="price">
                  {formatPrice(getInstallmentPrice(product))}
                  <span className="price-label">3 cuotas sin interés</span>
                </p>
                <p className="price-secondary">
                  {formatPrice(getCashPrice(product))}
                  <span className="price-label">Efectivo / Transferencia</span>
                </p>
              </>
            )}
          </div>

          <div className="selectors-wrapper">
            {/* Color Selection */}
            {product.colors && product.colors.length > 0 && (
              <div className="selector-group">
                <h4>{settings.colorLabel || 'Color'}</h4>
                <div className="options-container">
                  {product.colors.map(color => (
                    <button 
                      key={color} 
                      className={`option-btn ${selectedColor === color ? 'selected' : ''}`}
                      onClick={() => setSelectedColor(color)}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="selector-group">
                <h4>{settings.sizeLabel || 'Talle'}</h4>
                <div className="options-container">
                  {product.sizes.map(size => (
                    <button 
                      key={size} 
                      className={`option-btn ${selectedSize === size ? 'selected' : ''}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="purchase-actions">
            {/* Stock Calculation */}
            {(() => {
              // Stock actual para la variante seleccionada (talle o color, según el modo del producto)
              const isColorMode = product.stockMode === 'color';
              const variantSelected = hasVariantSelected(product.stockMode, product.colors, product.sizes, { size: selectedSize, color: selectedColor });
              let availableStock = 999;
              if (settings.enableStockManagement && product.stock && variantSelected) {
                const stockKey = getStockKey(product.stockMode, product.colors, product.sizes, { size: selectedSize, color: selectedColor });
                availableStock = product.stock[stockKey] !== undefined ? product.stock[stockKey] : 0;
              }
              const isOutOfStock = settings.enableStockManagement && variantSelected && availableStock <= 0;
              const noVariants = !(product.colors?.length > 0) && !(product.sizes?.length > 0);

              return (
                <>
                  {!product.isPaused && (
                    <div className="quantity-selector">
                      <button 
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="qty-btn"
                        disabled={isOutOfStock}
                      >-</button>
                      <span className="qty-value">{quantity}</span>
                      <button 
                        onClick={() => setQuantity(q => {
                          if (settings.enableStockManagement && q >= availableStock) {
                            toast.error(`Solo quedan ${availableStock} unidades disponibles`);
                            return q;
                          }
                          return q + 1;
                        })}
                        className="qty-btn"
                        disabled={isOutOfStock}
                      >+</button>
                    </div>
                  )}

                  {settings.enableStockManagement && variantSelected && (
                    <div className="stock-info animate-fade-in" style={{ marginBottom: '1rem' }}>
                      {availableStock > 0 ? (
                        <span className="stock-badge available" style={{ fontSize: '0.85rem', color: 'var(--color-dark)', fontWeight: '500', background: 'var(--color-secondary)', padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-sm)', display: 'inline-block' }}>
                          ¡Stock disponible! ({availableStock} unidades {(!isColorMode && selectedColor) ? `en ${(settings.colorLabel || 'color').toLowerCase()} ${selectedColor}` : ''})
                        </span>
                      ) : (
                        <span className="stock-badge out-of-stock" style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 'bold' }}>
                          Agotado {noVariants ? '' : (isColorMode ? `en ${(settings.colorLabel || 'color').toLowerCase()} ${selectedColor}` : (selectedColor ? `en ${selectedColor}` : `en este ${(settings.sizeLabel || 'talle').toLowerCase()}`))}
                        </span>
                      )}
                    </div>
                  )}

                  <button 
                    className={`btn btn-primary primary-action ${(product.isPaused || isOutOfStock) ? 'disabled' : ''}`} 
                    onClick={(product.isPaused || isOutOfStock) ? undefined : handleAddToCart}
                    disabled={product.isPaused || isOutOfStock}
                  >
                    <ShoppingBag size={20} />
                    {product.isPaused ? 'Sin stock' : isOutOfStock ? 'Agotado' : 'Agregar al carrito'}
                  </button>
                </>
              );
            })()}
          </div>

          <div className="product-description-container">
            <h4>Descripción</h4>
            <p className="product-description">
              {product.description || 'Prenda de alta calidad diseñada para brindar confort y elegancia. Ideal para complementar tu estilo en esta temporada.'}
            </p>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && createPortal(
        <div 
          className="lightbox-overlay animate-fade-in" 
          onClick={() => { setIsLightboxOpen(false); resetZoom(); }}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheelZoom}
        >
          <button className="lightbox-close" onClick={() => { setIsLightboxOpen(false); resetZoom(); }}>
            <CloseIcon size={32} />
          </button>

          <div className="lightbox-zoom-controls" onClick={e => e.stopPropagation()}>
            <button onClick={handleZoomOut} disabled={zoomScale <= 1} title="Alejar">
              <ZoomOut size={24} />
            </button>
            <span className="zoom-percentage">{Math.round(zoomScale * 100)}%</span>
            <button onClick={handleZoomIn} disabled={zoomScale >= 4} title="Acercar">
              <ZoomIn size={24} />
            </button>
          </div>

          <div 
            className="lightbox-content" 
            onClick={e => e.stopPropagation()}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            style={{ 
              cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
          >
            <img 
              src={mediaItems[activeIndex]?.url || product.imageUrl} 
              alt={product.name} 
              className="lightbox-image"
              style={{ 
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
              }}
              draggable="false"
            />
          </div>

          {zoomScale === 1 && mediaItems.length > 1 && (
            <div className="lightbox-nav">
              <button className="lightbox-nav-btn prev" onClick={(e) => { e.stopPropagation(); prevImage(); }}>
                <ChevronLeft size={40} />
              </button>
              <button className="lightbox-nav-btn next" onClick={(e) => { e.stopPropagation(); nextImage(); }}>
                <ChevronRight size={40} />
              </button>
            </div>
          )}
          
          {zoomScale > 1 ? (
            <div className="zoom-hint">Arrastrá para mover la foto</div>
          ) : (
            <div className="zoom-hint">Rueda del mouse para ampliar</div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
