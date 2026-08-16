import { useState, useEffect, useContext, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Check,
  Link2,
  Unlink,
  Send,
  CalendarClock,
  Loader2,
  CircleCheck,
  CircleX,
  CircleAlert,
  Key,
  Save,
  Eye,
  EyeOff,
  Pencil,
} from "lucide-react";
import toast from "react-hot-toast";

import { supabase } from "../../services/supabase";
import { SettingsContext } from "../../contexts/SettingsContext";
import {
  getMetaConnectUrl,
  getMetaAppConfigStatus,
  saveMetaAppConfig,
  getSocialAccountStatus,
  disconnectSocialAccount,
  publishSocialPost,
} from "../../services/social";
import "./SocialPublisher.css";

// lucide-react ya no incluye iconos de marcas, así que los definimos como SVG inline.
function Facebook({ size = 18, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}
function Instagram({ size = 18, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

const STATUS_LABELS = {
  published: { label: "Publicado", icon: CircleCheck, color: "#16a34a" },
  partial: { label: "Publicado parcialmente", icon: CircleAlert, color: "#d97706" },
  failed: { label: "Falló", icon: CircleX, color: "#dc2626" },
  scheduled: { label: "Programado", icon: CalendarClock, color: "#2563eb" },
};

export default function SocialPublisher({ products }) {
  const { settings } = useContext(SettingsContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [accountStatus, setAccountStatus] = useState(null); // null = cargando
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [metaConfig, setMetaConfig] = useState(null); // { configured, appId }
  const [loadingMetaConfig, setLoadingMetaConfig] = useState(true);
  const [editingCredentials, setEditingCredentials] = useState(false);
  const [appIdInput, setAppIdInput] = useState("");
  const [appSecretInput, setAppSecretInput] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]); // urls
  const [caption, setCaption] = useState("");
  const [targetFacebook, setTargetFacebook] = useState(true);
  const [targetInstagram, setTargetInstagram] = useState(true);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [posts, setPosts] = useState([]);

  // Leer el resultado del OAuth (?social=connected|error) que vuelve desde la Cloud Function
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const social = params.get("social");
    if (!social) return;

    if (social === "connected") {
      toast.success("¡Cuenta de Facebook vinculada!");
    } else if (social === "error") {
      const reason = params.get("reason");
      toast.error(`No se pudo vincular la cuenta${reason ? `: ${reason}` : ""}`);
    }
    // Limpiar los query params para no repetir el toast al refrescar
    navigate(location.pathname, { replace: true });
    refreshAccountStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAccountStatus = async () => {
    setLoadingAccount(true);
    try {
      const status = await getSocialAccountStatus();
      setAccountStatus(status);
    } catch (error) {
      console.error(error);
      toast.error("No se pudo obtener el estado de las cuentas vinculadas.");
      setAccountStatus({ connected: false });
    } finally {
      setLoadingAccount(false);
    }
  };

  useEffect(() => {
    refreshAccountStatus();
    refreshMetaConfig();
  }, []);

  const refreshMetaConfig = async () => {
    setLoadingMetaConfig(true);
    try {
      const status = await getMetaAppConfigStatus();
      setMetaConfig(status);
      setAppIdInput(status.appId || "");
    } catch (error) {
      console.error(error);
      setMetaConfig({ configured: false, appId: null });
    } finally {
      setLoadingMetaConfig(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!appIdInput.trim() || !appSecretInput.trim()) {
      toast.error("Completá el App ID y el App Secret.");
      return;
    }
    setSavingCredentials(true);
    try {
      await saveMetaAppConfig(appIdInput.trim(), appSecretInput.trim());
      toast.success("Credenciales guardadas.");
      setAppSecretInput("");
      setEditingCredentials(false);
      refreshMetaConfig();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "No se pudieron guardar las credenciales.");
    } finally {
      setSavingCredentials(false);
    }
  };

  // Últimas publicaciones (en vivo)
  useEffect(() => {
    let cancelled = false;

    const fromRow = (row) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      imageUrls: row.image_urls,
      caption: row.caption,
      targets: row.targets,
      status: row.status,
      scheduledFor: row.scheduled_for,
      publishedAt: row.published_at,
      results: row.results,
      createdAt: row.created_at,
    });

    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15);
      if (cancelled) return;
      if (!error) setPosts((data || []).map(fromRow));
    };

    fetchPosts();

    const channel = supabase
      .channel(`social_posts_changes-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, () => fetchPosts())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredProducts = useMemo(
    () =>
      (products || []).filter(
        (p) =>
          p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.category?.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [products, searchTerm],
  );

  const productImageUrls = (product) => {
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images.map((img) => (typeof img === "string" ? img : img.url)).filter(Boolean);
    }
    return product.imageUrl ? [product.imageUrl] : [];
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    const imgs = productImageUrls(product);
    setSelectedImages(imgs.slice(0, 1)); // por defecto la primera foto
    setCaption(product.description || product.name || "");
  };

  const toggleImage = (url) => {
    setSelectedImages((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
    );
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const url = await getMetaConnectUrl();
      window.location.href = url;
    } catch (error) {
      toast.error(error.message);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("¿Desvincular las cuentas de Facebook e Instagram?")) return;
    try {
      await disconnectSocialAccount();
      toast.success("Cuentas desvinculadas.");
      refreshAccountStatus();
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron desvincular las cuentas.");
    }
  };

  const resetComposer = () => {
    setSelectedProduct(null);
    setSelectedImages([]);
    setCaption("");
    setScheduleEnabled(false);
    setScheduleDate("");
  };

  const handlePublish = async () => {
    if (!selectedProduct) return;
    if (selectedImages.length === 0) {
      toast.error("Elegí al menos una foto.");
      return;
    }
    if (!targetFacebook && !targetInstagram) {
      toast.error("Elegí al menos una red social.");
      return;
    }
    if (scheduleEnabled && !scheduleDate) {
      toast.error("Elegí fecha y hora para programar la publicación.");
      return;
    }

    setIsPublishing(true);
    try {
      const result = await publishSocialPost({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        imageUrls: selectedImages,
        caption,
        targets: { facebook: targetFacebook, instagram: targetInstagram },
        scheduledFor: scheduleEnabled ? new Date(scheduleDate).toISOString() : null,
      });

      if (result.scheduled) {
        toast.success("¡Publicación programada!");
      } else if (result.status === "published") {
        toast.success("¡Publicado con éxito!");
      } else if (result.status === "partial") {
        toast.error("Se publicó solo en una de las redes elegidas. Revisá el detalle abajo.");
      } else {
        toast.error("No se pudo publicar. Revisá el detalle abajo.");
      }
      resetComposer();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error al publicar.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="social-publisher animate-fade-in">
      <div className="social-header">
        <div>
          <h3>Redes Sociales</h3>
          <p>Publicá tus productos en Facebook e Instagram sin salir de la tienda.</p>
        </div>
      </div>

      {/* --- Credenciales de la app de Meta (App ID / App Secret) --- */}
      <div className="social-account-card">
        {loadingMetaConfig ? (
          <div className="account-loading">
            <Loader2 size={18} className="spin" /> Cargando credenciales...
          </div>
        ) : metaConfig?.configured && !editingCredentials ? (
          <div className="account-connected">
            <div className="account-info">
              <div className="account-badge fb">
                <Key size={18} /> App de Meta configurada (App ID: {metaConfig.appId})
              </div>
            </div>
            <button className="unlink-btn" onClick={() => setEditingCredentials(true)}>
              <Pencil size={16} /> Editar credenciales
            </button>
          </div>
        ) : (
          <div className="credentials-form">
            <p className="credentials-hint">
              Cargá acá el <strong>App ID</strong> y el <strong>App Secret</strong> de tu app creada en{" "}
              <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">
                developers.facebook.com
              </a>{" "}
              (ver la guía de configuración). El App Secret se guarda de forma segura y nunca se
              vuelve a mostrar.
            </p>
            <div className="credentials-fields">
              <input
                type="text"
                placeholder="App ID"
                value={appIdInput}
                onChange={(e) => setAppIdInput(e.target.value)}
              />
              <div className="secret-input-wrap">
                <input
                  type={showSecret ? "text" : "password"}
                  placeholder="App Secret"
                  value={appSecretInput}
                  onChange={(e) => setAppSecretInput(e.target.value)}
                />
                <button
                  type="button"
                  className="toggle-secret-btn"
                  onClick={() => setShowSecret((v) => !v)}
                  tabIndex={-1}
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="credentials-actions">
              <button className="connect-btn" disabled={savingCredentials} onClick={handleSaveCredentials}>
                {savingCredentials ? (
                  <>
                    <Loader2 size={16} className="spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Guardar credenciales
                  </>
                )}
              </button>
              {metaConfig?.configured && (
                <button
                  className="unlink-btn"
                  onClick={() => {
                    setEditingCredentials(false);
                    setAppSecretInput("");
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- Estado de vinculación --- */}
      <div className="social-account-card">
        {loadingAccount ? (
          <div className="account-loading">
            <Loader2 size={18} className="spin" /> Cargando estado de las cuentas...
          </div>
        ) : accountStatus?.connected ? (
          <div className="account-connected">
            <div className="account-info">
              <div className="account-badge fb">
                <Facebook size={18} /> {accountStatus.pageName}
              </div>
              {accountStatus.igConnected ? (
                <div className="account-badge ig">
                  <Instagram size={18} /> @{accountStatus.igUsername}
                </div>
              ) : (
                <div className="account-badge warn">
                  <Instagram size={18} /> Sin cuenta de Instagram vinculada a la Página
                </div>
              )}
            </div>
            <button className="unlink-btn" onClick={handleDisconnect}>
              <Unlink size={16} /> Desvincular
            </button>
          </div>
        ) : (
          <div className="account-disconnected">
            <p>
              Todavía no vinculaste tus cuentas. Necesitás una Página de Facebook (e
              idealmente una cuenta de Instagram profesional vinculada a esa Página).
            </p>
            <button
              className="connect-btn"
              onClick={handleConnect}
              disabled={isConnecting || !metaConfig?.configured}
            >
              {isConnecting ? (
                <>
                  <Loader2 size={16} className="spin" /> Redirigiendo...
                </>
              ) : (
                <>
                  <Link2 size={16} /> Conectar con Facebook
                </>
              )}
            </button>
          </div>
        )}
        {!metaConfig?.configured && !loadingMetaConfig && (
          <p className="composer-hint" style={{ marginTop: "0.6rem" }}>
            Cargá primero el App ID y App Secret arriba para poder conectar.
          </p>
        )}
      </div>

      <div className="social-grid">
        {/* --- Selector de producto --- */}
        <div className="product-selector">
          <div className="search-bar" style={{ marginBottom: "1rem", position: "relative" }}>
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
                onClick={() => handleSelectProduct(product)}
              >
                <img src={product.imageUrl} alt={product.name} />
                <div className="info">
                  <p>{product.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- Compositor de la publicación --- */}
        <div className="composer-panel">
          {!selectedProduct ? (
            <p className="composer-empty">Elegí un producto para armar la publicación.</p>
          ) : (
            <>
              <h4>{selectedProduct.name}</h4>

              <p className="field-label">Fotos a publicar</p>
              <div className="image-picker">
                {productImageUrls(selectedProduct).map((url) => (
                  <div
                    key={url}
                    className={`image-picker-item ${selectedImages.includes(url) ? "selected" : ""}`}
                    onClick={() => toggleImage(url)}
                  >
                    <img src={url} alt="" />
                    {selectedImages.includes(url) && (
                      <div className="check-badge">
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <p className="field-label">Descripción</p>
              <textarea
                rows={5}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Escribí el texto de la publicación..."
              />

              <p className="field-label">Publicar en</p>
              <div className="target-toggles">
                <label className={`target-toggle ${targetFacebook ? "active" : ""}`}>
                  <input
                    type="checkbox"
                    checked={targetFacebook}
                    onChange={(e) => setTargetFacebook(e.target.checked)}
                  />
                  <Facebook size={16} /> Facebook
                </label>
                <label className={`target-toggle ${targetInstagram ? "active" : ""}`}>
                  <input
                    type="checkbox"
                    checked={targetInstagram}
                    onChange={(e) => setTargetInstagram(e.target.checked)}
                  />
                  <Instagram size={16} /> Instagram
                </label>
              </div>

              <div className="schedule-row">
                <div className="switch-container" style={{ marginBottom: scheduleEnabled ? "0.6rem" : 0 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>Programar para más tarde</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={scheduleEnabled}
                      onChange={(e) => setScheduleEnabled(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                {scheduleEnabled && (
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="schedule-input"
                  />
                )}
              </div>

              <button
                className="publish-btn"
                disabled={isPublishing || !accountStatus?.connected}
                onClick={handlePublish}
              >
                {isPublishing ? (
                  <>
                    <Loader2 size={16} className="spin" /> Publicando...
                  </>
                ) : scheduleEnabled ? (
                  <>
                    <CalendarClock size={16} /> Programar publicación
                  </>
                ) : (
                  <>
                    <Send size={16} /> Publicar ahora
                  </>
                )}
              </button>
              {!accountStatus?.connected && (
                <p className="composer-hint">Vinculá tus cuentas de Facebook/Instagram arriba para poder publicar.</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* --- Historial --- */}
      {posts.length > 0 && (
        <div className="social-history">
          <h4>Últimas publicaciones</h4>
          <div className="history-list">
            {posts.map((post) => {
              const meta = STATUS_LABELS[post.status] || STATUS_LABELS.scheduled;
              const StatusIcon = meta.icon;
              return (
                <div key={post.id} className="history-item">
                  {post.imageUrls?.[0] && <img src={post.imageUrls[0]} alt="" />}
                  <div className="history-info">
                    <p className="history-name">{post.productName || "Producto"}</p>
                    <p className="history-targets">
                      {post.targets?.facebook && <Facebook size={13} />}
                      {post.targets?.instagram && <Instagram size={13} />}
                    </p>
                  </div>
                  <div className="history-status" style={{ color: meta.color }}>
                    <StatusIcon size={16} /> {meta.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
