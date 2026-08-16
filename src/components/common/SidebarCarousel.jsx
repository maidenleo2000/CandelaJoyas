import { useState, useEffect, useRef } from 'react';
import './SidebarCarousel.css';

const DEFAULT_HEIGHT_PX = 220;
const DEFAULT_INTERVAL_SECONDS = 4.5;

export default function SidebarCarousel({ images, heightPx, intervalSeconds }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);

  const slides = Array.isArray(images) ? images.filter((img) => img?.url) : [];
  const resolvedHeight = Number(heightPx) > 0 ? Number(heightPx) : DEFAULT_HEIGHT_PX;
  const resolvedIntervalMs = (Number(intervalSeconds) > 0 ? Number(intervalSeconds) : DEFAULT_INTERVAL_SECONDS) * 1000;

  useEffect(() => {
    if (currentIndex >= slides.length) setCurrentIndex(0);
  }, [slides.length, currentIndex]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, resolvedIntervalMs);

    return () => clearInterval(timerRef.current);
  }, [slides.length, resolvedIntervalMs]);

  if (slides.length === 0) return null;

  const goTo = (index) => {
    clearInterval(timerRef.current);
    setCurrentIndex(index);
  };

  return (
    <div className="sidebar-carousel" style={{ '--sidebar-carousel-height': `${resolvedHeight}px` }}>
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
