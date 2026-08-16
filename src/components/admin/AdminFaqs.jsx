import { useState, useEffect, useContext } from 'react';
import { supabase } from '../../services/supabase';
import { SettingsContext } from '../../contexts/SettingsContext';
import { Plus, Edit2, Trash2, Save, X, GripVertical, Columns, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminFaqs.css';

export default function AdminFaqs() {
  const { settings, updateSettings } = useContext(SettingsContext);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(null); // ID del FAQ en edición
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
  const [editFaq, setEditFaq] = useState({ question: '', answer: '' });

  useEffect(() => {
    let cancelled = false;

    const fetchFaqs = async () => {
      const { data, error } = await supabase.from('faqs').select('*');
      if (cancelled) return;
      if (error) {
        console.error("Error cargando FAQs:", error);
        toast.error("Error al cargar preguntas. Revisa la consola.");
      } else {
        const faqsData = [...(data || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setFaqs(faqsData);
      }
      setLoading(false);
    };

    fetchFaqs();

    const channel = supabase
      .channel(`faqs_changes-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'faqs' }, () => fetchFaqs())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddFaq = async (e) => {
    e.preventDefault();
    if (!newFaq.question || !newFaq.answer) return toast.error('Completá ambos campos');

    try {
      const { error } = await supabase.from('faqs').insert(newFaq);
      if (error) throw error;
      setNewFaq({ question: '', answer: '' });
      toast.success('Pregunta agregada');
    } catch (error) {
      console.error(error);
      toast.error('Error al agregar');
    }
  };

  const handleUpdateFaq = async (id) => {
    try {
      const { error } = await supabase.from('faqs').update(editFaq).eq('id', id);
      if (error) throw error;
      setIsEditing(null);
      toast.success('Pregunta actualizada');
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar');
    }
  };

  const handleDeleteFaq = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta pregunta?')) return;
    try {
      const { error } = await supabase.from('faqs').delete().eq('id', id);
      if (error) throw error;
      toast.success('Pregunta eliminada');
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar');
    }
  };

  const startEdit = (faq) => {
    setIsEditing(faq.id);
    setEditFaq({ question: faq.question, answer: faq.answer });
  };

  if (loading) return <div className="admin-loading">Cargando preguntas...</div>;

  return (
    <div className="admin-faqs">
      <div className="admin-section-header">
        <h2>Gestionar Preguntas Frecuentes</h2>
        <p>Añadí o editá las preguntas que aparecen en la sección "¿Cómo comprar?"</p>
      </div>

      <div className="faq-settings-bar">
        <div className="setting-item">
          <label><Columns size={18} /> Columnas en la tienda:</label>
          <div className="column-selector">
            {[1, 2, 3].map(num => (
              <button 
                key={num}
                className={`col-btn ${settings.faqColumns === num ? 'active' : ''}`}
                onClick={() => updateSettings({ ...settings, faqColumns: num })}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-item">
          <label><Maximize2 size={18} /> Ancho máximo (px):</label>
          <div className="width-control">
            <input 
              type="range" 
              min="500" 
              max="1200" 
              step="10"
              value={settings.howToBuyWidth || 780}
              onChange={(e) => updateSettings({ ...settings, howToBuyWidth: parseInt(e.target.value) })}
            />
            <span className="width-value">{settings.howToBuyWidth || 780}px</span>
          </div>
        </div>
      </div>

      <form className="add-faq-form glass" onSubmit={handleAddFaq}>
        <div className="form-group">
          <label>Pregunta</label>
          <input 
            type="text" 
            placeholder="Ej: ¿Hacen envíos?" 
            value={newFaq.question}
            onChange={(e) => setNewFaq({...newFaq, question: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Respuesta</label>
          <textarea 
            placeholder="Ej: Sí, hacemos envíos a todo el país..." 
            value={newFaq.answer}
            onChange={(e) => setNewFaq({...newFaq, answer: e.target.value})}
            rows="3"
          />
        </div>
        <button type="submit" className="btn btn-primary add-btn">
          <Plus size={20} />
          Agregar Pregunta
        </button>
      </form>

      <div className="faqs-list">
        {faqs.length === 0 ? (
          <div className="empty-state">No hay preguntas cargadas aún.</div>
        ) : (
          faqs.map(faq => (
            <div key={faq.id} className="faq-admin-card glass">
              {isEditing === faq.id ? (
                <div className="faq-edit-mode">
                  <input 
                    type="text" 
                    value={editFaq.question} 
                    onChange={(e) => setEditFaq({...editFaq, question: e.target.value})}
                  />
                  <textarea 
                    value={editFaq.answer} 
                    onChange={(e) => setEditFaq({...editFaq, answer: e.target.value})}
                    rows="3"
                  />
                  <div className="edit-actions">
                    <button className="btn btn-primary" onClick={() => handleUpdateFaq(faq.id)}>
                      <Save size={18} /> Guardar
                    </button>
                    <button className="btn btn-secondary" onClick={() => setIsEditing(null)}>
                      <X size={18} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="faq-content">
                    <h4>{faq.question}</h4>
                    <p>{faq.answer}</p>
                  </div>
                  <div className="faq-actions">
                    <button className="action-btn edit" onClick={() => startEdit(faq)}>
                      <Edit2 size={18} />
                    </button>
                    <button className="action-btn delete" onClick={() => handleDeleteFaq(faq.id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
