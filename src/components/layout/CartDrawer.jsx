import { useContext, useState } from "react";
import { CartContext } from "../../contexts/CartContext";
import { SettingsContext } from "../../contexts/SettingsContext";
import { AuthContext } from "../../contexts/AuthContext";
import { X, ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../../services/supabase";
import CheckoutModal from "./CheckoutModal";
import "./CartDrawer.css";

export default function CartDrawer({ isOpen, onClose }) {
  const {
    cart,
    removeFromCart,
    addToCart,
    removeItemCompletely,
    cartTotal,
    cartCount,
    clearCart
  } = useContext(CartContext);
  const { settings } = useContext(SettingsContext);
  const { currentUser } = useContext(AuthContext);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckoutClick = () => {
    if (cart.length === 0) return;
    setIsCheckoutModalOpen(true);
  };

  const processOrder = async (customerData) => {
    if (!settings.whatsappNumber) {
      toast.error("El número de WhatsApp no está configurado.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Validar Stock Final antes de procesar
      if (settings.enableStockManagement) {
        for (const item of cart) {
          const { data: productData } = await supabase
            .from('products')
            .select('colors, stock')
            .eq('id', item.id)
            .single();

          if (productData) {
            // Determinamos la key de stock (Talle_Color o solo Talle)
            const hasColors = productData.colors && productData.colors.length > 0;
            const stockKey = (hasColors && item.selectedColor) ? `${item.selectedSize}_${item.selectedColor}` : item.selectedSize;
            const currentStock = productData.stock?.[stockKey] || 0;

            if (currentStock < item.quantity) {
              const variantLabel = hasColors ? `${item.selectedSize} - ${item.selectedColor}` : item.selectedSize;
              toast.error(`Lo sentimos, solo quedan ${currentStock} unidades de "${item.name}" (Variante: ${variantLabel})`);
              setIsSubmitting(false);
              return;
            }
          }
        }
      }

      // 2. Guardar la venta (limpiamos datos para evitar undefined)
      // Generamos el id en el cliente: un visitante anónimo puede insertar
      // la venta (RLS lo permite) pero no puede leerla de vuelta con
      // .select(), así que no podemos depender de que la DB nos devuelva el id.
      const saleId = crypto.randomUUID();
      const saleData = {
        id: saleId,
        user_id: currentUser?.id || null,
        customer_name: customerData.customerName || 'Cliente',
        customer_phone: customerData.customerPhone || 'No proporcionado',
        customer_email: customerData.customerEmail || '',
        items: cart.map(item => ({
          id: item.id || '',
          name: item.name || 'Producto',
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          selectedColor: item.selectedColor || null,
          selectedSize: item.selectedSize || null
        })),
        total: Number(cartTotal) || 0,
        status: 'Pendiente',
        payment_method: customerData.paymentMethod || 'whatsapp',
        payment_status: customerData.paymentMethod === 'mercadopago' ? 'pending' : 'not_applicable',
        shipping_method: customerData.shippingMethod || 'coordinate',
        shipping_address: customerData.address || null,
        shipping_cost: customerData.shippingMethod === 'mercadoenvios'
          ? Number(settings.shippingCost || 0)
          : customerData.shippingMethod === 'correoargentino'
            ? Number(customerData.shippingQuote?.cost || 0)
            : 0,
        correo_shipment_status: customerData.shippingMethod === 'correoargentino' ? 'pending' : null,
        correo_shipment_data: customerData.shippingMethod === 'correoargentino' ? (customerData.shippingQuote || null) : null,
      };

      const { error: saleError } = await supabase.from('sales').insert(saleData);
      if (saleError) throw saleError;
      const docRef = { id: saleId };

      // Handle WhatsApp logic
      if (customerData.paymentMethod === 'whatsapp') {
        // ... existing whatsapp logic ...
        const orderList = cart
          .map(
            (item) =>
              `• ${item.name} x${item.quantity}\n  Talle: ${item.selectedSize || "-"}\n  Color: ${item.selectedColor || "-"}\n  Subtotal: $${(item.price * item.quantity).toLocaleString()}`,
          )
          .join("\n\n");

        const message =
          `*PEDIDO DE: ${customerData.customerName.toUpperCase()}*\n` +
          `${customerData.customerPhone ? `Tel: ${customerData.customerPhone}\n` : ''}\n` +
          `*EMPRESA: ${settings.siteTitle}*\n\n` +
          `${orderList}\n\n` +
          `*TOTAL: $${cartTotal.toLocaleString()}*\n\n` +
          `Por favor, confirmar disponibilidad para continuar con el pago.`;

        const whatsappUrl = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(message)}`;
        
        setIsCheckoutModalOpen(false);
        onClose();
        
        setTimeout(() => {
          clearCart && clearCart();
        }, 1000);

        window.open(whatsappUrl, "_blank");
        toast.success("¡Pedido enviado por WhatsApp!");
      } 
      // Handle Mercado Pago logic
      else if (customerData.paymentMethod === 'mercadopago') {
        toast.loading("Iniciando pago con Mercado Pago...");
        
        try {
          const { data: result, error: mpFnError } = await supabase.functions.invoke('create-mp-preference', {
            body: {
              items: cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                imageUrl: item.imageUrl,
                selectedColor: item.selectedColor
              })),
              customerData: {
                customerName: customerData.customerName,
                customerPhone: customerData.customerPhone,
                customerEmail: customerData.customerEmail,
                orderId: docRef.id,
                shippingMethod: customerData.shippingMethod || 'coordinate',
                address: customerData.address || null,
                shippingCost: customerData.shippingMethod === 'correoargentino'
                  ? Number(customerData.shippingQuote?.cost || 0)
                  : (settings.shippingCost || 0),
                origin: window.location.origin // LE PASAMOS EL ORIGEN EXACTO
              }
            }
          });
          if (mpFnError) throw mpFnError;
          if (result?.error) throw new Error(result.error);

          const { init_point } = result;

          // Close modal and drawer
          setIsCheckoutModalOpen(false);
          onClose();
          
          // Clear cart
          clearCart && clearCart();

          // Redirect to Mercado Pago
          window.location.href = init_point;
          
        } catch (mpError) {
          console.error("Error Mercado Pago:", mpError);
          toast.dismiss();
          toast.error("Error al conectar con Mercado Pago. Intenta nuevamente.");
        }
      }
    } catch (error) {
      console.error("DEBUG - Detalle del error:", error);
      toast.error(`Error: ${error.message || 'Error desconocido'}`, { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cart-overlay" onClick={onClose}>
      <div
        className="cart-drawer animate-slide-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cart-header">
          <div className="cart-title">
            <ShoppingCart size={24} />
            <h2>Tu Carrito ({cartCount})</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={28} />
          </button>
        </div>

        <div className="cart-content">
          {cart.length === 0 ? (
            <div className="empty-cart flex-center flex-column">
              <ShoppingCart size={64} className="empty-icon" />
              <p>Tu carrito está vacío</p>
              <button className="btn btn-primary" onClick={onClose}>
                Ir de compras
              </button>
            </div>
          ) : (
            <div className="cart-items">
              {cart.map((item) => (
                <div
                  key={`${item.id}-${item.selectedColor}-${item.selectedSize}`}
                  className="cart-item"
                >
                  <div className="item-image">
                    <img src={item.imageUrl} alt={item.name} />
                  </div>
                  <div className="item-details">
                    <div className="item-header">
                      <h3>{item.name}</h3>
                      <button
                        className="remove-btn"
                        onClick={() =>
                          removeItemCompletely(item.id, {
                            color: item.selectedColor,
                            size: item.selectedSize,
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <p className="item-variant">
                      {item.selectedColor && (
                        <span>Color: {item.selectedColor}</span>
                      )}
                      {item.selectedSize && (
                        <span> / Talle: {item.selectedSize}</span>
                      )}
                    </p>

                    <div className="item-actions">
                      <div className="quantity-controls">
                        <button
                          onClick={() =>
                            removeFromCart(item.id, {
                              color: item.selectedColor,
                              size: item.selectedSize,
                            })
                          }
                        >
                          <Minus size={14} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => {
                            if (settings.enableStockManagement) {
                              const hasColors = item.colors && item.colors.length > 0;
                              const stockKey = (hasColors && item.selectedColor) ? `${item.selectedSize}_${item.selectedColor}` : item.selectedSize;
                              const currentStock = item.stock?.[stockKey] || 0;
                              
                              if (item.quantity >= currentStock) {
                                toast.error(`No hay más unidades disponibles de esta variante`);
                                return;
                              }
                            }
                            addToCart(item, {
                              color: item.selectedColor,
                              size: item.selectedSize,
                            });
                          }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="item-price">
                        ${(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="total-row">
              <span>Total</span>
              <span className="total-amount">
                ${cartTotal.toLocaleString()}
              </span>
            </div>
            <button
              className="btn btn-primary checkout-btn"
              onClick={handleCheckoutClick}
            >
              Finalizar Compra
            </button>
            <button
              className="btn btn-outline continue-shopping-btn"
              onClick={onClose}
            >
              Seguir Comprando
            </button>
          </div>
        )}
      </div>

      <CheckoutModal 
        isOpen={isCheckoutModalOpen}
        onCancel={() => setIsCheckoutModalOpen(false)}
        onConfirm={processOrder}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
