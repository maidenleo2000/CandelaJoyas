import React, { useState, useRef, useContext } from "react";
import {
  Download,
  Smartphone,
  Square,
  Check,
  Search,
  Image as ImageIcon,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

import { SettingsContext } from "../../contexts/SettingsContext";
import toast from "react-hot-toast";
import "./MarketingTool.css";

const MarketingTool = ({ products }) => {
  const { settings } = useContext(SettingsContext);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [base64Images, setBase64Images] = useState([]);
  const [isCollage, setIsCollage] = useState(false);
  const [maxPhotos, setMaxPhotos] = useState(4);
  const [format, setFormat] = useState("square");
  const [searchTerm, setSearchTerm] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  // Color del círculo del precio (por defecto usa el primario de los ajustes)
  const [priceColor, setPriceColor] = useState(
    settings?.primaryColor || "#D4A373",
  );

  const plateRef = useRef(null);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleProductSelect = async (product) => {
    setSelectedProduct(product);
    setBase64Images([]);
    const loadingToast = toast.loading("Procesando imágenes...");

    try {
      // Tomamos hasta el máximo elegido para el collage
      const imagesToProcess = isCollage
        ? product.images?.slice(0, maxPhotos) || [{ url: product.imageUrl }]
        : [{ url: product.imageUrl }];

      const processed = await Promise.all(
        imagesToProcess.map(async (imgObj) => {
          const url = imgObj.url;
          try {
            const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&output=png`;
            const response = await fetch(proxiedUrl);
            const blob = await response.blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            return url;
          }
        }),
      );

      setBase64Images(processed);
      toast.dismiss(loadingToast);
      toast.success(
        isCollage ? `¡${processed.length} fotos listas!` : "Imagen lista",
      );
    } catch (error) {
      console.error("Error al procesar imágenes:", error);
      setBase64Images([product.imageUrl]);
      toast.dismiss(loadingToast);
    }
  };

  // Función principal para generar la imagen (Canvas) y ejecutar una acción
  const handleAction = async (type) => {
    if (!selectedProduct || base64Images.length === 0) return;
    setIsGenerating(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const width = 1080;
      const height = format === "square" ? 1080 : 1920; // 1:1 para Feed, 9:16 para Stories
      canvas.width = width;
      canvas.height = height;

      const loadedImages = await Promise.all(
        base64Images.map((src) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });
        }),
      );

      // Fondo blanco para que las separaciones sean blancas y elegantes
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);

      // Función para emular el 'object-fit: cover' en el canvas
      const drawImageCover = (img, dx, dy, dWidth, dHeight) => {
        const imgRatio = img.width / img.height;
        const areaRatio = dWidth / dHeight;
        let sw, sh, sx, sy;

        if (imgRatio > areaRatio) {
          sh = img.height;
          sw = img.height * areaRatio;
          sx = (img.width - sw) / 2;
          sy = 0;
        } else {
          sw = img.width;
          sh = img.width / areaRatio;
          sx = 0;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dWidth, dHeight);
      };

      const count = loadedImages.length;
      const gap = 4; // Separación sutil blanca
      if (count === 1) {
        drawImageCover(loadedImages[0], 0, 0, width, height);
      } else if (count === 2) {
        drawImageCover(loadedImages[0], 0, 0, width / 2 - gap / 2, height);
        drawImageCover(
          loadedImages[1],
          width / 2 + gap / 2,
          0,
          width / 2 - gap / 2,
          height,
        );
      } else if (count === 3) {
        drawImageCover(loadedImages[0], 0, 0, width / 2 - gap / 2, height);
        drawImageCover(
          loadedImages[1],
          width / 2 + gap / 2,
          0,
          width / 2 - gap / 2,
          height / 2 - gap / 2,
        );
        drawImageCover(
          loadedImages[2],
          width / 2 + gap / 2,
          height / 2 + gap / 2,
          width / 2 - gap / 2,
          height / 2 - gap / 2,
        );
      } else if (count >= 4) {
        drawImageCover(
          loadedImages[0],
          0,
          0,
          width / 2 - gap / 2,
          height / 2 - gap / 2,
        );
        drawImageCover(
          loadedImages[1],
          width / 2 + gap / 2,
          0,
          width / 2 - gap / 2,
          height / 2 - gap / 2,
        );
        drawImageCover(
          loadedImages[2],
          0,
          height / 2 + gap / 2,
          width / 2 - gap / 2,
          height / 2 - gap / 2,
        );
        drawImageCover(
          loadedImages[3],
          width / 2 + gap / 2,
          height / 2 + gap / 2,
          width / 2 - gap / 2,
          height / 2 - gap / 2,
        );
      }

      // Gradiente inferior para dar contraste al texto blanco
      const gradient = ctx.createLinearGradient(0, height * 0.7, 0, height);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, "rgba(0,0,0,0.9)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, height * 0.7, width, height * 0.3);

      ctx.fillStyle = "rgba(255,255,255,0.98)";
      const brandWidth = 480;
      const brandHeight = 90;
      const bx = 40,
        by = 40,
        br = 45;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(bx, by, brandWidth, brandHeight, br);
      } else {
        ctx.rect(bx, by, brandWidth, brandHeight);
      }
      ctx.fill();

      ctx.fillStyle = "#222";
      ctx.font = "bold 34px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        settings?.siteTitle || "GENOVEVA InduStore",
        bx + brandWidth / 2,
        by + 58,
      );

      const px = width - 150,
        py = 120,
        pr = 95;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = priceColor;
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = "white";
      ctx.stroke();

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate((10 * Math.PI) / 180); // 10 grados de rotación
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      const priceText = `$${selectedProduct.price}`;
      ctx.font = "bold 44px sans-serif";
      ctx.fillText(priceText, 0, 18); // Centrado relativo
      ctx.restore();

      ctx.textAlign = "left";
      ctx.fillStyle = "white";
      ctx.font = "bold 78px sans-serif";
      ctx.fillText(selectedProduct.name, 50, height - 130);

      ctx.font = "bold 44px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.fillText("www.genovevaindu.com.ar", 50, height - 65);

      const dataUrl = canvas.toDataURL("image/png");
      const fileName = `PLACA_${selectedProduct.name.replace(/\s+/g, "_")}.png`;

      if (type === "share" && Capacitor.isNativePlatform()) {
        const cacheFile = await Filesystem.writeFile({
          path: fileName,
          data: dataUrl,
          directory: Directory.Cache,
        });
        await Share.share({
          title: "",
          text: "",
          url: cacheFile.uri,
          dialogTitle: "Compartir imagen",
        });
      } else if (type === "download") {
        if (Capacitor.isNativePlatform()) {
          await Filesystem.writeFile({
            path: fileName,
            data: dataUrl,
            directory: Directory.Documents,
            recursive: true,
          });
          toast.success("¡Imagen guardada en Documentos!");
        } else {
          const link = document.createElement("a");
          link.download = fileName;
          link.href = dataUrl;
          link.click();
          toast.success("¡Placa descargada!");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al procesar la acción");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="marketing-tool animate-fade-in">
      <div className="marketing-header">
        <div>
          <h3>Herramienta de Marketing</h3>
          <p>Generador de placas y collages.</p>
        </div>
      </div>

      <div className="marketing-grid">
        <div className="product-selector">
          <div
            className="search-bar"
            style={{ marginBottom: "1rem", position: "relative" }}
          >
            <Search
              size={18}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#999",
              }}
            />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "0.8rem 1rem 0.8rem 2.5rem",
                borderRadius: "12px",
                border: "1px solid #ddd",
              }}
            />
          </div>
          <div className="selector-grid">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className={`selector-item ${selectedProduct?.id === product.id ? "selected" : ""}`}
                onClick={() => handleProductSelect(product)}
              >
                <img src={product.imageUrl} alt={product.name} />
                <div className="info">
                  <p>{product.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="preview-sidebar">
          <div className="controls-panel">
            <div className="format-selector">
              <button
                className={`format-btn ${format === "square" ? "active" : ""}`}
                onClick={() => setFormat("square")}
              >
                Feed
              </button>
              <button
                className={`format-btn ${format === "story" ? "active" : ""}`}
                onClick={() => setFormat("story")}
              >
                Story
              </button>
            </div>
            <div
              style={{
                marginTop: "1.2rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.2rem",
              }}
            >
              <div className="switch-container">
                <span style={{ fontWeight: "600", fontSize: "0.85rem" }}>
                  Habilitar Collage
                </span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={isCollage}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setIsCollage(val);
                      if (selectedProduct) {
                        // Forzamos actualización de imágenes
                        setTimeout(
                          () => handleProductSelect(selectedProduct),
                          50,
                        );
                      }
                    }}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              {/* Selector de máximo de fotos (Solo si collage está activo) */}
              {isCollage && (
                <div className="animate-fade-in">
                  <p
                    style={{
                      fontWeight: "600",
                      fontSize: "0.8rem",
                      marginBottom: "0.5rem",
                      color: "#666",
                    }}
                  >
                    Máximo de fotos:
                  </p>
                  <div className="max-photos-selector">
                    {[2, 3, 4].map((num) => (
                      <button
                        key={num}
                        className={`number-btn ${maxPhotos === num ? "active" : ""}`}
                        onClick={() => {
                          setMaxPhotos(num);
                          if (selectedProduct) {
                            // Pequeño timeout para asegurar que el estado se actualizó
                            setTimeout(
                              () => handleProductSelect(selectedProduct),
                              50,
                            );
                          }
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.8rem",
                  borderTop: "1px solid #eee",
                  paddingTop: "1rem",
                }}
              >
                <input
                  type="color"
                  value={priceColor}
                  onChange={(e) => setPriceColor(e.target.value)}
                  style={{
                    width: "35px",
                    height: "35px",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                />
                <span style={{ fontSize: "0.8rem" }}>Color Precio</span>
              </div>
            </div>

            <div
              className="action-buttons-container"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.8rem",
                marginTop: "1.2rem",
              }}
            >
              <button
                className="download-btn"
                disabled={base64Images.length === 0 || isGenerating}
                onClick={() => handleAction("download")}
              >
                {isGenerating ? "Procesando..." : "Descargar Imagen"}
              </button>

              {Capacitor.isNativePlatform() && (
                <button
                  className="share-action-btn"
                  disabled={base64Images.length === 0 || isGenerating}
                  onClick={() => handleAction("share")}
                  style={{
                    padding: "0.8rem",
                    borderRadius: "10px",
                    background: "#25D366",
                    color: "white",
                    border: "none",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Compartir Placa
                </button>
              )}
            </div>
          </div>

          <div className="preview-container">
            {selectedProduct ? (
              <div className={`shareable-plate ${format}`}>
                <div className="plate-content">
                  <div className="plate-brand">
                    {settings?.siteTitle || "GENOVEVA InduStore"}
                  </div>
                  <div
                    className="plate-price-tag"
                    style={{ backgroundColor: priceColor }}
                  >
                    <span className="currency">$</span>
                    <span className="amount">{selectedProduct.price}</span>
                  </div>
                  <div className={`plate-grid count-${base64Images.length}`}>
                    {base64Images.map((img, idx) => (
                      <div
                        key={idx}
                        className="plate-image-item"
                        style={{ backgroundImage: `url(${img})` }}
                      />
                    ))}
                  </div>
                  <div className="plate-overlay">
                    <div className="plate-title">{selectedProduct.name}</div>
                    <div className="plate-url">www.genovevaindu.com.ar</div>
                  </div>
                </div>
              </div>
            ) : (
              <p>Selecciona un producto</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingTool;
