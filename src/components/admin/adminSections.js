import { Package, ShoppingBag, Truck, BarChart3, Tag, Settings, MessageSquare, Megaphone, Share2, Users, User, BookOpen, LogOut, ArrowUpRight } from 'lucide-react';

export const groups = [
  { label: 'Operación', items: [
    { id: 'sales', label: 'Ventas', icon: ShoppingBag, description: 'Consultá los pedidos y gestioná el estado de cada venta.' },
    { id: 'envios', label: 'Envíos', icon: Truck, description: 'Organizá las entregas y el seguimiento de tus pedidos.' },
    { id: 'metrics', label: 'Métricas', icon: BarChart3, description: 'Revisá los resultados y la evolución de tu tienda.' },
  ] },
  { label: 'Catálogo', items: [
    { id: 'products', label: 'Productos', icon: Package, description: 'Administrá tus productos, precios y disponibilidad.' },
    { id: 'categories', label: 'Categorías', icon: Tag, description: 'Ordená el catálogo para que tus clientes encuentren lo que buscan.' },
  ] },
  { label: 'Comunicación', items: [
    { id: 'marketing', label: 'Marketing', icon: Megaphone, description: 'Creá material para promocionar tus productos.' },
    { id: 'social', label: 'Redes sociales', icon: Share2, description: 'Prepará y publicá contenido para tus redes sociales.' },
    { id: 'faqs', label: 'Preguntas frecuentes', icon: MessageSquare, description: 'Respondé las consultas más habituales de tus clientes.' },
  ] },
  { label: 'Administración', items: [
    { id: 'settings', label: 'Configuración', icon: Settings, description: 'Personalizá tu tienda y configurá las opciones de compra.' },
    { id: 'users', label: 'Usuarios', icon: Users, description: 'Administrá los usuarios y sus permisos de acceso.' },
    { id: 'myaccount', label: 'Mi cuenta', icon: User, description: 'Gestioná tu acceso, seguridad y notificaciones.' },
  ] },
];

export function getAdminSection(id) {
  return groups.flatMap(group => group.items).find(item => item.id === id) || groups[1].items[0];
}

