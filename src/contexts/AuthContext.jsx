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
    // Hardcoded Admin Emails for emergency access
    const adminEmails = ['leandromartello1987@gmail.com', 'yesyrockmetal@gmail.com'];

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
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
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
    logout,
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
