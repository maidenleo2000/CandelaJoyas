import React, { useState, useEffect, useRef } from 'react';
import './VideoSlider.css';

/**
 * VideoSlider con Doble Buffering
 * Evita el flash negro precargando el siguiente video en un elemento oculto
 * y realizando un crossfade suave.
 */
export default function VideoSlider({ videoUrls }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeBuffer, setActiveBuffer] = useState(0); // 0 o 1
  const [bufferSources, setBufferSources] = useState([null, null]);
  const [isReady, setIsReady] = useState(false);
  
  const video0Ref = useRef(null);
  const video1Ref = useRef(null);

  // Normalizar URLs desde el prop
  const urls = React.useMemo(() => {
    if (Array.isArray(videoUrls)) return videoUrls;
    if (typeof videoUrls === 'string') {
      return videoUrls.split('\n').map(u => u.trim()).filter(Boolean);
    }
    return [];
  }, [videoUrls]);

  // Inicialización
  useEffect(() => {
    if (urls.length > 0) {
      setBufferSources([urls[0], urls[1] || urls[0]]);
      setCurrentIndex(0);
      setActiveBuffer(0);
    }
  }, [urls]);

  // Reproducir el video inicial cuando el buffer 0 esté listo
  useEffect(() => {
    if (activeBuffer === 0 && video0Ref.current && bufferSources[0]) {
      video0Ref.current.play().catch(e => console.log("Autoplay blocked:", e));
    }
  }, [bufferSources, activeBuffer]);

  // Manejar el cambio de video (Siguiente)
  const goToNext = (nextIdx) => {
    if (nextIdx === currentIndex) return;

    const targetBuffer = activeBuffer === 0 ? 1 : 0;
    const targetRef = targetBuffer === 0 ? video0Ref : video1Ref;
    const currentRef = activeBuffer === 0 ? video0Ref : video1Ref;

    // Actualizar la fuente del buffer inactivo si no coincide
    setBufferSources(prev => {
      const newSources = [...prev];
      newSources[targetBuffer] = urls[nextIdx];
      return newSources;
    });

    // Iniciar reproducción del siguiente
    if (targetRef.current) {
        targetRef.current.currentTime = 0;
        targetRef.current.play().then(() => {
            // Cuando arranca la reproducción, hacemos el switch visual
            setCurrentIndex(nextIdx);
            setActiveBuffer(targetBuffer);
            
            // Pausar el anterior después de un breve delay para el crossfade
            setTimeout(() => {
                if (currentRef.current) currentRef.current.pause();
            }, 800);
        }).catch(err => {
            console.warn("Error play transition:", err);
            // Fallback directo si falla el play suave
            setCurrentIndex(nextIdx);
            setActiveBuffer(targetBuffer);
        });
    }
  };

  if (urls.length === 0) return null;

  const handleEnded = () => {
    const nextIdx = (currentIndex + 1) % urls.length;
    goToNext(nextIdx);
  };

  const skipTo = (idx) => {
    goToNext(idx);
  };

  return (
    <div className="video-slider-container">
      {/* Background skeleton mientras carga el primer video */}
      {!isReady && <div className="video-loader-placeholder" />}

      {/* Buffer 0 */}
      <div className={`video-wrapper ${activeBuffer === 0 ? 'active' : ''}`}>
        <video
          ref={video0Ref}
          src={bufferSources[0]}
          className={`video-slider ${isReady && activeBuffer === 0 ? 'visible' : ''}`}
          muted
          playsInline
          onEnded={handleEnded}
          loop={urls.length === 1}
          onPlaying={() => activeBuffer === 0 && setIsReady(true)}
          poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        />
      </div>

      {/* Buffer 1 */}
      <div className={`video-wrapper ${activeBuffer === 1 ? 'active' : ''}`}>
        <video
          ref={video1Ref}
          src={bufferSources[1]}
          className={`video-slider ${isReady && activeBuffer === 1 ? 'visible' : ''}`}
          muted
          playsInline
          onEnded={handleEnded}
          loop={urls.length === 1}
          onPlaying={() => activeBuffer === 1 && setIsReady(true)}
          poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        />
      </div>
      
      {/* Indicadores */}
      {urls.length > 1 && (
        <div className="video-slider-indicators">
          {urls.map((_, idx) => (
            <div 
              key={idx} 
              className={`indicator ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => skipTo(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
