import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

function normalizeSubcategories(subs) {
  return (subs || []).map((s, index) =>
    typeof s === 'string' ? { id: `sub-${index}`, name: s } : s
  );
}

function normalize(data) {
  const cats = data?.categories || [];
  return cats.map((c, index) => {
    const category = typeof c === 'string' ? { id: `cat-${index}`, name: c } : c;
    return { ...category, subcategories: normalizeSubcategories(category.subcategories) };
  });
}

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      const { data: row, error } = await supabase
        .from('site_settings')
        .select('data')
        .eq('id', 1)
        .single();
      if (cancelled) return;
      if (error) {
        console.error("Error obteniendo categorías desde settings:", error);
        setError(error.message);
      } else {
        setCategories(normalize(row?.data));
      }
      setLoading(false);
    };

    fetchCategories();

    const channel = supabase
      .channel(`categories_changes-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
        fetchCategories();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { categories, loading, error, setCategories };
}
