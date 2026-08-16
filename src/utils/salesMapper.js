// Convierte una fila de la tabla "sales" (snake_case) al shape que usa
// el frontend (camelCase). Compartido entre SalesTab (admin) y AccountPage
// (pedidos del cliente) para no duplicar el mapeo.
export const saleFromRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  customerEmail: row.customer_email,
  items: row.items,
  total: row.total,
  status: row.status,
  paymentMethod: row.payment_method,
  paymentStatus: row.payment_status,
  shippingMethod: row.shipping_method,
  shippingAddress: row.shipping_address,
  shippingCost: row.shipping_cost,
  correoTrackingNumber: row.correo_tracking_number,
  correoLabelUrl: row.correo_label_url,
  correoShipmentStatus: row.correo_shipment_status,
  trackingNumber: row.tracking_number,
  trackingCarrier: row.tracking_carrier,
  trackingUrl: row.tracking_url,
  mercadopagoPaymentId: row.mercadopago_payment_id,
  createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  updatedAt: row.updated_at ? new Date(row.updated_at) : null,
});

export const ORDER_STATUS_STEPS = ['Pendiente', 'Confirmada', 'Enviada', 'Completada'];
