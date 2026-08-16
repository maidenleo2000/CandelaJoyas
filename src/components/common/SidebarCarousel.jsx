import { useState, useEffect, useRef } from 'react';
import './SidebarCarousel.css';

const AUTO_ROTATE_MS = 4500;

export default function SidebarCarousel({ images }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);

  const slides = Array.isArray(images) ? images.filter((img) => img?.url) : [];

  useEffect(() => {
    if (currentIndex >= slides.length) setCurrentIndex(0);
  }, [slides.length, currentIndex]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, AUTO_ROTATE_MS);

    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const goTo = (index) => {
    clearInterval(timerRef.current);
    setCurrentIndex(index);
  };

  return (
    <div className="sidebar-carousel">
      <div className="sidebar-carousel-track">
        {slides.map((slide, index) => {
          const content = (
            <img src={slide.url} alt="" className="sidebar-carousel-image" />
          );
          return (
            <div
              key={slide.url + index}
              className={`sidebar-carousel-slide ${index === currentIndex ? 'is-active' : ''}`}
            >
              {slide.linkUrl ? (
                <a href={slide.linkUrl} target="_blank" rel="noreferrer">
                  {content}
                </a>
              ) : (
                content
              )}
            </div>
          );
        })}
      </div>

      {slides.length > 1 && (
        <div className="sidebar-carousel-dots">
          {slides.map((slide, index) => (
            <button
              key={slide.url + index}
              type="button"
              className={`sidebar-carousel-dot ${index === currentIndex ? 'is-active' : ''}`}
              onClick={() => goTo(index)}
              aria-label={`Ver imagen ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
