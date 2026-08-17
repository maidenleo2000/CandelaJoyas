import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { toast } from 'react-hot-toast';
import { Search, UserPlus, Trash2, Edit2, Shield, User, Mail, X, Key, ShieldCheck, MailQuestion } from 'lucide-react';
import './UsersTab.css';

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'client'
  });

  const fromRow = (row) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  });

  useEffect(() => {
    let cancelled = false;

    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("Error fetching users:", error);
      } else {
        setUsers((data || []).map(fromRow));
      }
      setLoading(false);
    };

    fetchUsers();

    const channel = supabase
      .channel(`profiles_changes-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchUsers())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const resetForm = () => {
    setFormData({ email: '', password: '', displayName: '', role: 'client' });
    setIsEditing(false);
    setSelectedUser(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '', // Password not editable this way
      displayName: user.displayName || '',
      role: user.role || 'client'
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isEditing) {
        const { error } = await supabase.from('profiles').update({
          display_name: formData.displayName,
          role: formData.role,
          updated_at: new Date().toISOString(),
        }).eq('id', selectedUser.id);
        if (error) throw error;
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? {
          ...u,
          displayName: formData.displayName,
          role: formData.role,
        } : u));
        toast.success("Usuario actualizado correctamente");
      } else {
        // Crear usuario vía Edge Function (usa el service role, no puede
        // hacerse desde el cliente)
        const { data, error } = await supabase.functions.invoke('admin-create-user', {
          body: {
            email: formData.email,
            password: formData.password,
            displayName: formData.displayName,
            role: formData.role,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setUsers(prev => [{
          id: data.id,
          email: formData.email,
          displayName: formData.displayName,
          role: formData.role,
          createdAt: new Date(),
        }, ...prev]);
        toast.success("Usuario creado exitosamente");
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("DEBUG - Error al guardar usuario:", error.message);
      toast.error(error.message || 'Error al procesar el usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, userEmail) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente a ${userEmail}?`)) {
      try {
        const { data, error } = await supabase.functions.invoke('admin-delete-user', {
          body: { id },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setUsers(prev => prev.filter(u => u.id !== id));
        toast.success("Usuario eliminado correctamente");
      } catch (error) {
        toast.error(error.message || "Error al eliminar el usuario");
      }
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loader" style={{margin: '4rem auto'}}></div>;

  return (
    <div className="users-tab animate-fade-in">
      <div className="users-header">
        <div className="search-bar-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary create-user-btn" onClick={handleOpenCreateModal}>
          <UserPlus size={20} /> Crear Usuario
        </button>
      </div>

      <div className="users-grid">
        <div className="sales-table-container glass">
          <table className="sales-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Registrado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td data-label="Usuario">
                    <div className="customer-cell">
                      <strong>{user.displayName || 'Sin Nombre'}</strong>
                    </div>
                  </td>
                  <td data-label="Email">
                    <div className="user-email-cell">
                      <span>{user.email}</span>
                    </div>
                  </td>
                  <td data-label="Rol">
                    <span className={`role-badge ${user.role || 'client'}`}>
                      {user.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                      {user.role || 'client'}
                    </span>
                  </td>
                  <td data-label="Registrado">
                    <div className="date-cell">
                       {user.createdAt.toLocaleDateString()}
                    </div>
                  </td>
                  <td data-label="Acciones">
                    <div className="actions-cell">
                      <button className="edit-btn" onClick={() => handleOpenEditModal(user)}><Edit2 size={16} /></button>
                      <button className="delete-btn" onClick={() => handleDelete(user.id, user.email)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="user-form-grid">
                <div className="form-group">
                  <label>Nombre Completo</label>
                  <div className="input-with-icon">
                    <User size={18} className="input-icon" />
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      placeholder="Ej. María López"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Rol</label>
                  <div className="input-with-icon">
                    <ShieldCheck size={18} className="input-icon" />
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="client">Cliente</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Correo Electrónico</label>
                  <div className="input-with-icon">
                    <Mail size={18} className="input-icon" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="email@ejemplo.com"
                      disabled={isEditing}
                      required
                    />
                  </div>
                </div>

                {!isEditing && (
                  <div className="form-group">
                    <label>Contraseña</label>
                    <div className="input-with-icon">
                      <Key size={18} className="input-icon" />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="Mínimo 6 caracteres"
                        required={!isEditing}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Procesando...' : isEditing ? 'Actualizar Usuario' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
