import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Download, Smartphone, X, CheckCircle, House, User, CircleHelp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getInstallStatus, subscribeInstall, requestAppInstall } from '../../services/pwa';
import './ApplicationMenu.css';

export default function ApplicationMenu() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const status = useSyncExternalStore(subscribeInstall, getInstallStatus);
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  useEffect(() => {
    if (open && !dialogRef.current.open) dialogRef.current.showModal();
    if (!open && dialogRef.current.open) dialogRef.current.close();
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const install = async () => {
    setBusy(true);
    setMessage('');
    try {
      const outcome = await requestAppInstall();
      setMessage(outcome === 'accepted' ? 'Instalación solicitada. Seguí las indicaciones de tu dispositivo.' : outcome === 'dismissed' ? 'Podés volver a instalarla cuando quieras desde este menú.' : 'Usá las instrucciones que aparecen abajo para instalarla.');
    } catch {
      setMessage('No se pudo iniciar la instalación. Probá desde el menú de tu navegador.');
    } finally {
      setBusy(false);
    }
  };

  return <>
    <button ref={triggerRef} type="button" className="action-btn application-menu-trigger" aria-label="Menú de aplicación" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><Smartphone size={20} /><span>Aplicación</span></button>
    <dialog ref={dialogRef} className="application-menu-dialog" aria-labelledby="application-menu-title" onCancel={close} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="application-menu-content">
        <div className="application-menu-heading"><div><p>Candela Joyas</p><h2 id="application-menu-title">Aplicación</h2></div><button type="button" className="application-menu-close" aria-label="Cerrar menú de aplicación" onClick={close}><X size={22} /></button></div>
        <nav className="application-menu-links" aria-label="Navegación de la aplicación">
          <Link replace to="/" onClick={close}><House size={18} />Ir al catálogo</Link>
          <Link replace to="/mi-cuenta" onClick={close}><User size={18} />Mi cuenta</Link>
          <Link replace to="/como-comprar" onClick={close}><CircleHelp size={18} />Cómo comprar</Link>
        </nav>
        <section className="application-install-card" aria-labelledby="application-install-title">
          <span className="application-install-icon">{status === 'installed' ? <CheckCircle size={26} /> : <Download size={26} />}</span>
          <h3 id="application-install-title">{status === 'installed' ? 'Ya estás usando la aplicación' : 'Tu tienda, a un toque'}</h3>
          <p>{status === 'installed' ? 'Navegá usando los botones de la tienda.' : 'Instalá Candela Joyas en tu celular o PC y abrila desde su propio icono.'}</p>
          {status === 'available' && <button type="button" className="btn btn-primary" onClick={install} disabled={busy}><Download size={18} />{busy ? 'Preparando…' : 'Instalar aplicación'}</button>}
          {status === 'manual' && <div className="application-install-help">
            <h4>Cómo instalar la aplicación</h4>
            {isIos ? <ol><li>Abrí esta tienda en Safari.</li><li>Tocá Compartir y elegí “Agregar a inicio”.</li><li>Si aparece “Abrir como app”, activalo y tocá “Agregar”.</li></ol> : <><p>Si tu navegador ofrece la opción de instalación:</p><ol><li>Abrí el menú de Chrome o Edge.</li><li>Elegí “Instalar aplicación” o “Agregar a la pantalla principal”. En PC también puede aparecer un icono de instalación en la barra de direcciones.</li><li>Confirmá la instalación.</li></ol><p>Si no aparece, abrí la tienda en Chrome o Edge y volvé a intentarlo.</p></>}
          </div>}
          {message && status !== 'installed' && <p className="application-install-message" role="status">{message}</p>}
        </section>
      </div>
    </dialog>
  </>;
}
