import { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { SettingsContext } from '../contexts/SettingsContext';
import { supabase } from '../services/supabase';
import { uploadFile, isStorageUrl, deleteFileByUrl } from '../services/storage';
import toast from 'react-hot-toast';
import { Edit2, Trash2, Image as ImageIcon, UploadCloud, Settings, Package, Palette, Type, User, Video, Layout, Link, MessageSquare, ShoppingBag, Calendar, Phone, Users, Key, Lock, LogOut, ClipboardCheck, ChevronDown, Filter, Megaphone, RotateCcw, Bell, Tag, Share2, BookOpen, Star, X, CreditCard, AlertTriangle, GalleryHorizontal, Truck, Wrench } from 'lucide-react';
import { useMaintenanceStatus } from '../hooks/useMaintenanceStatus';
import { registerPush, unregisterPush } from '../services/pushNotifications';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import SalesTab from './SalesTab';
import EnviosTab from './EnviosTab';
import UsersTab from './UsersTab';
import AdminFaqs from '../components/admin/AdminFaqs';
import CategoryManager from '../components/admin/CategoryManager';
import MarketingTool from '../components/admin/MarketingTool';
import SocialPublisher from '../components/admin/SocialPublisher';
import MercadoPagoConfig from '../components/admin/MercadoPagoConfig';
import './AdminDashboard.css';

// Helper para procesar imágenes en el cliente antes de subir
const processImage = (file, maxWidth, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Solo redimensionar si es más ancha que el máximo
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Calidad de dibujo alta
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            reject(new Error('Canvas to Blob failed'));
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { currentUser, userRole, userData, updateUserData, login, logout, changePassword } = useContext(AuthContext);
  const { products, loading: productsLoading } = useProducts();
  const { categories, loading: categoriesLoading } = useCategories();
  const { settings, updateSettings } = useContext(SettingsContext);
  
  const [activeTab, setActiveTab] = useState('products'); // 'products' or 'settings'
  const [activeSettingsTab, setActiveSettingsTab] = useState('identity'); // 'identity', 'hero', 'marquee', 'videos', 'sidebar', 'checkout', 'footer', 'about'
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['products', 'sales', 'settings', 'myaccount', 'users', 'faqs', 'categories', 'marketing'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);

  const [adminCategoryFilter, setAdminCategoryFilter] = useState('All');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // Admin Form Control State
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Data State
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    imageUrl: '', // Keep for compatibility with existing products
    images: [], // Array of {url: string, isMain: boolean}
    description: '',
    colors: '',
    sizes: '',
    isOnSale: false,
    isPaused: false,
    isHidden: false,
    oldPrice: '',
    newPrice: '',
    discountPercentage: 0,
    videoUrl: '',
    stock: {} // Object mapping sizes to quantities: { "S": 10, "M": 5 }
  });
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [imageFiles, setImageFiles] = useState([]); // Array of File objects
  const [deletedImages, setDeletedImages] = useState([]); // Array of URLs to delete from Storage on save
  const [isUploading, setIsUploading] = useState(false);
  
  // Product Sub-tabs: 'list' or 'edit'
  const [productView, setProductView] = useState('list');

  // Bulk Price Update State
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [bulkPricePercentage, setBulkPricePercentage] = useState('');
  const [bulkPriceAction, setBulkPriceAction] = useState('increase'); // 'increase' or 'decrease'

  // Settings State
  const [siteSettings, setSiteSettings] = useState({
    siteTitle: '',
    primaryColor: '',
    secondaryColor: '',
    logoUrl: '',
    logoShape: 'normal',
    pageHeaderGradientStart: '#D4A373',
    pageHeaderGradientEnd: '#FAEDCD',
    pageHeaderHeight: '220',
    pageHeaderTitleColor: '#ffffff',
    pageHeaderSubtitleColor: '#ffffff',
    showAbout: true,
    aboutTitle: '',
    aboutText: '',
    showContactForm: true,
    catalogTitle: 'Catálogo',
    showVideoSlider: false,
    videoUrls: [],
    showSidebarCarousel: false,
    sidebarCarouselImages: [],
    sidebarCarouselHeight: '220',
    sidebarCarouselIntervalSeconds: '4.5',
    enableWhatsApp: true, // Default enabled
    enableMercadoPago: false, // Default disabled
    checkoutRequireName: true,
    checkoutRequirePhone: true,
    checkoutRequireName: true,
    checkoutRequirePhone: true,
    showMarquee: true,
    marqueeText: '',
    marqueeBgColor: '#A08264',
    marqueeTextColor: '#ffffff',
    marqueeFontSize: '0.85',
    marqueeHeight: '36',
    maintenanceMode: false,
    maintenanceTitle: 'Sitio en Mantenimiento',
    maintenanceMessage: '',
    maintenanceEndsAt: '',
    maintenanceAutoDisable: true,
    maintenanceBackgroundImage: '',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [maintenanceBgFile, setMaintenanceBgFile] = useState(null);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [isSidebarImageUploading, setIsSidebarImageUploading] = useState(false);

  const handleFaviconChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Definir tamaño uniforme (cuadrado) para el recorte
          const size = Math.min(img.width, img.height);
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          
          // Limpiar canvas con transparencia
          ctx.clearRect(0, 0, size, size);
          
          // Crear máscara circular
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          
          // Dibujar la imagen centrada dentro del círculo
          ctx.drawImage(
            img, 
            (img.width - size) / 2, (img.height - size) / 2, size, size, 
            0, 0, size, size
          );
          
          // Convertir a Blob (formato PNG para soportar transparencia)
          canvas.toBlob((blob) => {
            const circularFile = new File([blob], 'favicon_circular.png', { type: 'image/png' });
            setFaviconFile(circularFile);
            toast.success("Foto recortada en círculo automáticamente");
          }, 'image/png');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    document.title = 'Panel de Administración | Candela Joyas';
  }, []);

  useEffect(() => {
    if (settings) {
      const normalizedSettings = { ...settings };
      if (typeof normalizedSettings.videoUrls === 'string') {
        normalizedSettings.videoUrls = normalizedSettings.videoUrls.split('\n').map(u => u.trim()).filter(Boolean);
      }
      if (!normalizedSettings.videoUrls) {
        normalizedSettings.videoUrls = [];
      }
      if (!normalizedSettings.sidebarCarouselImages) {
        normalizedSettings.sidebarCarouselImages = [];
      }
      setSiteSettings(normalizedSettings);
    }
  }, [settings]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoginLoading(true);
    try {
      await login(email, password);
      toast.success('Sesión iniciada correctamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al iniciar sesión. Revisa tus credenciales.');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: val };
      
      // Si cambia el precio normal (cuando no está en oferta)
      if (name === 'price' && !newData.isOnSale) {
        newData.newPrice = val;
      }
      
      // Si cambia el precio anterior o nuevo precio en oferta
      if (name === 'oldPrice' || name === 'newPrice') {
        const oldP = name === 'oldPrice' ? Number(val) : Number(newData.oldPrice);
        const newP = name === 'newPrice' ? Number(val) : Number(newData.newPrice);
        
        if (oldP > 0 && newP > 0) {
          newData.discountPercentage = Math.round(((oldP - newP) / oldP) * 100);
          newData.price = newP; // El precio actual pasa a ser el precio con descuento
        }
      }
      
      return newData;
    });
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
        toast.error('Por favor, selecciona un archivo de video válido (mp4, webm, etc).');
        return;
    }

    // Limite de 30MB para evitar fallos de timeout o cuotas
    if (file.size > 30 * 1024 * 1024) {
        toast.error('El video es muy pesado. El límite es 30MB.');
        return;
    }

    setIsVideoUploading(true);
    try {
        // Usamos la carpeta 'settings' que suele tener permisos de escritura ya configurados
        const url = await uploadFile('settings', `video_${Date.now()}_${file.name}`, file);

        setSiteSettings(prev => ({
            ...prev,
            videoUrls: [...(prev.videoUrls || []), url]
        }));
        toast.success('Video subido exitosamente.');
    } catch (error) {
        console.error("Error de subida:", error);
        toast.error('Error: Fallo la conexión, no tenés permisos o el archivo es incompatible.');
    } finally {
        setIsVideoUploading(false);
    }
  };

  const handleVideoRemove = async (index) => {
    const urlToRemove = siteSettings.videoUrls[index];

    // Intentar eliminar de Storage si es un link propio
    if (urlToRemove && isStorageUrl(urlToRemove)) {
      try {
        await deleteFileByUrl(urlToRemove);
      } catch (error) {
        console.warn("No se pudo eliminar el archivo de Storage (tal vez ya no existe o es externo):", error);
      }
    }

    setSiteSettings(prev => {
        const newUrls = [...(prev.videoUrls || [])];
        newUrls.splice(index, 1);
        return { ...prev, videoUrls: newUrls };
    });
    toast.success('Video removido. Recordá "Guardar Cambios" para confirmar.');
  };

  const handleSidebarImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsSidebarImageUploading(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const timestamp = Date.now();
        const fileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const url = await uploadFile('settings', `sidebar_${timestamp}_${fileName}`, file);

        setSiteSettings(prev => ({
          ...prev,
          sidebarCarouselImages: [...(prev.sidebarCarouselImages || []), { url, linkUrl: '' }]
        }));
      }
      toast.success('Imagen(es) subida(s) exitosamente.');
    } catch (error) {
      console.error('Error de subida:', error);
      toast.error('Error: Fallo la conexión, no tenés permisos o el archivo es incompatible.');
    } finally {
      setIsSidebarImageUploading(false);
    }
  };

  const handleSidebarImageRemove = async (index) => {
    const image = siteSettings.sidebarCarouselImages[index];

    if (image?.url && isStorageUrl(image.url)) {
      try {
        await deleteFileByUrl(image.url);
      } catch (error) {
        console.warn('No se pudo eliminar el archivo de Storage (tal vez ya no existe o es externo):', error);
      }
    }

    setSiteSettings(prev => {
      const newImages = [...(prev.sidebarCarouselImages || [])];
      newImages.splice(index, 1);
      return { ...prev, sidebarCarouselImages: newImages };
    });
    toast.success('Imagen removida. Recordá "Guardar Cambios" para confirmar.');
  };

  const handleSidebarImageLinkChange = (index, linkUrl) => {
    setSiteSettings(prev => {
      const newImages = [...(prev.sidebarCarouselImages || [])];
      newImages[index] = { ...newImages[index], linkUrl };
      return { ...prev, sidebarCarouselImages: newImages };
    });
  };

  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setSiteSettings(prev => ({ ...prev, [name]: val }));
  };

  // Convierte un ISO string (UTC) al formato que espera <input type="datetime-local">
  const isoToLocalInput = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  const handleMaintenanceEndsAtChange = (e) => {
    const localValue = e.target.value;
    const iso = localValue ? new Date(localValue).toISOString() : '';
    setSiteSettings(prev => ({ ...prev, maintenanceEndsAt: iso }));
  };

  const handleMaintenanceBgChange = (e) => {
    if (e.target.files[0]) {
      setMaintenanceBgFile(e.target.files[0]);
    }
  };

  const handleRemoveMaintenanceBg = async () => {
    if (siteSettings.maintenanceBackgroundImage && isStorageUrl(siteSettings.maintenanceBackgroundImage)) {
      try {
        await deleteFileByUrl(siteSettings.maintenanceBackgroundImage);
      } catch (error) {
        console.warn('No se pudo eliminar la imagen de fondo del Storage:', error);
      }
    }
    setMaintenanceBgFile(null);
    setSiteSettings(prev => ({ ...prev, maintenanceBackgroundImage: '' }));
    toast.success('Imagen de fondo removida. Recordá "Guardar Cambios" para confirmar.');
  };

  const maintenanceStatus = useMaintenanceStatus(settings);

  const handleImageChange = (e) => {
    if (e.target.files.length > 0) {
      const files = Array.from(e.target.files).map(file => ({
        file: file,
        id: Math.random().toString(36).substr(2, 9), // ID temporal para el preview
        isMain: false,
        preview: URL.createObjectURL(file),
        color: '' // Asociar color opcionalmente
      }));
      setImageFiles(prev => [...prev, ...files]);
    }
  };

  const handleSetImageColor = (index, color, isExisting = true) => {
    if (isExisting) {
      setFormData(prev => ({
        ...prev,
        images: prev.images.map((img, i) => i === index ? { ...img, color } : img)
      }));
    } else {
      setImageFiles(prev => prev.map((item, i) => i === index ? { ...item, color } : item));
    }
  };

  const handleRemoveNewImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (index) => {
    const urlToRemove = formData.images[index]?.url;
    if (urlToRemove && isStorageUrl(urlToRemove)) {
      setDeletedImages(prev => [...prev, urlToRemove]);
    }

    setFormData(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      // If we removed the main image, set the first one as main if exists
      if (prev.images[index]?.isMain && newImages.length > 0) {
        newImages[0].isMain = true;
      }
      return { ...prev, images: newImages };
    });
  };

  const handleSetMainProductImage = (index, isExisting = true) => {
    // Si marcamos una como principal, debemos desmarcar TODAS las demás (existentes y nuevas)
    if (isExisting) {
      setFormData(prev => ({
        ...prev,
        images: prev.images.map((img, i) => ({ ...img, isMain: i === index }))
      }));
      setImageFiles(prev => prev.map(item => ({ ...item, isMain: false })));
    } else {
      setImageFiles(prev => prev.map((item, i) => ({ ...item, isMain: i === index })));
      setFormData(prev => ({
        ...prev,
        images: prev.images.map(img => ({ ...img, isMain: false }))
      }));
    }
  };

  const handleLogoChange = (e) => {
    if (e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const allExistingCategories = categories.map(cat => cat.name).sort();

  const resetForm = () => {
    setFormData({ 
      name: '', 
      price: '', 
      category: '', 
      imageUrl: '', 
      images: [],
      description: '', 
      colors: '', 
      sizes: '',
      isOnSale: false,
      isPaused: false,
      isHidden: false,
      oldPrice: '',
      newPrice: '',
      discountPercentage: 0,
      videoUrl: '',
      stock: {}
    });
    setImageFiles([]);
    setDeletedImages([]);
    setShowNewCategoryInput(false);
    setNewCategoryName('');
    setIsEditing(false);
    setCurrentId(null);
    setProductView('list');
  };

  const handleEdit = (product) => {
    setIsEditing(true);
    setCurrentId(product.id);
    setFormData({
      name: product.name,
      price: product.price,
      category: product.category || '',
      imageUrl: product.imageUrl || '',
      images: product.images || (product.imageUrl ? [{ url: product.imageUrl, isMain: true }] : []),
      description: product.description || '',
      colors: product.colors?.join(', ') || '',
      sizes: product.sizes?.join(', ') || '',
      isOnSale: product.isOnSale || false,
      isPaused: product.isPaused || false,
      isHidden: product.isHidden || false,
      oldPrice: product.oldPrice || '',
      newPrice: product.newPrice || '',
      discountPercentage: product.discountPercentage || 0,
      videoUrl: product.videoUrl || '',
      stock: product.stock || {}
    });
    // Check if category exists or needs new input
    if (product.category && !allExistingCategories.includes(product.category)) {
      setShowNewCategoryInput(true);
      setNewCategoryName(product.category);
    } else {
      setShowNewCategoryInput(false);
    }
    setProductView('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este producto permanentemente? Esta acción también borrará sus imágenes del servidor.")) {
      try {
        // Find the product first to get all image URLs
        const productToDelete = products.find(p => p.id === id);
        
        if (productToDelete && productToDelete.images && productToDelete.images.length > 0) {
          // Delete all images associated with this product from Storage
          const deletePromises = productToDelete.images.map(async (img) => {
              if (img.url && isStorageUrl(img.url)) {
                await deleteFileByUrl(img.url);
              }
              if (img.thumbnailUrl && isStorageUrl(img.thumbnailUrl)) {
                await deleteFileByUrl(img.thumbnailUrl);
              }
          });
          await Promise.all(deletePromises);
        } else if (productToDelete && productToDelete.imageUrl) {
          // Fallback for older products with only imageUrl
          if (isStorageUrl(productToDelete.imageUrl)) {
            await deleteFileByUrl(productToDelete.imageUrl);
          }
        }

        const { error: deleteError } = await supabase.from('products').delete().eq('id', id);
        if (deleteError) throw deleteError;
        toast.success("Producto e imágenes eliminados correctamente");
      } catch(e) {
        console.error(e);
        toast.error("Error eliminando producto");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const uploadedImages = [];

    try {
      if (imageFiles.length > 0) {
        setIsUploading(true);
        for (const item of imageFiles) {
          const timestamp = Date.now();
          const fileName = item.file.name.replace(/[^a-zA-Z0-9.]/g, '_');

          // 1. Generar y subir versión OPTIMIZADA (para el detalle, max 1200px)
          const optimizedFile = await processImage(item.file, 1200, 0.8);
          const url = await uploadFile('products', `${timestamp}_${fileName}`, optimizedFile);

          // 2. Generar y subir MINIATURA (para el catálogo, max 400px)
          const thumbFile = await processImage(item.file, 400, 0.75);
          const thumbnailUrl = await uploadFile('products', `thumb_${timestamp}_${fileName}`, thumbFile);

          uploadedImages.push({ url, thumbnailUrl, isMain: item.isMain });
        }
        setIsUploading(false);
      }

      // Filtrar las imágenes existentes que NO fueron borradas para combinarlas con las nuevas
      const remainingExisting = (formData.images || []).filter(img => !deletedImages.includes(img.url));
      
      const newProcessedImages = uploadedImages.map((img, idx) => {
        // Encontrar el item original en imageFiles para recuperar el color asignado
        const originalFileItem = imageFiles[idx];
        return {
          ...img,
          color: originalFileItem?.color || ''
        };
      });

      const allImages = [...remainingExisting, ...newProcessedImages];
      
      // Asegurar que haya al menos una imagen principal
      if (allImages.length > 0 && !allImages.some(img => img.isMain)) {
        allImages[0].isMain = true;
      }

      const mainImage = allImages.find(img => img.isMain) || allImages[0];
      const finalImageUrl = mainImage ? mainImage.url : '';

      let finalCategory = showNewCategoryInput ? newCategoryName.trim() : formData.category;

      // Si es una categoría nueva, agregarla a la colección de categorías también (en settings)
      if (showNewCategoryInput && finalCategory) {
        const categoryExists = categories.some(cat => cat.name.toLowerCase() === finalCategory.toLowerCase());
        if (!categoryExists) {
          const newCategory = {
            id: Math.random().toString(36).substr(2, 9),
            name: finalCategory
          };
          const { data: row, error: readError } = await supabase.from('site_settings').select('data').eq('id', 1).single();
          if (readError) {
            console.error("Error leyendo site_settings para agregar categoría:", readError);
            toast.error(`No se pudo crear la categoría "${finalCategory}" (error al leer configuración). El producto se guardará con esa categoría de todos modos.`);
          } else {
            const { error: updateError } = await supabase.from('site_settings').update({
              data: { ...row.data, categories: [...(row.data?.categories || []), newCategory] },
              updated_at: new Date().toISOString(),
            }).eq('id', 1);
            if (updateError) {
              console.error("Error guardando nueva categoría en settings:", updateError);
              toast.error(`No se pudo crear la categoría "${finalCategory}" en el listado global. El producto se guardará con esa categoría de todos modos.`);
            }
          }
        }
      }

      // Limpiar stock obsoleto (ej: si cambió de talle único a talles específicos o agregó colores)
      const currentSizes = formData.sizes ? formData.sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
      const currentColors = formData.colors ? formData.colors.split(',').map(c => c.trim()).filter(Boolean) : [];
      const cleanedStock = {};
      
      if (formData.stock) {
        currentSizes.forEach(size => {
          if (currentColors.length === 0) {
            // Solo talle
            if (formData.stock[size] !== undefined) {
              cleanedStock[size] = formData.stock[size];
            }
          } else {
            // Talle + Color
            currentColors.forEach(color => {
              const key = `${size}_${color}`;
              if (formData.stock[key] !== undefined) {
                cleanedStock[key] = formData.stock[key];
              }
            });
          }
        });
      }

      // Preparar y normalizar los datos (mapeados a las columnas de la tabla products)
      const formattedData = {
        name: formData.name,
        category: finalCategory,
        image_url: finalImageUrl,
        images: allImages,
        description: formData.description,
        is_on_sale: formData.isOnSale,
        is_paused: formData.isPaused,
        is_hidden: formData.isHidden,
        video_url: formData.videoUrl,
        price: Number(formData.price),
        old_price: formData.isOnSale ? Number(formData.oldPrice) : null,
        new_price: formData.isOnSale ? Number(formData.newPrice) : null,
        discount_percentage: formData.isOnSale ? Number(formData.discountPercentage) : 0,
        colors: currentColors,
        sizes: currentSizes,
        stock: cleanedStock,
        updated_at: new Date().toISOString(),
      };
      if (isEditing) {
        // ACTUALIZACIÓN: Limpiar imágenes borradas de Storage
        if (deletedImages.length > 0) {
          const cleanupPromises = deletedImages.map((url) => deleteFileByUrl(url));
          await Promise.all(cleanupPromises);
        }

        // Actualizar en la base de datos
        const { error } = await supabase.from('products').update(formattedData).eq('id', currentId);
        if (error) throw error;
        toast.success("Producto actualizado correctamente");
      } else {
        // Nuevo producto
        const { error } = await supabase.from('products').insert(formattedData);
        if (error) throw error;
        toast.success("¡Producto agregado a tu tienda!");
      }
      resetForm();
    } catch (e) {
      console.error("Error completo:", e);
      toast.error("Hubo un error al guardar. Revisa la consola o asegúrate de que Storage esté habilitado.");
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalLogoUrl = siteSettings.logoUrl;
      if (logoFile) {
        finalLogoUrl = await uploadFile('settings', `logo_${Date.now()}`, logoFile);
      }

      let finalFaviconUrl = siteSettings.faviconUrl;
      if (faviconFile) {
        finalFaviconUrl = await uploadFile('settings', `favicon_${Date.now()}`, faviconFile);
      }

      let finalMaintenanceBgUrl = siteSettings.maintenanceBackgroundImage;
      if (maintenanceBgFile) {
        finalMaintenanceBgUrl = await uploadFile('settings', `maintenance_bg_${Date.now()}`, maintenanceBgFile);
      }

      await updateSettings({ ...siteSettings, logoUrl: finalLogoUrl, faviconUrl: finalFaviconUrl, maintenanceBackgroundImage: finalMaintenanceBgUrl });
      setLogoFile(null);
      setFaviconFile(null);
      setMaintenanceBgFile(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetColors = () => {
    setSiteSettings(prev => ({
      ...prev,
      primaryColor: '#D4A373',
      secondaryColor: '#FAEDCD'
    }));
    toast.success('Colores restablecidos a los valores por defecto');
  };


  const handleBulkPriceUpdate = async (e) => {
    e.preventDefault();
    if (!bulkPricePercentage || isNaN(bulkPricePercentage) || Number(bulkPricePercentage) <= 0) {
      toast.error('Ingresa un porcentaje válido mayor a 0');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que quieres ${bulkPriceAction === 'increase' ? 'aumentar' : 'reducir'} los precios un ${bulkPricePercentage}%? Esto afectará a todos los productos y no se puede deshacer fácilmente.`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const percentage = Number(bulkPricePercentage) / 100;
      const factor = bulkPriceAction === 'increase' ? (1 + percentage) : (1 - percentage);

      const updatePromises = products.map(product => {
        const currentPrice = Number(product.price || 0);
        let newPrice = Math.round(currentPrice * factor);

        let updates = { price: newPrice };
        if (product.isOnSale) {
           const currentOldPrice = Number(product.oldPrice || 0);
           updates.old_price = Math.round(currentOldPrice * factor);
           updates.new_price = newPrice;
        } else {
           updates.new_price = newPrice;
        }

        return supabase.from('products').update(updates).eq('id', product.id);
      });

      await Promise.all(updatePromises);
      
      toast.success(`Precios actualizados correctamente para ${products.length} productos.`);
      setShowBulkPriceModal(false);
      setBulkPricePercentage('');
    } catch (error) {
      console.error('Error al actualizar precios en lote:', error);
      toast.error('Hubo un error al actualizar los precios.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="admin-login-container animate-fade-in">
        <div className="admin-login-box">
          <h2>Acceso Administrador</h2>
          <p>Ingresa tus credenciales para administrar el catálogo.</p>
          <form onSubmit={handleLogin} className="login-form">
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
            <button type="submit" className="btn btn-primary" disabled={isLoginLoading}>
              {isLoginLoading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container admin-dashboard animate-fade-in">
      <div className="admin-header">
        <h1>Panel de Administración</h1>
        <p>Gestiona los productos y la apariencia de tu tienda.</p>
      </div>

      <div className="admin-tabs">
        {userRole === 'admin' && (
          <>
            <button 
              className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              <Package size={20} /> Productos
            </button>
            <button
              className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
              onClick={() => setActiveTab('sales')}
            >
              <ShoppingBag size={20} /> Ventas
            </button>
            <button
              className={`tab-btn ${activeTab === 'envios' ? 'active' : ''}`}
              onClick={() => setActiveTab('envios')}
            >
              <Truck size={20} /> Envíos
            </button>
            <button
              className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={20} /> Configuración
            </button>
            <button 
              className={`tab-btn ${activeTab === 'faqs' ? 'active' : ''}`}
              onClick={() => setActiveTab('faqs')}
            >
              <MessageSquare size={20} /> FAQs
            </button>
            <button 
              className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
              onClick={() => setActiveTab('categories')}
            >
              <Tag size={20} /> Categorías
            </button>
            <button
              className={`tab-btn ${activeTab === 'marketing' ? 'active' : ''}`}
              onClick={() => setActiveTab('marketing')}
            >
              <Share2 size={20} /> Marketing
            </button>
            <button
              className={`tab-btn ${activeTab === 'social' ? 'active' : ''}`}
              onClick={() => setActiveTab('social')}
            >
              <Share2 size={20} /> Redes Sociales
            </button>
          </>
        )}
        <button 
          className={`tab-btn ${activeTab === 'myaccount' ? 'active' : ''}`}
          onClick={() => setActiveTab('myaccount')}
        >
          <User size={20} /> Mi Cuenta
        </button>
        {userRole === 'admin' && (
          <button 
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={20} /> Usuarios
          </button>
        )}
        <button 
          className="tab-btn"
          onClick={() => navigate('/admin/guia')}
          style={{ color: 'var(--primary-color)' }}
        >
          <BookOpen size={20} /> Guía
        </button>
        <button 
          className="tab-btn logout-btn"
          onClick={logout}
          style={{ marginLeft: 'auto', color: '#dc2626' }}
        >
          <LogOut size={20} /> Salir
        </button>
      </div>
      
      {activeTab === 'sales' && userRole === 'admin' && (
        <SalesTab />
      )}

      {activeTab === 'envios' && userRole === 'admin' && (
        <EnviosTab />
      )}

      {activeTab === 'users' && userRole === 'admin' && (
        <UsersTab />
      )}
      {activeTab === 'faqs' && userRole === 'admin' && (
        <AdminFaqs />
      )}
      {activeTab === 'marketing' && userRole === 'admin' && (
        <div className="admin-form-panel glass animate-fade-in">
          <MarketingTool products={products} />
        </div>
      )}
      {activeTab === 'social' && userRole === 'admin' && (
        <div className="admin-form-panel glass animate-fade-in">
          <SocialPublisher products={products} />
        </div>
      )}
      {activeTab === 'categories' && userRole === 'admin' && (
        <div className="admin-form-panel glass animate-fade-in">
          <CategoryManager />
        </div>
      )}

      {activeTab === 'myaccount' && (
        <div className="admin-form-panel glass animate-fade-in" style={{ maxWidth: '600px', margin: '2rem auto' }}>
          <h3><User size={20} /> Mi Cuenta</h3>
          <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>Gestiona tu información de acceso y seguridad.</p>
          
          <div className="settings-section">
            <h4>Seguridad</h4>
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input type="text" value={currentUser.email} disabled style={{ backgroundColor: '#f5f5f5' }} />
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const newPass = e.target.newPassword.value;
              const confirmPass = e.target.confirmPassword.value;
              
              if (!newPass || newPass.length < 6) {
                toast.error("La contraseña debe tener al menos 6 caracteres");
                return;
              }
              
              if (newPass !== confirmPass) {
                toast.error("Las contraseñas no coinciden");
                return;
              }
              
              try {
                await changePassword(newPass);
                e.target.reset();
              } catch (err) {
                // Error already handled in context toast
              }
            }}>
              <div className="form-group">
                <label>Nueva Contraseña</label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input name="newPassword" type="password" placeholder="Tu nueva clave" required />
                </div>
              </div>
              <div className="form-group">
                <label>Repetir Nueva Contraseña</label>
                <div className="input-with-icon">
                   <Lock size={18} className="input-icon" />
                   <input name="confirmPassword" type="password" placeholder="Repetí tu nueva clave" required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                <Key size={18} /> Actualizar Contraseña
              </button>
            </form>
          </div>

          <div className="settings-section" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #eee' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <Bell size={20} style={{ color: 'var(--color-primary)' }} />
              <h4 style={{ margin: 0 }}>Notificaciones Push</h4>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Recibe avisos en tu teléfono cada vez que se realice una nueva venta.
            </p>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '1rem',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div>
                <span style={{ fontWeight: '600', display: 'block' }}>Alertas de Ventas</span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {userData?.push_enabled ? 'Activado' : 'Desactivado'}
                </span>
              </div>
              <button
                onClick={async () => {
                  const newState = !userData?.push_enabled;
                  try {
                    if (newState) {
                      await registerPush(currentUser.id);
                      await updateUserData({ push_enabled: true });
                      toast.success("Notificaciones activadas");
                    } else {
                      await unregisterPush(currentUser.id);
                      await updateUserData({ push_enabled: false });
                      toast.success("Notificaciones desactivadas");
                    }
                  } catch (err) {
                    console.error(err);
                    toast.error("Error al configurar notificaciones");
                  }
                }}
                className={`btn ${userData?.push_enabled ? 'btn-danger' : 'btn-primary'}`}
                style={{ minWidth: '120px' }}
              >
                {userData?.push_enabled ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && userRole === 'admin' && (
        <div className="admin-products-container animate-fade-in">
          <div className="product-management-tabs">
            <button 
              className={`p-tab-btn ${productView === 'list' ? 'active' : ''}`}
              onClick={() => {
                setProductView('list');
                if (isEditing) resetForm();
              }}
            >
              <Package size={18} /> Ver Productos
            </button>
            <button 
              className={`p-tab-btn ${productView === 'edit' ? 'active' : ''}`}
              onClick={() => setProductView('edit')}
            >
              <UploadCloud size={18} /> {isEditing ? 'Editando Producto' : 'Nuevo Producto'}
            </button>
            
            {settings.enableStockManagement && (
              <button 
                className={`p-tab-btn ${productView === 'stock-alerts' ? 'active' : ''}`}
                onClick={() => setProductView('stock-alerts')}
                style={{ position: 'relative' }}
              >
                <AlertTriangle size={18} /> Alertas de Stock
                {products.some(p => p.stock && Object.values(p.stock).some(v => v <= (settings.lowStockThreshold || 5))) && (
                  <span style={{ position: 'absolute', top: '-5px', right: '-5px', width: '10px', height: '10px', background: '#dc2626', borderRadius: '50%', border: '2px solid white' }}></span>
                )}
              </button>
            )}
          </div>

          <div className="admin-single-column">
            {/* Formulario (Nuevo/Editar) */}
            {productView === 'edit' && (
              <div className="admin-form-panel glass full-width animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ margin: 0 }}>{isEditing ? 'Editar Producto' : 'Crear Nuevo Producto'}</h3>
                  <button type="button" onClick={() => setProductView('list')} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                    Volver a la lista
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="product-form">
                  <div className="form-group">
                    <label>Nombre del Producto *</label>
                    <input name="name" value={formData.name} onChange={handleInputChange} required />
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>¿Está en Oferta?</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                        <input 
                          type="checkbox" 
                          name="isOnSale" 
                          checked={formData.isOnSale} 
                          onChange={handleInputChange}
                          style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <span>Activar oferta</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Pausar / Ocultar</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input 
                            type="checkbox" 
                            name="isPaused" 
                            checked={formData.isPaused} 
                            onChange={handleInputChange}
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                          />
                          <span style={{ color: formData.isPaused ? '#dc2626' : 'inherit', fontWeight: formData.isPaused ? 'bold' : 'normal', fontSize: '0.9rem' }}>
                            Sin Stock (Pausado)
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input 
                            type="checkbox" 
                            name="isHidden" 
                            checked={formData.isHidden} 
                            onChange={handleInputChange}
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                          />
                          <span style={{ color: formData.isHidden ? '#6b7280' : 'inherit', fontWeight: formData.isHidden ? 'bold' : 'normal', fontSize: '0.9rem' }}>
                            Ocultar del Catálogo
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {formData.isOnSale ? (
                    <div className="form-row animate-fade-in" style={{ background: '#fef2f2', padding: '1rem', borderRadius: '8px', border: '1px solid #fee2e2', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label>Precio Anterior (ARS)</label>
                        <input type="number" name="oldPrice" value={formData.oldPrice} onChange={handleInputChange} required={formData.isOnSale} />
                      </div>
                      <div className="form-group">
                        <label>Precio Oferta (ARS)</label>
                        <input type="number" name="newPrice" value={formData.newPrice} onChange={handleInputChange} required={formData.isOnSale} />
                      </div>
                      <div className="form-group" style={{ display: 'flex', flexFlow: 'column', justifyContent: 'center' }}>
                        <label>Descuento</label>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#dc2626' }}>
                          {formData.discountPercentage}% OFF
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="form-row">
                      <div className="form-group">
                        <label>Precio (ARS) *</label>
                        <input type="number" min="0" step="any" name="price" value={formData.price} onChange={handleInputChange} required={!formData.isOnSale} />
                      </div>
                      <div className="form-group">
                         {/* Empty space for alignment */}
                      </div>
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label>Categoría *</label>
                      <div className="admin-select-wrapper">
                        <select 
                          className="admin-form-select"
                          value={showNewCategoryInput ? "NEW" : formData.category}
                          onChange={(e) => {
                            if (e.target.value === "NEW") {
                              setShowNewCategoryInput(true);
                            } else {
                              setShowNewCategoryInput(false);
                              setFormData(prev => ({ ...prev, category: e.target.value }));
                            }
                          }}
                          required={!showNewCategoryInput}
                        >
                          <option value="" disabled>Seleccionar categoría...</option>
                          {allExistingCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          <option value="NEW">+ Agregar nueva categoría...</option>
                        </select>
                        <div className="admin-select-icon">
                          <ChevronDown size={18} />
                        </div>
                      </div>
                      
                      {showNewCategoryInput && (
                        <input 
                          name="category" 
                          value={newCategoryName} 
                          onChange={(e) => setNewCategoryName(e.target.value)} 
                          placeholder="Nombre de la nueva categoría" 
                          className="animate-fade-in"
                          style={{ marginTop: '0.5rem' }}
                          required 
                        />
                      )}
                    </div>
                  </div>

                  {settings.enableStockManagement && (
                    <div className="form-group animate-fade-in" style={{ padding: '1.5rem', border: '1px solid var(--color-primary)', borderRadius: '12px', background: 'rgba(212, 163, 115, 0.05)', marginBottom: '1.5rem' }}>
                      <label style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Package size={18} /> Gestión de Stock por Talle y Color
                      </label>
                      <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1.5rem' }}>
                        Define cuántas unidades hay de cada combinación. Si no usas colores, solo completa el talle.
                      </p>
                      
                      {!formData.sizes ? (
                        <p style={{ fontSize: '0.85rem', color: '#dc2626' }}>Primero debes ingresar los talles arriba (ej: S, M, L).</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          {formData.sizes.split(',').map(s => s.trim()).filter(Boolean).map(size => (
                            <div key={size} style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--color-primary)', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                                Talle: {size}
                              </h4>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                                {(!formData.colors || formData.colors.trim() === '') ? (
                                  <div className="stock-input-group">
                                    <label style={{ fontSize: '0.7rem', color: '#666' }}>Stock General</label>
                                    <input 
                                      type="number" 
                                      min="0" 
                                      value={formData.stock?.[size] || 0} 
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setFormData(prev => ({
                                          ...prev,
                                          stock: {
                                            ...(prev.stock || {}),
                                            [size]: val
                                          }
                                        }));
                                      }}
                                    />
                                  </div>
                                ) : (
                                  formData.colors.split(',').map(c => c.trim()).filter(Boolean).map(color => (
                                    <div key={`${size}_${color}`} className="stock-input-group">
                                      <label style={{ fontSize: '0.7rem', color: '#666' }}>Color: {color}</label>
                                      <input 
                                        type="number" 
                                        min="0" 
                                        value={formData.stock?.[`${size}_${color}`] || 0} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value) || 0;
                                          setFormData(prev => ({
                                            ...prev,
                                            stock: {
                                              ...(prev.stock || {}),
                                              [`${size}_${color}`]: val
                                            }
                                          }));
                                        }}
                                      />
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="form-group" style={{ padding: '1.5rem', border: '1px solid #E5E7EB', borderRadius: '12px', background: '#f9fafb' }}>
                    <label style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '1rem' }}>Imagen del Producto *</label>
                    
                    <div style={{ marginBottom: '1.5rem', borderBottom: '1px dashed #ccc', paddingBottom: '1.5rem' }}>
                        <div style={{ marginBottom: '1rem' }}>
                          <label htmlFor="file-upload" className="btn btn-primary upload-label-btn">
                            <UploadCloud size={20} /> Subir fotos
                          </label>
                          <input 
                            id="file-upload"
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageChange}
                            multiple
                            style={{ display: 'none' }}
                          />
                        </div>
                        {imageFiles.length > 0 && (
                          <div style={{ padding: '0.5rem 1rem', background: '#ecfdf5', color: '#059669', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '500', marginBottom: '1rem', display: 'inline-block' }}>
                            {imageFiles.length} archivo(s) seleccionados para subir
                          </div>
                        )}
                      
                      {/* Grid de imágenes seleccionadas para subir */}
                      {imageFiles.length > 0 && (
                        <div className="image-grid">
                          {imageFiles.map((item, index) => (
                            <div key={item.id} className={`image-preview-item ${item.isMain ? 'is-main' : ''}`}>
                              <img src={item.preview} alt="Preview" />
                              
                              <button 
                                type="button" 
                                className="remove-img-btn" 
                                onClick={() => handleRemoveNewImage(index)}
                                title="Eliminar imagen"
                              >
                                <X size={14} />
                              </button>

                              <button 
                                type="button" 
                                className={`main-star-btn ${item.isMain ? 'is-active' : ''}`} 
                                onClick={() => handleSetMainProductImage(index, false)}
                                title={item.isMain ? "Imagen Principal" : "Marcar como principal"}
                              >
                                <Star size={16} fill={item.isMain ? "currentColor" : "none"} />
                              </button>
                              
                              <div className="image-controls-overlay">
                                <select 
                                  className="image-color-select"
                                  value={item.color || ''} 
                                  onChange={(e) => handleSetImageColor(index, e.target.value, false)}
                                >
                                  <option value="">Sin Color</option>
                                  {formData.colors.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Grid de imágenes ya existentes */}
                      {formData.images && formData.images.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem', display: 'block' }}>Imágenes actuales del producto:</label>
                          <div className="image-grid">
                            {formData.images.map((img, index) => (
                              <div key={index} className={`image-preview-item ${img.isMain ? 'is-main' : ''}`}>
                                <img src={img.url} alt={`Product ${index}`} />
                                
                                <button 
                                  type="button" 
                                  className="remove-img-btn" 
                                  onClick={() => handleRemoveExistingImage(index)}
                                  title="Eliminar imagen"
                                >
                                  <X size={14} />
                                </button>

                                <button 
                                  type="button" 
                                  className={`main-star-btn ${img.isMain ? 'is-active' : ''}`} 
                                  onClick={() => handleSetMainProductImage(index)}
                                  title={img.isMain ? "Imagen Principal" : "Marcar como principal"}
                                >
                                  <Star size={16} fill={img.isMain ? "currentColor" : "none"} />
                                </button>
                                
                                <div className="image-controls-overlay">
                                  <select 
                                    className="image-color-select"
                                    value={img.color || ''} 
                                    onChange={(e) => handleSetImageColor(index, e.target.value, true)}
                                  >
                                    <option value="">Sin Color</option>
                                    {formData.colors.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <span style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>O agregar por URL (varias separadas por coma y presionar Enter):</span>
                      <div className="input-with-icon">
                        <ImageIcon size={18} className="input-icon" />
                        <input 
                          type="text" 
                          placeholder="https://... , https://..." 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = e.target.value.trim();
                              if (val) {
                                const urls = val.split(/[\s,]+/).filter(url => url.startsWith('http'));
                                if (urls.length > 0) {
                                  setFormData(prev => {
                                    const currentImages = prev.images || [];
                                    const newImages = urls.map((url, idx) => ({
                                      url: url.trim(),
                                      isMain: currentImages.length === 0 && idx === 0
                                    }));
                                    return {
                                      ...prev,
                                      images: [...currentImages, ...newImages]
                                    };
                                  });
                                  e.target.value = '';
                                  toast.success(`${urls.length} imagen(es) agregada(s)`);
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group" style={{ padding: '1rem', border: '1px solid #E5E7EB', borderRadius: '8px', marginTop: '1rem' }}>
                    <label>Video del Producto (YouTube)</label>
                    <div className="input-with-icon" style={{ marginTop: '0.5rem' }}>
                      <Video size={18} className="input-icon" />
                      <input 
                        name="videoUrl" 
                        value={formData.videoUrl} 
                        onChange={handleInputChange} 
                        placeholder="https://www.youtube.com/watch?v=..." 
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Colores (separados por coma)</label>
                      <input name="colors" value={formData.colors} onChange={handleInputChange} placeholder="Rojo, Azul, Beig" />
                    </div>
                    <div className="form-group">
                      <label>Talles (separados por coma)</label>
                      <input name="sizes" value={formData.sizes} onChange={handleInputChange} placeholder="S, M, L, XL" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Descripción corta</label>
                    <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} />
                  </div>

                  <div className="form-actions">
                    <button type="button" onClick={() => setProductView('list')} className="btn btn-outline" disabled={isSubmitting || isUploading}>Cancelar</button>
                    <button type="submit" className="btn btn-primary save-product-btn" disabled={isSubmitting || isUploading}>
                      {isUploading ? 'Subiendo Imagen...' : isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar Producto' : 'Guardar Producto')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Panel de Lista */}
            {productView === 'list' && (
              <div className="admin-list-panel full-width animate-fade-in">
                <div className="admin-list-header">
                  <h3 className="admin-list-title">
                    <Package size={22} color="var(--color-primary)" /> 
                    Productos Actuales ({products.filter(p => adminCategoryFilter === 'All' || p.category === adminCategoryFilter).length})
                  </h3>
                  
                  <div className="admin-filter-container">
                    <div className="admin-filter-group">
                      <select 
                        value={adminCategoryFilter} 
                        onChange={(e) => setAdminCategoryFilter(e.target.value)}
                        className="admin-category-select"
                      >
                        <option value="All">Todas las Categorías</option>
                        {allExistingCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <div className="admin-filter-icon-wrapper">
                        <ChevronDown size={18} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        className="btn btn-outline" 
                        onClick={() => setShowBulkPriceModal(true)}
                        title="Actualizar todos los precios por porcentaje"
                      >
                        <Tag size={16} /> Precios en Lote
                      </button>
                      <button 
                        className="btn btn-primary add-product-btn" 
                        onClick={() => setProductView('edit')}
                      >
                        + Nuevo Producto
                      </button>
                    </div>
                  </div>
                </div>

                {productsLoading ? (
                  <div className="loader" style={{margin: '2rem auto'}}></div>
                ) : (
                  <div className="admin-products-list-grid">
                    {products
                      .filter(p => adminCategoryFilter === 'All' || p.category === adminCategoryFilter)
                      .map(product => (
                      <div key={product.id} className="admin-product-card glass">
                        <img src={product.imageUrl} alt={product.name} />
                        <div className="admin-product-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong>{product.name}</strong>
                            {product.isPaused && (
                              <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: '10px', fontWeight: 'bold' }}>SIN STOCK</span>
                            )}
                            {product.isHidden && (
                              <span style={{ fontSize: '0.65rem', background: '#f3f4f6', color: '#4b5563', padding: '1px 6px', borderRadius: '10px', fontWeight: 'bold' }}>OCULTO</span>
                            )}
                          </div>
                          <span>{product.category} - {product.isOnSale ? (
                            <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                              ${product.newPrice} <small style={{ textDecoration: 'line-through', color: '#9ca3af', fontWeight: 'normal' }}>${product.oldPrice}</small>
                            </span>
                          ) : (
                            `$${product.price}`
                          )}</span>
                          
                          {settings.enableStockManagement && product.stock && (
                            <div className="stock-summary-compact" style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '100px', overflowY: 'auto', padding: '4px', background: 'rgba(0,0,0,0.02)', borderRadius: '6px' }}>
                              {Object.entries(product.stock).filter(([_, qty]) => qty !== undefined).map(([key, qty]) => {
                                const label = key.replace('_', ' ');
                                return (
                                  <span key={key} className={`stock-badge ${qty <= 0 ? 'out-of-stock' : qty <= (settings.lowStockThreshold || 5) ? 'low-stock' : 'available'}`} style={{ fontSize: '0.6rem', padding: '2px 6px', marginTop: '0' }}>
                                    {label}: {qty}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="admin-product-actions">
                          <button onClick={() => handleEdit(product)} className="icon-btn edit-btn" aria-label="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="icon-btn delete-btn" aria-label="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {products.length === 0 && <p className="text-muted">No tienes productos todavía. ¡Empieza a cargar algunos!</p>}
                  </div>
                )}
              </div>
            )}

            {/* Panel de Alertas de Stock */}
            {productView === 'stock-alerts' && (
              <div className="admin-list-panel full-width animate-fade-in">
                <div className="admin-list-header">
                  <h3 className="admin-list-title" style={{ color: '#dc2626' }}>
                    <AlertTriangle size={22} /> Productos con Stock Bajo o Agotado
                  </h3>
                </div>

                <div className="admin-products-list-grid">
                  {products
                    .filter(p => {
                      if (!p.stock) return false;
                      return Object.values(p.stock).some(qty => qty <= (settings.lowStockThreshold || 5));
                    })
                    .map(product => (
                      <div key={product.id} className="admin-product-card glass" style={{ borderLeft: '4px solid #dc2626' }}>
                        <img src={product.imageUrl} alt={product.name} />
                        <div className="admin-product-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong>{product.name}</strong>
                          </div>
                          <span>{product.category}</span>
                          
                          <div className="stock-alerts-list" style={{ marginTop: '10px' }}>
                            {Object.entries(product.stock)
                              .filter(([_, qty]) => qty <= (settings.lowStockThreshold || 5))
                              .map(([key, qty]) => (
                                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: qty <= 0 ? '#fef2f2' : '#fffbeb', borderRadius: '6px', marginBottom: '4px', border: qty <= 0 ? '1px solid #fecaca' : '1px solid #fef3c7' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: '600', color: qty <= 0 ? '#dc2626' : '#d97706' }}>
                                    {key.replace('_', ' ')}
                                  </span>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: qty <= 0 ? '#b91c1c' : '#b45309' }}>
                                    {qty <= 0 ? 'AGOTADO' : `${qty} unid.`}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                        <div className="admin-product-actions">
                          <button onClick={() => handleEdit(product)} className="btn btn-primary" style={{ padding: '0.5rem', fontSize: '0.8rem' }}>
                            Reponer Stock
                          </button>
                        </div>
                      </div>
                    ))}
                  
                  {products.filter(p => p.stock && Object.values(p.stock).some(v => v <= (settings.lowStockThreshold || 5))).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', background: '#f0fdf4', borderRadius: '12px', border: '1px dashed #22c55e' }}>
                      <p style={{ color: '#15803d', fontWeight: '600', margin: 0 }}>¡Excelente! Todos tus productos tienen stock suficiente.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Modal para Actualización Masiva de Precios */}
            {showBulkPriceModal && (
              <div className="modal-overlay" onClick={() => setShowBulkPriceModal(false)}>
                <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Actualizar Precios en Lote</h3>
                    <button className="close-btn" onClick={() => setShowBulkPriceModal(false)}><X size={24} /></button>
                  </div>
                  <form onSubmit={handleBulkPriceUpdate} className="modal-body">
                    <p style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Esta acción modificará los precios de <strong>todos tus productos</strong> al mismo tiempo. Usa esta herramienta con precaución.
                    </p>
                    
                    <div className="form-group">
                      <label>Acción</label>
                      <select 
                        value={bulkPriceAction} 
                        onChange={e => setBulkPriceAction(e.target.value)}
                      >
                        <option value="increase">Aumentar Precios (+)</option>
                        <option value="decrease">Reducir Precios (-)</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Porcentaje (%)</label>
                      <div className="input-with-icon" style={{ display: 'flex', alignItems: 'center' }}>
                        <input 
                          type="number" 
                          min="1" 
                          max="100" 
                          step="0.1"
                          value={bulkPricePercentage} 
                          onChange={e => setBulkPricePercentage(e.target.value)}
                          placeholder="Ej. 10" 
                          required
                          style={{ flex: 1 }}
                        />
                        <span style={{ padding: '0 10px', fontWeight: 'bold' }}>%</span>
                      </div>
                    </div>
                    
                    <div className="modal-footer" style={{ marginTop: '2rem' }}>
                      <button type="button" className="btn btn-outline" onClick={() => setShowBulkPriceModal(false)}>Cancelar</button>
                      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Actualizando...' : 'Aplicar a Todos'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {activeTab === 'settings' && userRole === 'admin' && (
        <div className="admin-settings-panel glass animate-fade-in">
          <h2><Palette size={24} /> Personalización de la Tienda</h2>
          <p>Cambia los colores, el título y el logo de tu sitio en tiempo real.</p>
          
          <div className="settings-tabs">
            <button type="button" className={`settings-tab-btn ${activeSettingsTab === 'identity' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('identity')}><Type size={16} /> Marca</button>
            <button type="button" className={`settings-tab-btn ${activeSettingsTab === 'hero' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('hero')}><Layout size={16} /> Inicio</button>
            <button type="button" className={`settings-tab-btn ${activeSettingsTab === 'marquee' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('marquee')}><Megaphone size={16} /> Marquesina</button>
            <button type="button" className={`settings-tab-btn ${activeSettingsTab === 'videos' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('videos')}><Video size={16} /> Videos</button>
            <button type="button" className={`settings-tab-btn ${activeSettingsTab === 'sidebar' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('sidebar')}><GalleryHorizontal size={16} /> Sidebar</button>
            <button type="button" className={`settings-tab-btn ${activeSettingsTab === 'checkout' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('checkout')}><ClipboardCheck size={16} /> Checkout</button>
            <button type="button" className={`settings-tab-btn ${activeSettingsTab === 'footer' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('footer')}><Link size={16} /> Footer</button>
            <button type="button" className={`settings-tab-btn ${activeSettingsTab === 'about' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('about')}><User size={16} /> Nosotras</button>
            <button type="button" className={`settings-tab-btn ${activeSettingsTab === 'maintenance' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('maintenance')}><Wrench size={16} /> Mantenimiento</button>
          </div>
          
          <form onSubmit={handleSettingsSubmit} className="settings-form">
            {activeSettingsTab === 'identity' && (
              <div className="animate-fade-in">
                <div className="settings-section">
                  <h3><Type size={18} /> Identidad y Marca</h3>
                  <div className="form-group grid-2">
                    <div className="form-group">
                      <label>Título del Sitio</label>
                      <input 
                        name="siteTitle" 
                        value={siteSettings.siteTitle} 
                        onChange={handleSettingsChange} 
                        placeholder="Ej. Mi Boutique Femme"
                      />
                    </div>
                    <div className="form-group">
                      <label>Nombre Menú Catálogo</label>
                      <input 
                        name="catalogTitle" 
                        value={siteSettings.catalogTitle} 
                        onChange={handleSettingsChange} 
                        placeholder="Ej. Colección / Tienda"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Número de WhatsApp (Ventas)</label>
                    <input 
                      name="whatsappNumber" 
                      value={siteSettings.whatsappNumber} 
                      onChange={handleSettingsChange} 
                      placeholder="Ej. 5491112345678 (Sin el +)"
                    />
                    <small className="form-hint">Ingresar código de país + código de área + número (ej. 54911...)</small>
                  </div>

                  <div className="form-group">
                    <label>Forma del Logo</label>
                    <select name="logoShape" value={siteSettings.logoShape || 'normal'} onChange={handleSettingsChange}>
                      <option value="normal">Redondo / Normal (Sin recortes)</option>
                      <option value="curved">Bordes Curvos</option>
                      <option value="rounded">Circular / Redondeado</option>
                    </select>
                  </div>

                  <div className="form-group grid-2">
                    <div className="form-group">
                      <label>Logo de la Tienda (Opcional)</label>
                      <div className="logo-upload-container">
                        {siteSettings.logoUrl && !logoFile && (
                          <div className="current-logo-preview">
                            <img 
                              src={siteSettings.logoUrl} 
                              alt="Logo actual" 
                              style={{
                                borderRadius: siteSettings.logoShape === 'rounded' ? '50%' : siteSettings.logoShape === 'curved' ? '12px' : '0',
                                overflow: 'hidden'
                              }} 
                            />
                            <span>Logo actual</span>
                            <button 
                              type="button" 
                              onClick={() => setSiteSettings(prev => ({ ...prev, logoUrl: '' }))} 
                              className="btn btn-outline" 
                              style={{ marginTop: '0.5rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                            >
                              Eliminar Logo
                            </button>
                          </div>
                        )}
                        <div className="upload-box">
                          <input type="file" accept="image/*" onChange={handleLogoChange} />
                          <UploadCloud size={24} strokeWidth={1.5} />
                          <span>{logoFile ? logoFile.name : 'Cambiar logo'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Favicon (Icono Navegador)</label>
                      <div className="logo-upload-container">
                        {siteSettings.faviconUrl && !faviconFile && (
                          <div className="current-logo-preview">
                            <img 
                              src={siteSettings.faviconUrl} 
                              alt="Favicon actual" 
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <span>Icono actual</span>
                            <button 
                              type="button" 
                              onClick={() => setSiteSettings(prev => ({ ...prev, faviconUrl: '' }))} 
                              className="btn btn-outline" 
                              style={{ marginTop: '0.5rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                        <div className="upload-box" style={{ borderRadius: '50%', width: '80px', height: '80px', flex: 'none', margin: '0 auto' }}>
                          <input type="file" accept="image/*" onChange={handleFaviconChange} />
                          <UploadCloud size={24} strokeWidth={1.5} />
                          <span style={{ fontSize: '0.6rem' }}>{faviconFile ? 'Listo' : 'Subir'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="settings-section">
                  <h3><Palette size={18} /> Colores de Marca</h3>
                  <div className="color-grid">
                    <div className="form-group">
                      <label>Color Primario (Botones, acentos)</label>
                      <div className="color-input-wrapper">
                        <input 
                          type="color" 
                          name="primaryColor" 
                          value={siteSettings.primaryColor} 
                          onChange={handleSettingsChange} 
                        />
                        <input 
                          type="text" 
                          name="primaryColor" 
                          value={siteSettings.primaryColor} 
                          onChange={handleSettingsChange} 
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Color Secundario (Fondos, secciones)</label>
                      <div className="color-input-wrapper">
                        <input 
                          type="color" 
                          name="secondaryColor" 
                          value={siteSettings.secondaryColor} 
                          onChange={handleSettingsChange} 
                        />
                        <input 
                          type="text" 
                          name="secondaryColor" 
                          value={siteSettings.secondaryColor} 
                          onChange={handleSettingsChange} 
                        />
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <button type="button" onClick={resetColors} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                      <Palette size={14} /> Restablecer Colores por defecto
                    </button>
                  </div>
                </div>

                <div className="settings-section">
                  <h3><Layout size={18} /> Encabezado de Páginas (Nosotras, Cómo Comprar)</h3>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Controla el gradiente, el alto y los colores de texto de la franja de título que aparece arriba de esas páginas.</p>

                  <div className="color-grid">
                    <div className="form-group">
                      <label>Gradiente - Color Inicial</label>
                      <div className="color-input-wrapper">
                        <input
                          type="color"
                          name="pageHeaderGradientStart"
                          value={siteSettings.pageHeaderGradientStart || '#D4A373'}
                          onChange={handleSettingsChange}
                        />
                        <input
                          type="text"
                          name="pageHeaderGradientStart"
                          value={siteSettings.pageHeaderGradientStart || '#D4A373'}
                          onChange={handleSettingsChange}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Gradiente - Color Final</label>
                      <div className="color-input-wrapper">
                        <input
                          type="color"
                          name="pageHeaderGradientEnd"
                          value={siteSettings.pageHeaderGradientEnd || '#FAEDCD'}
                          onChange={handleSettingsChange}
                        />
                        <input
                          type="text"
                          name="pageHeaderGradientEnd"
                          value={siteSettings.pageHeaderGradientEnd || '#FAEDCD'}
                          onChange={handleSettingsChange}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Color del Título</label>
                      <div className="color-input-wrapper">
                        <input
                          type="color"
                          name="pageHeaderTitleColor"
                          value={siteSettings.pageHeaderTitleColor || '#ffffff'}
                          onChange={handleSettingsChange}
                        />
                        <input
                          type="text"
                          name="pageHeaderTitleColor"
                          value={siteSettings.pageHeaderTitleColor || '#ffffff'}
                          onChange={handleSettingsChange}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Color del Subtítulo</label>
                      <div className="color-input-wrapper">
                        <input
                          type="color"
                          name="pageHeaderSubtitleColor"
                          value={siteSettings.pageHeaderSubtitleColor || '#ffffff'}
                          onChange={handleSettingsChange}
                        />
                        <input
                          type="text"
                          name="pageHeaderSubtitleColor"
                          value={siteSettings.pageHeaderSubtitleColor || '#ffffff'}
                          onChange={handleSettingsChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '1.5rem' }}>
                    <label>Alto del encabezado (px): <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{siteSettings.pageHeaderHeight || '220'} px</span></label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <input
                        type="range"
                        name="pageHeaderHeight"
                        min="120"
                        max="400"
                        step="10"
                        value={siteSettings.pageHeaderHeight || '220'}
                        onChange={handleSettingsChange}
                        style={{ flex: 1 }}
                      />
                      <div style={{ padding: '4px 10px', background: '#f0f0f0', borderRadius: '4px', fontSize: '0.8rem', minWidth: '80px', textAlign: 'center' }}>
                        {siteSettings.pageHeaderHeight || '220'} px
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSettingsTab === 'hero' && (
              <div className="animate-fade-in">
                <div className="settings-section">
                  <h3><Layout size={18} /> Banner Principal (Hero)</h3>
                  
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label" style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                      <input 
                        type="checkbox"
                        name="showHero" 
                        checked={siteSettings.showHero !== false} 
                        onChange={(e) => setSiteSettings(prev => ({ ...prev, showHero: e.target.checked }))} 
                      />
                      Habilitar Banner de Bienvenida (Hero)
                    </label>
                  </div>

                  <div className="form-group grid-2">
                    <div>
                      <label>Título de Bienvenida (Texto)</label>
                      <input 
                        name="heroTitle" 
                        value={siteSettings.heroTitle} 
                        onChange={handleSettingsChange} 
                        placeholder="Ej. Nueva Colección Otoño / Invierno"
                      />
                    </div>
                    <div>
                      <label>Tamaño Título (rem)</label>
                      <input 
                        type="number"
                        step="0.1"
                        name="heroTitleSize" 
                        value={siteSettings.heroTitleSize} 
                        onChange={handleSettingsChange} 
                      />
                    </div>
                  </div>

                  <div className="form-group grid-2">
                    <div>
                      <label>Subtítulo de Bienvenida (Texto)</label>
                      <textarea 
                        name="heroSubtitle" 
                        value={siteSettings.heroSubtitle} 
                        onChange={handleSettingsChange} 
                        rows={2}
                        placeholder="Ej. Descubre diseños exclusivos..."
                      />
                    </div>
                    <div>
                      <label>Tamaño Subtítulo (rem)</label>
                      <input 
                        type="number"
                        step="0.1"
                        name="heroSubtitleSize" 
                        value={siteSettings.heroSubtitleSize} 
                        onChange={handleSettingsChange} 
                      />
                    </div>
                  </div>
                  
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        name="showBackToTop" 
                        checked={siteSettings.showBackToTop} 
                        onChange={(e) => setSiteSettings(prev => ({ ...prev, showBackToTop: e.target.checked }))} 
                      />
                      Mostrar botón "Volver arriba"
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeSettingsTab === 'marquee' && (
              <div className="animate-fade-in">
                <div className="settings-section">
                  <h3><Megaphone size={18} /> Marquesina de Anuncios</h3>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Configura el texto que aparece deslizándose en la parte superior de tu tienda.
                  </p>
                  
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label" style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                      <input 
                        type="checkbox"
                        name="showMarquee" 
                        checked={siteSettings.showMarquee} 
                        onChange={handleSettingsChange} 
                      />
                      Habilitar Marquesina
                    </label>
                  </div>

                  <div className="form-group">
                    <label>Texto de la Marquesina</label>
                    <textarea 
                      name="marqueeText" 
                      value={siteSettings.marqueeText} 
                      onChange={handleSettingsChange} 
                      placeholder="Ej. COMPRA MÍNIMA: 10 PRODUCTOS... "
                      rows={2}
                    />
                  </div>

                  <div className="color-grid">
                    <div className="form-group">
                      <label>Color de Fondo</label>
                      <div className="color-input-wrapper">
                        <input 
                          type="color" 
                          name="marqueeBgColor" 
                          value={siteSettings.marqueeBgColor || '#A08264'} 
                          onChange={handleSettingsChange} 
                        />
                        <input 
                          type="text" 
                          name="marqueeBgColor" 
                          value={siteSettings.marqueeBgColor || '#A08264'} 
                          onChange={handleSettingsChange} 
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Color de Texto</label>
                      <div className="color-input-wrapper">
                        <input 
                          type="color" 
                          name="marqueeTextColor" 
                          value={siteSettings.marqueeTextColor || '#ffffff'} 
                          onChange={handleSettingsChange} 
                        />
                        <input 
                          type="text" 
                          name="marqueeTextColor" 
                          value={siteSettings.marqueeTextColor || '#ffffff'} 
                          onChange={handleSettingsChange} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '1.5rem' }}>
                    <label>Tamaño del Texto (rem): <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{siteSettings.marqueeFontSize || '0.85'} rem</span></label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <input 
                        type="range" 
                        name="marqueeFontSize" 
                        min="0.5" 
                        max="1.5" 
                        step="0.05"
                        value={siteSettings.marqueeFontSize || '0.85'} 
                        onChange={handleSettingsChange}
                        style={{ flex: 1 }}
                      />
                      <div style={{ padding: '4px 10px', background: '#f0f0f0', borderRadius: '4px', fontSize: '0.8rem', minWidth: '80px', textAlign: 'center' }}>
                         {Math.round((siteSettings.marqueeFontSize || 0.85) * 16)} px
                      </div>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '1.5rem' }}>
                    <label>Alto de la marquesina (px): <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{siteSettings.marqueeHeight || '36'} px</span></label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <input 
                        type="range" 
                        name="marqueeHeight" 
                        min="24" 
                        max="80" 
                        step="2"
                        value={siteSettings.marqueeHeight || '36'} 
                        onChange={handleSettingsChange}
                        style={{ flex: 1 }}
                      />
                      <div style={{ padding: '4px 10px', background: '#f0f0f0', borderRadius: '4px', fontSize: '0.8rem', minWidth: '80px', textAlign: 'center' }}>
                         {siteSettings.marqueeHeight || '36'} px
                      </div>
                    </div>
                    <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '5px' }}>
                      El navbar y el contenido de la tienda se ajustarán automáticamente a este alto.
                    </p>
                  </div>

                  <button 
                    type="button" 
                    className="btn-marquee-reset" 
                    onClick={() => {
                      setSiteSettings(prev => ({
                        ...prev,
                        marqueeFontSize: '0.85',
                        marqueeHeight: '36'
                      }));
                      toast.success('Valores de marquesina restablecidos');
                    }}
                  >
                    <RotateCcw size={14} /> Restablecer Tamaño y Alto por defecto
                  </button>
                </div>
              </div>
            )}

            {activeSettingsTab === 'videos' && (
              <div className="animate-fade-in">
                <div className="settings-section">
                  <h3><Video size={18} /> Slider de Videos</h3>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Estos videos aparecerán en el catálogo antes de los productos.</p>
                  
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label" style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                      <input 
                        type="checkbox"
                        name="showVideoSlider" 
                        checked={siteSettings.showVideoSlider} 
                        onChange={handleSettingsChange} 
                      />
                      Habilitar esta sección en la tienda
                    </label>
                  </div>

                  {siteSettings.showVideoSlider && (
                    <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid #eee' }}>
                      <div className="form-group">
                        <label>Videos listos para el Slider</label>
                        {(!siteSettings.videoUrls || siteSettings.videoUrls.length === 0) && (
                          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Aún no hay videos agregados.</p>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', marginBottom: '15px' }}>
                          {(siteSettings.videoUrls || []).map((url, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                              <video src={url} style={{ width: '80px', height: '60px', objectFit: 'contain', borderRadius: '4px', backgroundColor: '#000' }} muted />
                              <span style={{flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem'}}>{url}</span>
                              <button type="button" onClick={() => handleVideoRemove(index)} className="btn btn-outline" style={{ padding: '5px 10px', color: 'red', borderColor: 'red' }}>Eliminar</button>
                            </div>
                          ))}
                        </div>

                        <div className="upload-box" style={{ width: '100%', height: '100px', margin: 0, opacity: isVideoUploading ? 0.6 : 1, position: 'relative', background: '#fff', border: '2px dashed #ccc', borderRadius: '8px' }}>
                          <input type="file" accept="video/*" onChange={handleVideoUpload} disabled={isVideoUploading} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                          <UploadCloud size={24} strokeWidth={1.5} />
                          <span>{isVideoUploading ? 'Subiendo video (esto puede tardar unos minutos)...' : 'Subir nuevo video (.mp4)'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSettingsTab === 'sidebar' && (
              <div className="animate-fade-in">
                <div className="settings-section">
                  <h3><GalleryHorizontal size={18} /> Carrusel debajo del Header</h3>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Estas imágenes rotan en un carrusel que aparece en el Inicio, justo debajo del encabezado.</p>

                  <div className="form-group checkbox-group">
                    <label className="checkbox-label" style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                      <input
                        type="checkbox"
                        name="showSidebarCarousel"
                        checked={siteSettings.showSidebarCarousel}
                        onChange={handleSettingsChange}
                      />
                      Habilitar esta sección en la tienda
                    </label>
                  </div>

                  {siteSettings.showSidebarCarousel && (
                    <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid #eee' }}>
                      <div className="form-group">
                        <label>Imágenes del carrusel</label>
                        {(!siteSettings.sidebarCarouselImages || siteSettings.sidebarCarouselImages.length === 0) && (
                          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Aún no hay imágenes agregadas.</p>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', marginBottom: '15px' }}>
                          {(siteSettings.sidebarCarouselImages || []).map((image, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                              <img src={image.url} style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} alt="" />
                              <input
                                type="text"
                                value={image.linkUrl || ''}
                                onChange={(e) => handleSidebarImageLinkChange(index, e.target.value)}
                                placeholder="Link opcional al hacer click (https://...)"
                                style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.85rem' }}
                              />
                              <button type="button" onClick={() => handleSidebarImageRemove(index)} className="btn btn-outline" style={{ padding: '5px 10px', color: 'red', borderColor: 'red' }}>Eliminar</button>
                            </div>
                          ))}
                        </div>

                        <div className="upload-box" style={{ width: '100%', height: '100px', margin: 0, opacity: isSidebarImageUploading ? 0.6 : 1, position: 'relative', background: '#fff', border: '2px dashed #ccc', borderRadius: '8px' }}>
                          <input type="file" accept="image/*" multiple onChange={handleSidebarImageUpload} disabled={isSidebarImageUploading} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                          <UploadCloud size={24} strokeWidth={1.5} />
                          <span>{isSidebarImageUploading ? 'Subiendo imagen(es)...' : 'Subir nueva(s) imagen(es)'}</span>
                        </div>
                      </div>

                      <div className="form-group" style={{ marginTop: '1.5rem' }}>
                        <label>Alto del carrusel (px): <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{siteSettings.sidebarCarouselHeight || '220'} px</span></label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <input
                            type="range"
                            name="sidebarCarouselHeight"
                            min="100"
                            max="500"
                            step="10"
                            value={siteSettings.sidebarCarouselHeight || '220'}
                            onChange={handleSettingsChange}
                            style={{ flex: 1 }}
                          />
                          <div style={{ padding: '4px 10px', background: '#f0f0f0', borderRadius: '4px', fontSize: '0.8rem', minWidth: '80px', textAlign: 'center' }}>
                            {siteSettings.sidebarCarouselHeight || '220'} px
                          </div>
                        </div>
                      </div>

                      <div className="form-group" style={{ marginTop: '1.5rem' }}>
                        <label>Tiempo entre imágenes (segundos): <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{siteSettings.sidebarCarouselIntervalSeconds || '4.5'}s</span></label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <input
                            type="range"
                            name="sidebarCarouselIntervalSeconds"
                            min="1.5"
                            max="15"
                            step="0.5"
                            value={siteSettings.sidebarCarouselIntervalSeconds || '4.5'}
                            onChange={handleSettingsChange}
                            style={{ flex: 1 }}
                          />
                          <div style={{ padding: '4px 10px', background: '#f0f0f0', borderRadius: '4px', fontSize: '0.8rem', minWidth: '80px', textAlign: 'center' }}>
                            {siteSettings.sidebarCarouselIntervalSeconds || '4.5'}s
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSettingsTab === 'checkout' && (
              <div className="animate-fade-in">
                <div className="settings-section">
                  <h3><ClipboardCheck size={18} /> Configuración de Finalización de Compra (Checkout)</h3>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Define qué datos son obligatorios cuando el cliente confirma su pedido por WhatsApp.
                  </p>
                  
                  <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid #eee' }}>
                    <div className="form-group checkbox-group" style={{ marginBottom: '1rem' }}>
                      <label className="checkbox-label" style={{ fontWeight: '500' }}>
                        <input 
                          type="checkbox"
                          name="checkoutRequireName" 
                          checked={siteSettings.checkoutRequireName !== false} 
                          onChange={handleSettingsChange} 
                        />
                        Nombre completo obligatorio
                      </label>
                    </div>

                    <div className="form-group checkbox-group">
                      <label className="checkbox-label" style={{ fontWeight: '500' }}>
                        <input 
                          type="checkbox"
                          name="checkoutRequirePhone" 
                          checked={siteSettings.checkoutRequirePhone !== false} 
                          onChange={handleSettingsChange} 
                        />
                        Teléfono obligatorio
                      </label>
                    </div>
                  </div>

                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fef3c7', borderRadius: '8px', color: '#92400e', fontSize: '0.85rem' }}>
                    <strong>Nota:</strong> Al menos uno de los campos debería ser obligatorio para poder identificar quién realiza el pedido. Si desactivas ambos, el sistema permitirá confirmar sin datos.
                  </div>

                  <h3 style={{ marginTop: '2.5rem' }}><CreditCard size={18} /> Métodos de Pago Disponibles</h3>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Selecciona qué opciones verá el cliente al momento de finalizar su compra.
                  </p>

                  <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid #eee' }}>
                    <div className="form-group checkbox-group" style={{ marginBottom: '1rem' }}>
                      <label className="checkbox-label" style={{ fontWeight: 'bold', color: '#25D366' }}>
                        <input 
                          type="checkbox"
                          name="enableWhatsApp" 
                          checked={siteSettings.enableWhatsApp !== false} 
                          onChange={handleSettingsChange} 
                        />
                        Habilitar Pedido por WhatsApp
                      </label>
                      <p style={{ fontSize: '0.8rem', marginLeft: '34px', color: '#666' }}>
                        El cliente envía su carrito por mensaje directo para coordinar pago y entrega.
                      </p>
                    </div>

                    <div className="form-group checkbox-group">
                      <label className="checkbox-label" style={{ fontWeight: 'bold', color: '#009EE3' }}>
                        <input 
                          type="checkbox"
                          name="enableMercadoPago" 
                          checked={siteSettings.enableMercadoPago === true} 
                          onChange={handleSettingsChange} 
                        />
                        Habilitar Pago con Mercado Pago (V2)
                      </label>
                      <p style={{ fontSize: '0.8rem', marginLeft: '34px', color: '#666' }}>
                        Permite pagar con tarjetas, efectivo o dinero en cuenta mediante el checkout oficial.
                      </p>
                    </div>

                    <div className="form-group checkbox-group" style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                      <label className="checkbox-label" style={{ fontWeight: 'bold', color: '#ff8800' }}>
                        <input 
                          type="checkbox"
                          name="enableMercadoEnvios" 
                          checked={siteSettings.enableMercadoEnvios === true} 
                          onChange={handleSettingsChange} 
                        />
                        Habilitar Mercado Envíos
                      </label>
                      <p style={{ fontSize: '0.8rem', marginLeft: '34px', color: '#666' }}>
                        Permite que el cliente elija envío por correo. Se calcula automáticamente en el checkout de Mercado Pago.
                      </p>
                    </div>

                    {siteSettings.enableMercadoEnvios && (
                      <div className="form-group" style={{ marginLeft: '34px', marginTop: '1rem', maxWidth: '200px' }}>
                        <label>Costo de Envío Fijo ($)</label>
                        <input 
                          type="number"
                          name="shippingCost"
                          value={siteSettings.shippingCost || 0}
                          onChange={handleSettingsChange}
                          placeholder="Ej. 6500"
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                        <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '5px' }}>
                          Este monto se sumará al total si el cliente elige envío.
                        </p>
                      </div>
                    )}
                  </div>

                  <h3 style={{ marginTop: '2.5rem' }}><Package size={18} /> Inventario y Stock</h3>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Controla si la tienda debe manejar existencias automáticamente.
                  </p>

                  <div style={{ padding: '1.5rem', background: 'rgba(212, 163, 115, 0.05)', borderRadius: '12px', border: '1px solid var(--color-primary)' }}>
                    <div className="form-group checkbox-group">
                      <label className="checkbox-label" style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        <input 
                          type="checkbox"
                          name="enableStockManagement" 
                          checked={siteSettings.enableStockManagement === true} 
                          onChange={handleSettingsChange} 
                        />
                        Habilitar Gestión de Stock Automática
                      </label>
                      <p style={{ fontSize: '0.8rem', marginLeft: '34px', color: '#666' }}>
                        Si se activa, deberás cargar las unidades por talle en cada producto. El sistema bloqueará la compra si no hay stock disponible.
                      </p>
                    </div>

                    {siteSettings.enableStockManagement && (
                      <div className="form-group animate-fade-in" style={{ marginLeft: '34px', marginTop: '1.5rem', borderTop: '1px dashed #ddd', paddingTop: '1.5rem' }}>
                        <label style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Umbral de Stock Bajo</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '0.5rem' }}>
                          <input 
                            type="number"
                            name="lowStockThreshold"
                            min="1"
                            max="50"
                            value={siteSettings.lowStockThreshold || 5}
                            onChange={handleSettingsChange}
                            style={{ width: '80px', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ddd' }}
                          />
                          <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>
                            Unidades a partir de las cuales el stock se mostrará en <strong>amarillo</strong> (alerta).
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {siteSettings.enableMercadoPago && (
                    <MercadoPagoConfig />
                  )}
                </div>
              </div>
            )}

            {activeSettingsTab === 'footer' && (
              <div className="animate-fade-in">
                <div className="settings-section">
                  <h3><Link size={18} /> Pie de Página (Footer)</h3>
                  <div className="footer-settings-grid">
                    <div className="form-group checkbox-group">
                      <label className="checkbox-label">
                        <input 
                          type="checkbox"
                          name="footerShowLinks" 
                          checked={siteSettings.footerShowLinks} 
                          onChange={handleSettingsChange} 
                        />
                        Mostrar "Enlaces Rápidos"
                      </label>
                    </div>
                    <div className="form-group checkbox-group">
                      <label className="checkbox-label">
                        <input 
                          type="checkbox"
                          name="footerShowPolicies" 
                          checked={siteSettings.footerShowPolicies} 
                          onChange={handleSettingsChange} 
                        />
                        Mostrar "Políticas"
                      </label>
                    </div>
                    <div className="form-group checkbox-group">
                      <label className="checkbox-label">
                        <input 
                          type="checkbox"
                          name="footerShowContact" 
                          checked={siteSettings.footerShowContact} 
                          onChange={handleSettingsChange} 
                        />
                        Mostrar "Contacto"
                      </label>
                    </div>
                    <div className="form-group checkbox-group">
                      <label className="checkbox-label">
                        <input 
                          type="checkbox"
                          name="footerShowSocial" 
                          checked={siteSettings.footerShowSocial} 
                          onChange={handleSettingsChange} 
                        />
                        Mostrar Redes Sociales
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Descripción del Footer (Bajo el logo)</label>
                    <textarea 
                      name="footerDescription" 
                      value={siteSettings.footerDescription} 
                      onChange={handleSettingsChange} 
                      rows={2}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Email de Contacto</label>
                      <input 
                        name="footerEmail" 
                        value={siteSettings.footerEmail} 
                        onChange={handleSettingsChange} 
                      />
                    </div>
                    <div className="form-group">
                      <label>WhatsApp en Footer (Número)</label>
                      <input 
                        name="footerPhone" 
                        value={siteSettings.footerPhone} 
                        onChange={handleSettingsChange} 
                        placeholder="Ej. 1125604932 (Sin el +)"
                      />
                    </div>
                    <div className="form-group">
                      <label>Texto WhatsApp Footer</label>
                      <input 
                        name="whatsappFooterLabel" 
                        value={siteSettings.whatsappFooterLabel || 'WhatsApp'} 
                        onChange={handleSettingsChange} 
                        placeholder="Ej. WhatsApp o Contáctanos"
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label>Mensaje del Modal (Confirmación)</label>
                      <textarea 
                        name="whatsappModalMessage" 
                        value={siteSettings.whatsappModalMessage || ''} 
                        onChange={handleSettingsChange} 
                        placeholder="Ej. ¿Deseas realizar una consulta por WhatsApp?"
                        rows={2}
                      />
                    </div>
                    <div className="form-group">
                      <label>Dirección / Ubicación</label>
                      <input 
                        name="footerAddress" 
                        value={siteSettings.footerAddress} 
                        onChange={handleSettingsChange} 
                      />
                    </div>
                  </div>

                  <div className="social-inputs-grid">
                    <div className="form-group">
                      <label>Instagram URL</label>
                      <input 
                        name="instagramLink" 
                        value={siteSettings.instagramLink} 
                        onChange={handleSettingsChange} 
                        placeholder="https://instagram.com/tu_tienda"
                      />
                    </div>
                    <div className="form-group">
                      <label>Facebook URL</label>
                      <input 
                        name="facebookLink" 
                        value={siteSettings.facebookLink} 
                        onChange={handleSettingsChange} 
                        placeholder="https://facebook.com/tu_tienda"
                      />
                    </div>
                    <div className="form-group">
                      <label>Twitter / X URL</label>
                      <input 
                        name="twitterLink" 
                        value={siteSettings.twitterLink} 
                        onChange={handleSettingsChange} 
                        placeholder="https://x.com/tu_tienda"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSettingsTab === 'about' && (
              <div className="animate-fade-in">
                <div className="settings-section">
                  <h3><User size={18} /> Sección Nosotras / Empresa</h3>
                  
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label" style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                      <input 
                        type="checkbox"
                        name="showAbout" 
                        checked={siteSettings.showAbout} 
                        onChange={handleSettingsChange} 
                      />
                      Habilitar sección "Nosotras" en el sitio
                    </label>
                  </div>

                  {siteSettings.showAbout && (
                    <div className="animate-fade-in" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid #eee' }}>
                      <div className="form-group">
                        <label>Título de la Sección</label>
                        <input 
                          name="aboutTitle" 
                          value={siteSettings.aboutTitle} 
                          onChange={handleSettingsChange} 
                          placeholder="Ej. Sobre Nosotros / Nuestra Historia"
                        />
                      </div>

                      <div className="form-group">
                        <label>Descripción / Historia de la Tienda</label>
                        <textarea 
                          name="aboutText" 
                          value={siteSettings.aboutText} 
                          onChange={handleSettingsChange} 
                          rows={10}
                          placeholder="Contanos sobre tu emprendimiento..."
                        />
                      </div>

                      <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                          <input 
                            type="checkbox"
                            name="showContactForm" 
                            checked={siteSettings.showContactForm} 
                            onChange={handleSettingsChange} 
                          />
                          Incluir Formulario de Contacto al final
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSettingsTab === 'maintenance' && (
              <div className="animate-fade-in">
                <div className="settings-section">
                  <h3><Wrench size={18} /> Modo Mantenimiento</h3>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Muestra una pantalla de "en construcción" a todos los visitantes mientras realizas cambios. Los administradores siguen viendo el sitio normalmente.
                  </p>

                  <div className="form-group checkbox-group">
                    <label className="checkbox-label" style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                      <input
                        type="checkbox"
                        name="maintenanceMode"
                        checked={siteSettings.maintenanceMode}
                        onChange={handleSettingsChange}
                      />
                      Activar Modo Mantenimiento
                    </label>
                  </div>

                  {settings.maintenanceMode && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      marginBottom: '1.5rem',
                      background: maintenanceStatus.active ? '#fef2f2' : '#f0fdf4',
                      border: `1px solid ${maintenanceStatus.active ? '#fee2e2' : '#dcfce7'}`,
                      color: maintenanceStatus.active ? '#dc2626' : '#16a34a',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}>
                      {maintenanceStatus.active
                        ? 'El sitio está actualmente EN MANTENIMIENTO para los visitantes.'
                        : 'El contador llegó a 0 y el sitio se restauró automáticamente. Guarda los cambios para actualizar el estado.'}
                    </div>
                  )}

                  <div className="animate-fade-in" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid #eee' }}>
                    <div className="form-group">
                      <label>Título</label>
                      <input
                        name="maintenanceTitle"
                        value={siteSettings.maintenanceTitle}
                        onChange={handleSettingsChange}
                        placeholder="Ej. Sitio en Mantenimiento"
                      />
                    </div>

                    <div className="form-group">
                      <label>Mensaje para los visitantes</label>
                      <textarea
                        name="maintenanceMessage"
                        value={siteSettings.maintenanceMessage}
                        onChange={handleSettingsChange}
                        rows={4}
                        placeholder="Estamos realizando mejoras. ¡Volvemos pronto!"
                      />
                    </div>

                    <div className="form-group">
                      <label>Contador regresivo (opcional)</label>
                      <input
                        type="datetime-local"
                        value={isoToLocalInput(siteSettings.maintenanceEndsAt)}
                        onChange={handleMaintenanceEndsAtChange}
                      />
                      <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '5px' }}>
                        Si lo dejas vacío, el sitio permanecerá en mantenimiento hasta que lo desactives manualmente.
                      </p>
                    </div>

                    {siteSettings.maintenanceEndsAt && (
                      <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            name="maintenanceAutoDisable"
                            checked={siteSettings.maintenanceAutoDisable}
                            onChange={handleSettingsChange}
                          />
                          Restaurar el sitio automáticamente cuando el contador llegue a 0
                        </label>
                        <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '5px' }}>
                          Si lo desactivas, el sitio seguirá en mantenimiento aunque el contador termine, hasta que lo apagues manualmente.
                        </p>
                      </div>
                    )}

                    <div className="form-group" style={{ marginTop: '1rem' }}>
                      <label>Imagen de Fondo (Opcional)</label>
                      <div className="logo-upload-container">
                        {siteSettings.maintenanceBackgroundImage && !maintenanceBgFile && (
                          <div className="current-logo-preview">
                            <img
                              src={siteSettings.maintenanceBackgroundImage}
                              alt="Fondo de mantenimiento actual"
                              style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                            />
                            <span>Fondo actual</span>
                            <button
                              type="button"
                              onClick={handleRemoveMaintenanceBg}
                              className="btn btn-outline"
                              style={{ marginTop: '0.5rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                            >
                              Quitar Imagen
                            </button>
                          </div>
                        )}
                        <div className="upload-box">
                          <input type="file" accept="image/*" onChange={handleMaintenanceBgChange} />
                          <UploadCloud size={24} strokeWidth={1.5} />
                          <span>{maintenanceBgFile ? maintenanceBgFile.name : 'Subir imagen de fondo'}</span>
                        </div>
                      </div>
                      <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '5px' }}>
                        Se muestra detrás del mensaje de mantenimiento, con una capa oscura para mantener el texto legible. Si no subís ninguna, se usa el degradé de colores de la marca.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="form-actions" style={{ marginTop: '2rem', padding: '1.5rem 0', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'center' }}>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ minWidth: '200px' }}>
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
