import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { 
  BookOpen, 
  Package, 
  ShoppingBag, 
  Settings, 
  MessageSquare, 
  Tag, 
  Share2, 
  User, 
  ChevronLeft, 
  Printer,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Image as ImageIcon
} from 'lucide-react';
import './AdminGuide.css';

const AdminGuide = () => {
  const navigate = useNavigate();
  const { currentUser, userRole } = useContext(AuthContext);

  if (!currentUser || userRole !== 'admin') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem' }}>
        <h2>Acceso Restringido</h2>
        <p>Debes ser administrador para ver esta guía.</p>
        <button onClick={() => navigate('/admin')} style={{ padding: '0.5rem 1rem', background: '#A08264', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Ir al Login
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="admin-guide-page animate-fade-in">
      <header className="guide-header">
        <div className="header-content">
          <button className="back-btn" onClick={() => navigate('/admin')}>
            <ChevronLeft size={20} /> Volver al Panel
          </button>
          <div className="header-title">
            <BookOpen size={32} className="text-primary" />
            <h1>Guía del Administrador</h1>
          </div>
          <button className="print-btn" onClick={handlePrint}>
            <Printer size={20} /> Imprimir a PDF
          </button>
        </div>
      </header>

      <div className="guide-container">
        <aside className="guide-sidebar">
          <nav>
            <h3>Contenido</h3>
            <ul>
              <li><a href="#intro">Introducción</a></li>
              <li><a href="#productos">Gestión de Productos</a></li>
              <li><a href="#ventas">Gestión de Ventas</a></li>
              <li><a href="#config">Configuración</a></li>
              <li><a href="#marketing">Marketing</a></li>
              <li><a href="#seguridad">Seguridad</a></li>
            </ul>
          </nav>
          
          <div className="guide-tip-card">
            <HelpCircle size={24} />
            <p><strong>¿Necesitas ayuda?</strong> Si tienes problemas técnicos, recuerda que las imágenes no deben superar los 5MB para un rendimiento óptimo.</p>
          </div>
        </aside>

        <main className="guide-content">
          <section id="intro" className="guide-section glass">
            <h2><BookOpen size={24} /> Introducción</h2>
            <p>Bienvenido al centro de control de <strong>Genoveva InduStore</strong>. Este manual está diseñado para que puedas autogestionar tu tienda de manera profesional, desde la carga de stock hasta la personalización de tu marca.</p>
            <div className="highlight-box">
              <CheckCircle2 size={20} />
              <p>Todos los cambios que realices se reflejan instantáneamente en la web para tus clientes.</p>
            </div>
          </section>

          <section id="productos" className="guide-section glass">
            <h2><Package size={24} /> Gestión de Productos</h2>
            <p>Es el corazón de tu tienda. Aquí controlas qué vendes y cómo se ve.</p>
            
            <div className="step-card">
              <h3>Carga Inteligente</h3>
              <ul>
                <li><strong>Multifoto:</strong> Puedes subir hasta 10 fotos por producto. El sistema las redimensiona automáticamente para que la página vuele.</li>
                <li><strong>Foto Principal:</strong> Marca la estrella en la imagen que quieres que aparezca en el catálogo general.</li>
                <li><strong>Ofertas:</strong> Si activas "En Oferta", coloca el precio anterior. El sistema mostrará el cartel de "OFF" y calculará el % de descuento solo.</li>
              </ul>
            </div>

            <div className="step-card">
              <h3>Actualización Masiva de Precios</h3>
              <ul>
                <li><strong>Ajuste Global:</strong> Usa esta herramienta para aumentar o disminuir los precios de todos los productos a la vez.</li>
                <li><strong>Aplicación:</strong> Ingresa el porcentaje (%), elige si es "Aumento" o "Descuento" y confirma. El catálogo entero se actualizará en segundos.</li>
              </ul>
            </div>

            <div className="feature-highlight" style={{ marginTop: '2rem' }}>
              <div className="icon-wrapper" style={{ background: 'rgba(212, 163, 115, 0.1)', color: 'var(--color-primary)' }}><Package size={32} /></div>
              <div className="text">
                <h3>Gestión de Stock por Talle</h3>
                <p>Puedes activar el control de inventario en <strong>Configuración {' > '} Checkout</strong>. Una vez activo:</p>
                <ul>
                  <li><strong>Carga de Unidades:</strong> En cada producto, define cuántas unidades tienes por talle.</li>
                  <li><strong>Alerta de Stock Bajo:</strong> Define un umbral (ej. 5 unidades) para que el sistema te avise en amarillo cuando algo se está por agotar.</li>
                  <li><strong>Venta Automática:</strong> Si el stock llega a 0, la tienda bloquea la venta de ese talle automáticamente.</li>
                  <li><strong>Descuento de Stock:</strong> El stock se resta solo cuando pasas un pedido a "Confirmada" o cuando se acredita un pago de Mercado Pago.</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="ventas" className="guide-section glass">
            <h2><ShoppingBag size={24} /> Gestión de Ventas</h2>
            <p>Administra tus pedidos y mantén a tus clientes informados.</p>
            
            <div className="feature-highlight">
              <div className="icon-wrapper"><Smartphone size={32} /></div>
              <div className="text">
                <h3>Venta por WhatsApp y Referencias</h3>
                <p>Al recibir una venta, haz clic en el icono del teléfono. Se abrirá un chat con el cliente con un mensaje ya escrito que dice exactamente qué compró, talle y color. ¡Ideal para pasar el link de pago!</p>
                <p><strong>Mercado Pago:</strong> Si el cliente paga por la web, verás el "ID de Pago" en la tabla, lo que te permite rastrear la operación exacta en tu cuenta de Mercado Pago.</p>
              </div>
            </div>

            <div className="status-guide">
              <h4>Estados de Pedido:</h4>
              <div className="status-grid">
                <span className="badge pendiente">Pendiente</span> <p>Pedido recién entrado.</p>
                <span className="badge confirmada">Confirmada</span> <p>Pago verificado.</p>
                <span className="badge completada">Completada</span> <p>Entregado al cliente.</p>
              </div>
            </div>
          </section>

          <section id="config" className="guide-section glass">
            <h2><Settings size={24} /> Configuración del Sitio</h2>
            <p>Personaliza la identidad visual de Genoveva sin diseñadores.</p>
            <ul>
              <li><strong>Marca:</strong> Sube tu logo y el favicon. El favicon es la fotito que aparece en la pestaña del navegador. ¡El sistema lo hace redondo solo!</li>
              <li><strong>Colores:</strong> Elige el color que domina la web (Primario) y el de fondo (Secundario).</li>
              <li><strong>Marquesina:</strong> El texto que corre arriba. Puedes cambiarle el color, el tamaño y lo que dice (ej: "Envios gratis a todo el país").</li>
              <li><strong>Videos:</strong> Sube videos cortos (Reels/TikTok style) para el inicio. Máximo 30MB.</li>
            </ul>
          </section>

          <section id="marketing" className="guide-section glass">
            <h2><Share2 size={24} /> Marketing y Categorías</h2>
            <div className="two-cols">
              <div>
                <h3><Tag size={20} /> Categorías</h3>
                <p>Crea grupos como "Remeras", "Pantalones", etc. Si borras una categoría, los productos no se borran, solo quedan sin grupo.</p>
              </div>
              <div>
                <h3><Share2 size={20} /> Redes Sociales</h3>
                <p>Usa la herramienta de Marketing para crear placas de tus productos con precios actualizados para Instagram.</p>
              </div>
            </div>
          </section>

          <section id="seguridad" className="guide-section glass">
            <h2><User size={24} /> Seguridad y Mi Cuenta</h2>
            <div className="alert-box">
              <AlertCircle size={20} />
              <p>Nunca compartas tu contraseña. Si necesitas que otra persona ayude, pídele que se registre y tú puedes autorizarla desde la pestaña <strong>Usuarios</strong>.</p>
            </div>
            <p>En "Mi Cuenta" puedes cambiar tu contraseña periódicamente para mantener la tienda segura.</p>
          </section>
        </main>
      </div>

      <footer className="guide-footer">
        <p>© 2026 Genoveva InduStore - Panel de Administración</p>
      </footer>
    </div>
  );
};

export default AdminGuide;
