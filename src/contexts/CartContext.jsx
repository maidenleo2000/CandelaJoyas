import { createContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export const CartContext = createContext();

export default function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, settings = {}) => {
    const quantityToAdd = settings.quantity || 1;
    let success = false;
    let message = '';

    setCart(prevCart => {
      const color = settings.color || '';
      const size = settings.size || '';
      
      const existingItemIndex = prevCart.findIndex(
        item => item.id === product.id && 
        (item.selectedColor || '') === color && 
        (item.selectedSize || '') === size
      );

      if (existingItemIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: newCart[existingItemIndex].quantity + quantityToAdd
        };
        success = true;
        message = `Se agregaron ${quantityToAdd} unidad(es) de ${product.name}`;
        return newCart;
      }

      success = true;
      message = `${product.name} agregado al carrito`;
      return [...prevCart, { 
        ...product, 
        quantity: quantityToAdd, 
        selectedColor: color,
        selectedSize: size 
      }];
    });

    if (success && message) toast.success(message);
  };

  const removeFromCart = (productId, settings = {}) => {
    setCart(prevCart => {
        const color = settings.color || '';
        const size = settings.size || '';
        const itemIndex = prevCart.findIndex(
          item => item.id === productId && 
          (item.selectedColor || '') === color && 
          (item.selectedSize || '') === size
        );
        
        if (itemIndex === -1) return prevCart;

        const newCart = [...prevCart];
        if (newCart[itemIndex].quantity > 1) {
          newCart[itemIndex] = {
            ...newCart[itemIndex],
            quantity: newCart[itemIndex].quantity - 1
          };
        } else {
          newCart.splice(itemIndex, 1);
        }
        return newCart;
    });
  };

  const removeItemCompletely = (productId, settings = {}) => {
    const color = settings.color || '';
    const size = settings.size || '';
    setCart(prevCart => prevCart.filter(item => 
      !(item.id === productId && 
        (item.selectedColor || '') === color && 
        (item.selectedSize || '') === size)
    ));
    toast.success('Producto eliminado del carrito');
  };

  const clearCart = () => {
    setCart([]);
    toast.success('Carrito vaciado');
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart, 
      removeItemCompletely,
      clearCart, 
      cartCount, 
      cartTotal 
    }}>
      {children}
    </CartContext.Provider>
  );
}
