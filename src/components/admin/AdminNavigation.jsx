import { createElement } from 'react';
import { ShoppingBag, BookOpen, LogOut, ArrowUpRight } from 'lucide-react';
import { groups } from './adminSections';

export default function AdminNavigation({ activeTab, onSelect, isAdmin, onGuide, onLogout, onStore }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand"><span className="admin-brand-icon"><ShoppingBag size={22} /></span><div><strong>Administración</strong><small>Tu tienda, en orden</small></div></div>
      <nav aria-label="Secciones de administración" className="admin-navigation">
        {groups.map(group => {
          const items = group.items.filter(item => isAdmin || item.id === 'myaccount');
          if (!items.length) return null;
          return <div className="admin-nav-group" key={group.label}>
            <p className="admin-nav-label">{group.label}</p>
            {items.map(({ id, label, icon }) => <button key={id} type="button" className={`admin-nav-item ${activeTab === id ? 'is-active' : ''}`} aria-current={activeTab === id ? 'page' : undefined} onClick={() => onSelect(id)}>{createElement(icon, { size: 18 })}<span>{label}</span></button>)}
          </div>;
        })}
      </nav>
      <div className="admin-sidebar-footer">
        <button type="button" className="admin-nav-item" onClick={onStore}><ArrowUpRight size={18} />Ver tienda</button>
        <button type="button" className="admin-nav-item" onClick={onGuide}><BookOpen size={18} />Guía de ayuda</button>
        <button type="button" className="admin-nav-item admin-nav-logout" onClick={onLogout}><LogOut size={18} />Cerrar sesión</button>
      </div>
    </aside>
  );
}
