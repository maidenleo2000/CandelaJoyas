import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function fromRow(row) {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    category: row.category,
    subcategory: row.subcategory,
    imageUrl: row.image_url,
    images: row.images,
    description: row.description,
    colors: row.colors,
    sizes: row.sizes,
    stock: row.stock,
    isOnSale: row.is_on_sale,
    isPaused: row.is_paused,
    isHidden: row.is_hidden,
    oldPrice: row.old_price,
    newPrice: row.new_price,
    discountPercentage: row.discount_percentage,
    videoUrl: row.video_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (cancelled) return;
      if (error) {
        console.error("Error obteniendo productos:", error);
        setError(error.message);
      } else {
        setProducts((data || []).map(fromRow));
      }
      setLoading(false);
    };

    fetchProducts();

    // Escucha en tiempo real (realtime) a Postgres
    const channel = supabase
      .channel(`products_changes-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const refetch = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*');
    if (error) {
      console.error("Error obteniendo productos:", error);
      setError(error.message);
    } else {
      setProducts((data || []).map(fromRow));
    }
    setLoading(false);
  };

  return { products, loading, error, refetch, setProducts };
}
