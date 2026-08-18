import { useState } from 'react';
import { supabase } from '../../services/supabase';
import { useCategories } from '../../hooks/useCategories';
import { useProducts } from '../../hooks/useProducts';
import { Edit2, Trash2, Plus, Save, X, Tag, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import './CategoryManager.css';

export default function CategoryManager() {
  const { categories, loading, setCategories } = useCategories();
  const { products, setProducts } = useProducts();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [editingSubId, setEditingSubId] = useState(null);
  const [editSubName, setEditSubName] = useState('');

  const updateCategories = async (newCategories) => {
    const { data: row, error: readError } = await supabase
      .from('site_settings')
      .select('data')
      .eq('id', 1)
      .single();
    if (readError) throw readError;

    const { error } = await supabase
      .from('site_settings')
      .update({ data: { ...row.data, categories: newCategories }, updated_at: new Date().toISOString() })
      .eq('id', 1);
    if (error) throw error;
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    if (categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Esta categoría ya existe');
      return;
    }

    setIsSubmitting(true);
    try {
      const newCategory = {
        id: Math.random().toString(36).substr(2, 9),
        name: name
      };

      await updateCategories([...categories, newCategory]);

      setCategories(prev => [...prev, newCategory]);
      setNewCategoryName('');
      toast.success('Categoría agregada');
    } catch (error) {
      console.error(error);
      toast.error('Error al agregar categoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (category) => {
    setEditingId(category.id);
    setEditName(category.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleUpdateCategory = async (category) => {
    const newName = editName.trim();
    if (!newName || newName === category.name) {
      handleCancelEdit();
      return;
    }

    if (categories.some(cat => cat.id !== category.id && cat.name.toLowerCase() === newName.toLowerCase())) {
      toast.error('Ya existe otra categoría con ese nombre');
      return;
    }

    setIsSubmitting(true);
    try {
      const oldName = category.name;

      // Update categories array in settings
      const updatedCategories = categories.map(cat =>
        cat.id === category.id ? { ...cat, name: newName } : cat
      );

      await updateCategories(updatedCategories);
      setCategories(updatedCategories);

      // Update all products with this category
      const productsToUpdate = products.filter(p => p.category === oldName);
      if (productsToUpdate.length > 0) {
        const { error } = await supabase.from('products').update({ category: newName }).eq('category', oldName);
        if (error) throw error;
        setProducts(prev => prev.map(p => p.category === oldName ? { ...p, category: newName } : p));
        toast.success(`Categoría actualizada y ${productsToUpdate.length} productos vinculados`);
      } else {
        toast.success('Categoría actualizada');
      }

      handleCancelEdit();
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar categoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    const productsInCategory = products.filter(p => p.category === category.name);
    
    let message = `¿Estás seguro de eliminar la categoría "${category.name}"?`;
    if (productsInCategory.length > 0) {
      message += `\n\nATENCIÓN: Hay ${productsInCategory.length} productos en esta categoría que quedarán sin categoría asignada.`;
    }

    if (window.confirm(message)) {
      setIsSubmitting(true);
      try {
        // Remove from categories array in settings
        const updatedCategories = categories.filter(cat => cat.id !== category.id);
        await updateCategories(updatedCategories);
        setCategories(updatedCategories);

        // Update products to have no category (ni subcategoría, que queda huérfana)
        if (productsInCategory.length > 0) {
          const { error } = await supabase.from('products').update({ category: '', subcategory: '' }).eq('category', category.name);
          if (error) throw error;
          setProducts(prev => prev.map(p => p.category === category.name ? { ...p, category: '', subcategory: '' } : p));
          toast.success('Categoría eliminada y productos desvinculados');
        } else {
          toast.success('Categoría eliminada');
        }
      } catch (error) {
        console.error(error);
        toast.error('Error al eliminar categoría');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const toggleExpanded = (categoryId) => {
    setExpandedId(prev => (prev === categoryId ? null : categoryId));
    setNewSubcategoryName('');
    handleCancelSubEdit();
  };

  const handleAddSubcategory = async (e, category) => {
    e.preventDefault();
    const name = newSubcategoryName.trim();
    if (!name) return;

    if (category.subcategories.some(sub => sub.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Esta subcategoría ya existe');
      return;
    }

    setIsSubmitting(true);
    try {
      const newSubcategory = { id: Math.random().toString(36).substr(2, 9), name };
      const updatedCategories = categories.map(cat =>
        cat.id === category.id ? { ...cat, subcategories: [...cat.subcategories, newSubcategory] } : cat
      );

      await updateCategories(updatedCategories);
      setCategories(updatedCategories);
      setNewSubcategoryName('');
      toast.success('Subcategoría agregada');
    } catch (error) {
      console.error(error);
      toast.error('Error al agregar subcategoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartSubEdit = (subcategory) => {
    setEditingSubId(subcategory.id);
    setEditSubName(subcategory.name);
  };

  const handleCancelSubEdit = () => {
    setEditingSubId(null);
    setEditSubName('');
  };

  const handleUpdateSubcategory = async (category, subcategory) => {
    const newName = editSubName.trim();
    if (!newName || newName === subcategory.name) {
      handleCancelSubEdit();
      return;
    }

    if (category.subcategories.some(sub => sub.id !== subcategory.id && sub.name.toLowerCase() === newName.toLowerCase())) {
      toast.error('Ya existe otra subcategoría con ese nombre');
      return;
    }

    setIsSubmitting(true);
    try {
      const oldName = subcategory.name;
      const updatedCategories = categories.map(cat =>
        cat.id === category.id
          ? { ...cat, subcategories: cat.subcategories.map(sub => sub.id === subcategory.id ? { ...sub, name: newName } : sub) }
          : cat
      );

      await updateCategories(updatedCategories);
      setCategories(updatedCategories);

      const productsToUpdate = products.filter(p => p.category === category.name && p.subcategory === oldName);
      if (productsToUpdate.length > 0) {
        const { error } = await supabase.from('products').update({ subcategory: newName })
          .eq('category', category.name).eq('subcategory', oldName);
        if (error) throw error;
        setProducts(prev => prev.map(p => (p.category === category.name && p.subcategory === oldName) ? { ...p, subcategory: newName } : p));
        toast.success(`Subcategoría actualizada y ${productsToUpdate.length} productos vinculados`);
      } else {
        toast.success('Subcategoría actualizada');
      }

      handleCancelSubEdit();
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar subcategoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubcategory = async (category, subcategory) => {
    const productsInSubcategory = products.filter(p => p.category === category.name && p.subcategory === subcategory.name);

    let message = `¿Estás seguro de eliminar la subcategoría "${subcategory.name}"?`;
    if (productsInSubcategory.length > 0) {
      message += `\n\nATENCIÓN: Hay ${productsInSubcategory.length} productos en esta subcategoría que quedarán sin subcategoría asignada.`;
    }

    if (window.confirm(message)) {
      setIsSubmitting(true);
      try {
        const updatedCategories = categories.map(cat =>
          cat.id === category.id
            ? { ...cat, subcategories: cat.subcategories.filter(sub => sub.id !== subcategory.id) }
            : cat
        );
        await updateCategories(updatedCategories);
        setCategories(updatedCategories);

        if (productsInSubcategory.length > 0) {
          const { error } = await supabase.from('products').update({ subcategory: '' })
            .eq('category', category.name).eq('subcategory', subcategory.name);
          if (error) throw error;
          setProducts(prev => prev.map(p => (p.category === category.name && p.subcategory === subcategory.name) ? { ...p, subcategory: '' } : p));
          toast.success('Subcategoría eliminada y productos desvinculados');
        } else {
          toast.success('Subcategoría eliminada');
        }
      } catch (error) {
        console.error(error);
        toast.error('Error al eliminar subcategoría');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleImportFromProducts = async () => {
    const existingCats = [...new Set(products.map(p => p.category).filter(Boolean))];
    if (existingCats.length === 0) {
      toast.error('No hay categorías en los productos para importar');
      return;
    }

    setIsSubmitting(true);
    try {
      const newCatsToImport = existingCats
        .filter(catName => !categories.some(c => c.name.toLowerCase() === catName.toLowerCase()))
        .map(catName => ({
          id: Math.random().toString(36).substr(2, 9),
          name: catName
        }));

      if (newCatsToImport.length > 0) {
        await updateCategories([...categories, ...newCatsToImport]);
        setCategories(prev => [...prev, ...newCatsToImport]);
        toast.success(`${newCatsToImport.length} categorías importadas correctamente`);
      } else {
        toast.success('Todas las categorías ya estaban importadas');
      }
    } catch (error) {
      console.error("Error al importar categorías:", error);
      toast.error('Error al importar categorías. Revisa la consola para más detalles.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="loader"></div>;

  return (
    <div className="category-manager animate-fade-in">
      <div className="category-manager-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3><Tag size={20} /> Gestión de Categorías</h3>
            <p>Agrega, edita o elimina las categorías de tus productos.</p>
          </div>
          {categories.length === 0 && products.some(p => p.category) && (
            <button 
              onClick={handleImportFromProducts} 
              className="btn btn-outline" 
              style={{ fontSize: '0.8rem' }}
              disabled={isSubmitting}
            >
              Importar desde productos
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleAddCategory} className="add-category-form">
        <div className="form-group">
          <input 
            type="text" 
            value={newCategoryName} 
            onChange={(e) => setNewCategoryName(e.target.value)} 
            placeholder="Nombre de la nueva categoría..."
            disabled={isSubmitting}
          />
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || !newCategoryName.trim()}>
            <Plus size={18} /> Agregar
          </button>
        </div>
      </form>

      <div className="categories-list">
        {categories.length === 0 ? (
          <p className="text-muted">No hay categorías creadas aún.</p>
        ) : (
          categories.map(category => (
            <div key={category.id} className="category-item glass">
              <div className="category-row">
                {editingId === category.id ? (
                  <div className="category-edit-mode">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                    />
                    <div className="category-actions">
                      <button onClick={() => handleUpdateCategory(category)} className="icon-btn save-btn" title="Guardar">
                        <Save size={16} />
                      </button>
                      <button onClick={handleCancelEdit} className="icon-btn cancel-btn" title="Cancelar">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="category-expand-toggle"
                      onClick={() => toggleExpanded(category.id)}
                      title={expandedId === category.id ? 'Ocultar subcategorías' : 'Ver subcategorías'}
                    >
                      {expandedId === category.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <div className="category-info">
                      <span className="category-name">{category.name}</span>
                      <span className="category-count">
                        {products.filter(p => p.category === category.name).length} productos
                        {category.subcategories.length > 0 && ` · ${category.subcategories.length} subcategorías`}
                      </span>
                    </div>
                    <div className="category-actions">
                      <button onClick={() => handleStartEdit(category)} className="icon-btn edit-btn" title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteCategory(category)} className="icon-btn delete-btn" title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {expandedId === category.id && (
                <div className="subcategory-panel">
                  <form onSubmit={(e) => handleAddSubcategory(e, category)} className="add-subcategory-form">
                    <input
                      type="text"
                      value={newSubcategoryName}
                      onChange={(e) => setNewSubcategoryName(e.target.value)}
                      placeholder="Nombre de la nueva subcategoría..."
                      disabled={isSubmitting}
                    />
                    <button type="submit" className="btn btn-outline" disabled={isSubmitting || !newSubcategoryName.trim()}>
                      <Plus size={16} /> Agregar
                    </button>
                  </form>

                  {category.subcategories.length === 0 ? (
                    <p className="text-muted subcategory-empty">Esta categoría no tiene subcategorías aún.</p>
                  ) : (
                    <div className="subcategories-list">
                      {category.subcategories.map(subcategory => (
                        <div key={subcategory.id} className="subcategory-item">
                          {editingSubId === subcategory.id ? (
                            <div className="category-edit-mode">
                              <input
                                type="text"
                                value={editSubName}
                                onChange={(e) => setEditSubName(e.target.value)}
                                autoFocus
                              />
                              <div className="category-actions">
                                <button onClick={() => handleUpdateSubcategory(category, subcategory)} className="icon-btn save-btn" title="Guardar">
                                  <Save size={16} />
                                </button>
                                <button onClick={handleCancelSubEdit} className="icon-btn cancel-btn" title="Cancelar">
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="category-info">
                                <span className="category-name">{subcategory.name}</span>
                                <span className="category-count">
                                  {products.filter(p => p.category === category.name && p.subcategory === subcategory.name).length} productos
                                </span>
                              </div>
                              <div className="category-actions">
                                <button onClick={() => handleStartSubEdit(subcategory)} className="icon-btn edit-btn" title="Editar">
                                  <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDeleteSubcategory(category, subcategory)} className="icon-btn delete-btn" title="Eliminar">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
