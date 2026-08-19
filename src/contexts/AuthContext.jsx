import { createContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId, email) => {
    // Emails admin de emergencia, configurables por variable de entorno
    // (respaldo si falla la consulta a profiles).
    const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    let role = 'client';
    let data = null;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && profile) {
        data = profile;
        role = profile.role || 'client';
      }
    } catch (error) {
      console.error("Error fetching user role from supabase:", error);
    }

    if (email && adminEmails.includes(email.toLowerCase())) {
      role = 'admin';
    }

    setUserRole(role);
    setUserData(data);
    return { role, data };
  };

  // Sign In function for Admin
  const login = async (email, password, captchaToken) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken }
    });
    if (error) throw error;
    return data;
  };

  // Registro público de clientes. Nunca se envía "role": el trigger
  // handle_new_user() en la base de datos ignora cualquier role que
  // venga del cliente y siempre asigna 'client' (salvo emails admin
  // hardcodeados), así que no hay forma de auto-otorgarse admin.
  const register = async (email, password, displayName, captchaToken) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || '' }, captchaToken }
    });
    if (error) throw error;
    // Si el email ya tiene una cuenta, Supabase Auth no devuelve error (para
    // no filtrar qué emails existen): responde con un user "ofuscado" cuyo id
    // no es una fila real de auth.users (identities viene vacío). Si no
    // detectamos esto, ese id termina usándose como FK en otras tablas.
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('Este email ya tiene una cuenta. Iniciá sesión en su lugar.');
    }
    return data;
  };

  // Envía el email de recuperación de contraseña con un link que redirige
  // a /restablecer-contrasena, donde Supabase deja una sesión temporal.
  const resetPassword = async (email, captchaToken) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restablecer-contrasena`,
      captchaToken
    });
    if (error) throw error;
  };

  // Log Out function
  const logout = async () => {
    setUserRole(null);
    setUserData(null);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateUserData = async (newData) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update(newData)
        .eq('id', currentUser.id);
      if (error) throw error;
      setUserData(prev => ({ ...prev, ...newData }));
    } catch (error) {
      console.error("Error updating user data:", error);
      throw error;
    }
  };

  const changePassword = async (newPassword) => {
    if (!currentUser) throw new Error("No hay usuario autenticado");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Contraseña actualizada correctamente");
    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar la contraseña");
      throw error;
    }
  };

  // Listen to Supabase Auth state changing
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        const { role, data } = await fetchUserRole(user.id, user.email);

        // Si es admin y tiene push habilitado (o es la primera vez que se loguea como admin)
        // Podríamos intentar registrarlo.
        if (role === 'admin' && data?.push_enabled !== false) {
          import('../services/pushNotifications').then(m => {
            m.registerPush(user.id).catch(err => console.warn("Push registration failed:", err));
          });
        }
      } else {
        setUserRole(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const value = {
    currentUser,
    userRole,
    userData,
    updateUserData,
    login,
    register,
    logout,
    changePassword,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
