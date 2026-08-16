import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { CartContext } from '../../contexts/CartContext';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const images = product.images && product.images.length > 0 ? product.images : (product.imageUrl ? [{url: product.imageUrl}] : []);
  
  // Encontrar el índice de la imagen principal para mostrarla primero
  const initialIdx = images.findIndex(img => img.isMain);
  const [currentIdx, setCurrentIdx] = useState(initialIdx !== -1 ? initialIdx : 0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleNext = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIdx((prev) => (prev + 1) % images.length);
  };

  const handlePrev = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) handleNext(e);
    if (distance < -50) handlePrev(e);
    setTouchStart(0);
    setTouchEnd(0);
  };

  // Format price to ARS (Argentine Peso)
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(price);
  };

  const handleGoToProduct = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/product/${product.id}`);
  };

  return (
    <div className="product-card animate-slide-up">
      <Link 
        to={`/product/${product.id}`} 
        className="product-image-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="card-slider-track" 
          style={{ transform: `translateX(-${currentIdx * 100}%)` }}
        >
          {images.map((img, idx) => (
            <img 
              key={idx} 
              src={img.thumbnailUrl || img.url} 
              alt={product.name} 
              className="product-image" 
              loading="lazy"
            />
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button className="card-arrow prev" onClick={handlePrev} aria-label="Anterior">
              <ChevronLeft size={18} />
            </button>
            <button className="card-arrow next" onClick={handleNext} aria-label="Siguiente">
              <ChevronRight size={18} />
            </button>
            <div className="card-dots">
              {images.map((_, i) => (
                <div key={i} className={`dot ${i === currentIdx ? 'active' : ''}`} />
              ))}
            </div>
          </>
        )}

        {product.isOnSale && !product.isPaused && (
          <div className="offer-badge animate-pulse">
            {product.discountPercentage}% OFF
          </div>
        )}
        {product.isPaused && (
          <div className="paused-badge">
            SIN STOCK
          </div>
        )}
        <div className="product-overlay">
          <span className="view-btn">{product.isPaused ? 'Sin Stock' : 'Ver Detalles'}</span>
        </div>
      </Link>
      
      <div className={`product-info ${product.isPaused ? 'product-paused' : ''}`}>
        <span className="product-category">{product.category}</span>
        <h3 className="product-name">
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        <div className="product-price-container">
          {product.isOnSale ? (
            <>
              <p className="product-price sale-price">{formatPrice(product.newPrice)}</p>
              <p className="product-old-price">{formatPrice(product.oldPrice)}</p>
            </>
          ) : (
            <p className="product-price">{formatPrice(product.price)}</p>
          )}
        </div>
        
        <button 
          className={`btn btn-primary add-to-cart-btn ${product.isPaused ? 'disabled' : ''}`} 
          onClick={product.isPaused ? undefined : handleGoToProduct}
          disabled={product.isPaused}
        >
          <ShoppingBag size={16} />
          {product.isPaused ? 'Sin Stock' : 'Ver Opciones'}
        </button>
      </div>
    </div>
  );
}
